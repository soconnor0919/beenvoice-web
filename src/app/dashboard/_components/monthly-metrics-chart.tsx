"use client";

import {
  Bar,
  BarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChart } from "~/components/charts/responsive-chart";
import { useAnimationPreferences } from "~/components/providers/animation-preferences-provider";

export interface MonthlyMetricsChartDatum {
  month: string;
  monthLabel: string;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  draftInvoices: number;
}

interface MonthlyMetricsChartProps {
  data: MonthlyMetricsChartDatum[];
}

function MonthlyMetricsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    payload: MonthlyMetricsChartDatum;
  }>;
  label?: string;
}) {
  if (active && payload?.length) {
    const chartDatum = payload[0]!.payload;
    return (
      <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="text-primary font-medium font-mono tabular-nums">
            Paid: {chartDatum.paidInvoices}
          </p>
          <p className="text-primary/80 font-mono tabular-nums">
            Pending: {chartDatum.pendingInvoices}
          </p>
          <p className="text-destructive font-mono tabular-nums">
            Overdue: {chartDatum.overdueInvoices}
          </p>
          <p className="text-muted-foreground font-mono tabular-nums">
            Draft: {chartDatum.draftInvoices}
          </p>
          <p className="text-foreground border-t pt-1 font-medium font-mono tabular-nums">
            Total: {chartDatum.totalInvoices}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function MonthlyMetricsChart({ data }: MonthlyMetricsChartProps) {
  const { prefersReducedMotion, animationSpeedMultiplier } =
    useAnimationPreferences();
  const barAnimationDuration = Math.round(
    500 / (animationSpeedMultiplier || 1),
  );

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            No metrics data available
          </p>
          <p className="text-muted-foreground text-xs">
            Monthly metrics will appear here once you create invoices
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveChart height={192} className="h-48">
        <BarChart data={data}>
            <XAxis
              dataKey="monthLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 12,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
            />
            <Tooltip content={<MonthlyMetricsTooltip />} />
            <Bar
              dataKey="draftInvoices"
              stackId="a"
              fill="hsl(0, 0%, 60%)"
              radius={[0, 0, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={barAnimationDuration}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="paidInvoices"
              stackId="a"
              fill="hsl(142, 71%, 45%)"
              radius={[0, 0, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={barAnimationDuration}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="pendingInvoices"
              stackId="a"
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.6}
              radius={[0, 0, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={barAnimationDuration}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="overdueInvoices"
              stackId="a"
              fill="hsl(var(--destructive))"
              radius={[2, 2, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={barAnimationDuration}
              animationEasing="ease-out"
            />
          </BarChart>
      </ResponsiveChart>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "hsl(0, 0%, 60%)" }}
          />
          <span className="text-xs">Draft</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
          />
          <span className="text-xs">Paid</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "hsl(217, 91%, 60%)", opacity: 0.6 }}
          />
          <span className="text-xs">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-destructive h-3 w-3 rounded-full" />
          <span className="text-xs">Overdue</span>
        </div>
      </div>
    </div>
  );
}
