import { headers as nextHeaders } from "next/headers";
import { auth } from "~/lib/auth";

const MOBILE_AUTH_COOKIE_HEADER = "x-beenvoice-auth-cookie";
const MAX_AUTH_COOKIE_HEADER_LENGTH = 16 * 1024;

function looksLikeSessionCookie(cookie: string): boolean {
  return cookie.split(";").some((part) => {
    const name =
      part
        .trim()
        .split("=", 1)[0]
        ?.replace(/^__Secure-/, "") ?? "";
    return (
      name === "better-auth.session_token" ||
      name === "better-auth.session_data" ||
      name.startsWith("better-auth.session_token.") ||
      name.startsWith("better-auth.session_data.") ||
      name.endsWith(".session_token") ||
      name.endsWith(".session_data") ||
      name.includes(".session_token.") ||
      name.includes(".session_data.")
    );
  });
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
