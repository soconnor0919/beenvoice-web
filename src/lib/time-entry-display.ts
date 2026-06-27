export function invoiceLabel(inv: {
  invoicePrefix: string | null;
  invoiceNumber: string;
}) {
  return `${inv.invoicePrefix ?? "#"}${inv.invoiceNumber}`;
}

export function entryHref(entry: {
  invoiceId: string | null;
  clientId: string | null;
  invoice?: { id: string } | null;
  client?: { id: string } | null;
}): string | null {
  const invoiceId = entry.invoiceId ?? entry.invoice?.id;
  if (invoiceId) return `/dashboard/invoices/${invoiceId}`;
  const clientId = entry.clientId ?? entry.client?.id;
  if (clientId) return `/dashboard/clients/${clientId}`;
  return null;
}

export type TimeEntryListItem = {
  id: string;
  description: string | null;
  hours: number | null;
  rate: number | null;
  startedAt: Date;
  endedAt: Date | null;
  clientId: string | null;
  invoiceId: string | null;
  client?: { id: string; name: string } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoicePrefix: string | null;
  } | null;
};

export function groupEntriesByDate<T extends { startedAt: Date }>(
  entries: T[],
): { dateKey: string; label: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();

  for (const entry of entries) {
    const d = new Date(entry.startedAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(dateKey, [entry]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, groupEntries]) => {
    const sample = new Date(groupEntries[0]!.startedAt);
    const label = sample.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { dateKey, label, entries: groupEntries };
  });
}
