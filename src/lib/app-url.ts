/** Public app origin (no trailing slash). */
export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/** Hostname for display (e.g. marketing browser chrome). */
export function getAppHost(): string {
  try {
    return new URL(getAppUrl()).host;
  } catch {
    return "beenvoice.app";
  }
}
