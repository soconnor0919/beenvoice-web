import { cn } from "~/lib/utils";

/** Vertical rhythm for dashboard pages — use with shell `gap-5`. */
export const dashboardGapClass = "gap-5 md:gap-6";

/** Standard grid gap for dashboard cards and sections. */
export const dashboardGridClass =
  "grid gap-5 md:gap-6";

/** Summary stat cards (2-up mobile, 4-up desktop). */
export const dashboardStatGridClass =
  "grid grid-cols-2 gap-4 sm:grid-cols-4";

export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "page-enter mx-auto flex w-full max-w-7xl flex-col",
        dashboardGapClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(dashboardGridClass, className)}>{children}</div>
  );
}

export function DashboardCardTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className="flex items-center gap-2">
      {Icon ? <Icon className="text-muted-foreground h-4 w-4" /> : null}
      {children}
    </span>
  );
}
