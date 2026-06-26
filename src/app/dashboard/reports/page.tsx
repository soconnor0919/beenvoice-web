"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage, dashboardStatGridClass } from "~/components/layout/dashboard-page";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/data/status-badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { formatCurrency } from "~/lib/currency";
import { getEffectiveInvoiceStatus } from "~/lib/invoice-status";
import type { StoredInvoiceStatus } from "~/types/invoice";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Download,
  Receipt,
  FileText,
} from "lucide-react";

function toNumericChartValue(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function ReportsPage() {
  const { data: invoices = [], isLoading: invoicesLoading } =
    api.invoices.getAll.useQuery();
  const { data: expenses = [], isLoading: expensesLoading } =
    api.expenses.getAll.useQuery();
  const { data: stats } = api.dashboard.getStats.useQuery();

  const isLoading = invoicesLoading || expensesLoading;

  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(String(currentYear));

  // Overview data (last 12 months)
  const overviewData = useMemo(() => {
    if (!invoices.length) return null;

    const now = new Date();
    const monthMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = 0;
    }

    let totalRevenue = 0;
    let totalPending = 0;
    let totalHours = 0;

    for (const inv of invoices) {
      const status = getEffectiveInvoiceStatus(
        inv.status as StoredInvoiceStatus,
        inv.dueDate,
      );
      if (status === "paid") {
        totalRevenue += inv.totalAmount;
        const key = `${new Date(inv.issueDate).getFullYear()}-${String(new Date(inv.issueDate).getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key] !== undefined) monthMap[key] += inv.totalAmount;
      } else if (status === "sent" || status === "overdue") {
        totalPending += inv.totalAmount;
      }
      totalHours += (inv.items ?? []).reduce((s, item) => s + item.hours, 0);
    }

    const revenueByMonth = Object.entries(monthMap).map(([month, revenue]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      revenue,
    }));

    const clientMap: Record<string, { name: string; revenue: number }> = {};
    for (const inv of invoices) {
      const status = getEffectiveInvoiceStatus(
        inv.status as StoredInvoiceStatus,
        inv.dueDate,
      );
      if (status === "paid" && inv.client) {
        const id = inv.client.id;
        const entry = (clientMap[id] ??= {
          name: inv.client.name,
          revenue: 0,
        });
        entry.revenue += inv.totalAmount;
      }
    }
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const statusCount: Record<string, number> = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    };
    for (const inv of invoices) {
      const s = getEffectiveInvoiceStatus(
        inv.status as StoredInvoiceStatus,
        inv.dueDate,
      );
      statusCount[s] = (statusCount[s] ?? 0) + 1;
    }

    return {
      revenueByMonth,
      topClients,
      totalRevenue,
      totalPending,
      totalHours,
      statusCount,
    };
  }, [invoices]);

  // Tax summary for selected year
  const taxData = useMemo(() => {
    const year = parseInt(taxYear);

    const yearInvoices = invoices.filter((inv) => {
      const status = getEffectiveInvoiceStatus(
        inv.status as StoredInvoiceStatus,
        inv.dueDate,
      );
      return (
        status === "paid" && new Date(inv.issueDate).getFullYear() === year
      );
    });
    const yearExpenses = expenses.filter(
      (exp) => new Date(exp.date).getFullYear() === year,
    );

    const getSubtotal = (inv: (typeof yearInvoices)[number]) => {
      const itemSubtotal = (inv.items ?? []).reduce(
        (s, item) => s + item.amount,
        0,
      );
      if (itemSubtotal > 0) return itemSubtotal;

      const taxMultiplier = 1 + (inv.taxRate ?? 0) / 100;
      return taxMultiplier > 0
        ? inv.totalAmount / taxMultiplier
        : inv.totalAmount;
    };

    const grossIncome = yearInvoices.reduce(
      (s, inv) => s + getSubtotal(inv),
      0,
    );
    const taxCollected = yearInvoices.reduce(
      (s, inv) => s + (inv.totalAmount - getSubtotal(inv)),
      0,
    );
    const totalExpenses = yearExpenses.reduce((s, exp) => s + exp.amount, 0);
    const deductibleExpenses = yearExpenses
      .filter(
        (exp) =>
          (exp as typeof exp & { taxDeductible?: boolean }).taxDeductible,
      )
      .reduce((s, exp) => s + exp.amount, 0);

    const netProfit = grossIncome - deductibleExpenses;
    const seTaxBase = Math.max(0, netProfit) * 0.9235;
    const selfEmploymentTax = seTaxBase * 0.153;
    const taxableIncome = Math.max(0, netProfit - selfEmploymentTax / 2);
    const federalEstimate = taxableIncome * 0.22;
    const totalEstimated = selfEmploymentTax + federalEstimate;

    const quarters = [1, 2, 3, 4].map((q) => {
      const qMonths = [(q - 1) * 3, (q - 1) * 3 + 1, (q - 1) * 3 + 2];
      return {
        label: `Q${q}`,
        income: yearInvoices
          .filter((inv) => qMonths.includes(new Date(inv.issueDate).getMonth()))
          .reduce((s, inv) => s + getSubtotal(inv), 0),
        expenses: yearExpenses
          .filter((exp) => qMonths.includes(new Date(exp.date).getMonth()))
          .reduce((s, exp) => s + exp.amount, 0),
      };
    });

    return {
      grossIncome,
      taxCollected,
      totalInvoiced: grossIncome + taxCollected,
      totalExpenses,
      deductibleExpenses,
      netProfit,
      selfEmploymentTax,
      federalEstimate,
      totalEstimated,
      quarters,
      yearInvoices,
      yearExpenses,
    };
  }, [invoices, expenses, taxYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear - 1]);
    for (const inv of invoices)
      years.add(new Date(inv.issueDate).getFullYear());
    for (const exp of expenses) years.add(new Date(exp.date).getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, expenses, currentYear]);

  const avgInvoice =
    invoices.length > 0
      ? (overviewData?.totalRevenue ?? 0) /
        (invoices.filter(
          (i) =>
            getEffectiveInvoiceStatus(
              i.status as StoredInvoiceStatus,
              i.dueDate,
            ) === "paid",
        ).length || 1)
      : 0;

  function exportCSV() {
    const rows: string[] = [
      `Tax Year ${taxYear} - Income & Expense Report`,
      `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      "INCOME (Paid Invoices)",
      "Date,Invoice #,Client,Subtotal,Tax Rate,Tax Amount,Total",
      ...taxData.yearInvoices.map((inv) => {
        const subtotal = (inv.items ?? []).reduce(
          (s, item) => s + item.amount,
          0,
        );
        const fallbackSubtotal =
          inv.totalAmount / (1 + (inv.taxRate ?? 0) / 100);
        const invoiceSubtotal = subtotal > 0 ? subtotal : fallbackSubtotal;
        const taxAmt = inv.totalAmount - invoiceSubtotal;
        return [
          new Date(inv.issueDate).toLocaleDateString("en-US"),
          inv.invoiceNumber,
          `"${inv.client?.name ?? ""}"`,
          invoiceSubtotal.toFixed(2),
          `${(inv.taxRate ?? 0).toFixed(1)}%`,
          taxAmt.toFixed(2),
          inv.totalAmount.toFixed(2),
        ].join(",");
      }),
      `,,Totals,${taxData.grossIncome.toFixed(2)},,${taxData.taxCollected.toFixed(2)},${taxData.totalInvoiced.toFixed(2)}`,
      "",
      "EXPENSES",
      "Date,Description,Category,Amount,Currency,Billable,Reimbursable,Tax Deductible",
      ...taxData.yearExpenses.map((exp) =>
        [
          new Date(exp.date).toLocaleDateString("en-US"),
          `"${exp.description}"`,
          `"${exp.category ?? ""}"`,
          exp.amount.toFixed(2),
          exp.currency,
          exp.billable ? "Yes" : "No",
          exp.reimbursable ? "Yes" : "No",
          (exp as typeof exp & { taxDeductible?: boolean }).taxDeductible
            ? "Yes"
            : "No",
        ].join(","),
      ),
      `,,Totals,${taxData.totalExpenses.toFixed(2)},,,,"Deductible: ${taxData.deductibleExpenses.toFixed(2)}"`,
      "",
      "TAX SUMMARY",
      `Gross Income,${taxData.grossIncome.toFixed(2)}`,
      `Tax Collected,${taxData.taxCollected.toFixed(2)}`,
      `Deductible Expenses,${taxData.deductibleExpenses.toFixed(2)}`,
      `Net Profit,${taxData.netProfit.toFixed(2)}`,
      `Est. Self-Employment Tax (15.3%),${taxData.selfEmploymentTax.toFixed(2)}`,
      `Est. Federal Income Tax (22%),${taxData.federalEstimate.toFixed(2)}`,
      `Total Estimated Tax,${taxData.totalEstimated.toFixed(2)}`,
    ];
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title="Reports"
          description="Revenue and tax analytics"
        />
        <div className={dashboardStatGridClass}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Reports"
        description="Revenue and tax analytics"
      />

      <PageTabs defaultValue="overview">
        <PageTabsList>
          <PageTabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Overview
          </PageTabsTrigger>
          <PageTabsTrigger value="tax" className="gap-1.5">
            <FileText className="h-4 w-4" /> Tax Summary
          </PageTabsTrigger>
        </PageTabsList>

        {/* ── OVERVIEW TAB ── */}
        <PageTabsContent value="overview">
          <div className={dashboardStatGridClass}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded p-1.5">
                    <DollarSign className="text-primary h-4 w-4" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Total Revenue
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(overviewData?.totalRevenue ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded bg-yellow-500/10 p-1.5">
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Pending
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(overviewData?.totalPending ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded bg-blue-500/10 p-1.5">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Avg Invoice
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(isNaN(avgInvoice) ? 0 : avgInvoice)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="rounded bg-green-500/10 p-1.5">
                    <Users className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Total Hours
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {(overviewData?.totalHours ?? 0).toFixed(1)}h
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Revenue (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewData?.revenueByMonth ?? []}>
                    <defs>
                      <linearGradient
                        id="revenueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(142, 76%, 36%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(142, 76%, 36%)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(toNumericChartValue(value)),
                        "Revenue",
                      ]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(142, 76%, 36%)"
                      fill="url(#revenueGrad)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Top Clients by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!overviewData?.topClients.length ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No paid invoices yet.
                  </p>
                ) : (
                  <div className="h-48 md:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={overviewData.topClients}
                        layout="vertical"
                      >
                        <XAxis
                          type="number"
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip
                          formatter={(value) => [
                            formatCurrency(toNumericChartValue(value)),
                            "Revenue",
                          ]}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(142, 76%, 36%)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(overviewData?.statusCount ?? {}).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <StatusBadge status={status as never} />
                      <div className="flex items-center gap-3">
                        <div className="bg-muted h-2 w-24 overflow-hidden rounded-full sm:w-32">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{
                              width: `${invoices.length ? (count / invoices.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right text-sm">
                          {count}
                        </span>
                      </div>
                    </div>
                  ),
                )}
                {invoices.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No invoices yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {stats.recentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="font-medium">{inv.client?.name ?? "—"}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(inv.issueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge
                          status={
                            getEffectiveInvoiceStatus(
                              inv.status as StoredInvoiceStatus,
                              inv.dueDate,
                            ) as never
                          }
                        />
                        <p className="font-semibold">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </PageTabsContent>

        {/* ── TAX SUMMARY TAB ── */}
        <PageTabsContent value="tax">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Tax Year</span>
              <Select value={taxYear} onValueChange={setTaxYear}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {/* Income */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> Income
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Gross Income (paid invoices)
                </span>
                <span className="font-medium">
                  {formatCurrency(taxData.grossIncome)}
                </span>
              </div>
              {taxData.taxCollected > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax Collected from Clients
                  </span>
                  <span className="font-medium">
                    {formatCurrency(taxData.taxCollected)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Invoiced (inc. tax)</span>
                <span>{formatCurrency(taxData.totalInvoiced)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Expenses & Deductions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Expenses</span>
                <span className="font-medium">
                  {formatCurrency(taxData.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax-Deductible Expenses
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(taxData.deductibleExpenses)}
                </span>
              </div>
              {taxData.totalExpenses > 0 &&
                taxData.deductibleExpenses === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Mark expenses as &quot;Tax Deductible&quot; in the Expenses
                    page to include them here.
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Estimated tax */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Estimated Tax Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Net Profit (income − deductible expenses)
                </span>
                <span className="font-medium">
                  {formatCurrency(taxData.netProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Self-Employment Tax (15.3% on 92.35% of net)
                </span>
                <span className="font-medium">
                  {formatCurrency(taxData.selfEmploymentTax)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Federal Income Tax (est. 22% bracket)
                </span>
                <span className="font-medium">
                  {formatCurrency(taxData.federalEstimate)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Estimated Tax</span>
                <span className="text-destructive">
                  {formatCurrency(taxData.totalEstimated)}
                </span>
              </div>
              <p className="text-muted-foreground pt-1 text-xs">
                Assumes US self-employment tax rules and the 22% federal
                bracket. Consult a tax professional for accurate filing.
              </p>
            </CardContent>
          </Card>

          {/* Quarterly chart */}
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taxData.quarters}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(toNumericChartValue(value)),
                        name === "income" ? "Income" : "Expenses",
                      ]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="income"
                      name="income"
                      fill="hsl(142, 76%, 36%)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="expenses"
                      fill="hsl(0, 84%, 60%)"
                      radius={[4, 4, 0, 0]}
                      opacity={0.75}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-muted-foreground mt-2 flex justify-center gap-6 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600" />{" "}
                  Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/75" />{" "}
                  Expenses
                </span>
              </div>
            </CardContent>
          </Card>
        </PageTabsContent>
      </PageTabs>
    </DashboardPage>
  );
}
