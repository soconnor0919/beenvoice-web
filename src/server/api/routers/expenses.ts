import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  expenses,
  clients,
  invoices,
  expenseReceipts,
} from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import {
  resolveBusinessForExpense,
  verifyBusinessAccess,
} from "~/server/api/lib/business-access";
import {
  deleteObject,
  isAllowedReceiptMime,
  putObject,
  RECEIPT_MAX_BYTES,
} from "~/lib/object-storage";

export { EXPENSE_CATEGORIES };

const createExpenseSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be positive"),
  currency: z.string().length(3).default("USD"),
  category: z.string().optional().or(z.literal("")),
  billable: z.boolean().default(false),
  reimbursable: z.boolean().default(false),
  taxDeductible: z.boolean().default(false),
  notes: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  businessId: z.string().optional().or(z.literal("")),
  invoiceId: z.string().optional().or(z.literal("")),
});

const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string(),
});

async function verifyClientAccess(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } },
  clientId: string,
) {
  const client = await ctx.db.query.clients.findFirst({
    where: and(
      eq(clients.id, clientId),
      eq(clients.createdById, ctx.session.user.id),
    ),
  });
  if (!client) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Client not found",
    });
  }
  return client;
}

async function verifyInvoiceAccess(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } },
  invoiceId: string,
) {
  const invoice = await ctx.db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, invoiceId),
      eq(invoices.createdById, ctx.session.user.id),
    ),
  });
  if (!invoice) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invoice not found",
    });
  }
  return invoice;
}

async function resolveExpenseBusinessId(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } },
  businessId: string | null,
  invoice?: { businessId: string | null } | null,
) {
  const explicitBusinessId =
    businessId && businessId.trim() !== "" ? businessId : null;
  const inheritedBusinessId =
    !explicitBusinessId && invoice?.businessId ? invoice.businessId : null;

  const resolved = await resolveBusinessForExpense(
    ctx,
    explicitBusinessId ?? inheritedBusinessId,
  );
  return resolved?.id ?? null;
}

async function getOwnedExpense(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } },
  expenseId: string,
) {
  const expense = await ctx.db.query.expenses.findFirst({
    where: and(
      eq(expenses.id, expenseId),
      eq(expenses.createdById, ctx.session.user.id),
    ),
  });
  if (!expense) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Expense not found",
    });
  }
  return expense;
}

