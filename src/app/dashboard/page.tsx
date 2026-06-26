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
import { AnimatedStatsCard } from "~/app/dashboard/_components/animated-stats-card";
import {
  InvoiceStatusChart,
  MonthlyMetricsChart,
  RevenueChart,
} from "~/app/dashboard/_components/charts-client";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  DashboardCardTitle,
  DashboardGrid,
  DashboardPage as DashboardPageLayout,
  dashboardGridClass,
} from "~/components/layout/dashboard-page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getOptionalServerSessionFromHeaders } from "~/lib/auth-server";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import type { DashboardStats, RecentInvoice } from "./types";

function DashboardStats({ stats }: { stats: DashboardStats }) {
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
      description: "Collected to date",
    },
    {
      title: "Pending",
      value: `$${stats.pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      numericValue: stats.pendingAmount,
      isCurrency: true,
      change: "0%",
      trend: "neutral" as const,
      iconName: "Clock" as const,
      description: "Awaiting payment",
    },
    {
      title: "Clients",
      value: stats.totalClients.toString(),
      numericValue: stats.totalClients,
      isCurrency: false,
      change: "0",
      trend: "neutral" as const,
      iconName: "Users" as const,
      description: "Active clients",
    },
    {
      title: "Overdue",
      value: stats.overdueCount.toString(),
      numericValue: stats.overdueCount,
      isCurrency: false,
      change: "0",
      trend: "neutral" as const,
      iconName: "TrendingDown" as const,
      description: "Past due date",
    },
  ];

  return (
    <div className={cn(dashboardGridClass, "sm:grid-cols-2 xl:grid-cols-4")}>
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

function ChartsSection({ stats }: { stats: DashboardStats }) {
  return (
    <DashboardGrid className="lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            <DashboardCardTitle icon={BarChart3}>
              Revenue over time
            </DashboardCardTitle>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={stats.revenueChartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <DashboardCardTitle icon={Activity}>
              Invoice status
            </DashboardCardTitle>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceStatusChart data={stats.statusChartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <DashboardCardTitle icon={Calendar}>
              Monthly metrics
            </DashboardCardTitle>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyMetricsChart data={stats.monthlyMetricsChartData} />
        </CardContent>
      </Card>
    </DashboardGrid>
  );
}

function QuickActions() {
  const actions = [
    {
      title: "Create invoice",
      description: "Start a new invoice for a client",
      href: "/dashboard/invoices/new",
      icon: FileText,
      featured: true,
    },
    {
      title: "Add client",
      description: "Register someone you bill",
      href: "/dashboard/clients/new",
      icon: Users,
      featured: false,
    },
    {
      title: "View invoices",
      description: "Browse your full pipeline",
      href: "/dashboard/invoices",
      icon: BarChart3,
      featured: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <DashboardCardTitle icon={Plus}>Quick actions</DashboardCardTitle>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                action.featured
                  ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
                  : "border-border/60 bg-background/50 hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "rounded-xl p-2",
                  action.featured
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{action.title}</p>
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

function CurrentWork({
  currentDraft,
}: {
  currentDraft: DashboardStats["currentDraft"];
}) {
  if (!currentDraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <DashboardCardTitle icon={Activity}>
              Current work
            </DashboardCardTitle>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8 text-center">
          <div className="bg-muted mb-4 rounded-2xl p-3">
            <FileText className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="font-medium">No draft in progress</p>
          <CardDescription className="mt-1 max-w-xs">
            Start an invoice when you&apos;re ready to bill your next piece of
            work.
          </CardDescription>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/dashboard/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Create invoice
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalHours = currentDraft.totalHours;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          <DashboardCardTitle icon={Activity}>Current work</DashboardCardTitle>
        </CardTitle>
        <Badge variant="secondary">Draft</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium">#{currentDraft.invoiceNumber}</p>
              <p className="text-muted-foreground text-sm">
                {currentDraft.client?.name}
              </p>
            </div>
            <p className="font-mono text-xl font-semibold tabular-nums">
              ${currentDraft.totalAmount.toFixed(2)}
            </p>
          </div>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {totalHours.toFixed(1)} hours logged
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/dashboard/invoices/${currentDraft.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`/dashboard/invoices/${currentDraft.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Continue
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({
  recentInvoices,
}: {
  recentInvoices: RecentInvoice[];
}) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default" as const;
      case "sent":
        return "secondary" as const;
      case "overdue":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          <DashboardCardTitle icon={Calendar}>
            Recent activity
          </DashboardCardTitle>
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/invoices">
            <span className="hidden sm:inline">View all</span>
            <ArrowUpRight className="h-4 w-4 sm:ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recentInvoices.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="bg-muted mb-4 rounded-2xl p-3">
              <FileText className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="font-medium">No invoices yet</p>
            <CardDescription className="mt-1 max-w-xs">
              Your latest invoices will show up here.
            </CardDescription>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/dashboard/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Create invoice
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.id}`}
                className="hover:bg-muted/50 border-border/60 flex items-center gap-3 rounded-2xl border p-3 transition-colors"
              >
                <div className="bg-muted rounded-xl p-2">
                  <FileText className="text-muted-foreground h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      #{invoice.invoiceNumber}
                    </p>
                    <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                      ${invoice.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground truncate text-xs">
                      {invoice.client?.name}
                    </p>
                    <Badge
                      variant={getStatusVariant(invoice.status)}
                      className="shrink-0 text-[10px]"
                    >
                      {invoice.status}
                    </Badge>
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

export default async function DashboardPage() {
  const session = await getOptionalServerSessionFromHeaders();
  const firstName = session?.user?.name?.split(" ")[0] ?? "User";
  const stats = await api.dashboard.getStats();

  return (
    <DashboardPageLayout>
      <DashboardPageHeader
        title={`Welcome back, ${firstName}`}
        description="A snapshot of your invoices, revenue, and work in progress."
      />

      <DashboardStats stats={stats} />
      <ChartsSection stats={stats} />
      <DashboardGrid className="lg:grid-cols-2">
        <div className={cn(dashboardGridClass)}>
          <CurrentWork currentDraft={stats.currentDraft} />
          <QuickActions />
        </div>
        <RecentActivity recentInvoices={stats.recentInvoices} />
      </DashboardGrid>
    </DashboardPageLayout>
  );
}
