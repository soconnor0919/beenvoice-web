import * as React from "react";
import { cn } from "~/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return <div className={cn("min-h-screen", className)}>{children}</div>;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  spacing?: "default" | "compact" | "large";
}

export function PageContent({
  children,
  className,
  spacing = "default",
}: PageContentProps) {
  const spacingClasses = {
    default: "space-y-8",
    compact: "space-y-4",
    large: "space-y-12",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>{children}</div>
  );
}

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageSection({
  children,
  className,
  title,
  description,
  actions,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title ?? description ?? actions) && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            {title && (
              <h2 className="text-foreground text-xl font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-shrink-0 gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

interface PageGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: "default" | "compact" | "large";
}

export function PageGrid({
  children,
  className,
  columns = 3,
  gap = "default",
}: PageGridProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  const gapClasses = {
    default: "gap-4",
    compact: "gap-2",
    large: "gap-6",
  };

  return (
    <div
      className={cn("grid", columnClasses[columns], gapClasses[gap], className)}
    >
      {children}
    </div>
  );
}

// Empty state component for consistent empty states across pages
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      {icon && (
        <div className="bg-muted mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl p-3 [&_svg]:text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mx-auto mb-4 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
