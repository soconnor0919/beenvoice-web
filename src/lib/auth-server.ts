import { headers as nextHeaders } from "next/headers";
import { auth } from "~/lib/auth";

const MOBILE_AUTH_COOKIE_HEADER = "x-beenvoice-auth-cookie";
const MAX_AUTH_COOKIE_HEADER_LENGTH = 16 * 1024;

function looksLikeSessionCookie(cookie: string): boolean {
  return (
    cookie.includes("session_token=") ||
    cookie.includes("session_data=") ||
    cookie.includes("better-auth.session_token=") ||
    cookie.includes("__Secure-better-auth.session_token=")
  );
}

export function headersWithAuthCookieFallback(headers: Headers): Headers {
  if (headers.get("cookie")?.trim()) return headers;

  const mobileCookie = headers.get(MOBILE_AUTH_COOKIE_HEADER)?.trim();
  if (
    !mobileCookie ||
    mobileCookie.length > MAX_AUTH_COOKIE_HEADER_LENGTH ||
    !looksLikeSessionCookie(mobileCookie)
  ) {
    return headers;
  }

  const nextHeaders = new Headers(headers);
  nextHeaders.set("cookie", mobileCookie);
  return nextHeaders;
}

export function hasSessionCookie(headers: Headers): boolean {
  const cookie = headers.get("cookie") ?? "";
  if (!cookie.trim()) return false;

  return looksLikeSessionCookie(cookie);
}

export async function getOptionalServerSession(headers: Headers) {
  headers = headersWithAuthCookieFallback(headers);

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
