import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { invoices, clients } from "~/server/db/schema";
import { and, desc, eq, isNotNull, lte } from "drizzle-orm";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Fetch all invoices for the user to calculate stats
    // Note: For very large datasets, we should use separate count/sum queries,
    // but for typical usage, fetching fields is fine and allows flexible JS calculation
    // where SQL complexity might be high (e.g. dynamic status).
    // However, let's try to be efficient with SQL where possible.

    const userInvoices = await ctx.db.query.invoices.findMany({
      where: eq(invoices.createdById, userId),
      columns: {
        id: true,
        totalAmount: true,
        status: true,
        dueDate: true,
        issueDate: true,
      },
    });

    const userClientsCount = await ctx.db.$count(
      clients,
      eq(clients.createdById, userId),
    );

    // Helper to check status
    const getStatus = (inv: (typeof userInvoices)[0]) => {
      if (inv.status === "paid") return "paid";
      if (inv.status === "draft") return "draft";
      if (new Date(inv.dueDate) < now && inv.status !== "paid")
        return "overdue";
      return "sent";
    };

    // Calculate Stats
    let totalRevenue = 0;
    let pendingAmount = 0;
    let overdueCount = 0;

    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    for (const inv of userInvoices) {
      const status = getStatus(inv);
      const amount = inv.totalAmount;
      const issueDate = new Date(inv.issueDate);

      if (status === "paid") {
        totalRevenue += amount;

        if (issueDate >= currentMonthStart) {
          currentMonthRevenue += amount;
        } else if (
          issueDate >= lastMonthStart &&
          issueDate < currentMonthStart
        ) {
          lastMonthRevenue += amount;
        }
      } else if (status === "sent" || status === "overdue") {
        pendingAmount += amount;
      }

      if (status === "overdue") {
        overdueCount++;
      }
    }

    // Revenue Trend (Last 6 months)
    const revenueByMonth: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[key] = 0;
    }

    for (const inv of userInvoices) {
      if (getStatus(inv) === "paid") {
        const d = new Date(inv.issueDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (revenueByMonth[key] !== undefined) {
          revenueByMonth[key] += inv.totalAmount;
        }
      }
    }

    const revenueChartData = Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({
        month,
        revenue,
        monthLabel: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Recent Activity
    const recentInvoices = await ctx.db.query.invoices.findMany({
      where: eq(invoices.createdById, userId),
      orderBy: [
        desc(invoices.issueDate),
        desc(invoices.dueDate),
        desc(invoices.invoiceNumber),
      ],
      limit: 5,
      with: {
        client: {
          columns: { name: true },
        },
      },
    });

    const sendReminderDue = await ctx.db.query.invoices.findMany({
      where: and(
        eq(invoices.createdById, userId),
        eq(invoices.status, "draft"),
        isNotNull(invoices.sendReminderAt),
        lte(invoices.sendReminderAt, now),
      ),
      columns: {
        id: true,
        invoiceNumber: true,
        invoicePrefix: true,
        sendReminderAt: true,
      },
      with: {
        client: { columns: { name: true } },
      },
      orderBy: [desc(invoices.sendReminderAt)],
      limit: 10,
    });

    return {
      totalRevenue,
      pendingAmount,
      overdueCount,
      totalClients: userClientsCount,
      revenueChange:
        lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0,
      revenueChartData,
      recentInvoices,
      sendReminderDue,
    };
  }),
});
