"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "~/lib/utils";

interface ResponsiveChartProps {
  height?: number;
  className?: string;
  children: ReactElement;
}

export function ResponsiveChart({
  height = 256,
  className,
  children,
}: ResponsiveChartProps) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
