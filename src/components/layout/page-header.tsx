import React from "react";
import { DashboardBreadcrumbs } from "~/components/navigation/dashboard-breadcrumbs";
import { cn } from "~/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons or other header content
  className?: string;
  variant?: "default" | "gradient" | "large" | "large-gradient";
  titleClassName?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className = "",
  variant = "default",
  titleClassName,
}: PageHeaderProps) {
  const getTitleClasses = () => {
    const baseClasses = "font-bold";

    switch (variant) {
      case "gradient":
        return `${baseClasses} text-3xl text-foreground`;
      case "large":
        return `${baseClasses} text-4xl text-foreground`;
      case "large-gradient":
        return `${baseClasses} text-4xl text-foreground`;
      default:
        return `${baseClasses} text-3xl text-foreground`;
    }
  };

  const getDescriptionSpacing = () => {
    return variant === "large" || variant === "large-gradient"
      ? "mt-2"
      : "mt-1";
  };

  return (
    <div className={cn("animate-fade-in-down", className)}>
      {variant === "large-gradient" || variant === "gradient" ? (
        <div className="platform-header-surface bg-card text-card-foreground relative overflow-hidden rounded-xl border shadow-sm">
          <div className="platform-header-gradient from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
          <div className="platform-header-content relative p-6">
            <DashboardBreadcrumbs className="mb-4" />
            {/* UPDATED: flex-col on mobile to prevent squishing, row on sm+ */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className={titleClassName ?? getTitleClasses()}>{title}</h1>
                {description && (
                  <p
                    className={`text-muted-foreground ${getDescriptionSpacing()} text-lg`}
                  >
                    {description}
                  </p>
                )}
              </div>
              {children && (
                <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto sm:gap-3">
                  {children}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <DashboardBreadcrumbs className="mb-2 sm:mb-4" />
          {/* UPDATED: flex-col on mobile to prevent squishing, row on sm+ */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="animate-fade-in-up space-y-1">
              <h1 className={titleClassName ?? getTitleClasses()}>{title}</h1>
              {description && (
                <p
                  className={`animate-fade-in-up animate-delay-100 text-muted-foreground ${getDescriptionSpacing()} text-lg`}
                >
                  {description}
                </p>
              )}
            </div>
            {children && (
              <div className="animate-slide-in-right animate-delay-200 flex w-full flex-shrink-0 gap-2 sm:w-auto sm:gap-3">
                {children}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Convenience wrapper for dashboard page with larger gradient title
export function DashboardPageHeader({
  title,
  description,
  children,
  className = "",
}: Omit<PageHeaderProps, "variant">) {
  return (
    <PageHeader
      title={title}
      description={description}
      variant="gradient"
      className={cn("mb-0", className)}
      titleClassName="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
    >
      {children}
    </PageHeader>
  );
}
