import { and, desc, eq, gte, lt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getEffectiveInvoiceStatus } from "~/lib/invoice-status";
import { clients, invoices } from "~/server/db/schema";
import type { StoredInvoiceStatus } from "~/types/invoice";

type LiteInvoice = {
  id: string;
  totalAmount: number;
  status: string;
  dueDate: Date;
  issueDate: Date;
};

function buildRevenueMonthKeys(now: Date, count: number) {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

function aggregateDashboardMetrics(userInvoices: LiteInvoice[], now: Date) {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let totalRevenue = 0;
  let pendingAmount = 0;
  let overdueCount = 0;
  let currentMonthRevenue = 0;
  let lastMonthRevenue = 0;

  const revenueByMonth = Object.fromEntries(
    buildRevenueMonthKeys(now, 6).map((key) => [key, 0]),
  ) as Record<string, number>;

  const statusTotals: Record<
    string,
    { status: string; count: number; value: number }
  > = {};

  const monthlyTotals: Record<
    string,
    {
      month: string;
      totalInvoices: number;
      paidInvoices: number;
      pendingInvoices: number;
      overdueInvoices: number;
      draftInvoices: number;
    }
  > = {};

  for (const inv of userInvoices) {
    const effectiveStatus = getEffectiveInvoiceStatus(
      inv.status as StoredInvoiceStatus,
      inv.dueDate,
    );
    const amount = inv.totalAmount;
    const issueDate = new Date(inv.issueDate);

    if (effectiveStatus === "paid") {
      totalRevenue += amount;

      if (issueDate >= currentMonthStart) {
        currentMonthRevenue += amount;
      } else if (
        issueDate >= lastMonthStart &&
        issueDate < currentMonthStart
      ) {
        lastMonthRevenue += amount;
      }

      const revenueKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, "0")}`;
      const monthRevenue = revenueByMonth[revenueKey];
      if (monthRevenue !== undefined) {
        revenueByMonth[revenueKey] = monthRevenue + amount;
      }
    } else if (effectiveStatus === "sent" || effectiveStatus === "overdue") {
      pendingAmount += amount;
    }

    if (effectiveStatus === "overdue") {
      overdueCount++;
    }

    statusTotals[effectiveStatus] ??= {
      status: effectiveStatus,
      count: 0,
      value: 0,
    };
    statusTotals[effectiveStatus].count += 1;
    statusTotals[effectiveStatus].value += amount;

    const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotals[monthKey] ??= {
      month: monthKey,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      draftInvoices: 0,
    };
    monthlyTotals[monthKey].totalInvoices += 1;

    switch (effectiveStatus) {
      case "paid":
        monthlyTotals[monthKey].paidInvoices += 1;
        break;
      case "sent":
        monthlyTotals[monthKey].pendingInvoices += 1;
        break;
      case "overdue":
        monthlyTotals[monthKey].overdueInvoices += 1;
        break;
      case "draft":
        monthlyTotals[monthKey].draftInvoices += 1;
        break;
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

  const statusChartData = Object.values(statusTotals).map((item) => ({
    ...item,
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
  }));

  const monthlyMetricsChartData = Object.values(monthlyTotals)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((item) => ({
      ...item,
      monthLabel: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    }));

  return {
    totalRevenue,
    pendingAmount,
    overdueCount,
    revenueChange:
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0,
    revenueChartData,
    statusChartData,
    monthlyMetricsChartData,
  };
}

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();

    const [
      userInvoices,
      userClientsCount,
      recentInvoices,
      monthInvoices,
      currentDraft,
    ] = await Promise.all([
      ctx.db.query.invoices.findMany({
        where: eq(invoices.createdById, userId),
        columns: {
          id: true,
          totalAmount: true,
          status: true,
          dueDate: true,
          issueDate: true,
        },
      }),
      ctx.db.$count(clients, eq(clients.createdById, userId)),
      ctx.db.query.invoices.findMany({
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
      }),
      ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.createdById, userId),
          gte(invoices.issueDate, new Date(now.getFullYear(), now.getMonth(), 1)),
          lt(invoices.issueDate, new Date(now.getFullYear(), now.getMonth() + 1, 1)),
        ),
        orderBy: [
          desc(invoices.issueDate),
          desc(invoices.dueDate),
          desc(invoices.invoiceNumber),
        ],
        columns: {
          id: true,
          invoicePrefix: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          dueDate: true,
          issueDate: true,
          currency: true,
        },
        with: {
          client: {
            columns: { name: true },
          },
        },
      }),
      ctx.db.query.invoices.findFirst({
        where: and(
          eq(invoices.createdById, userId),
          eq(invoices.status, "draft"),
        ),
        orderBy: [
          desc(invoices.issueDate),
          desc(invoices.dueDate),
          desc(invoices.invoiceNumber),
        ],
        columns: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
        },
        with: {
          client: { columns: { name: true } },
          items: { columns: { hours: true } },
        },
      }),
    ]);

    const metrics = aggregateDashboardMetrics(userInvoices, now);

    return {
      ...metrics,
      totalClients: userClientsCount,
      recentInvoices,
      monthInvoices,
      currentDraft: currentDraft
        ? {
            id: currentDraft.id,
            invoiceNumber: currentDraft.invoiceNumber,
            totalAmount: currentDraft.totalAmount,
            client: currentDraft.client,
            totalHours: currentDraft.items.reduce(
              (sum, item) => sum + item.hours,
              0,
            ),
          }
        : null,
    };
  }),
});
