/** Parse env vars that Docker Compose passes as strings ("true" / "false"). */
export function envBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}
