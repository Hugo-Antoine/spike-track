import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  annotations,
  userVideoProgress,
  videos,
} from "~/server/db/schema";
import { getFrameUrl } from "~/lib/cloudinary.server";

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

    // Get all available videos
    const allVideos = await ctx.db.query.videos.findMany({
      orderBy: [desc(videos.createdAt)],
    });

    // Current video: most recent in_progress
    const current = progressRecords
      .filter((p) => p.status === "in_progress")
      .sort(
        (a, b) =>
          b.lastActivity.getTime() - a.lastActivity.getTime()
      )[0];

    // Completed videos
    const completed = progressRecords.filter((p) => p.status === "completed");

    // Available videos: not started by this user
    const progressVideoIds = new Set(progressRecords.map((p) => p.videoId));
    const available = allVideos.filter((v) => !progressVideoIds.has(v.id));

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
      available: available.map((v) => ({
        id: v.id,
        name: v.name,
        totalFrames: v.totalFrames,
        fps: v.fps,
        createdAt: v.createdAt,
      })),
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
    .input(z.object({ videoId: z.number() }))
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
          eq(userVideoProgress.videoId, input.videoId)
        ),
      });

      if (!progress) {
        // Create initial progress record
        const [newProgress] = await ctx.db
          .insert(userVideoProgress)
          .values({
            userId,
            videoId: input.videoId,
            lastAnnotatedFrame: -1,
            totalAnnotated: 0,
            status: "in_progress",
            startedAt: new Date(),
            lastActivity: new Date(),
          })
          .returning();
        progress = newProgress!;
      }

      // Find next unannotated frame using PostgreSQL generate_series
      const nextFrameQuery = await ctx.db.execute(sql`
        SELECT frame_num
        FROM generate_series(
          ${progress.lastAnnotatedFrame + 1}::integer,
          ${video.totalFrames - 1}::integer
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
              eq(userVideoProgress.videoId, input.videoId)
            )
          );

        return { completed: true };
      }

      const frameNumber = nextFrameRow.frame_num;

      // Get last 5 annotations where ball was visible (for visual reference)
      const previousAnnotations = await ctx.db.query.annotations.findMany({
        where: and(
          eq(annotations.videoId, input.videoId),
          eq(annotations.userId, userId),
          eq(annotations.ballVisible, true)
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
      const imageUrl = getFrameUrl(video.cloudinaryFolder, frameNumber);

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
        videoId: z.number(),
        frameNumber: z.number(),
        x: z.number().optional(),
        y: z.number().optional(),
        ballVisible: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate: if ballVisible=true, x and y must be provided
      if (input.ballVisible && (input.x === undefined || input.y === undefined)) {
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
          eq(userVideoProgress.videoId, input.videoId)
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

        const totalAnnotated = (
          annotationsCount[0] as { count: number }
        ).count;

        await ctx.db
          .update(userVideoProgress)
          .set({
            lastAnnotatedFrame: Math.max(
              currentProgress.lastAnnotatedFrame,
              input.frameNumber
            ),
            totalAnnotated,
            lastActivity: new Date(),
          })
          .where(
            and(
              eq(userVideoProgress.userId, userId),
              eq(userVideoProgress.videoId, input.videoId)
            )
          );
      }

      return { success: true };
    }),

  /**
   * Get stats for current video session
   */
  getStats: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const progress = await ctx.db.query.userVideoProgress.findFirst({
        where: and(
          eq(userVideoProgress.userId, userId),
          eq(userVideoProgress.videoId, input.videoId)
        ),
        with: {
          video: true,
        },
      });

      if (!progress) {
        throw new Error("Progress record not found");
      }

      const sessionDuration = Math.floor(
        (Date.now() - progress.startedAt.getTime()) / 1000
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
});
