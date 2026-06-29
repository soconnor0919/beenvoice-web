import { z } from "zod";
import { eq, and, desc, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { timeEntries, clients, invoices, businesses } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import type { db } from "~/server/db";
import {
  computeTrackedHours,
  resolveBillingDescription,
  type ClockOutOutcome,
} from "~/lib/time-clock";
import { defaultDueDate, generateInvoiceNumber } from "~/lib/draft-invoice";
import {
  insertInvoiceLineForTimeEntry,
  relinkTimeEntryToInvoice,
  removeLinkedInvoiceItem,
  syncLinkedInvoiceItem,
} from "~/server/api/lib/time-entry-invoice-sync";

type Db = typeof db;

const createSchema = z.object({
  description: z.string().max(500).default(""),
  clientId: z.string().optional().or(z.literal("")),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  hours: z.number().min(0).optional(),
  rate: z.number().min(0).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const updateSchema = createSchema.partial().extend({ id: z.string() });

async function resolveHourlyRate(
  database: Db,
  userId: string,
  clientId: string | null,
  explicitRate?: number | null,
): Promise<number | null> {
  if (explicitRate != null && explicitRate > 0) return explicitRate;
  if (!clientId) return explicitRate ?? null;

  const client = await database.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.createdById, userId)),
    columns: { defaultHourlyRate: true },
  });

  return client?.defaultHourlyRate ?? explicitRate ?? null;
}

function computeHours(startedAt: Date, endedAt: Date): number {
  return computeTrackedHours(startedAt, endedAt);
}

async function addEntryToInvoice(
  database: Db,
  invoice: { id: string; invoiceNumber: string; invoicePrefix: string | null; taxRate: number; items: { amount: number; position: number }[] },
  entryId: string,
  description: string,
  hours: number,
  rate: number,
  date: Date,
): Promise<{ id: string; invoiceNumber: string; invoicePrefix: string }> {
  return insertInvoiceLineForTimeEntry(database, {
    invoice,
    entryId,
    description,
    hours,
    rate,
    date,
  });
}

async function findOrCreateDraftInvoice(
  database: Db,
  userId: string,
  clientId: string,
) {
  const existing = await database.query.invoices.findFirst({
    where: and(
      eq(invoices.clientId, clientId),
      eq(invoices.createdById, userId),
      eq(invoices.status, "draft"),
    ),
    with: { items: true },
    orderBy: [
      desc(invoices.updatedAt),
      desc(invoices.issueDate),
      desc(invoices.invoiceNumber),
    ],
  });

  if (existing) return existing;

  const client = await database.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.createdById, userId)),
    columns: { currency: true },
  });
  if (!client) return null;

  const defaultBusiness = await database.query.businesses.findFirst({
    where: and(eq(businesses.createdById, userId), eq(businesses.isDefault, true)),
    columns: { id: true },
  });

  const issueDate = new Date();
  const [created] = await database
    .insert(invoices)
    .values({
      invoiceNumber: generateInvoiceNumber(issueDate),
      clientId,
      businessId: defaultBusiness?.id ?? null,
      issueDate,
      dueDate: defaultDueDate(issueDate),
      status: "draft",
      totalAmount: 0,
      taxRate: 0,
      currency: client.currency,
      createdById: userId,
    })
    .returning();

  if (!created) return null;

  return { ...created, items: [] as { amount: number; position: number }[] };
}

async function addEntryToLatestInvoice(
  database: Db,
  userId: string,
  clientId: string,
  entryId: string,
  description: string,
  hours: number,
  rate: number,
  date: Date,
): Promise<{ id: string; invoiceNumber: string; invoicePrefix: string } | null> {
  const invoice = await findOrCreateDraftInvoice(database, userId, clientId);
  if (!invoice) return null;
  return addEntryToInvoice(database, invoice, entryId, description, hours, rate, date);
}

