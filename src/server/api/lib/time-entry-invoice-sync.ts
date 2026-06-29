import { and, eq } from "drizzle-orm";
import type { db } from "~/server/db";
import { invoiceItems, invoices, timeEntries } from "~/server/db/schema";
import { resolveBillingDescription } from "~/lib/time-clock";

type Db = typeof db;

function recalculateInvoiceTotal(
  items: { amount: number }[],
  taxRate: number,
): number {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  return subtotal + (subtotal * taxRate) / 100;
}

export async function findLinkedInvoiceItem(database: Db, timeEntryId: string) {
  return database.query.invoiceItems.findFirst({
    where: eq(invoiceItems.timeEntryId, timeEntryId),
    with: {
      invoice: {
        columns: { id: true, taxRate: true, status: true, createdById: true },
      },
    },
  });
}

export async function insertInvoiceLineForTimeEntry(
  database: Db,
  input: {
    invoice: {
      id: string;
      invoiceNumber: string;
      invoicePrefix: string | null;
      taxRate: number;
      items: { amount: number; position: number }[];
    };
    entryId: string;
    description: string;
    hours: number;
    rate: number;
    date: Date;
  },
) {
  const amount = input.hours * input.rate;
  const maxPosition = input.invoice.items.reduce(
    (m, item) => Math.max(m, item.position),
    -1,
  );

  await database.insert(invoiceItems).values({
    invoiceId: input.invoice.id,
    date: input.date,
    description: input.description,
    hours: input.hours,
    rate: input.rate,
    amount,
    position: maxPosition + 1,
    timeEntryId: input.entryId,
  });

  const subtotal =
    input.invoice.items.reduce((s, i) => s + i.amount, 0) + amount;
  const newTotal = subtotal + (subtotal * input.invoice.taxRate) / 100;

  await database
    .update(invoices)
    .set({ totalAmount: newTotal, updatedAt: new Date() })
    .where(eq(invoices.id, input.invoice.id));

  await database
    .update(timeEntries)
    .set({ invoiceId: input.invoice.id, updatedAt: new Date() })
    .where(eq(timeEntries.id, input.entryId));

  return {
    id: input.invoice.id,
    invoiceNumber: input.invoice.invoiceNumber,
    invoicePrefix: input.invoice.invoicePrefix ?? "#",
  };
}

export async function syncLinkedInvoiceItem(
  database: Db,
  entry: {
    id: string;
    description: string | null;
    hours: number | null;
    rate: number | null;
    startedAt: Date;
    endedAt: Date | null;
    invoiceId: string | null;
  },
) {
  const linked = await findLinkedInvoiceItem(database, entry.id);
  if (!linked?.invoice) return;

  if (linked.invoice.status !== "draft") return;

  const hours =
    entry.hours ??
    (entry.endedAt
      ? Math.max(
          0,
          (entry.endedAt.getTime() - entry.startedAt.getTime()) / 3_600_000,
        )
      : null);

  if (hours == null || hours <= 0) return;

  const rate = entry.rate ?? 0;
  const amount = hours * rate;
  const description = resolveBillingDescription(entry.description ?? "");

  await database
    .update(invoiceItems)
    .set({
      description,
      hours,
      rate,
      amount,
      date: entry.endedAt ?? entry.startedAt,
    })
    .where(eq(invoiceItems.id, linked.id));

  const siblings = await database.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, linked.invoiceId),
    columns: { amount: true },
  });

  await database
    .update(invoices)
    .set({
      totalAmount: recalculateInvoiceTotal(siblings, linked.invoice.taxRate),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, linked.invoiceId));
}

export async function removeLinkedInvoiceItem(database: Db, timeEntryId: string) {
  const linked = await findLinkedInvoiceItem(database, timeEntryId);
  if (!linked?.invoice) return;

  await database.delete(invoiceItems).where(eq(invoiceItems.id, linked.id));

  const siblings = await database.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, linked.invoiceId),
    columns: { amount: true },
  });

  await database
    .update(invoices)
    .set({
      totalAmount: recalculateInvoiceTotal(siblings, linked.invoice.taxRate),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, linked.invoiceId));
}

export async function relinkTimeEntryToInvoice(
  database: Db,
  userId: string,
  entry: {
    id: string;
    description: string | null;
    hours: number | null;
    rate: number | null;
    startedAt: Date;
    endedAt: Date | null;
    clientId: string | null;
  },
  invoiceId: string | null,
) {
  await removeLinkedInvoiceItem(database, entry.id);

  if (!invoiceId || !entry.endedAt || !entry.hours || entry.hours <= 0) {
    await database
      .update(timeEntries)
      .set({ invoiceId: invoiceId ?? null, updatedAt: new Date() })
      .where(eq(timeEntries.id, entry.id));
    return null;
  }

  const invoice = await database.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.createdById, userId),
      eq(invoices.status, "draft"),
    ),
    with: { items: true },
  });

  if (!invoice) return null;

  return insertInvoiceLineForTimeEntry(database, {
    invoice,
    entryId: entry.id,
    description: resolveBillingDescription(entry.description ?? ""),
    hours: entry.hours,
    rate: entry.rate ?? 0,
    date: entry.endedAt,
  });
}
