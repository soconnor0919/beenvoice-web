import { z } from "zod";
import { and, count, desc, eq, gte, ilike, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "~/lib/audit-log";
import { sendPasswordResetForUser } from "~/lib/password-reset";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdmin } from "~/server/api/require-admin";
import {
  auditLog,
  businesses,
  clients,
  invoices,
  sessions,
  timeEntries,
  users,
} from "~/server/db/schema";

const ACTIVE_USER_DAYS = 30;

async function assertNotLastAdmin(
  db: Parameters<typeof requireAdmin>[0]["db"],
  userId: string,
  newRole: "user" | "admin",
) {
  if (newRole === "admin") return;

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  if (target?.role !== "admin") return;

  const [adminCount] = await db
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

export const adminRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    const activeSince = new Date();
    activeSince.setDate(activeSince.getDate() - ACTIVE_USER_DAYS);

    const [
      [totalUsersRow],
      [activeUsersRow],
      [totalInvoicesRow],
      [totalBusinessesRow],
      [totalClientsRow],
      [totalTimeEntriesRow],
      [adminCountRow],
    ] = await Promise.all([
      ctx.db.select({ count: count() }).from(users),
      ctx.db
        .select({ count: sql<number>`count(distinct ${sessions.userId})::int` })
        .from(sessions)
        .where(gte(sessions.updatedAt, activeSince)),
      ctx.db.select({ count: count() }).from(invoices),
      ctx.db.select({ count: count() }).from(businesses),
      ctx.db.select({ count: count() }).from(clients),
      ctx.db.select({ count: count() }).from(timeEntries),
      ctx.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin")),
    ]);

    return {
      totalUsers: totalUsersRow?.count ?? 0,
      activeUsers: activeUsersRow?.count ?? 0,
      totalInvoices: totalInvoicesRow?.count ?? 0,
      totalBusinesses: totalBusinessesRow?.count ?? 0,
      totalClients: totalClientsRow?.count ?? 0,
      totalTimeEntries: totalTimeEntriesRow?.count ?? 0,
      adminCount: adminCountRow?.count ?? 0,
      activeUserWindowDays: ACTIVE_USER_DAYS,
    };
  }),

  listUsers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const search = input.search?.trim();
      const whereClause = search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          )
        : undefined;

      const [items, [totalRow]] = await Promise.all([
        ctx.db.query.users.findMany({
          where: whereClause,
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: (usersTable, { asc }) => [asc(usersTable.createdAt)],
          offset: input.offset,
          limit: input.limit,
        }),
        ctx.db
          .select({ count: count() })
          .from(users)
          .where(whereClause),
      ]);

      return {
        items,
        total: totalRow?.count ?? 0,
        offset: input.offset,
        limit: input.limit,
      };
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        role: z.enum(["user", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: { id: true, name: true, email: true, role: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const normalizedEmail = input.email.toLowerCase();
      if (normalizedEmail !== existing.email) {
        const emailTaken = await ctx.db.query.users.findFirst({
          where: and(
            eq(users.email, normalizedEmail),
            ne(users.id, input.userId),
          ),
          columns: { id: true },
        });

        if (emailTaken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email is already in use",
          });
        }
      }

      await assertNotLastAdmin(ctx.db, input.userId, input.role);

      const changedFields: string[] = [];
      if (existing.name !== input.name) changedFields.push("name");
      if (existing.email !== normalizedEmail) changedFields.push("email");
      if (existing.role !== input.role) changedFields.push("role");

      if (changedFields.length === 0) {
        return { success: true };
      }

      await ctx.db
        .update(users)
        .set({
          name: input.name,
          email: normalizedEmail,
          role: input.role,
        })
        .where(eq(users.id, input.userId));

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action:
          changedFields.includes("role") && changedFields.length === 1
            ? "user.role_updated"
            : "user.profile_updated",
        targetType: "user",
        targetId: input.userId,
        metadata: {
          changedFields,
          ...(changedFields.includes("role") && {
            previousRole: existing.role,
            newRole: input.role,
          }),
        },
      });

      return { success: true };
    }),

  sendPasswordReset: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: { id: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const result = await sendPasswordResetForUser(input.userId);

      await logAuditEvent({
        actorUserId: ctx.session.user.id,
        action: "user.password_reset_sent",
        targetType: "user",
        targetId: input.userId,
        metadata: { emailSent: result.emailSent },
      });

      return {
        success: result.success,
        emailSent: result.emailSent,
      };
    }),

  listAuditLog: protectedProcedure
    .input(
      z.object({
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const [entries, [totalRow]] = await Promise.all([
        ctx.db.query.auditLog.findMany({
          orderBy: [desc(auditLog.createdAt)],
          offset: input.offset,
          limit: input.limit,
          with: {
            actor: {
              columns: { id: true, name: true },
            },
          },
        }),
        ctx.db.select({ count: count() }).from(auditLog),
      ]);

      return {
        items: entries.map((entry) => ({
          id: entry.id,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metadata: entry.metadata,
          createdAt: entry.createdAt,
          actor: entry.actor,
        })),
        total: totalRow?.count ?? 0,
        offset: input.offset,
        limit: input.limit,
      };
    }),
});
