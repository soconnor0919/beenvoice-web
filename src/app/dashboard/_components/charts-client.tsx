"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "~/components/ui/skeleton";

const chartSkeleton = () => <Skeleton className="h-64 w-full" />;

export const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  { ssr: false, loading: chartSkeleton },
);

export const InvoiceStatusChart = dynamic(
  () => import("./invoice-status-chart").then((m) => m.InvoiceStatusChart),
  { ssr: false, loading: chartSkeleton },
);

export const MonthlyMetricsChart = dynamic(
  () => import("./monthly-metrics-chart").then((m) => m.MonthlyMetricsChart),
  { ssr: false, loading: chartSkeleton },
);
