import { z } from "zod";
import { eq, and, desc, isNull, isNotNull, gte, lte, or } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { timeEntries, clients, invoices, invoiceItems } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

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

function computeHours(startedAt: Date, endedAt: Date): number {
  const seconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  return Math.max(0.25, Math.ceil(seconds / 900) * 0.25);
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
  const invoice = await database.query.invoices.findFirst({
    where: and(
      eq(invoices.clientId, clientId),
      eq(invoices.createdById, userId),
      or(eq(invoices.status, "draft"), eq(invoices.status, "sent")),
    ),
    with: { items: true },
    orderBy: [desc(invoices.createdAt)],
  });

  if (!invoice) return null;

  const amount = hours * rate;
  const maxPosition = invoice.items.reduce((m, item) => Math.max(m, item.position), -1);

  await database.insert(invoiceItems).values({
    invoiceId: invoice.id,
    date,
    description,
    hours,
    rate,
    amount,
    position: maxPosition + 1,
  });

  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0) + amount;
  const newTotal = subtotal + (subtotal * invoice.taxRate) / 100;

  await database
    .update(invoices)
    .set({ totalAmount: newTotal, updatedAt: new Date() })
    .where(eq(invoices.id, invoice.id));

  await database
    .update(timeEntries)
    .set({ invoiceId: invoice.id, updatedAt: new Date() })
    .where(eq(timeEntries.id, entryId));

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoicePrefix: invoice.invoicePrefix ?? "#",
  };
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
    return ctx.db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.createdById, ctx.session.user.id),
        isNull(timeEntries.endedAt),
      ),
      with: { client: true },
    });
  }),

  clockIn: protectedProcedure
    .input(
      z.object({
        description: z.string().max(500).default(""),
        clientId: z.string().optional().or(z.literal("")),
        rate: z.number().min(0).optional(),
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
      if (clientId) {
        const client = await ctx.db.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
        });
        if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
      }

      const [entry] = await ctx.db
        .insert(timeEntries)
        .values({
          description: input.description,
          clientId,
          startedAt: new Date(),
          rate: input.rate ?? null,
          createdById: ctx.session.user.id,
        })
        .returning();

      return entry;
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
      const description = input?.description?.trim() ?? entry.description;

      const [updated] = await ctx.db
        .update(timeEntries)
        .set({ endedAt, hours, description, updatedAt: new Date() })
        .where(eq(timeEntries.id, entry.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Clock out failed" });

      let linkedInvoice: { id: string; invoiceNumber: string; invoicePrefix: string } | null = null;
      if (entry.clientId && hours > 0) {
        linkedInvoice = await addEntryToLatestInvoice(
          ctx.db,
          ctx.session.user.id,
          entry.clientId,
          updated.id,
          description,
          hours,
          entry.rate ?? 0,
          endedAt,
        );
      }

      return { entry: updated, invoice: linkedInvoice };
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
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, id),
          eq(timeEntries.createdById, ctx.session.user.id),
        ),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });

      const clientId =
        data.clientId !== undefined ? data.clientId?.trim() || null : undefined;

      if (clientId) {
        const client = await ctx.db.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.createdById, ctx.session.user.id)),
        });
        if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "Client not found" });
      }

      await ctx.db
        .update(timeEntries)
        .set({
          ...data,
          clientId,
          notes: data.notes?.trim() ?? null,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, id));

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
