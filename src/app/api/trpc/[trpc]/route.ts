import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { reportError } from "~/lib/error-reporting";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const REPORTABLE_CODES = new Set(["INTERNAL_SERVER_ERROR", "TIMEOUT"]);

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, ctx }) => {
      if (env.NODE_ENV === "development") {
        console.error(
          `tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }

      if (REPORTABLE_CODES.has(error.code)) {
        reportError({
          message: `tRPC ${error.code}: ${error.message}`,
          path: path ?? undefined,
          userId: (ctx as { session?: { user?: { id?: string } } })?.session
            ?.user?.id,
          error,
        });
      }
    },
  });

export { handler as GET, handler as POST };
