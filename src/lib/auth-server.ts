import { headers as nextHeaders } from "next/headers";
import { auth } from "~/lib/auth";

export function hasSessionCookie(headers: Headers): boolean {
  const cookie = headers.get("cookie") ?? "";
  return (
    cookie.includes("better-auth.session_token=") ||
    cookie.includes("__Secure-better-auth.session_token=")
  );
}

export async function getOptionalServerSession(headers: Headers) {
  if (!hasSessionCookie(headers)) {
    return null;
  }

  try {
    return await auth.api.getSession({ headers });
  } catch (error) {
    console.error("[auth] Failed to resolve session:", error);
    return null;
  }
}

export async function getOptionalServerSessionFromHeaders() {
  return getOptionalServerSession(await nextHeaders());
}
