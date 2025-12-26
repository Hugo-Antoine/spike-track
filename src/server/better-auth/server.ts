import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from ".";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

// Extend Better Auth types to include role field
declare module "better-auth/types" {
  interface User {
    role: "USER" | "ANNOTATOR" | "ADMIN";
  }
}
