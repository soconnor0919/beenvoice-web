"use client";

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { dashboardGapClass, dashboardGridClass } from "~/components/layout/dashboard-page";
import { cn } from "~/lib/utils";

/** Vertical rhythm inside tab panels — matches dashboard page sections. */
export const pageTabsPanelClass = dashboardGapClass;

/** Grid for stacked cards inside a tab panel. */
export const pageTabsGridClass = dashboardGridClass;

type PageTabsProps = React.ComponentPropsWithoutRef<typeof Tabs>;

export function PageTabs({ className, ...props }: PageTabsProps) {
  return (
    <Tabs
      className={cn("flex flex-col", pageTabsPanelClass, className)}
      {...props}
    />
  );
}

type PageTabsListProps = React.ComponentPropsWithoutRef<typeof TabsList>;

export function PageTabsList({ className, ...props }: PageTabsListProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsList
        className={cn(
          "bg-muted/50 border-border/60 inline-flex h-10 w-max min-w-full gap-0.5 rounded-xl border p-1 sm:min-w-0",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function PageTabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "data-[state=active]:bg-background h-8 rounded-lg px-3.5 text-sm data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function PageTabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsContent>) {
  return (
    <TabsContent
      className={cn(
        "mt-0 flex flex-col focus-visible:ring-0 focus-visible:outline-none",
        pageTabsPanelClass,
        className,
      )}
      {...props}
    />
  );
}
