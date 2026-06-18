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
      return `Saved ${input.hours}h — no open invoice found for this client. Pick an invoice on the time clock or create one.`;
    case "saved_no_client":
      return `Saved ${input.hours}h — assign a client and invoice to bill this time.`;
    case "zero_hours":
      return "Timer stopped (less than minimum billable increment).";
  }
}
