import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user as unknown as {
      role: "USER" | "ANNOTATOR" | "ADMIN";
      permissions: string[];
    };
    return {
      ...ctx.session,
      user: {
        ...ctx.session.user,
        role: user.role,
        permissions: user.permissions ?? [],
      },
    };
  }),
});
