import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  requirePermission,
} from "~/server/api/trpc";
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
import { reportError } from "~/lib/error-reporting";

const MULTIPART_THRESHOLD = 200 * 1024 * 1024; // 200 MB
const PART_SIZE = 100 * 1024 * 1024; // 100 MB per part

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
      requirePermission(ctx, "video:upload");

      const ext = input.filename.replace(/.*\./, ".");
      const uuid = crypto.randomUUID();
      const s3Key = `uploads/${uuid}${ext}`;

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
      requirePermission(ctx, "video:upload");
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
      requirePermission(ctx, "video:upload");
      await abortMultipartUpload(input.s3Key, input.uploadId);
      return { success: true };
    }),

  // --- Source video management (admin) ---

  createSourceVideo: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        s3Key: z.string().min(1), // uploads/{uuid}.mp4
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:create_source");

      // Derive the final sources/ key from the uploads/ key
      const targetKey = input.s3Key.replace(/^uploads\//, "sources/");

      // Store with the final sources/ key
      const [source] = await ctx.db
        .insert(sourceVideos)
        .values({
          name: input.name,
          s3Key: targetKey,
        })
        .returning();

      // Invoke faststart Lambda to move uploads/ → sources/ with moov atom optimization
      // Fire-and-forget: don't block source creation if Lambda invocation fails
      invokeLambdaAsync(env.LAMBDA_FASTSTART_ARN, {
        uploadKey: input.s3Key,
        targetKey,
        databaseUrl: env.DATABASE_URL,
        sourceVideoId: source!.id,
      }).catch((err) => {
        reportError({
          message: "Failed to invoke faststart Lambda",
          context: `sourceVideoId=${source!.id}`,
          error: err,
        });
      });

      return source!;
    }),

  listSourceVideos: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "video:list_sources");

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
      requirePermission(ctx, "video:list_sources");

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const url = await getPresignedUrl(source.s3Key);
      return { url, source };
    }),

  // --- Segment management ---

  createSegment: protectedProcedure
    .input(
      z
        .object({
          sourceVideoId: z.string().uuid(),
          name: z.string().min(1),
          startTime: z.number().min(0),
          endTime: z.number().min(0),
        })
        .refine((d) => d.endTime > d.startTime, {
          message: "Le temps de fin doit être supérieur au temps de début",
          path: ["endTime"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:create_segments");

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const segmentId = crypto.randomUUID();
      const s3Prefix = `frames/${segmentId}/`;

      const [segment] = await ctx.db
        .insert(videos)
        .values({
          id: segmentId,
          sourceVideoId: source.id,
          name: input.name,
          s3FramesPrefix: s3Prefix,
          startTimeSeconds: input.startTime,
          endTimeSeconds: input.endTime,
          totalFrames: 0,
          fps: 30,
          width: 1280,
          height: 720,
          status: "pending",
        })
        .returning();

      return segment!;
    }),

  updateSegmentName: protectedProcedure
    .input(
      z.object({
        segmentId: z.string().uuid(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:create_segments");

      const segment = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.segmentId),
      });
      if (!segment) throw new TRPCError({ code: "NOT_FOUND" });
      if (segment.status !== "pending") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only rename pending segments",
        });
      }

      await ctx.db
        .update(videos)
        .set({ name: input.name })
        .where(eq(videos.id, input.segmentId));

      return { success: true };
    }),

  deleteSegment: protectedProcedure
    .input(z.object({ segmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:create_segments");

      const segment = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.segmentId),
      });
      if (!segment) throw new TRPCError({ code: "NOT_FOUND" });
      if (segment.status !== "pending") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Can only delete pending segments",
        });
      }

      await ctx.db.delete(videos).where(eq(videos.id, input.segmentId));

      return { success: true };
    }),

  saveSegments: protectedProcedure
    .input(
      z.object({
        sourceVideoId: z.string().uuid(),
        segments: z.array(
          z
            .object({
              name: z.string().min(1),
              startTime: z.number().min(0),
              endTime: z.number().min(0),
            })
            .refine((d) => d.endTime > d.startTime, {
              message: "Le temps de fin doit être supérieur au temps de début",
              path: ["endTime"],
            }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:create_segments");

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const segmentIds: string[] = [];

      for (const segment of input.segments) {
        const segmentId = crypto.randomUUID();
        const s3Prefix = `frames/${segmentId}/`;

        await ctx.db.insert(videos).values({
          id: segmentId,
          sourceVideoId: source.id,
          name: segment.name,
          s3FramesPrefix: s3Prefix,
          startTimeSeconds: segment.startTime,
          endTimeSeconds: segment.endTime,
          totalFrames: 0,
          fps: 30,
          width: 1280,
          height: 720,
          status: "pending",
        });

        segmentIds.push(segmentId);
      }

      return { segmentIds };
    }),

  // --- Batch processing via Lambda ---

  launchProcessing: protectedProcedure
    .input(z.object({ sourceVideoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:launch_processing");

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, input.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      // Get all pending segments for this source
      const pendingSegments = await ctx.db.query.videos.findMany({
        where: and(
          eq(videos.sourceVideoId, input.sourceVideoId),
          eq(videos.status, "pending"),
        ),
        orderBy: [videos.startTimeSeconds],
      });

      if (pendingSegments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending segments to process",
        });
      }

      // Batch into groups of MAX_SEGMENTS_PER_LAMBDA
      const MAX_SEGMENTS_PER_LAMBDA = 30;
      const batches: (typeof pendingSegments)[] = [];
      for (
        let i = 0;
        i < pendingSegments.length;
        i += MAX_SEGMENTS_PER_LAMBDA
      ) {
        batches.push(pendingSegments.slice(i, i + MAX_SEGMENTS_PER_LAMBDA));
      }

      // Invoke Lambda for each batch (fire-and-forget)
      for (const batch of batches) {
        await invokeLambdaAsync(env.LAMBDA_PROCESS_SEGMENT_ARN, {
          sourceS3Key: source.s3Key,
          segments: batch.map((seg) => ({
            segmentId: seg.id,
            s3FramesPrefix: seg.s3FramesPrefix,
            startTime: seg.startTimeSeconds,
            endTime: seg.endTimeSeconds,
          })),
          s3Bucket: env.S3_BUCKET_NAME,
          databaseUrl: env.DATABASE_URL,
        });
      }

      return {
        launched: pendingSegments.length,
        batches: batches.length,
      };
    }),

  launchSegmentProcessing: protectedProcedure
    .input(z.object({ segmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:launch_processing");

      const segment = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.segmentId),
      });
      if (!segment) throw new TRPCError({ code: "NOT_FOUND" });
      if (segment.status !== "pending" && segment.status !== "error") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Segment is not pending or in error",
        });
      }

      const source = await ctx.db.query.sourceVideos.findFirst({
        where: eq(sourceVideos.id, segment.sourceVideoId),
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      await invokeLambdaAsync(env.LAMBDA_PROCESS_SEGMENT_ARN, {
        sourceS3Key: source.s3Key,
        segments: [
          {
            segmentId: segment.id,
            s3FramesPrefix: segment.s3FramesPrefix,
            startTime: segment.startTimeSeconds,
            endTime: segment.endTimeSeconds,
          },
        ],
        s3Bucket: env.S3_BUCKET_NAME,
        databaseUrl: env.DATABASE_URL,
      });

      return { launched: 1 };
    }),

  getProcessingStatus: protectedProcedure
    .input(z.object({ sourceVideoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx, "video:view_processing");

      const segmentList = await ctx.db.query.videos.findMany({
        where: eq(videos.sourceVideoId, input.sourceVideoId),
        orderBy: [desc(videos.createdAt)],
      });

      const segments = segmentList.map((v) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        totalFrames: v.totalFrames,
        processedFrames: v.processedFrames,
      }));

      const allReady =
        segments.length > 0 && segments.every((s) => s.status === "ready");
      const hasError = segments.some((s) => s.status === "error");
      const hasPending = segments.some((s) => s.status === "pending");
      const hasProcessing = segments.some((s) => s.status === "processing");

      return { segments, allReady, hasError, hasPending, hasProcessing };
    }),

  deleteSourceVideo: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "video:delete_source");

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
