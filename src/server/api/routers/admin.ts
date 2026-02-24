import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  requirePermission,
} from "~/server/api/trpc";
import { user, queueConfig } from "~/server/db/schema";
import { PERMISSIONS, type Permission } from "~/lib/permissions";

export const adminRouter = createTRPCRouter({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "admin:view_users");

    const users = await ctx.db.query.user.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        permissions: true,
        createdAt: true,
      },
    });

    return users;
  }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "ANNOTATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "admin:manage_roles");

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      await ctx.db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx, "admin:manage_roles");

      const dbUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
        },
      });

      if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

      return dbUser;
    }),

  updateUserPermissions: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "admin:manage_roles");

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot modify your own permissions",
        });
      }

      // Validate all permissions
      const validPermissions = new Set<string>(PERMISSIONS);
      const invalid = input.permissions.filter((p) => !validPermissions.has(p));
      if (invalid.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid permissions: ${invalid.join(", ")}`,
        });
      }

      await ctx.db
        .update(user)
        .set({ permissions: input.permissions as Permission[] })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  getQueueConfig: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx, "admin:manage_config");

    let config = await ctx.db.query.queueConfig.findFirst();

    if (!config) {
      const [inserted] = await ctx.db
        .insert(queueConfig)
        .values({ reannotationPercentage: 30 })
        .returning();
      config = inserted!;
    }

    return { reannotationPercentage: config.reannotationPercentage };
  }),

  updateQueueConfig: protectedProcedure
    .input(
      z.object({
        reannotationPercentage: z.number().int().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx, "admin:manage_config");

      const config = await ctx.db.query.queueConfig.findFirst();

      if (!config) {
        await ctx.db.insert(queueConfig).values({
          reannotationPercentage: input.reannotationPercentage,
          updatedBy: ctx.session.user.id,
        });
      } else {
        await ctx.db
          .update(queueConfig)
          .set({
            reannotationPercentage: input.reannotationPercentage,
            updatedBy: ctx.session.user.id,
          })
          .where(eq(queueConfig.id, config.id));
      }

      return { success: true };
    }),
});
