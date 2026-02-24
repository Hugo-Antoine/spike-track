import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { annotations, userVideoProgress, videos } from "~/server/db/schema";
import { getFrameUrl } from "~/lib/frame-url";

/**
 * Build the image URL for a frame. Supports both new S3/CloudFront videos
 * and legacy Cloudinary videos (for backwards compatibility).
 */
function buildFrameImageUrl(
  video: {
    s3FramesPrefix: string | null;
    cloudinaryPublicId: string | null;
    fps: number;
  },
  frameNumber: number,
): string {
  if (video.s3FramesPrefix) {
    return getFrameUrl(video.s3FramesPrefix, frameNumber);
  }
  // Legacy Cloudinary fallback
  const seconds = ((frameNumber - 1) / video.fps).toFixed(3);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
    ? undefined
    : process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (cloudName && video.cloudinaryPublicId) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_${seconds},w_1280,c_limit,q_auto,f_auto/${video.cloudinaryPublicId}.jpg`;
  }
  throw new Error("Video has no frame source configured");
}

export const annotationRouter = createTRPCRouter({
  /**
   * Get user's progress dashboard data
   */
  getMyProgress: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all user's progress records
    const progressRecords = await ctx.db.query.userVideoProgress.findMany({
      where: eq(userVideoProgress.userId, userId),
      with: {
        video: true,
      },
    });

    // Current video: most recent in_progress
    const current = progressRecords
      .filter((p) => p.status === "in_progress")
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())[0];

    // Completed videos
    const completed = progressRecords.filter((p) => p.status === "completed");

    return {
      current: current
        ? {
            videoId: current.videoId,
            videoName: current.video.name,
            lastFrame: current.lastAnnotatedFrame,
            totalFrames: current.video.totalFrames,
            percentComplete:
              (current.totalAnnotated / current.video.totalFrames) * 100,
            totalAnnotated: current.totalAnnotated,
          }
        : null,
      completed: completed.map((c) => ({
        id: c.video.id,
        name: c.video.name,
        totalFrames: c.video.totalFrames,
        totalAnnotated: c.totalAnnotated,
        completedAt: c.completedAt,
        startedAt: c.startedAt,
      })),
    };
  }),

  /**
   * Get next frame to annotate for a video
   */
  getNextFrame: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get video details
      const video = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.videoId),
      });

      if (!video) {
        throw new Error("Video not found");
      }

      // Get or create progress record
      let progress = await ctx.db.query.userVideoProgress.findFirst({
        where: and(
          eq(userVideoProgress.userId, userId),
          eq(userVideoProgress.videoId, input.videoId),
        ),
      });

      if (!progress) {
        // Create initial progress record
        const [newProgress] = await ctx.db
          .insert(userVideoProgress)
          .values({
            userId,
            videoId: input.videoId,
            lastAnnotatedFrame: 0,
            totalAnnotated: 0,
            status: "in_progress",
            startedAt: new Date(),
            lastActivity: new Date(),
          })
          .returning();
        progress = newProgress!;
      }

      // Find next unannotated frame using PostgreSQL generate_series (1-indexed)
      const nextFrameQuery = await ctx.db.execute(sql`
        SELECT frame_num
        FROM generate_series(
          1::integer,
          ${video.totalFrames}::integer
        ) AS frame_num
        WHERE NOT EXISTS (
          SELECT 1
          FROM ${annotations}
          WHERE ${annotations.videoId} = ${input.videoId}
            AND ${annotations.userId} = ${userId}
            AND ${annotations.frameNumber} = frame_num
        )
        ORDER BY frame_num ASC
        LIMIT 1
      `);

      const nextFrameRow = nextFrameQuery[0] as
        | { frame_num: number }
        | undefined;

      // If no frame found, mark as completed
      if (!nextFrameRow) {
        await ctx.db
          .update(userVideoProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            lastActivity: new Date(),
          })
          .where(
            and(
              eq(userVideoProgress.userId, userId),
              eq(userVideoProgress.videoId, input.videoId),
            ),
          );

        return { completed: true };
      }

      const frameNumber = nextFrameRow.frame_num;

      // Get last 5 annotations where ball was visible (for visual reference)
      const previousAnnotations = await ctx.db.query.annotations.findMany({
        where: and(
          eq(annotations.videoId, input.videoId),
          eq(annotations.userId, userId),
          eq(annotations.ballVisible, true),
        ),
        orderBy: [desc(annotations.frameNumber)],
        limit: 5,
        columns: {
          frameNumber: true,
          x: true,
          y: true,
        },
      });

      // Generate image URL
      const imageUrl = buildFrameImageUrl(video, frameNumber);

      // Calculate progress stats
      const totalAnnotated = progress.totalAnnotated;
      const percentComplete = (totalAnnotated / video.totalFrames) * 100;

      return {
        completed: false,
        frameNumber,
        imageUrl,
        previousAnnotations: previousAnnotations.map((a) => ({
          frameNumber: a.frameNumber,
          x: a.x!,
          y: a.y!,
        })),
        progress: {
          current: frameNumber,
          total: video.totalFrames,
          annotated: totalAnnotated,
          percentComplete,
        },
      };
    }),

  /**
   * Save annotation for a frame
   */
  saveAnnotation: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        frameNumber: z.number(),
        x: z.number().min(0).max(1).optional(), // Coordonnées relatives 0-1
        y: z.number().min(0).max(1).optional(), // Coordonnées relatives 0-1
        ballVisible: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate: if ballVisible=true, x and y must be provided
      if (
        input.ballVisible &&
        (input.x === undefined || input.y === undefined)
      ) {
        throw new Error("x and y coordinates required when ball is visible");
      }

      // UPSERT annotation (INSERT ... ON CONFLICT UPDATE)
      await ctx.db
        .insert(annotations)
        .values({
          videoId: input.videoId,
          userId,
          frameNumber: input.frameNumber,
          x: input.ballVisible ? input.x : null,
          y: input.ballVisible ? input.y : null,
          ballVisible: input.ballVisible,
        })
        .onConflictDoUpdate({
          target: [
            annotations.videoId,
            annotations.userId,
            annotations.frameNumber,
          ],
          set: {
            x: input.ballVisible ? input.x : null,
            y: input.ballVisible ? input.y : null,
            ballVisible: input.ballVisible,
            updatedAt: new Date(),
          },
        });

      // Update progress
      const currentProgress = await ctx.db.query.userVideoProgress.findFirst({
        where: and(
          eq(userVideoProgress.userId, userId),
          eq(userVideoProgress.videoId, input.videoId),
        ),
      });

      if (currentProgress) {
        // Get total annotations count
        const annotationsCount = await ctx.db.execute(sql`
          SELECT COUNT(*)::integer as count
          FROM ${annotations}
          WHERE ${annotations.videoId} = ${input.videoId}
            AND ${annotations.userId} = ${userId}
        `);

        const totalAnnotated = (annotationsCount[0] as { count: number }).count;

        await ctx.db
          .update(userVideoProgress)
          .set({
            lastAnnotatedFrame: Math.max(
              currentProgress.lastAnnotatedFrame,
              input.frameNumber,
            ),
            totalAnnotated,
            lastActivity: new Date(),
          })
          .where(
            and(
              eq(userVideoProgress.userId, userId),
              eq(userVideoProgress.videoId, input.videoId),
            ),
          );
      }

      return { success: true };
    }),

  /**
   * Save multiple annotations in batch
   */
  saveBatch: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        annotations: z.array(
          z.object({
            frameNumber: z.number(),
            x: z.number().min(0).max(1).optional(),
            y: z.number().min(0).max(1).optional(),
            ballVisible: z.boolean(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate all annotations
      for (const ann of input.annotations) {
        if (ann.ballVisible && (ann.x === undefined || ann.y === undefined)) {
          throw new Error(
            `Frame ${ann.frameNumber}: x and y required when ball is visible`,
          );
        }
      }

      // Insert all annotations (UPSERT)
      for (const ann of input.annotations) {
        await ctx.db
          .insert(annotations)
          .values({
            videoId: input.videoId,
            userId,
            frameNumber: ann.frameNumber,
            x: ann.ballVisible ? ann.x : null,
            y: ann.ballVisible ? ann.y : null,
            ballVisible: ann.ballVisible,
          })
          .onConflictDoUpdate({
            target: [
              annotations.videoId,
              annotations.userId,
              annotations.frameNumber,
            ],
            set: {
              x: ann.ballVisible ? ann.x : null,
              y: ann.ballVisible ? ann.y : null,
              ballVisible: ann.ballVisible,
              updatedAt: new Date(),
            },
          });
      }

      // Update progress once for all annotations
      const currentProgress = await ctx.db.query.userVideoProgress.findFirst({
        where: and(
          eq(userVideoProgress.userId, userId),
          eq(userVideoProgress.videoId, input.videoId),
        ),
      });

      if (currentProgress) {
        const annotationsCount = await ctx.db.execute(sql`
          SELECT COUNT(*)::integer as count
          FROM ${annotations}
          WHERE ${annotations.videoId} = ${input.videoId}
            AND ${annotations.userId} = ${userId}
        `);

        const totalAnnotated = (annotationsCount[0] as { count: number }).count;

        const maxFrame = Math.max(
          ...input.annotations.map((a) => a.frameNumber),
          currentProgress.lastAnnotatedFrame,
        );

        await ctx.db
          .update(userVideoProgress)
          .set({
            lastAnnotatedFrame: maxFrame,
            totalAnnotated,
            lastActivity: new Date(),
          })
          .where(
            and(
              eq(userVideoProgress.userId, userId),
              eq(userVideoProgress.videoId, input.videoId),
            ),
          );
      }

      return { success: true, count: input.annotations.length };
    }),

  /**
   * Get specific frame data (for navigation)
   */
  getFrame: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        frameNumber: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get video
      const video = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.videoId),
      });

      if (!video) {
        throw new Error("Video not found");
      }

      // Check if this frame is already annotated
      const existingAnnotation = await ctx.db.query.annotations.findFirst({
        where: and(
          eq(annotations.videoId, input.videoId),
          eq(annotations.userId, userId),
          eq(annotations.frameNumber, input.frameNumber),
        ),
      });

      // Get last 5 visible annotations
      const previousAnnotations = await ctx.db.query.annotations.findMany({
        where: and(
          eq(annotations.videoId, input.videoId),
          eq(annotations.userId, userId),
          eq(annotations.ballVisible, true),
        ),
        orderBy: [desc(annotations.frameNumber)],
        limit: 5,
        columns: {
          frameNumber: true,
          x: true,
          y: true,
        },
      });

      const imageUrl = buildFrameImageUrl(video, input.frameNumber);

      return {
        frameNumber: input.frameNumber,
        imageUrl,
        annotation: existingAnnotation
          ? {
              x: existingAnnotation.x,
              y: existingAnnotation.y,
              ballVisible: existingAnnotation.ballVisible,
            }
          : null,
        previousAnnotations: previousAnnotations.map((a) => ({
          frameNumber: a.frameNumber,
          x: a.x!,
          y: a.y!,
        })),
      };
    }),

  /**
   * Get stats for current video session
   */
  getStats: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const progress = await ctx.db.query.userVideoProgress.findFirst({
        where: and(
          eq(userVideoProgress.userId, userId),
          eq(userVideoProgress.videoId, input.videoId),
        ),
        with: {
          video: true,
        },
      });

      if (!progress) {
        // No progress yet (first visit) — return defaults
        const video = await ctx.db.query.videos.findFirst({
          where: eq(videos.id, input.videoId),
        });
        return {
          currentFrame: 0,
          totalFrames: video?.totalFrames ?? 0,
          annotated: 0,
          percentComplete: 0,
          sessionDuration: 0,
        };
      }

      const sessionDuration = Math.floor(
        (Date.now() - progress.startedAt.getTime()) / 1000,
      );

      return {
        currentFrame: progress.lastAnnotatedFrame,
        totalFrames: progress.video.totalFrames,
        annotated: progress.totalAnnotated,
        percentComplete:
          (progress.totalAnnotated / progress.video.totalFrames) * 100,
        sessionDuration,
      };
    }),

  /**
   * Get all annotations for a video (bulk load for client-side cache)
   */
  getAllAnnotations: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const allAnnotations = await ctx.db.query.annotations.findMany({
        where: and(
          eq(annotations.videoId, input.videoId),
          eq(annotations.userId, userId),
        ),
        columns: {
          frameNumber: true,
          x: true,
          y: true,
          ballVisible: true,
        },
      });

      // Return as Record<frameNumber, annotation> for O(1) lookup
      const annotationMap: Record<
        number,
        { x: number | null; y: number | null; ballVisible: boolean }
      > = {};
      for (const a of allAnnotations) {
        annotationMap[a.frameNumber] = {
          x: a.x,
          y: a.y,
          ballVisible: a.ballVisible,
        };
      }

      return annotationMap;
    }),
});
