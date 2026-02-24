import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { neon } from "@neondatabase/serverless";

const execFileAsync = promisify(execFile);

const BATCH_SIZE = 25; // parallel S3 uploads per batch

export async function handler(event) {
  const {
    sourceS3Key,
    segmentId,
    s3FramesPrefix,
    startTime,
    endTime,
    s3Bucket,
    databaseUrl,
  } = event;

  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const sql = neon(databaseUrl);
  const tmpDir = `/tmp/${segmentId}`;

  try {
    await mkdir(tmpDir, { recursive: true });

    // Generate presigned GET URL for source video
    const getCommand = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: sourceS3Key,
    });
    const sourceUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    // Extract frames with ffmpeg using HTTP input (range seeking with -ss before -i)
    const ffmpegArgs = [
      "-ss", String(startTime),
      "-to", String(endTime),
      "-i", sourceUrl,
      "-vf", "scale=1280:-1",
      "-q:v", "2",
      `${tmpDir}/frame_%06d.jpg`,
    ];

    await execFileAsync("/usr/local/bin/ffmpeg", ffmpegArgs, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 min
    });

    // List extracted frames
    const files = (await readdir(tmpDir))
      .filter((f) => f.endsWith(".jpg"))
      .sort();
    const frameCount = files.length;

    if (frameCount === 0) {
      throw new Error("No frames extracted");
    }

    // Upload frames to S3 in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file) => {
          const body = await readFile(`${tmpDir}/${file}`);
          await s3.send(
            new PutObjectCommand({
              Bucket: s3Bucket,
              Key: `${s3FramesPrefix}${file}`,
              Body: body,
              ContentType: "image/jpeg",
              CacheControl: "public, max-age=31536000, immutable",
            }),
          );
        }),
      );
    }

    // Get dimensions from first frame via ffprobe
    let width = 1280;
    let height = 720;
    try {
      const { stdout } = await execFileAsync("/usr/local/bin/ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        `${tmpDir}/frame_000001.jpg`,
      ]);
      const probe = JSON.parse(stdout);
      width = probe.streams?.[0]?.width ?? 1280;
      height = probe.streams?.[0]?.height ?? 720;
    } catch {
      // fallback to defaults
    }

    // Calculate fps from frame count and duration
    const duration = endTime - startTime;
    const fps = duration > 0 ? Math.round(frameCount / duration) : 30;

    // Update DB — segment is ready
    await sql`
      UPDATE "pg-drizzle_video"
      SET status = 'ready',
          "totalFrames" = ${frameCount},
          fps = ${fps},
          width = ${width},
          height = ${height},
          "updatedAt" = NOW()
      WHERE id = ${segmentId}
    `;

    console.log(`Segment ${segmentId}: ${frameCount} frames, ${fps}fps, ${width}x${height}`);

    return { statusCode: 200, segmentId, frameCount };
  } catch (err) {
    console.error(`Segment ${segmentId} failed:`, err);

    // Update DB — segment errored
    try {
      await sql`
        UPDATE "pg-drizzle_video"
        SET status = 'error', "updatedAt" = NOW()
        WHERE id = ${segmentId}
      `;
    } catch (dbErr) {
      console.error("Failed to update error status:", dbErr);
    }

    return { statusCode: 500, segmentId, error: err.message };
  } finally {
    // Cleanup tmp
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
