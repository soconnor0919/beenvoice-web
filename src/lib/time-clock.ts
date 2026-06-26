/** Stored on entries clocked in before empty descriptions were allowed. */
export const LEGACY_DEFAULT_CLOCK_DESCRIPTION = "Professional services";

export function resolveEffectiveHourlyRate(
  enteredRate: number,
  client?: { defaultHourlyRate?: number | null } | null,
): number {
  if (Number.isFinite(enteredRate) && enteredRate > 0) return enteredRate;
  const clientRate = client?.defaultHourlyRate ?? 0;
  if (Number.isFinite(clientRate) && clientRate > 0) return clientRate;
  return 0;
}

export function startedAtFromMinutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export function resolveClockDescription(
  title: string,
  existingDescription?: string | null,
): string {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  if (existingDescription?.trim()) return existingDescription.trim();
  return "";
}

export function formatRunningTimerLabel(description?: string | null): string {
  const trimmed = description?.trim() ?? "";
  if (!trimmed || trimmed === LEGACY_DEFAULT_CLOCK_DESCRIPTION) return "Clocked in";
  return trimmed;
}

export function resolveBillingDescription(description?: string | null): string {
  const trimmed = description?.trim() ?? "";
  if (!trimmed || trimmed === LEGACY_DEFAULT_CLOCK_DESCRIPTION) {
    return LEGACY_DEFAULT_CLOCK_DESCRIPTION;
  }
  return trimmed;
}

export type ClockOutOutcome =
  | "linked_to_invoice"
  | "saved_no_invoice"
  | "saved_no_client"
  | "zero_hours";

export function computeTrackedHours(startedAt: Date, endedAt: Date): number {
  const seconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  return Math.max(0.25, Math.ceil(seconds / 900) * 0.25);
}

export function formatElapsedSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function describeClockOutOutcome(input: {
  outcome: ClockOutOutcome;
  hours: number;
  rate: number;
  invoice?: { invoicePrefix: string; invoiceNumber: string } | null;
}): string {
  const amount = input.hours * input.rate;

  switch (input.outcome) {
    case "linked_to_invoice":
      if (input.invoice) {
        const label = `${input.invoice.invoicePrefix}${input.invoice.invoiceNumber}`;
        return `Added ${input.hours}h @ $${input.rate}/hr ($${amount.toFixed(2)}) to invoice ${label}`;
      }
      return `Added ${input.hours}h to invoice`;
    case "saved_no_invoice":
      return `Saved ${input.hours}h — could not create or find a draft invoice for this client.`;
    case "saved_no_client":
      return `Saved ${input.hours}h — assign a client and invoice to bill this time.`;
    case "zero_hours":
      return "Timer stopped (less than minimum billable increment).";
  }
}
