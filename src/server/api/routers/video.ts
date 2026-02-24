import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { videos, sourceVideos } from "~/server/db/schema";
import {
  getPresignedUrl,
  createPresignedPutUrl,
  initiateMultipartUpload,
  getMultipartPartUrls,
  completeMultipartUpload,
  abortMultipartUpload,
  invokeLambdaAsync,
} from "~/lib/s3";
import { env } from "~/env";

const MULTIPART_THRESHOLD = 200 * 1024 * 1024; // 200 MB
const PART_SIZE = 100 * 1024 * 1024; // 100 MB per part

function requireAdmin(role: string) {
  if (role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

export const videoRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.videos.findMany({
      where: eq(videos.status, "ready"),
      orderBy: [desc(videos.createdAt)],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.id),
      });
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      return video;
    }),

  // --- Upload: presigned URLs for direct browser→S3 upload ---

  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        fileSize: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      const ext = input.filename.replace(/.*\./, ".");
      const s3Key = `sources/${crypto.randomUUID()}${ext}`;

      if (input.fileSize < MULTIPART_THRESHOLD) {
        // Single presigned PUT
        const url = await createPresignedPutUrl(s3Key, input.contentType);
        return { mode: "single" as const, s3Key, url };
      }

      // Multipart
      const totalParts = Math.ceil(input.fileSize / PART_SIZE);
      const uploadId = await initiateMultipartUpload(s3Key, input.contentType);
      const partUrls = await getMultipartPartUrls(s3Key, uploadId, totalParts);

      return {
        mode: "multipart" as const,
        s3Key,
        uploadId,
        partUrls,
        partSize: PART_SIZE,
      };
    }),

  completeUpload: protectedProcedure
    .input(
      z.object({
        s3Key: z.string(),
        uploadId: z.string(),
        parts: z.array(
          z.object({
            PartNumber: z.number(),
            ETag: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      await completeMultipartUpload(input.s3Key, input.uploadId, input.parts);
      return { success: true };
    }),

  abortUpload: protectedProcedure
    .input(
      z.object({
        s3Key: z.string(),
        uploadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);
      await abortMultipartUpload(input.s3Key, input.uploadId);
      return { success: true };
    }),

  // --- Source video management (admin) ---

  createSourceVideo: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        s3Key: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      // No ffprobe — metadata will be filled by Lambda later
      const [source] = await ctx.db
        .insert(sourceVideos)
        .values({
          name: input.name,
          s3Key: input.s3Key,
        })
        .returning();

      return source!;
    }),

  listSourceVideos: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);

    const sources = await ctx.db.query.sourceVideos.findMany({
      orderBy: [desc(sourceVideos.createdAt)],
      with: { segments: true },
    });

    return sources.map((s) => ({
      ...s,
      segmentCount: s.segments.length,
      segments: s.segments,
    }));
  }),

  getSourcePlaybackUrl: protectedProcedure
    .input(z.object({ sourceVideoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const url = await getPresignedUrl(source.s3Key);
      return { url, source };
    }),

  // --- Segment processing via Lambda ---

  processSegments: protectedProcedure
    .input(
      z.object({
        sourceVideoId: z.string().uuid(),
        segments: z.array(
          z.object({
            name: z.string().min(1),
            startTime: z.number().min(0),
            endTime: z.number().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const segmentIds: string[] = [];

      for (const segment of input.segments) {
        const segmentId = crypto.randomUUID();
        const s3Prefix = `frames/${segmentId}/`;

        // Insert video record with "processing" status
        await ctx.db.insert(videos).values({
          id: segmentId,
          sourceVideoId: source.id,
          name: segment.name,
          s3FramesPrefix: s3Prefix,
          startTimeSeconds: segment.startTime,
          totalFrames: 0,
          fps: 30,
          width: 1280,
          height: 720,
          status: "processing",
        });

        // Invoke Lambda async (fire-and-forget)
        await invokeLambdaAsync(env.LAMBDA_PROCESS_SEGMENT_ARN, {
          sourceS3Key: source.s3Key,
          segmentId,
          s3FramesPrefix: s3Prefix,
          startTime: segment.startTime,
          endTime: segment.endTime,
          s3Bucket: env.S3_BUCKET_NAME,
          databaseUrl: env.DATABASE_URL,
        });

        segmentIds.push(segmentId);
      }

      return { segmentIds };
    }),

  getProcessingStatus: protectedProcedure
    .input(z.object({ sourceVideoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      const segmentList = await ctx.db.query.videos.findMany({
        where: eq(videos.sourceVideoId, input.sourceVideoId),
        orderBy: [desc(videos.createdAt)],
      });

      const segments = segmentList.map((v) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        totalFrames: v.totalFrames,
      }));

      const allReady =
        segments.length > 0 && segments.every((s) => s.status === "ready");
      const hasError = segments.some((s) => s.status === "error");

      return { segments, allReady, hasError };
    }),

  deleteSourceVideo: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      // Check no segments exist
      const segmentCount = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(eq(videos.sourceVideoId, input.id));

      if ((segmentCount[0]?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Delete all segments first",
        });
      }

      await ctx.db.delete(sourceVideos).where(eq(sourceVideos.id, input.id));

      return { success: true };
    }),
});
