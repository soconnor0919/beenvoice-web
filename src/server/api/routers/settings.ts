import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  accounts,
  users,
  clients,
  businesses,
  invoices,
  invoiceItems,
  platformSettings,
} from "~/server/db/schema";
import {
  colorModeSchema,
  colorThemeSchema,
  defaultBodyFontPreference,
  defaultHeadingFontPreference,
  defaultInterfaceTheme,
  defaultRadiusPreference,
  defaultSidebarStyle,
  fallbackAppearance,
  fontPreferenceSchema,
  hslChannelsSchema,
  interfaceThemeSchema,
  pdfTemplateSchema,
  radiusPreferenceSchema,
  sidebarStyleSchema,
  type ColorMode,
  type ColorTheme,
  type FontPreference,
  type InterfaceTheme,
  type RadiusPreference,
  type SidebarStyle,
} from "~/lib/branding";
import type { db as database } from "~/server/db";

async function requireAdmin(ctx: {
  db: typeof database;
  session: { user: { id: string } };
}) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.session.user.id),
    columns: { role: true },
  });

  if (user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
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
});

const InvoiceItemBackupSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  description: z.string(),
  hours: z.number(),
  rate: z.number(),
  amount: z.number(),
  position: z.number().default(0),
});

const InvoiceBackupSchema = z.object({
  invoiceNumber: z.string(),
  businessName: z.string().optional(),
  businessNickname: z.string().optional(),
  clientName: z.string(),
  issueDate: z.string().transform((str) => new Date(str)),
  dueDate: z.string().transform((str) => new Date(str)),
  status: z.string().default("draft"),
  totalAmount: z.number().default(0),
  taxRate: z.number().default(0),
  notes: z.string().optional(),
  emailMessage: z.string().optional(),
  items: z.array(InvoiceItemBackupSchema),
});

