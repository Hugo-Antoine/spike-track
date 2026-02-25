import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { neon } from "@neondatabase/serverless";

const execFileAsync = promisify(execFile);

const UPLOAD_BATCH_SIZE = 25; // parallel S3 uploads per batch

export async function handler(event) {
  const {
    sourceS3Key,
    segments, // [{ segmentId, s3FramesPrefix, startTime, endTime }]
    s3Bucket,
    databaseUrl,
  } = event;

  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const sql = neon(databaseUrl);

  // Generate presigned URL for the source video (valid 15 min)
  const sourceUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: s3Bucket, Key: sourceS3Key }),
    { expiresIn: 900 },
  );
  console.log(`Presigned URL generated for ${sourceS3Key} (${segments.length} segments to process)`);

  // Process each segment sequentially
  const results = [];

  for (const seg of segments) {
    const { segmentId, s3FramesPrefix, startTime, endTime } = seg;
    const tmpDir = `/tmp/${segmentId}`;

    try {
      // Mark as processing, reset counters
      await sql`
        UPDATE "pg-drizzle_video"
        SET status = 'processing', "processedFrames" = 0, "updatedAt" = NOW()
        WHERE id = ${segmentId}
      `;

      await mkdir(tmpDir, { recursive: true });

      // Extract frames with ffmpeg via presigned URL (HTTP range seek)
      const segDuration = endTime - startTime;
      const ffmpegArgs = [
        "-ss", String(startTime),
        "-t", String(segDuration),
        "-i", sourceUrl,
        "-vf", "scale=1280:-1",
        "-q:v", "2",
        `${tmpDir}/frame_%06d.jpg`,
      ];

      await execFileAsync("/usr/local/bin/ffmpeg", ffmpegArgs, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
      });

      // List extracted frames
      const files = (await readdir(tmpDir))
        .filter((f) => f.endsWith(".jpg"))
        .sort();
      const frameCount = files.length;

      if (frameCount === 0) {
        throw new Error("No frames extracted");
      }

      // Store totalFrames early so the UI can compute progress %
      await sql`
        UPDATE "pg-drizzle_video"
        SET "totalFrames" = ${frameCount}, "updatedAt" = NOW()
        WHERE id = ${segmentId}
      `;

      // Upload frames to S3 in batches, updating progress after each
      let uploaded = 0;
      for (let i = 0; i < files.length; i += UPLOAD_BATCH_SIZE) {
        const batch = files.slice(i, i + UPLOAD_BATCH_SIZE);
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
        uploaded += batch.length;
        await sql`
          UPDATE "pg-drizzle_video"
          SET "processedFrames" = ${uploaded}, "updatedAt" = NOW()
          WHERE id = ${segmentId}
        `;
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
      results.push({ segmentId, frameCount, status: "ready" });
    } catch (err) {
      console.error(`Segment ${segmentId} failed:`, err);

      try {
        await sql`
          UPDATE "pg-drizzle_video"
          SET status = 'error', "updatedAt" = NOW()
          WHERE id = ${segmentId}
        `;
      } catch (dbErr) {
        console.error("Failed to update error status:", dbErr);
      }

      results.push({ segmentId, status: "error", error: err.message });
    } finally {
      // Cleanup segment frames
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  console.log(`Batch complete: ${results.filter(r => r.status === "ready").length}/${segments.length} succeeded`);
  return { statusCode: 200, results };
}
