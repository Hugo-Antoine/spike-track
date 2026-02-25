import { z } from "zod";
import { sql } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  requirePermission,
} from "~/server/api/trpc";
import {
  sourceVideos,
  videos,
  annotations,
  userVideoProgress,
  user,
} from "~/server/db/schema";

export const statsRouter = createTRPCRouter({
  getGlobalStats: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "stats:view_global");

    const [
      totalSourceVideos,
      totalReadySegments,
      totalFrames,
      totalAnnotations,
      activeAnnotators,
      errorSegments,
    ] = await Promise.all([
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(sourceVideos)
        .then((r) => r[0]!.count),
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(sql`${videos.status} = 'ready'`)
        .then((r) => r[0]!.count),
      ctx.db
        .select({
          total: sql<number>`coalesce(sum(${videos.totalFrames}), 0)::int`,
        })
        .from(videos)
        .where(sql`${videos.status} = 'ready'`)
        .then((r) => r[0]!.total),
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(annotations)
        .then((r) => r[0]!.count),
      ctx.db
        .select({
          count: sql<number>`count(distinct ${userVideoProgress.userId})::int`,
        })
        .from(userVideoProgress)
        .where(sql`${userVideoProgress.status} = 'in_progress'`)
        .then((r) => r[0]!.count),
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(sql`${videos.status} = 'error'`)
        .then((r) => r[0]!.count),
    ]);

    return {
      totalSourceVideos,
      totalReadySegments,
      totalFrames,
      totalAnnotations,
      activeAnnotators,
      errorSegments,
    };
  }),

  getSourceVideoStats: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "stats:view_global");

    const rows = await ctx.db.execute<{
      id: string;
      name: string;
      createdAt: Date;
      segmentCount: number;
      totalFrames: number;
      totalAnnotations: number;
    }>(sql`
      SELECT
        sv.id,
        sv.name,
        sv."createdAt",
        count(v.id)::int as "segmentCount",
        coalesce(sum(v."totalFrames"), 0)::int as "totalFrames",
        (
          SELECT count(*)::int
          FROM ${annotations} a
          JOIN ${videos} v2 ON a."videoId" = v2.id
          WHERE v2."sourceVideoId" = sv.id
        ) as "totalAnnotations"
      FROM ${sourceVideos} sv
      LEFT JOIN ${videos} v ON v."sourceVideoId" = sv.id AND v.status = 'ready'
      GROUP BY sv.id
      ORDER BY sv."createdAt" DESC
    `);

    return rows as unknown as {
      id: string;
      name: string;
      createdAt: Date;
      segmentCount: number;
      totalFrames: number;
      totalAnnotations: number;
    }[];
  }),

  getSegmentDetails: protectedProcedure
    .input(z.object({ sourceVideoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx, "stats:view_global");

      const rows = await ctx.db.execute<{
        id: string;
        name: string;
        status: string;
        totalFrames: number;
        userId: string | null;
        userName: string | null;
        progressStatus: string | null;
        totalAnnotated: number | null;
        lastActivity: Date | null;
      }>(sql`
        SELECT
          v.id,
          v.name,
          v.status,
          v."totalFrames",
          uvp."userId",
          u.name as "userName",
          uvp.status as "progressStatus",
          uvp."totalAnnotated",
          uvp."lastActivity"
        FROM ${videos} v
        LEFT JOIN ${userVideoProgress} uvp ON uvp."videoId" = v.id
        LEFT JOIN ${user} u ON u.id = uvp."userId"
        WHERE v."sourceVideoId" = ${input.sourceVideoId}
        ORDER BY v.start_time_seconds, u.name
      `);

      const flat = rows as unknown as {
        id: string;
        name: string;
        status: string;
        totalFrames: number;
        userId: string | null;
        userName: string | null;
        progressStatus: string | null;
        totalAnnotated: number | null;
        lastActivity: Date | null;
      }[];

      // Group by segment
      const segmentMap = new Map<
        string,
        {
          id: string;
          name: string;
          status: string;
          totalFrames: number;
          annotators: {
            userId: string;
            userName: string;
            progressStatus: string;
            totalAnnotated: number;
            lastActivity: Date | null;
          }[];
        }
      >();

      for (const row of flat) {
        if (!segmentMap.has(row.id)) {
          segmentMap.set(row.id, {
            id: row.id,
            name: row.name,
            status: row.status,
            totalFrames: row.totalFrames,
            annotators: [],
          });
        }
        if (row.userId) {
          segmentMap.get(row.id)!.annotators.push({
            userId: row.userId,
            userName: row.userName ?? "Inconnu",
            progressStatus: row.progressStatus ?? "in_progress",
            totalAnnotated: row.totalAnnotated ?? 0,
            lastActivity: row.lastActivity,
          });
        }
      }

      return Array.from(segmentMap.values());
    }),

  getAnnotatorActivity: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "stats:view_global");

    const rows = await ctx.db.execute<{
      id: string;
      name: string;
      email: string;
      role: string;
      image: string | null;
      videosInProgress: number;
      videosCompleted: number;
      videosValidated: number;
      totalAnnotations: number;
      lastActivity: Date | null;
    }>(sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.image,
        count(DISTINCT CASE WHEN uvp.status = 'in_progress' THEN uvp."videoId" END)::int as "videosInProgress",
        count(DISTINCT CASE WHEN uvp.status = 'completed' THEN uvp."videoId" END)::int as "videosCompleted",
        count(DISTINCT CASE WHEN uvp.status = 'validated' THEN uvp."videoId" END)::int as "videosValidated",
        (SELECT count(*)::int FROM ${annotations} a WHERE a."userId" = u.id) as "totalAnnotations",
        max(uvp."lastActivity") as "lastActivity"
      FROM ${user} u
      LEFT JOIN ${userVideoProgress} uvp ON uvp."userId" = u.id
      WHERE u.role IN ('ANNOTATOR', 'ADMIN')
      GROUP BY u.id
      ORDER BY max(uvp."lastActivity") DESC NULLS LAST
    `);

    return rows as unknown as {
      id: string;
      name: string;
      email: string;
      role: string;
      image: string | null;
      videosInProgress: number;
      videosCompleted: number;
      videosValidated: number;
      totalAnnotations: number;
      lastActivity: Date | null;
    }[];
  }),
});
