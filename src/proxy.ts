import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicRoute } from "~/lib/public-routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define API routes that should be handled separately
  const apiRoutes = ["/api/auth", "/api/trpc", "/api/mcp", "/api/i"];

  // Allow API routes to pass through
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public routes for everyone
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session token in cookies (Better Auth cookie names)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  // If no session token, redirect to sign-in
  if (!sessionToken) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Session token exists, allow the request to proceed
  // The actual pages will validate the token properly
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Auth.js API routes)
     * - api/mcp (MCP API route)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|api/mcp|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
};
