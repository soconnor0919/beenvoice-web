import { z } from "zod";
import { and, count, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "~/lib/audit-log";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  sessionProcedure,
} from "~/server/api/trpc";
import { requireAdmin } from "~/server/api/require-admin";
import {
  accounts,
  users,
  clients,
  businesses,
  invoices,
  invoiceItems,
  invoicePayments,
  invoiceTemplates,
  expenses,
  recurringInvoices,
  recurringInvoiceItems,
  timeEntries,
  platformSettings,
} from "~/server/db/schema";
import {
  colorModeSchema,
  defaultColorMode,
  defaultPdfSettings,
  pdfFontFamilySchema,
  pdfTemplateSchema,
  type ColorMode,
} from "~/lib/branding";
import { revokeUserSessions } from "~/lib/session-security";

function resolveBusinessId(
  refs: { businessName?: string; businessNickname?: string },
  businessIdMap: Map<string, string>,
): string | null {
  if (refs.businessNickname) {
    const byNickname = businessIdMap.get(refs.businessNickname);
    if (byNickname) return byNickname;
  }
  if (refs.businessName) {
    return businessIdMap.get(refs.businessName) ?? null;
  }
  return null;
}

function backupImportError(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

// Validation schemas for backup data
const ClientBackupSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  defaultHourlyRate: z.number().optional(),
  currency: z.string().default("USD"),
});

const BusinessBackupSchema = z.object({
  name: z.string(),
  nickname: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  logoUrl: z.string().optional(),
  isDefault: z.boolean().default(false),
  resendApiKey: z.string().optional(),
  resendDomain: z.string().optional(),
  emailFromName: z.string().optional(),
});

const InvoiceItemBackupSchema = z.object({
  date: z.coerce.date(),
  description: z.string(),
  hours: z.number(),
  rate: z.number(),
  amount: z.number(),
  position: z.number().default(0),
});

