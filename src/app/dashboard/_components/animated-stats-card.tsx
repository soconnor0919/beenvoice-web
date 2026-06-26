"use client";

import {
  TrendingDown,
  TrendingUp,
  Minus,
  DollarSign,
  Clock,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

type IconName = "DollarSign" | "Clock" | "Users" | "TrendingDown";

interface AnimatedStatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  iconName: IconName;
  description: string;
  delay?: number;
  isCurrency?: boolean;
  numericValue?: number;
}

const iconMap = {
  DollarSign,
  Clock,
  Users,
  TrendingDown,
} as const;

export function AnimatedStatsCard({
  title,
  value,
  change,
  trend,
  iconName,
  description,
  delay = 0,
  isCurrency = false,
  numericValue,
}: AnimatedStatsCardProps) {
  const Icon = iconMap[iconName];

  let TrendIcon = Minus;
  if (trend === "up") TrendIcon = TrendingUp;
  if (trend === "down") TrendIcon = TrendingDown;

  const isPositive = trend === "up";
  const isNeutral = trend === "neutral";

  void delay;
  void isCurrency;
  void numericValue;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isNeutral
              ? "text-muted-foreground"
              : isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
          )}
        >
          <TrendIcon className="h-3 w-3" />
          <span className="font-mono tabular-nums">{change}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <CardDescription className="mt-1">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
