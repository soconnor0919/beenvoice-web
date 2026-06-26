import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Edit,
  Eye,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getEffectiveInvoiceStatus } from "~/lib/invoice-status";
import { getOptionalServerSessionFromHeaders } from "~/lib/auth-server";
import { HydrateClient, api } from "~/trpc/server";
import type { StoredInvoiceStatus } from "~/types/invoice";
import { RevenueChart, InvoiceStatusChart, MonthlyMetricsChart } from "~/app/dashboard/_components/charts-client";
import { AnimatedStatsCard } from "~/app/dashboard/_components/animated-stats-card";
import type { DashboardStats, RecentInvoice } from "./types";

// Hero section with clean mono design

// Enhanced stats cards with better visuals
function DashboardStats({ stats }: { stats: DashboardStats }) {
  // TODO: Import RouterOutput type
  const formatTrend = (value: number, isCount = false) => {
    if (isCount) {
      return value > 0 ? `+${value}` : value.toString();
    }
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      numericValue: stats.totalRevenue,
      isCurrency: true,
      change: formatTrend(stats.revenueChange),
      trend: stats.revenueChange >= 0 ? ("up" as const) : ("down" as const),
      iconName: "DollarSign" as const,
      description: "Total collected revenue",
    },
    {
      title: "Pending Amount",
      value: `$${stats.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      numericValue: stats.pendingAmount,
      isCurrency: true,
      change: "0%", // TODO: Calculate pending change if needed
      trend: "neutral" as const,
      iconName: "Clock" as const,
      description: "Invoices awaiting payment",
    },
    {
      title: "Active Clients",
      value: stats.totalClients.toString(),
      numericValue: stats.totalClients,
      isCurrency: false,
      change: "0", // TODO: Calculate client change if needed
      trend: "neutral" as const,
      iconName: "Users" as const,
      description: "Total registered clients",
    },
    {
      title: "Overdue Invoices",
      value: stats.overdueCount.toString(),
      numericValue: stats.overdueCount,
      isCurrency: false,
      change: "0", // TODO: Calculate overdue change if needed
      trend: "neutral" as const,
      iconName: "TrendingDown" as const,
      description: "Invoices past due date",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <AnimatedStatsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          numericValue={stat.numericValue}
          isCurrency={stat.isCurrency}
          iconName={stat.iconName}
          change={stat.change}
          trend={stat.trend}
          description={stat.description}
          delay={index * 100}
        />
      ))}
    </div>
  );
}

// Charts section
async function ChartsSection({ stats }: { stats: DashboardStats }) {
  // We still fetch all invoices for the status chart for now, or we could aggregate that too.
  // For now, let's keep status chart as is (fetching all) but use aggregated for revenue.
  // Actually, let's fetch invoices here for the status chart to keep it working.
  const invoices = await api.invoices.getAll();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Revenue Trend Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={stats.revenueChartData} />
        </CardContent>
      </Card>

      {/* Invoice Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Invoice Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceStatusChart invoices={invoices} />
        </CardContent>
      </Card>

      {/* Monthly Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyMetricsChart invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Quick Actions
function QuickActions() {
  const actions = [
    {
      title: "Create Invoice",
      description: "Start a new invoice for a client",
      href: "/dashboard/invoices/new",
      icon: FileText,
      featured: true,
    },
    {
      title: "Add Client",
      description: "Register a new client",
      href: "/dashboard/clients/new",
      icon: Users,
      featured: false,
    },
    {
      title: "View All Invoices",
      description: "Manage your invoice pipeline",
      href: "/dashboard/invoices",
      icon: BarChart3,
      featured: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className={`hover-lift flex w-full items-start space-x-3 rounded-lg border p-4 transition-colors ${
                action.featured
                  ? "border-foreground/20 bg-muted/50 hover:bg-muted"
                  : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{action.title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Current work section with enhanced design
async function CurrentWork() {
  const invoices = await api.invoices.getAll();
  const draftInvoices = invoices.filter(
    (invoice) =>
      getEffectiveInvoiceStatus(
        invoice.status as StoredInvoiceStatus,
        invoice.dueDate,
      ) === "draft",
  );
  const currentInvoice = draftInvoices[0];

  if (!currentInvoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No active drafts</h3>
            <p className="text-muted-foreground mb-4">
              Create a new invoice to get started
            </p>
            <Button asChild variant="outline" className="border-foreground/20">
              <Link href="/dashboard/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalHours =
    currentInvoice.items?.reduce((sum, item) => sum + item.hours, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Current Work
        </CardTitle>
        <Badge variant="secondary">In Progress</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold break-words">
                #{currentInvoice.invoiceNumber}
              </h3>
              <span className="text-primary text-2xl font-bold">
                ${currentInvoice.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="text-muted-foreground flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="break-words">{currentInvoice.client?.name}</span>
              <span className="text-xs sm:text-sm">
                {totalHours.toFixed(1)} hours logged
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hover-lift flex-1"
            >
              <Link href={`/dashboard/invoices/${currentInvoice.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
            <Button asChild size="sm" className="hover-lift flex-1">
              <Link href={`/dashboard/invoices/${currentInvoice.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Continue
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced recent activity
async function RecentActivity({
  recentInvoices,
}: {
  recentInvoices: RecentInvoice[];
}) {
  // Use passed recentInvoices instead of fetching all

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "paid":
        return {
          backgroundColor: "oklch(var(--chart-2) / 0.1)",
          borderColor: "oklch(var(--chart-2) / 0.3)",
          color: "oklch(var(--chart-2))",
        };
      case "sent":
        return {
          backgroundColor: "oklch(var(--chart-1) / 0.1)",
          borderColor: "oklch(var(--chart-1) / 0.3)",
          color: "oklch(var(--chart-1))",
        };
      case "overdue":
        return {
          backgroundColor: "oklch(var(--chart-3) / 0.1)",
          borderColor: "oklch(var(--chart-3) / 0.3)",
          color: "oklch(var(--chart-3))",
        };
      default:
        return {
          backgroundColor: "hsl(var(--muted))",
          borderColor: "hsl(var(--border))",
          color: "hsl(var(--muted-foreground))",
        };
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/invoices">
            <span className="hidden sm:inline">View All</span>
            <ArrowUpRight className="h-4 w-4 sm:ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recentInvoices.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invoice to get started
            </p>
            <Button asChild variant="outline" className="border-foreground/20">
              <Link href="/dashboard/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Invoice
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map((invoice, _index) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.id}`}
                className="block"
              >
                <div className="recent-activity-item bg-muted/50 hover:bg-muted border-foreground/20 rounded-lg border p-3 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-muted flex-shrink-0 rounded-lg p-2">
                      <FileText className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            #{invoice.invoiceNumber}
                          </p>
                          <p className="text-muted-foreground truncate text-sm">
                            {invoice.client?.name}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <Badge style={getStatusStyle(invoice.status)}>
                            {invoice.status}
                          </Badge>
                          <span className="text-primary font-semibold">
                            ${invoice.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeletons
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="mb-2 h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

import { DashboardPageHeader } from "~/components/layout/page-header";

// ... imports

export default async function DashboardPage() {
  const session = await getOptionalServerSessionFromHeaders();
  const firstName = session?.user?.name?.split(" ")[0] ?? "User";

  // Fetch stats centrally
  const stats = await api.dashboard.getStats();
  void api.timeEntries.getRunning.prefetch();

  return (
    <div className="page-enter space-y-6">
      <DashboardPageHeader
        title={`Welcome back, ${firstName}!`}
        description="Here's what's happening with your business today"
      />

      <HydrateClient>
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats stats={stats} />
        </Suspense>
      </HydrateClient>

      <HydrateClient>
        <Suspense fallback={<ChartsSkeleton />}>
          <ChartsSection stats={stats} />
        </Suspense>
      </HydrateClient>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <HydrateClient>
            <Suspense fallback={<CardSkeleton />}>
              <CurrentWork />
            </Suspense>
          </HydrateClient>
          <QuickActions />
        </div>

        <HydrateClient>
          <Suspense fallback={<CardSkeleton />}>
            <RecentActivity recentInvoices={stats.recentInvoices} />
          </Suspense>
        </HydrateClient>
      </div>
    </div>
  );
}
