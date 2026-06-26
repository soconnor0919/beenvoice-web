const DATABASE_SETUP_HINT =
  "Database not ready — run `bun db:migrate` (or `bun db:push` for local dev) after starting Postgres.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectErrorParts(error: unknown): string[] {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && isRecord(current) && !seen.has(current)) {
    seen.add(current);

    if (typeof current.message === "string") {
      parts.push(current.message);
    }

    if (typeof current.code === "string") {
      parts.push(current.code);
    }

    current = current.cause;
  }

  return parts;
}

export function getDatabaseSetupErrorMessage(error: unknown): string | null {
  const haystack = collectErrorParts(error).join(" ").toLowerCase();

  if (
    haystack.includes("does not exist") ||
    haystack.includes("42p01") ||
    haystack.includes("econnrefused") ||
    haystack.includes("connection refused") ||
    haystack.includes("connect econnrefused")
  ) {
    return DATABASE_SETUP_HINT;
  }

  return null;
}
