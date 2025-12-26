import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { videos } from "~/server/db/schema";

export const videoRouter = createTRPCRouter({
  /**
   * Get all videos (for selection on dashboard)
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.videos.findMany({
      orderBy: (videos, { desc }) => [desc(videos.createdAt)],
    });
  }),

  /**
   * Get single video by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.query.videos.findFirst({
        where: eq(videos.id, input.id),
      });

      if (!video) {
        throw new Error("Video not found");
      }

      return video;
    }),
});
