const FALLBACK_CALLBACK_PATH = "/dashboard";

export function safeCallbackPath(value: string | null | undefined) {
  if (!value) return FALLBACK_CALLBACK_PATH;

  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return FALLBACK_CALLBACK_PATH;
  }

  try {
    const url = new URL(trimmed, "https://beenvoice.local");
    if (url.origin !== "https://beenvoice.local") return FALLBACK_CALLBACK_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_CALLBACK_PATH;
  }
}
