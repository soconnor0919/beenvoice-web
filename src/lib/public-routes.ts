/** Routes that do not require authentication or server session lookups. */
export const PUBLIC_ROUTES = [
  "/",
  "/auth/signin",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/privacy",
  "/terms",
] as const;

/** Path prefixes treated as public (e.g. shareable invoice links). */
export const PUBLIC_ROUTE_PREFIXES = ["/i/"] as const;

export function isPublicRoute(pathname: string): boolean {
  if ((PUBLIC_ROUTES as readonly string[]).includes(pathname)) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
