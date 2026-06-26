"use client";

import {
  Area,
  AreaChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChart } from "~/components/charts/responsive-chart";
import { useAnimationPreferences } from "~/components/providers/animation-preferences-provider";

interface RevenueChartProps {
  data: {
    month: string;
    revenue: number;
    monthLabel: string;
  }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: { revenue: number } }>;
  label?: string;
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (active && payload?.length) {
    const data = payload[0]!.payload;
    return (
      <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        <p
          className="font-mono tabular-nums"
          style={{ color: "hsl(0, 0%, 60%)" }}
        >
          Revenue: {formatCurrency(data.revenue)}
        </p>
        <p className="text-muted-foreground text-sm">
          {/* Count not available in aggregated view currently */}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
  // Use data directly
  const chartData = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { prefersReducedMotion, animationSpeedMultiplier } =
    useAnimationPreferences();
  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            No revenue data available
          </p>
          <p className="text-muted-foreground text-xs">
            Revenue will appear here once you have paid invoices
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveChart height={256} className="h-48 md:h-64">
      <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(217, 91%, 60%)"
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor="hsl(217, 91%, 60%)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
              fontFamily: "var(--font-mono)",
            }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            isAnimationActive={!prefersReducedMotion}
            animationDuration={Math.round(
              600 / (animationSpeedMultiplier ?? 1),
            )}
            animationEasing="ease-out"
          />
        </AreaChart>
    </ResponsiveChart>
  );
}
