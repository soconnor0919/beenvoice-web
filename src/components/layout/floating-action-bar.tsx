"use client";

import React from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { useSidebar } from "~/components/layout/sidebar-provider";

interface FloatingActionBarProps {
  leftContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FloatingActionBar({
  leftContent,
  children,
  className,
}: FloatingActionBarProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        "pb-safe-area-inset-bottom fixed right-0 bottom-4 left-0 z-50 transition-all duration-300 ease-in-out",
        isCollapsed ? "md:left-16" : "md:left-64",
        "animate-slide-in-bottom",
        className,
      )}
    >
      <div className="w-full px-4 transition-transform duration-300">
        <Card className="hover-lift bg-card border-border border shadow-lg">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            {leftContent && (
              <div className="text-card-foreground animate-fade-in flex flex-1 items-center gap-3">
                {leftContent}
              </div>
            )}

            <div className="animate-fade-in animate-delay-100 flex items-center gap-2 sm:gap-3">
              {children}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
