import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/server/better-auth";

// Force Node.js runtime for Better Auth compatibility
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Get session once
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Routes publiques (auth)
  if (path.startsWith("/login") || path.startsWith("/register")) {
    if (session) {
      // Déjà connecté, rediriger selon le rôle
      if (session.user.role === "USER") {
        return NextResponse.redirect(new URL("/waiting", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Page d'attente
  if (path.startsWith("/waiting")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "USER") {
      // Pas USER, rediriger vers dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Routes admin
  if (path.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Routes protégées (dashboard, annotate)
  if (path.startsWith("/dashboard") || path.startsWith("/annotate")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role === "USER") {
      // Rediriger USER vers page d'attente
      return NextResponse.redirect(new URL("/waiting", request.url));
    }
    return NextResponse.next();
  }

  // Route racine
  if (path === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role === "USER") {
      return NextResponse.redirect(new URL("/waiting", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
