import { eq, and, sql } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userVideoProgress } from "~/server/db/schema";

export const queueRouter = createTRPCRouter({
  assignNextVideo: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // 1. Check for in_progress video
    const inProgress = await ctx.db.query.userVideoProgress.findFirst({
      where: and(
        eq(userVideoProgress.userId, userId),
        eq(userVideoProgress.status, "in_progress"),
      ),
      with: { video: true },
    });

    if (inProgress) {
      return {
        type: "continue" as const,
        videoId: inProgress.videoId,
        videoName: inProgress.video.name,
        totalFrames: inProgress.video.totalFrames,
      };
    }

    // 2. Load reannotation percentage
    const config = await ctx.db.query.queueConfig.findFirst();
    const reannotationPct = config?.reannotationPercentage ?? 30;

    // 3. Get videoIds already touched by this user
    const userProgress = await ctx.db.query.userVideoProgress.findMany({
      where: eq(userVideoProgress.userId, userId),
      columns: { videoId: true },
    });
    const touchedVideoIds = userProgress.map((p) => p.videoId);

    // 4. Get all videos
    const allVideos = await ctx.db.query.videos.findMany();

    // Filter to videos not touched by this user
    const untouched = allVideos.filter((v) => !touchedVideoIds.includes(v.id));

    if (untouched.length === 0) {
      return { type: "none" as const };
    }

    // 5. Get videos that have been completed by at least one other user
    const completedByOthers = await ctx.db
      .select({ videoId: userVideoProgress.videoId })
      .from(userVideoProgress)
      .where(
        and(
          eq(userVideoProgress.status, "completed"),
          // Exclude current user's progress (already filtered above, but explicit)
          sql`${userVideoProgress.userId} != ${userId}`,
        ),
      )
      .groupBy(userVideoProgress.videoId);

    const completedVideoIds = new Set(completedByOthers.map((r) => r.videoId));

    // Build pools from untouched videos
    const freshPool = untouched.filter((v) => !completedVideoIds.has(v.id));
    const reannotationPool = untouched.filter((v) =>
      completedVideoIds.has(v.id),
    );

    // 6. Pick a video
    let selectedVideo;

    if (freshPool.length === 0 && reannotationPool.length === 0) {
      return { type: "none" as const };
    } else if (freshPool.length === 0) {
      selectedVideo =
        reannotationPool[Math.floor(Math.random() * reannotationPool.length)]!;
    } else if (reannotationPool.length === 0) {
      selectedVideo = freshPool[Math.floor(Math.random() * freshPool.length)]!;
    } else {
      const roll = Math.random() * 100;
      const pool = roll < reannotationPct ? reannotationPool : freshPool;
      selectedVideo = pool[Math.floor(Math.random() * pool.length)]!;
    }

    // 7. Create userVideoProgress
    await ctx.db.insert(userVideoProgress).values({
      userId,
      videoId: selectedVideo.id,
      lastAnnotatedFrame: -1,
      totalAnnotated: 0,
      status: "in_progress",
      startedAt: new Date(),
      lastActivity: new Date(),
    });

    return {
      type: "assigned" as const,
      videoId: selectedVideo.id,
      videoName: selectedVideo.name,
      totalFrames: selectedVideo.totalFrames,
    };
  }),
});