export const expensesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          businessId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(expenses.createdById, ctx.session.user.id)];

      if (input?.businessId) {
        await verifyBusinessAccess(ctx, input.businessId);
        conditions.push(eq(expenses.businessId, input.businessId));
      }

      const rows = await ctx.db.query.expenses.findMany({
        where: and(...conditions),
        with: {
          client: true,
          business: true,
          invoice: true,
        },
        orderBy: [desc(expenses.date)],
      });

      const expenseIds = rows.map((e) => e.id);
      if (expenseIds.length === 0) return [];

      const receiptMeta = await ctx.db
        .select({
          expenseId: expenseReceipts.expenseId,
          id: expenseReceipts.id,
          mimeType: expenseReceipts.mimeType,
          originalFilename: expenseReceipts.originalFilename,
          createdAt: expenseReceipts.createdAt,
        })
        .from(expenseReceipts)
        .where(inArray(expenseReceipts.expenseId, expenseIds))
        .orderBy(desc(expenseReceipts.createdAt));

      const receiptStats = new Map<
        string,
        {
          receiptCount: number;
          receiptPreview: {
            id: string;
            mimeType: string;
            originalFilename: string;
          } | null;
        }
      >();

      for (const receipt of receiptMeta) {
        const existing = receiptStats.get(receipt.expenseId);
        if (existing) {
          existing.receiptCount += 1;
        } else {
          receiptStats.set(receipt.expenseId, {
            receiptCount: 1,
            receiptPreview: {
              id: receipt.id,
              mimeType: receipt.mimeType,
              originalFilename: receipt.originalFilename,
            },
          });
        }
      }

      return rows.map((expense) => {
        const stats = receiptStats.get(expense.id);
        return {
          ...expense,
          receiptCount: stats?.receiptCount ?? 0,
          receiptPreview: stats?.receiptPreview ?? null,
        };
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.createdById, ctx.session.user.id),
        ),
        with: {
          client: true,
          business: true,
          invoice: true,
          receipts: true,
        },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      return expense;
    }),

  create: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const clean = {
        ...input,
        clientId: input.clientId?.trim() ?? null,
        businessId: input.businessId?.trim() ?? null,
        invoiceId: input.invoiceId?.trim() ?? null,
        category: input.category?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
      };

      if (clean.clientId) {
        await verifyClientAccess(ctx, clean.clientId);
      }

      const invoice = clean.invoiceId
        ? await verifyInvoiceAccess(ctx, clean.invoiceId)
        : null;

      const businessId = await resolveExpenseBusinessId(
        ctx,
        clean.businessId,
        invoice,
      );

      const [expense] = await ctx.db
        .insert(expenses)
        .values({
          ...clean,
          businessId,
          createdById: ctx.session.user.id,
        })
        .returning();

      return expense;
    }),

  update: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, id),
          eq(expenses.createdById, ctx.session.user.id),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (data.date !== undefined) updates.date = data.date;
      if (data.description !== undefined) updates.description = data.description;
      if (data.amount !== undefined) updates.amount = data.amount;
      if (data.currency !== undefined) updates.currency = data.currency;
      if (data.billable !== undefined) updates.billable = data.billable;
      if (data.reimbursable !== undefined) updates.reimbursable = data.reimbursable;
      if (data.taxDeductible !== undefined) updates.taxDeductible = data.taxDeductible;
      if (data.category !== undefined) {
        updates.category = data.category?.trim() ?? null;
      }
      if (data.notes !== undefined) {
        updates.notes = data.notes?.trim() ?? null;
      }

      const nextClientId =
        data.clientId !== undefined ? data.clientId?.trim() || null : existing.clientId;
      if (data.clientId !== undefined) {
        if (nextClientId) await verifyClientAccess(ctx, nextClientId);
        updates.clientId = nextClientId;
      }

      const nextInvoiceId =
        data.invoiceId !== undefined
          ? data.invoiceId?.trim() || null
          : existing.invoiceId;
      let invoice = null;
      if (data.invoiceId !== undefined) {
        invoice = nextInvoiceId
          ? await verifyInvoiceAccess(ctx, nextInvoiceId)
          : null;
        updates.invoiceId = nextInvoiceId;
      } else if (nextInvoiceId) {
        invoice = await verifyInvoiceAccess(ctx, nextInvoiceId);
      }

      if (data.businessId !== undefined || data.invoiceId !== undefined) {
        const nextBusinessInput =
          data.businessId !== undefined
            ? data.businessId?.trim() || null
            : existing.businessId;
        updates.businessId = await resolveExpenseBusinessId(
          ctx,
          nextBusinessInput,
          invoice,
        );
      }

      await ctx.db.update(expenses).set(updates).where(eq(expenses.id, id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.expenses.findFirst({
        where: and(
          eq(expenses.id, input.id),
          eq(expenses.createdById, ctx.session.user.id),
        ),
        with: { receipts: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      await Promise.all(
        existing.receipts.map((receipt) => deleteObject(receipt.storageKey)),
      );

      await ctx.db.delete(expenses).where(eq(expenses.id, input.id));

      return { success: true };
    }),

  listReceipts: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getOwnedExpense(ctx, input.expenseId);

      return ctx.db.query.expenseReceipts.findMany({
        where: eq(expenseReceipts.expenseId, input.expenseId),
        orderBy: [desc(expenseReceipts.createdAt)],
      });
    }),

  uploadReceipt: protectedProcedure
    .input(
      z.object({
        expenseId: z.string(),
        filename: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        data: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedExpense(ctx, input.expenseId);

      if (!isAllowedReceiptMime(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only images and PDF files are allowed",
        });
      }

      const body = Buffer.from(input.data, "base64");
      if (body.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File is empty",
        });
      }
      if (body.length > RECEIPT_MAX_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File exceeds 10MB limit",
        });
      }

      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageKey = `receipts/${ctx.session.user.id}/${input.expenseId}/${crypto.randomUUID()}-${safeName}`;

      await putObject(storageKey, body, input.mimeType);

      const [receipt] = await ctx.db
        .insert(expenseReceipts)
        .values({
          expenseId: input.expenseId,
          storageKey,
          originalFilename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: body.length,
        })
        .returning();

      return receipt;
    }),

  deleteReceipt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await ctx.db.query.expenseReceipts.findFirst({
        where: eq(expenseReceipts.id, input.id),
        with: { expense: true },
      });

      if (
        !receipt ||
        receipt.expense.createdById !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receipt not found",
        });
      }

      await deleteObject(receipt.storageKey);
      await ctx.db
        .delete(expenseReceipts)
        .where(eq(expenseReceipts.id, input.id));

      return { success: true };
    }),
});