const BackupDataSchema = z.object({
  exportDate: z.string(),
  version: z.string().default("1.0"),
  user: z.object({
    name: z.string().optional(),
    email: z.string(),
  }),
  clients: z.array(ClientBackupSchema),
  businesses: z.array(BusinessBackupSchema),
  invoices: z.array(InvoiceBackupSchema),
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
      await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));
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
      },
    });

    return user;
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

  // Get theme preferences
  getTheme: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.platformSettings.findFirst({
      where: eq(platformSettings.id, "global"),
    });

    return {
      colorTheme:
        (settings?.colorTheme as ColorTheme) ?? fallbackAppearance.colorTheme,
      customColor: settings?.customColor ?? undefined,
      theme: (settings?.theme as ColorMode) ?? fallbackAppearance.colorMode,
      interfaceTheme:
        (settings?.interfaceTheme as InterfaceTheme) ?? defaultInterfaceTheme,
      bodyFontPreference:
        (settings?.bodyFontPreference as FontPreference) ??
        defaultBodyFontPreference,
      headingFontPreference:
        (settings?.headingFontPreference as FontPreference) ??
        defaultHeadingFontPreference,
      radiusPreference:
        (settings?.radiusPreference as RadiusPreference) ??
        defaultRadiusPreference,
      sidebarStyle:
        (settings?.sidebarStyle as SidebarStyle) ?? defaultSidebarStyle,
      brandName: settings?.brandName ?? fallbackAppearance.brandName,
      brandTagline: settings?.brandTagline ?? fallbackAppearance.brandTagline,
      brandLogoText:
        settings?.brandLogoText ?? fallbackAppearance.brandLogoText,
      brandIcon: settings?.brandIcon ?? fallbackAppearance.brandIcon,
      pdfTemplate:
        (settings?.pdfTemplate as "classic" | "minimal") ??
        fallbackAppearance.pdfTemplate,
      pdfAccentColor:
        settings?.pdfAccentColor ?? fallbackAppearance.pdfAccentColor,
      pdfFooterText:
        settings?.pdfFooterText ?? fallbackAppearance.pdfFooterText,
      pdfShowLogo: settings?.pdfShowLogo ?? fallbackAppearance.pdfShowLogo,
      pdfShowPageNumbers:
        settings?.pdfShowPageNumbers ?? fallbackAppearance.pdfShowPageNumbers,
    };
  }),

  // Update theme preferences
  updateTheme: protectedProcedure
    .input(
      z.object({
        colorTheme: colorThemeSchema.optional(),
        customColor: hslChannelsSchema.optional(),
        theme: colorModeSchema.optional(),
        interfaceTheme: interfaceThemeSchema.optional(),
        bodyFontPreference: fontPreferenceSchema.optional(),
        headingFontPreference: fontPreferenceSchema.optional(),
        radiusPreference: radiusPreferenceSchema.optional(),
        sidebarStyle: sidebarStyleSchema.optional(),
        brandName: z.string().min(1).max(100).optional(),
        brandTagline: z.string().min(1).max(255).optional(),
        brandLogoText: z.string().min(1).max(100).optional(),
        brandIcon: z.string().min(1).max(20).optional(),
        pdfTemplate: pdfTemplateSchema.optional(),
        pdfAccentColor: z.string().min(4).max(50).optional(),
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
          brandName: input.brandName ?? fallbackAppearance.brandName,
          brandTagline: input.brandTagline ?? fallbackAppearance.brandTagline,
          brandLogoText:
            input.brandLogoText ?? fallbackAppearance.brandLogoText,
          brandIcon: input.brandIcon ?? fallbackAppearance.brandIcon,
          colorTheme: input.colorTheme ?? fallbackAppearance.colorTheme,
          customColor: input.customColor,
          theme: input.theme ?? fallbackAppearance.colorMode,
          interfaceTheme: input.interfaceTheme ?? defaultInterfaceTheme,
          bodyFontPreference:
            input.bodyFontPreference ?? defaultBodyFontPreference,
          headingFontPreference:
            input.headingFontPreference ?? defaultHeadingFontPreference,
          radiusPreference: input.radiusPreference ?? defaultRadiusPreference,
          sidebarStyle: input.sidebarStyle ?? defaultSidebarStyle,
          pdfTemplate: input.pdfTemplate ?? fallbackAppearance.pdfTemplate,
          pdfAccentColor:
            input.pdfAccentColor ?? fallbackAppearance.pdfAccentColor,
          pdfFooterText:
            input.pdfFooterText ?? fallbackAppearance.pdfFooterText,
          pdfShowLogo: input.pdfShowLogo ?? fallbackAppearance.pdfShowLogo,
          pdfShowPageNumbers:
            input.pdfShowPageNumbers ?? fallbackAppearance.pdfShowPageNumbers,
        })
        .onConflictDoUpdate({
          target: platformSettings.id,
          set: {
            ...(input.brandName && { brandName: input.brandName }),
            ...(input.brandTagline && { brandTagline: input.brandTagline }),
            ...(input.brandLogoText && {
              brandLogoText: input.brandLogoText,
            }),
            ...(input.brandIcon && { brandIcon: input.brandIcon }),
            ...(input.colorTheme && { colorTheme: input.colorTheme }),
            ...(input.customColor !== undefined && {
              customColor: input.customColor,
            }),
            ...(input.theme && { theme: input.theme }),
            ...(input.interfaceTheme && {
              interfaceTheme: input.interfaceTheme,
            }),
            ...(input.bodyFontPreference && {
              bodyFontPreference: input.bodyFontPreference,
            }),
            ...(input.headingFontPreference && {
              headingFontPreference: input.headingFontPreference,
            }),
            ...(input.radiusPreference && {
              radiusPreference: input.radiusPreference,
            }),
            ...(input.sidebarStyle && { sidebarStyle: input.sidebarStyle }),
            ...(input.pdfTemplate && { pdfTemplate: input.pdfTemplate }),
            ...(input.pdfAccentColor && {
              pdfAccentColor: input.pdfAccentColor,
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

      return { success: true };
    }),

  // Update user profile
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
  changePassword: protectedProcedure
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

      return { success: true };
    }),

  // Export user data (backup)
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user info
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        name: true,
        email: true,
      },
    });

    // Get all clients
    const userClients = await ctx.db.query.clients.findMany({
      where: eq(clients.createdById, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
      },
    });

    // Get all businesses
    const userBusinesses = await ctx.db.query.businesses.findMany({
      where: eq(businesses.createdById, userId),
      columns: {
        id: true,
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
      },
    });

    // Get all invoices with their items
    const userInvoices = await ctx.db.query.invoices.findMany({
      where: eq(invoices.createdById, userId),
      with: {
        client: {
          columns: {
            name: true,
          },
        },
        business: {
          columns: {
            name: true,
            nickname: true,
          },
        },
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

    // Format the data for export
    const backupData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      user: {
        name: user?.name ?? "",
        email: user?.email ?? "",
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
      })),
      invoices: userInvoices.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        businessName: invoice.business?.name,
        businessNickname: invoice.business?.nickname,
        clientName: invoice.client.name,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        taxRate: invoice.taxRate,
        notes: invoice.notes ?? undefined,
        emailMessage: invoice.emailMessage ?? undefined,
        items: invoice.items,
      })),
    };

    return backupData;
  }),

  // Import user data (restore)
  importData: protectedProcedure
    .input(BackupDataSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return await ctx.db.transaction(async (tx) => {
        // Create a map to track old to new client IDs
        const clientIdMap = new Map<string, string>();
        const businessIdMap = new Map<string, string>();

        // Import clients
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

        // Import businesses
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

        // Import invoices
        for (const invoiceData of input.invoices) {
          const clientId = clientIdMap.get(invoiceData.clientName);
          if (!clientId) {
            throw new Error(`Client ${invoiceData.clientName} not found`);
          }

          const businessId = invoiceData.businessNickname
            ? (businessIdMap.get(invoiceData.businessNickname) ??
              (invoiceData.businessName
                ? (businessIdMap.get(invoiceData.businessName) ?? null)
                : null))
            : invoiceData.businessName
              ? (businessIdMap.get(invoiceData.businessName) ?? null)
              : null;

          const [newInvoice] = await tx
            .insert(invoices)
            .values({
              invoiceNumber: invoiceData.invoiceNumber,
              businessId,
              clientId,
              issueDate: invoiceData.issueDate,
              dueDate: invoiceData.dueDate,
              status: invoiceData.status,
              totalAmount: invoiceData.totalAmount,
              taxRate: invoiceData.taxRate,
              notes: invoiceData.notes,
              emailMessage: invoiceData.emailMessage,
              createdById: userId,
            })
            .returning({ id: invoices.id });

          if (newInvoice && invoiceData.items.length > 0) {
            // Import invoice items
            await tx.insert(invoiceItems).values(
              invoiceData.items.map((item) => ({
                ...item,
                invoiceId: newInvoice.id,
              })),
            );
          }
        }

        return {
          success: true,
          imported: {
            clients: input.clients.length,
            businesses: input.businesses.length,
            invoices: input.invoices.length,
            items: input.invoices.reduce(
              (sum, inv) => sum + inv.items.length,
              0,
            ),
          },
        };
      });
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
  deleteAllData: protectedProcedure
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
