"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ResponsiveChart } from "~/components/charts/responsive-chart";
import { useAnimationPreferences } from "~/components/providers/animation-preferences-provider";

export interface StatusChartDatum {
  status: string;
  name: string;
  count: number;
  value: number;
}

interface InvoiceStatusChartProps {
  data: StatusChartDatum[];
}

const STATUS_COLORS = {
  draft: "hsl(0, 0%, 60%)",
  sent: "hsl(217, 91%, 60%)",
  pending: "hsl(217, 91%, 60%)",
  paid: "hsl(142, 71%, 45%)",
  overdue: "hsl(var(--destructive))",
} as const;

const formatChartCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { name: string; count: number; value: number };
  }>;
}) {
  if (active && payload?.length) {
    const data = payload[0]!.payload;
    return (
      <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="font-mono text-sm tabular-nums">
          {data.count} invoice{data.count !== 1 ? "s" : ""}
        </p>
        <p className="font-mono text-sm tabular-nums">
          {formatChartCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
}

export function InvoiceStatusChart({ data }: InvoiceStatusChartProps) {
  const { prefersReducedMotion, animationSpeedMultiplier } =
    useAnimationPreferences();
  const pieAnimationDuration = Math.round(
    600 / (animationSpeedMultiplier || 1),
  );

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            No invoice data available
          </p>
          <p className="text-muted-foreground text-xs">
            Status breakdown will appear here once you create invoices
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveChart height={192} className="h-48">
        <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              stroke="none"
              dataKey="count"
              isAnimationActive={!prefersReducedMotion}
              animationDuration={pieAnimationDuration}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<StatusTooltip />} />
          </PieChart>
      </ResponsiveChart>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    STATUS_COLORS[item.status as keyof typeof STATUS_COLORS],
                }}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium tabular-nums">
                {item.count}
              </p>
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {formatChartCurrency(item.value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