async function addEntryToSpecificInvoice(
  database: Db,
  userId: string,
  invoiceId: string,
  entryId: string,
  description: string,
  hours: number,
  rate: number,
  date: Date,
): Promise<{ id: string; invoiceNumber: string; invoicePrefix: string } | null> {
  const invoice = await database.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.createdById, userId),
      eq(invoices.status, "draft"),
    ),
    with: { items: true },
  });

  if (!invoice) return null;
  return addEntryToInvoice(database, invoice, entryId, description, hours, rate, date);
}

export const timeEntriesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          clientId: z.string().optional(),
          from: z.date().optional(),
          to: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timeEntries.createdById, ctx.session.user.id)];
      if (input?.clientId) conditions.push(eq(timeEntries.clientId, input.clientId));
      if (input?.from) conditions.push(gte(timeEntries.startedAt, input.from));
      if (input?.to) conditions.push(lte(timeEntries.startedAt, input.to));

      return ctx.db.query.timeEntries.findMany({
        where: and(...conditions),
        with: { client: true, invoice: { columns: { id: true, invoiceNumber: true, invoicePrefix: true } } },
        orderBy: [desc(timeEntries.startedAt)],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.createdById, ctx.session.user.id),
        ),
        with: { client: true },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });
      return entry;
    }),

  getRunning: protectedProcedure.query(async ({ ctx }) => {
    const entry = await ctx.db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.createdById, ctx.session.user.id),
        isNull(timeEntries.endedAt),
      ),
      with: {
        client: true,
        invoice: { columns: { id: true, invoiceNumber: true, invoicePrefix: true } },
      },
    });
    return entry ?? null;
  }),

  clockIn: protectedProcedure
    .input(
      z.object({
        description: z.string().max(500).default(""),
        clientId: z.string().optional().or(z.literal("")),
        invoiceId: z.string().optional(),
        rate: z.number().min(0).optional(),
        startedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const running = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.createdById, ctx.session.user.id),
          isNull(timeEntries.endedAt),
        ),
      });
      if (running) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A timer is already running. Stop it before clocking in.",
        });
      }

      const clientId = input.clientId?.trim() ?? null;
      let clientRecord: { defaultHourlyRate: number | null } | null = null;
      if (clientId) {
        const found = await ctx.db.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
          columns: { defaultHourlyRate: true },
        });
        if (!found) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
        clientRecord = found;
      }

      const invoiceId = input.invoiceId ?? null;
      let resolvedClientId = clientId;
      if (invoiceId) {
        const invoice = await ctx.db.query.invoices.findFirst({
          where: and(
            eq(invoices.id, invoiceId),
            eq(invoices.createdById, ctx.session.user.id),
            eq(invoices.status, "draft"),
          ),
          columns: { id: true, clientId: true },
        });
        if (!invoice) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only draft invoices accept new time entries",
          });
        }
        if (resolvedClientId && invoice.clientId !== resolvedClientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected invoice does not belong to this client",
          });
        }
        resolvedClientId = resolvedClientId ?? invoice.clientId;
      }

      const startedAt = input.startedAt ?? new Date();
      if (startedAt > new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "startedAt cannot be in the future" });
      }

      if (!clientRecord && resolvedClientId) {
        const found = await ctx.db.query.clients.findFirst({
          where: and(
            eq(clients.id, resolvedClientId),
            eq(clients.createdById, ctx.session.user.id),
          ),
          columns: { defaultHourlyRate: true },
        });
        clientRecord = found ?? null;
      }

      const rate = await resolveHourlyRate(
        ctx.db,
        ctx.session.user.id,
        resolvedClientId,
        input.rate ?? clientRecord?.defaultHourlyRate,
      );

      const [entry] = await ctx.db
        .insert(timeEntries)
        .values({
          description: input.description,
          clientId: resolvedClientId,
          invoiceId,
          startedAt,
          rate,
          createdById: ctx.session.user.id,
        })
        .returning();

      return entry;
    }),

  updateRunning: protectedProcedure
    .input(
      z.object({
        description: z.string().max(500).optional(),
        clientId: z.string().optional().or(z.literal("")),
        invoiceId: z.string().optional().or(z.literal("")),
        rate: z.number().min(0).optional(),
        startedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.createdById, ctx.session.user.id),
          isNull(timeEntries.endedAt),
        ),
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No running timer found" });
      }

      const updates: {
        description?: string;
        clientId?: string | null;
        invoiceId?: string | null;
        rate?: number | null;
        startedAt?: Date;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      if (input.startedAt !== undefined) {
        if (input.startedAt > new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Start time cannot be in the future",
          });
        }
        updates.startedAt = input.startedAt;
      }

      if (input.description !== undefined) {
        updates.description = input.description;
      }

      let resolvedClientId = entry.clientId;

      if (input.clientId !== undefined) {
        const clientId = input.clientId.trim() || null;
        if (clientId) {
          const found = await ctx.db.query.clients.findFirst({
            where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
          });
          if (!found) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
        }
        resolvedClientId = clientId;
        updates.clientId = clientId;
        if (input.invoiceId === undefined) {
          updates.invoiceId = null;
        }
      }

      if (input.invoiceId !== undefined) {
        const invoiceId = input.invoiceId.trim() || null;
        if (invoiceId) {
          const invoice = await ctx.db.query.invoices.findFirst({
            where: and(
              eq(invoices.id, invoiceId),
              eq(invoices.createdById, ctx.session.user.id),
              eq(invoices.status, "draft"),
            ),
            columns: { id: true, clientId: true },
          });
          if (!invoice) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only draft invoices accept new time entries",
            });
          }
          if (resolvedClientId && invoice.clientId !== resolvedClientId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Selected invoice does not belong to this client",
            });
          }
          resolvedClientId = resolvedClientId ?? invoice.clientId;
          updates.clientId = resolvedClientId;
        }
        updates.invoiceId = invoiceId;
      }

      if (input.rate !== undefined) {
        updates.rate = input.rate;
      } else if (input.clientId !== undefined && resolvedClientId) {
        updates.rate = await resolveHourlyRate(
          ctx.db,
          ctx.session.user.id,
          resolvedClientId,
          entry.rate,
        );
      }

      const [updated] = await ctx.db
        .update(timeEntries)
        .set(updates)
        .where(eq(timeEntries.id, entry.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Update failed" });
      }

      return updated;
    }),

  clockOut: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        description: z.string().max(500).optional(),
      }).optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const conditions = [
        eq(timeEntries.createdById, ctx.session.user.id),
        isNull(timeEntries.endedAt),
      ];
      if (input?.id) conditions.push(eq(timeEntries.id, input.id));

      const entry = await ctx.db.query.timeEntries.findFirst({
        where: and(...conditions),
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No running timer found" });
      }

      const endedAt = new Date();
      const hours = computeHours(entry.startedAt, endedAt);
      const rawDescription = input?.description?.trim() ?? entry.description?.trim() ?? "";
      const billingDescription = resolveBillingDescription(rawDescription);
      const rate = entry.rate ?? 0;

      const [updated] = await ctx.db
        .update(timeEntries)
        .set({ endedAt, hours, description: rawDescription, updatedAt: new Date() })
        .where(eq(timeEntries.id, entry.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Clock out failed" });

      let linkedInvoice: { id: string; invoiceNumber: string; invoicePrefix: string } | null = null;
      let outcome: ClockOutOutcome = "zero_hours";

      if (hours > 0) {
        if (entry.invoiceId) {
          linkedInvoice = await addEntryToSpecificInvoice(
            ctx.db,
            ctx.session.user.id,
            entry.invoiceId,
            updated.id,
            billingDescription,
            hours,
            rate,
            endedAt,
          );
          outcome = linkedInvoice ? "linked_to_invoice" : "saved_no_invoice";
        } else if (entry.clientId) {
          linkedInvoice = await addEntryToLatestInvoice(
            ctx.db,
            ctx.session.user.id,
            entry.clientId,
            updated.id,
            billingDescription,
            hours,
            rate,
            endedAt,
          );
          outcome = linkedInvoice ? "linked_to_invoice" : "saved_no_invoice";
        } else {
          outcome = "saved_no_client";
        }
      }

      return {
        entry: updated,
        invoice: linkedInvoice,
        outcome,
        hours,
        rate,
        amount: hours * rate,
      };
    }),

  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = input.clientId?.trim() ?? null;
      if (clientId) {
        const client = await ctx.db.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
        });
        if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
      }

      let hours = input.hours ?? null;
      if (!hours && input.endedAt) {
        hours = computeHours(input.startedAt, input.endedAt);
      }

      const [entry] = await ctx.db
        .insert(timeEntries)
        .values({
          description: input.description,
          clientId,
          startedAt: input.startedAt,
          endedAt: input.endedAt ?? null,
          hours,
          rate: input.rate ?? null,
          notes: input.notes?.trim() ?? null,
          createdById: ctx.session.user.id,
        })
        .returning();

      if (!entry) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Create failed" });

      let linkedInvoice: { id: string; invoiceNumber: string; invoicePrefix: string } | null = null;
      if (clientId && hours && input.endedAt) {
        linkedInvoice = await addEntryToLatestInvoice(
          ctx.db,
          ctx.session.user.id,
          clientId,
          entry.id,
          input.description,
          hours,
          input.rate ?? 0,
          input.endedAt,
        );
      }

      return { entry, invoice: linkedInvoice };
    }),

  update: protectedProcedure
    .input(
      updateSchema.extend({
        invoiceId: z.string().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, invoiceId: nextInvoiceId, ...data } = input;

      const existing = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, id),
          eq(timeEntries.createdById, ctx.session.user.id),
        ),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });

      if (existing.endedAt == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use updateRunning to edit the active timer",
        });
      }

      const clientId =
        data.clientId !== undefined ? data.clientId?.trim() || null : undefined;

      if (clientId) {
        const client = await ctx.db.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
        });
        if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
      }

      let hours = data.hours;
      const startedAt = data.startedAt ?? existing.startedAt;
      const endedAt = data.endedAt ?? existing.endedAt;

      if (endedAt && (data.startedAt !== undefined || data.endedAt !== undefined || data.hours === undefined)) {
        hours = computeHours(startedAt, endedAt);
      }

      await ctx.db
        .update(timeEntries)
        .set({
          ...data,
          clientId,
          hours,
          notes: data.notes?.trim() ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, id));

      const updated = await ctx.db.query.timeEntries.findFirst({
        where: eq(timeEntries.id, id),
      });

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Update failed" });
      }

      if (nextInvoiceId !== undefined) {
        await relinkTimeEntryToInvoice(ctx.db, ctx.session.user.id, updated, nextInvoiceId.trim() || null);
      } else {
        await syncLinkedInvoiceItem(ctx.db, updated);
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.createdById, ctx.session.user.id),
        ),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });

      await removeLinkedInvoiceItem(ctx.db, input.id);
      await ctx.db.delete(timeEntries).where(eq(timeEntries.id, input.id));
      return { success: true };
    }),

  getSummary: protectedProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(timeEntries.createdById, ctx.session.user.id),
        isNotNull(timeEntries.endedAt),
      ];
      if (input?.from) conditions.push(gte(timeEntries.startedAt, input.from));
      if (input?.to) conditions.push(lte(timeEntries.startedAt, input.to));

      const entries = await ctx.db.query.timeEntries.findMany({
        where: and(...conditions),
        with: { client: true },
      });

      const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
      const totalEarnings = entries.reduce(
        (sum, e) => sum + (e.hours ?? 0) * (e.rate ?? 0),
        0,
      );

      return { totalHours, totalEarnings, count: entries.length };
    }),
});
