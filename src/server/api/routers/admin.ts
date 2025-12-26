import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { user } from "~/server/db/schema";

/**
 * Admin router - protected by role check
 */
export const adminRouter = createTRPCRouter({
  /**
   * Get all users (admin only)
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.session.user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    const users = await ctx.db.query.user.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    return users;
  }),

  /**
   * Update user role (admin only, cannot promote to ADMIN)
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "ANNOTATOR"]), // Cannot set ADMIN from interface
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Prevent changing own role
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
});