const InvoiceBackupSchema = z.object({
  invoiceNumber: z.string(),
  invoicePrefix: z.string().default("#"),
  businessName: z.string().optional(),
  businessNickname: z.string().optional(),
  clientName: z.string(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: z.string().default("draft"),
  totalAmount: z.number().default(0),
  taxRate: z.number().default(0),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  emailMessage: z.string().optional(),
  items: z.array(InvoiceItemBackupSchema),
});

const InvoicePaymentBackupSchema = z.object({
  invoiceNumber: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  date: z.coerce.date(),
  method: z.string().default("other"),
  notes: z.string().optional(),
});

const InvoiceTemplateBackupSchema = z.object({
  name: z.string(),
  type: z.string().default("notes"),
  content: z.string(),
  isDefault: z.boolean().default(false),
});

const RecurringInvoiceItemBackupSchema = z.object({
  description: z.string(),
  hours: z.number(),
  rate: z.number(),
  position: z.number().default(0),
});

const RecurringInvoiceBackupSchema = z.object({
  name: z.string(),
  clientName: z.string(),
  businessName: z.string().optional(),
  businessNickname: z.string().optional(),
  schedule: z.string().default("monthly"),
  status: z.string().default("active"),
  invoicePrefix: z.string().default("#"),
  taxRate: z.number().default(0),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  emailMessage: z.string().optional(),
  nextDueAt: z.coerce.date(),
  lastGeneratedAt: z.coerce.date().optional(),
  items: z.array(RecurringInvoiceItemBackupSchema),
});

const ExpenseBackupSchema = z.object({
  clientName: z.string().optional(),
  businessName: z.string().optional(),
  businessNickname: z.string().optional(),
  invoiceNumber: z.string().optional(),
  date: z.coerce.date(),
  description: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  category: z.string().optional(),
  billable: z.boolean().default(false),
  reimbursable: z.boolean().default(false),
  taxDeductible: z.boolean().default(false),
  notes: z.string().optional(),
});

const TimeEntryBackupSchema = z.object({
  description: z.string().default(""),
  clientName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  hours: z.number().optional(),
  rate: z.number().optional(),
  notes: z.string().optional(),
});

const BackupDataSchema = z.object({
  exportDate: z.string(),
  version: z.string().default("2.0"),
  user: z.object({
    name: z.string().optional(),
    email: z.string(),
    prefersReducedMotion: z.boolean().optional(),
    animationSpeedMultiplier: z.number().optional(),
    theme: z.string().optional(),
    onboardingCompletedAt: z.coerce.date().nullable().optional(),
  }),
  clients: z.array(ClientBackupSchema),
  businesses: z.array(BusinessBackupSchema),
  invoices: z.array(InvoiceBackupSchema),
  invoicePayments: z.array(InvoicePaymentBackupSchema).default([]),
  invoiceTemplates: z.array(InvoiceTemplateBackupSchema).default([]),
  recurringInvoices: z.array(RecurringInvoiceBackupSchema).default([]),
  expenses: z.array(ExpenseBackupSchema).default([]),
  timeEntries: z.array(TimeEntryBackupSchema).default([]),
});

export const settingsRouter = createTRPCRouter({
  listAccounts: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);
    return ctx.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.createdAt)],
    });
  }),

  updateAccountRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["user", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: { role: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (existing.role === input.role) {
        return { success: true };
      }

      if (existing.role === "admin" && input.role === "user") {
        const [adminCount] = await ctx.db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "admin"));

        if ((adminCount?.count ?? 0) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last administrator",
          });
        }
      }

      await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "user.role_updated",
        targetType: "user",
        targetId: input.userId,
        metadata: {
          previousRole: existing.role,
          newRole: input.role,
        },
      });

      return { success: true };
    }),

  // Get user profile information
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        onboardingCompletedAt: true,
      },
    });

    return user;
  }),

  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        onboardingCompletedAt: true,
      },
    });

    const [businessCount, clientCount] = await Promise.all([
      ctx.db.$count(
        businesses,
        eq(businesses.createdById, ctx.session.user.id),
      ),
      ctx.db.$count(clients, eq(clients.createdById, ctx.session.user.id)),
    ]);

    return {
      completed: user?.onboardingCompletedAt != null,
      businessCount,
      clientCount,
    };
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(users)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(users.id, ctx.session.user.id));

    return { success: true };
  }),

  // Get animation preferences
  getAnimationPreferences: publicProcedure.query(async ({ ctx }) => {
    // Return defaults if not authenticated
    if (!ctx.session?.user?.id) {
      return {
        prefersReducedMotion: false,
        animationSpeedMultiplier: 1,
      };
    }

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        prefersReducedMotion: true,
        animationSpeedMultiplier: true,
      },
    });

    return {
      prefersReducedMotion: user?.prefersReducedMotion ?? false,
      animationSpeedMultiplier: user?.animationSpeedMultiplier ?? 1,
    };
  }),

  // Update animation preferences
  updateAnimationPreferences: protectedProcedure
    .input(
      z.object({
        prefersReducedMotion: z.boolean().optional(),
        animationSpeedMultiplier: z
          .number()
          .min(0.25, "Minimum 0.25x")
          .max(4, "Maximum 4x")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          ...(input.prefersReducedMotion !== undefined && {
            prefersReducedMotion: input.prefersReducedMotion,
          }),
          ...(input.animationSpeedMultiplier !== undefined && {
            animationSpeedMultiplier: input.animationSpeedMultiplier,
          }),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  getColorMode: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: { theme: true },
    });

    return {
      colorMode: (user?.theme as ColorMode) ?? defaultColorMode,
    };
  }),

  updateColorMode: protectedProcedure
    .input(
      z.object({
        colorMode: colorModeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ theme: input.colorMode })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  getPdfSettings: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.platformSettings.findFirst({
      where: eq(platformSettings.id, "global"),
    });

    return {
      pdfTemplate:
        (settings?.pdfTemplate as "classic" | "minimal") ??
        defaultPdfSettings.pdfTemplate,
      pdfAccentColor:
        settings?.pdfAccentColor ?? defaultPdfSettings.pdfAccentColor,
      pdfFontFamily:
        (settings?.pdfFontFamily as "sans" | "serif" | "mono" | null) ??
        defaultPdfSettings.pdfFontFamily,
      pdfNumericFontFamily:
        (settings?.pdfNumericFontFamily as "sans" | "serif" | "mono" | null) ??
        defaultPdfSettings.pdfNumericFontFamily,
      pdfFooterText:
        settings?.pdfFooterText ?? defaultPdfSettings.pdfFooterText,
      pdfShowLogo: settings?.pdfShowLogo ?? defaultPdfSettings.pdfShowLogo,
      pdfShowPageNumbers:
        settings?.pdfShowPageNumbers ?? defaultPdfSettings.pdfShowPageNumbers,
    };
  }),

  updatePdfSettings: protectedProcedure
    .input(
      z.object({
        pdfTemplate: pdfTemplateSchema.optional(),
        pdfAccentColor: z.string().min(4).max(50).optional(),
        pdfFontFamily: pdfFontFamilySchema.optional(),
        pdfNumericFontFamily: pdfFontFamilySchema.optional(),
        pdfFooterText: z.string().min(1).max(120).optional(),
        pdfShowLogo: z.boolean().optional(),
        pdfShowPageNumbers: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);
      await ctx.db
        .insert(platformSettings)
        .values({
          id: "global",
          pdfTemplate: input.pdfTemplate ?? defaultPdfSettings.pdfTemplate,
          pdfAccentColor:
            input.pdfAccentColor ?? defaultPdfSettings.pdfAccentColor,
          pdfFontFamily:
            input.pdfFontFamily ?? defaultPdfSettings.pdfFontFamily,
          pdfNumericFontFamily:
            input.pdfNumericFontFamily ??
            defaultPdfSettings.pdfNumericFontFamily,
          pdfFooterText:
            input.pdfFooterText ?? defaultPdfSettings.pdfFooterText,
          pdfShowLogo: input.pdfShowLogo ?? defaultPdfSettings.pdfShowLogo,
          pdfShowPageNumbers:
            input.pdfShowPageNumbers ?? defaultPdfSettings.pdfShowPageNumbers,
        })
        .onConflictDoUpdate({
          target: platformSettings.id,
          set: {
            ...(input.pdfTemplate && { pdfTemplate: input.pdfTemplate }),
            ...(input.pdfAccentColor && {
              pdfAccentColor: input.pdfAccentColor,
            }),
            ...(input.pdfFontFamily && {
              pdfFontFamily: input.pdfFontFamily,
            }),
            ...(input.pdfNumericFontFamily && {
              pdfNumericFontFamily: input.pdfNumericFontFamily,
            }),
            ...(input.pdfFooterText && { pdfFooterText: input.pdfFooterText }),
            ...(input.pdfShowLogo !== undefined && {
              pdfShowLogo: input.pdfShowLogo,
            }),
            ...(input.pdfShowPageNumbers !== undefined && {
              pdfShowPageNumbers: input.pdfShowPageNumbers,
            }),
            updatedAt: new Date(),
          },
        });

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "platform.pdf_settings_updated",
        targetType: "platform",
        targetId: "global",
        metadata: {
          changedFields: Object.keys(input).filter(
            (key) => input[key as keyof typeof input] !== undefined,
          ),
        },
      });

      return { success: true };
    }),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          name: input.name,
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Change user password
  changePassword: sessionProcedure
    .input(
      z
        .object({
          currentPassword: z.string().min(1, "Current password is required"),
          newPassword: z
            .string()
            .min(8, "New password must be at least 8 characters"),
          confirmPassword: z
            .string()
            .min(1, "Password confirmation is required"),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the current user with password
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          password: true,
        },
      });

      if (!user?.password) {
        throw new Error("User not found or no password set");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        input.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(
        input.newPassword,
        saltRounds,
      );

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            password: hashedNewPassword,
          })
          .where(eq(users.id, userId));

        const credentialAccount = await tx.query.accounts.findFirst({
          where: and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, "credential"),
          ),
        });

        if (credentialAccount) {
          await tx
            .update(accounts)
            .set({
              password: hashedNewPassword,
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, credentialAccount.id));
        } else {
          await tx.insert(accounts).values({
            userId,
            accountId: userId,
            providerId: "credential",
            password: hashedNewPassword,
          });
        }
      });

      await revokeUserSessions(userId, ctx.session.session?.token);

      return { success: true };
    }),

  // Export user data (backup)
  exportData: sessionProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        name: true,
        email: true,
        prefersReducedMotion: true,
        animationSpeedMultiplier: true,
        theme: true,
        onboardingCompletedAt: true,
      },
    });

    const userClients = await ctx.db.query.clients.findMany({
      where: eq(clients.createdById, userId),
      columns: {
        name: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        defaultHourlyRate: true,
        currency: true,
      },
    });

    const userBusinesses = await ctx.db.query.businesses.findMany({
      where: eq(businesses.createdById, userId),
      columns: {
        name: true,
        nickname: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        website: true,
        taxId: true,
        logoUrl: true,
        isDefault: true,
        resendApiKey: true,
        resendDomain: true,
        emailFromName: true,
      },
    });

    const userInvoiceTemplates = await ctx.db.query.invoiceTemplates.findMany({
      where: eq(invoiceTemplates.createdById, userId),
      columns: {
        name: true,
        type: true,
        content: true,
        isDefault: true,
      },
    });

    const userInvoices = await ctx.db.query.invoices.findMany({
      where: eq(invoices.createdById, userId),
      with: {
        client: { columns: { name: true } },
        business: { columns: { name: true, nickname: true } },
        items: {
          columns: {
            date: true,
            description: true,
            hours: true,
            rate: true,
            amount: true,
            position: true,
          },
          orderBy: (items, { asc }) => [
            asc(items.date),
            asc(items.position),
            asc(items.createdAt),
          ],
        },
      },
      orderBy: (invoices, { desc }) => [
        desc(invoices.issueDate),
        desc(invoices.dueDate),
        desc(invoices.invoiceNumber),
      ],
    });

    const userPayments = await ctx.db.query.invoicePayments.findMany({
      where: eq(invoicePayments.createdById, userId),
      with: {
        invoice: { columns: { invoiceNumber: true } },
      },
    });

    const userRecurringInvoices = await ctx.db.query.recurringInvoices.findMany({
      where: eq(recurringInvoices.createdById, userId),
      with: {
        client: { columns: { name: true } },
        business: { columns: { name: true, nickname: true } },
        items: {
          columns: {
            description: true,
            hours: true,
            rate: true,
            position: true,
          },
          orderBy: (items, { asc }) => [
            asc(items.position),
            asc(items.createdAt),
          ],
        },
      },
    });

    const userExpenses = await ctx.db.query.expenses.findMany({
      where: eq(expenses.createdById, userId),
      with: {
        client: { columns: { name: true } },
        business: { columns: { name: true, nickname: true } },
        invoice: { columns: { invoiceNumber: true } },
      },
    });

    const userTimeEntries = await ctx.db.query.timeEntries.findMany({
      where: eq(timeEntries.createdById, userId),
      with: {
        client: { columns: { name: true } },
        invoice: { columns: { invoiceNumber: true } },
      },
      orderBy: (entries, { asc }) => [asc(entries.startedAt)],
    });

    return {
      exportDate: new Date().toISOString(),
      version: "2.0",
      user: {
        name: user?.name ?? "",
        email: user?.email ?? "",
        prefersReducedMotion: user?.prefersReducedMotion ?? false,
        animationSpeedMultiplier: user?.animationSpeedMultiplier ?? 1,
        theme: user?.theme ?? "system",
        onboardingCompletedAt: user?.onboardingCompletedAt ?? null,
      },
      clients: userClients.map((client) => ({
        name: client.name,
        email: client.email ?? undefined,
        phone: client.phone ?? undefined,
        addressLine1: client.addressLine1 ?? undefined,
        addressLine2: client.addressLine2 ?? undefined,
        city: client.city ?? undefined,
        state: client.state ?? undefined,
        postalCode: client.postalCode ?? undefined,
        country: client.country ?? undefined,
        defaultHourlyRate: client.defaultHourlyRate ?? undefined,
        currency: client.currency,
      })),
      businesses: userBusinesses.map((business) => ({
        name: business.name,
        nickname: business.nickname ?? undefined,
        email: business.email ?? undefined,
        phone: business.phone ?? undefined,
        addressLine1: business.addressLine1 ?? undefined,
        addressLine2: business.addressLine2 ?? undefined,
        city: business.city ?? undefined,
        state: business.state ?? undefined,
        postalCode: business.postalCode ?? undefined,
        country: business.country ?? undefined,
        website: business.website ?? undefined,
        taxId: business.taxId ?? undefined,
        logoUrl: business.logoUrl ?? undefined,
        isDefault: business.isDefault ?? false,
        resendApiKey: business.resendApiKey ?? undefined,
        resendDomain: business.resendDomain ?? undefined,
        emailFromName: business.emailFromName ?? undefined,
      })),
      invoiceTemplates: userInvoiceTemplates.map((template) => ({
        name: template.name,
        type: template.type,
        content: template.content,
        isDefault: template.isDefault,
      })),
      invoices: userInvoices.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        invoicePrefix: invoice.invoicePrefix ?? "#",
        businessName: invoice.business?.name,
        businessNickname: invoice.business?.nickname ?? undefined,
        clientName: invoice.client.name,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        taxRate: invoice.taxRate,
        currency: invoice.currency,
        notes: invoice.notes ?? undefined,
        emailMessage: invoice.emailMessage ?? undefined,
        items: invoice.items,
      })),
      invoicePayments: userPayments.map((payment) => ({
        invoiceNumber: payment.invoice.invoiceNumber,
        amount: payment.amount,
        currency: payment.currency,
        date: payment.date,
        method: payment.method,
        notes: payment.notes ?? undefined,
      })),
      recurringInvoices: userRecurringInvoices.map((recurring) => ({
        name: recurring.name,
        clientName: recurring.client.name,
        businessName: recurring.business?.name,
        businessNickname: recurring.business?.nickname ?? undefined,
        schedule: recurring.schedule,
        status: recurring.status,
        invoicePrefix: recurring.invoicePrefix ?? "#",
        taxRate: recurring.taxRate,
        currency: recurring.currency,
        notes: recurring.notes ?? undefined,
        emailMessage: recurring.emailMessage ?? undefined,
        nextDueAt: recurring.nextDueAt,
        lastGeneratedAt: recurring.lastGeneratedAt ?? undefined,
        items: recurring.items,
      })),
      expenses: userExpenses.map((expense) => ({
        clientName: expense.client?.name,
        businessName: expense.business?.name,
        businessNickname: expense.business?.nickname ?? undefined,
        invoiceNumber: expense.invoice?.invoiceNumber,
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category ?? undefined,
        billable: expense.billable,
        reimbursable: expense.reimbursable,
        taxDeductible: expense.taxDeductible,
        notes: expense.notes ?? undefined,
      })),
      timeEntries: userTimeEntries.map((entry) => ({
        description: entry.description,
        clientName: entry.client?.name,
        invoiceNumber: entry.invoice?.invoiceNumber,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt ?? undefined,
        hours: entry.hours ?? undefined,
        rate: entry.rate ?? undefined,
        notes: entry.notes ?? undefined,
      })),
    };
  }),

  // Import user data (restore)
  importData: sessionProcedure
    .input(BackupDataSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        return await ctx.db.transaction(async (tx) => {
          const clientIdMap = new Map<string, string>();
          const businessIdMap = new Map<string, string>();
          const invoiceIdMap = new Map<string, string>();

          for (const clientData of input.clients) {
            const [newClient] = await tx
              .insert(clients)
              .values({
                ...clientData,
                createdById: userId,
              })
              .returning({ id: clients.id });

            if (newClient) {
              clientIdMap.set(clientData.name, newClient.id);
            }
          }

          for (const businessData of input.businesses) {
            const [newBusiness] = await tx
              .insert(businesses)
              .values({
                ...businessData,
                createdById: userId,
              })
              .returning({ id: businesses.id });

            if (newBusiness) {
              businessIdMap.set(businessData.name, newBusiness.id);
              if (businessData.nickname) {
                businessIdMap.set(businessData.nickname, newBusiness.id);
              }
            }
          }

          for (const templateData of input.invoiceTemplates) {
            await tx.insert(invoiceTemplates).values({
              ...templateData,
              createdById: userId,
            });
          }

          for (const invoiceData of input.invoices) {
            const clientId = clientIdMap.get(invoiceData.clientName);
            if (!clientId) {
              backupImportError(
                `Client "${invoiceData.clientName}" not found for invoice ${invoiceData.invoiceNumber}`,
              );
            }

            const businessId = resolveBusinessId(invoiceData, businessIdMap);

            const [newInvoice] = await tx
              .insert(invoices)
              .values({
                invoiceNumber: invoiceData.invoiceNumber,
                invoicePrefix: invoiceData.invoicePrefix,
                businessId,
                clientId,
                issueDate: invoiceData.issueDate,
                dueDate: invoiceData.dueDate,
                status: invoiceData.status,
                totalAmount: invoiceData.totalAmount,
                taxRate: invoiceData.taxRate,
                currency: invoiceData.currency,
                notes: invoiceData.notes,
                emailMessage: invoiceData.emailMessage,
                createdById: userId,
              })
              .returning({ id: invoices.id });

            if (newInvoice) {
              invoiceIdMap.set(invoiceData.invoiceNumber, newInvoice.id);

              if (invoiceData.items.length > 0) {
                await tx.insert(invoiceItems).values(
                  invoiceData.items.map((item) => ({
                    ...item,
                    invoiceId: newInvoice.id,
                  })),
                );
              }
            }
          }

          for (const paymentData of input.invoicePayments) {
            const invoiceId = invoiceIdMap.get(paymentData.invoiceNumber);
            if (!invoiceId) {
              backupImportError(
                `Invoice "${paymentData.invoiceNumber}" not found for payment`,
              );
            }

            await tx.insert(invoicePayments).values({
              invoiceId,
              amount: paymentData.amount,
              currency: paymentData.currency,
              date: paymentData.date,
              method: paymentData.method,
              notes: paymentData.notes,
              createdById: userId,
            });
          }

          for (const recurringData of input.recurringInvoices) {
            const clientId = clientIdMap.get(recurringData.clientName);
            if (!clientId) {
              backupImportError(
                `Client "${recurringData.clientName}" not found for recurring invoice "${recurringData.name}"`,
              );
            }

            const businessId = resolveBusinessId(recurringData, businessIdMap);

            const [newRecurring] = await tx
              .insert(recurringInvoices)
              .values({
                name: recurringData.name,
                clientId,
                businessId,
                schedule: recurringData.schedule,
                status: recurringData.status,
                invoicePrefix: recurringData.invoicePrefix,
                taxRate: recurringData.taxRate,
                currency: recurringData.currency,
                notes: recurringData.notes,
                emailMessage: recurringData.emailMessage,
                nextDueAt: recurringData.nextDueAt,
                lastGeneratedAt: recurringData.lastGeneratedAt,
                createdById: userId,
              })
              .returning({ id: recurringInvoices.id });

            if (newRecurring && recurringData.items.length > 0) {
              await tx.insert(recurringInvoiceItems).values(
                recurringData.items.map((item) => ({
                  ...item,
                  recurringInvoiceId: newRecurring.id,
                })),
              );
            }
          }

          for (const expenseData of input.expenses) {
            const clientId = expenseData.clientName
              ? (clientIdMap.get(expenseData.clientName) ?? null)
              : null;
            if (expenseData.clientName && !clientId) {
              backupImportError(
                `Client "${expenseData.clientName}" not found for expense "${expenseData.description}"`,
              );
            }

            const businessId = resolveBusinessId(expenseData, businessIdMap);
            const invoiceId = expenseData.invoiceNumber
              ? (invoiceIdMap.get(expenseData.invoiceNumber) ?? null)
              : null;
            if (expenseData.invoiceNumber && !invoiceId) {
              backupImportError(
                `Invoice "${expenseData.invoiceNumber}" not found for expense "${expenseData.description}"`,
              );
            }

            await tx.insert(expenses).values({
              clientId,
              businessId,
              invoiceId,
              date: expenseData.date,
              description: expenseData.description,
              amount: expenseData.amount,
              currency: expenseData.currency,
              category: expenseData.category,
              billable: expenseData.billable,
              reimbursable: expenseData.reimbursable,
              taxDeductible: expenseData.taxDeductible,
              notes: expenseData.notes,
              createdById: userId,
            });
          }

          const existingRunningEntry = await tx.query.timeEntries.findFirst({
            where: and(
              eq(timeEntries.createdById, userId),
              isNull(timeEntries.endedAt),
            ),
            columns: { id: true },
          });

          for (const entryData of input.timeEntries) {
            const clientId = entryData.clientName
              ? (clientIdMap.get(entryData.clientName) ?? null)
              : null;
            if (entryData.clientName && !clientId) {
              backupImportError(
                `Client "${entryData.clientName}" not found for time entry`,
              );
            }

            const invoiceId = entryData.invoiceNumber
              ? (invoiceIdMap.get(entryData.invoiceNumber) ?? null)
              : null;
            if (entryData.invoiceNumber && !invoiceId) {
              backupImportError(
                `Invoice "${entryData.invoiceNumber}" not found for time entry`,
              );
            }

            const isRunningImport = entryData.endedAt == null;
            const endedAt =
              isRunningImport && existingRunningEntry
                ? entryData.startedAt
                : entryData.endedAt;

            await tx.insert(timeEntries).values({
              description: entryData.description,
              clientId,
              invoiceId,
              startedAt: entryData.startedAt,
              endedAt,
              hours: entryData.hours,
              rate: entryData.rate,
              notes: entryData.notes,
              createdById: userId,
            });
          }

          await tx
            .update(users)
            .set({
              ...(input.user.prefersReducedMotion !== undefined && {
                prefersReducedMotion: input.user.prefersReducedMotion,
              }),
              ...(input.user.animationSpeedMultiplier !== undefined && {
                animationSpeedMultiplier: input.user.animationSpeedMultiplier,
              }),
              ...(input.user.theme !== undefined && { theme: input.user.theme }),
              ...(input.user.onboardingCompletedAt !== undefined && {
                onboardingCompletedAt: input.user.onboardingCompletedAt,
              }),
            })
            .where(eq(users.id, userId));

          return {
            success: true,
            imported: {
              clients: input.clients.length,
              businesses: input.businesses.length,
              invoiceTemplates: input.invoiceTemplates.length,
              invoices: input.invoices.length,
              invoiceItems: input.invoices.reduce(
                (sum, inv) => sum + inv.items.length,
                0,
              ),
              invoicePayments: input.invoicePayments.length,
              recurringInvoices: input.recurringInvoices.length,
              recurringInvoiceItems: input.recurringInvoices.reduce(
                (sum, inv) => sum + inv.items.length,
                0,
              ),
              expenses: input.expenses.length,
              timeEntries: input.timeEntries.length,
            },
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Import failed unexpectedly",
        });
      }
    }),

  // Get data statistics
  getDataStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [clientCount, businessCount, invoiceCount] = await Promise.all([
      ctx.db
        .select({ count: clients.id })
        .from(clients)
        .where(eq(clients.createdById, userId))
        .then((result) => result.length),
      ctx.db
        .select({ count: businesses.id })
        .from(businesses)
        .where(eq(businesses.createdById, userId))
        .then((result) => result.length),
      ctx.db
        .select({ count: invoices.id })
        .from(invoices)
        .where(eq(invoices.createdById, userId))
        .then((result) => result.length),
    ]);

    return {
      clients: clientCount,
      businesses: businessCount,
      invoices: invoiceCount,
    };
  }),

  // Delete all user data (for account deletion)
  deleteAllData: sessionProcedure
    .input(
      z.object({
        confirmText: z.string().refine((val) => val === "DELETE ALL DATA", {
          message: "You must type 'DELETE ALL DATA' to confirm",
        }),
      }),
    )
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      return await ctx.db.transaction(async (tx) => {
        // Delete in order due to foreign key constraints
        // 1. Invoice items (cascade should handle this, but being explicit)
        const userInvoiceIds = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.createdById, userId));

        if (userInvoiceIds.length > 0) {
          for (const invoice of userInvoiceIds) {
            await tx
              .delete(invoiceItems)
              .where(eq(invoiceItems.invoiceId, invoice.id));
          }
        }

        // 2. Invoices
        await tx.delete(invoices).where(eq(invoices.createdById, userId));

        // 3. Clients
        await tx.delete(clients).where(eq(clients.createdById, userId));

        // 4. Businesses
        await tx.delete(businesses).where(eq(businesses.createdById, userId));

        return { success: true };
      });
    }),
});
