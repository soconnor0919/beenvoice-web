import { headers as nextHeaders } from "next/headers";
import { auth } from "~/lib/auth";

const MOBILE_AUTH_COOKIE_HEADER = "x-beenvoice-auth-cookie";
const MOBILE_SESSION_TOKEN_HEADER = "x-beenvoice-session-token";
const MAX_AUTH_COOKIE_HEADER_LENGTH = 16 * 1024;
const MAX_SESSION_TOKEN_LENGTH = 255;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]+$/;

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
  const mobileCookie = headers.get(MOBILE_AUTH_COOKIE_HEADER)?.trim();
  if (
    mobileCookie &&
    mobileCookie.length <= MAX_AUTH_COOKIE_HEADER_LENGTH &&
    looksLikeSessionCookie(mobileCookie)
  ) {
    const nextHeaders = new Headers(headers);
    nextHeaders.set("cookie", mobileCookie);
    return nextHeaders;
  }

  if (headers.get("cookie")?.trim()) return headers;

  const sessionToken = headers.get(MOBILE_SESSION_TOKEN_HEADER)?.trim();
  if (
    sessionToken &&
    sessionToken.length <= MAX_SESSION_TOKEN_LENGTH &&
    SESSION_TOKEN_PATTERN.test(sessionToken)
  ) {
    const nextHeaders = new Headers(headers);
    nextHeaders.set(
      "cookie",
      [
        `better-auth.session_token=${sessionToken}`,
        `__Secure-better-auth.session_token=${sessionToken}`,
      ].join("; "),
    );
    return nextHeaders;
  }

  return headers;
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
