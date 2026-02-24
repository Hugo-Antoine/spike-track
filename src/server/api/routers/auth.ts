import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(async ({ ctx }) => {
    return {
      ...ctx.session,
      user: {
        ...ctx.session.user,
        role: (
          ctx.session.user as unknown as {
            role: "USER" | "ANNOTATOR" | "ADMIN";
          }
        ).role,
      },
    };
  }),
});
