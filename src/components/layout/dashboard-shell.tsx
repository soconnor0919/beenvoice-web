"use client";

import * as React from "react";
import { Sidebar } from "~/components/layout/sidebar";
import {
  SidebarProvider,
  useSidebar,
} from "~/components/layout/sidebar-provider";
import { cn } from "~/lib/utils";
import { Menu } from "lucide-react";
import { Logo } from "~/components/branding/logo";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { useAppearance } from "~/components/providers/appearance-provider";
import { ActiveTimerWidget } from "~/app/dashboard/_components/active-timer-widget";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { sidebarStyle } = useAppearance();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="bg-dashboard relative flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <div className="dashboard-mobile-header bg-background/80 fixed top-0 right-0 left-0 z-50 flex h-16 items-center border-b px-4 backdrop-blur-md md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background h-10 w-10 shadow-sm"
              suppressHydrationWarning
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          {/* Mobile Link / Logo */}
          <div className="ml-4 flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <SheetContent side="left" className="w-72 p-0">
            <div className="sr-only">
              <h2 id="mobile-nav-title">Navigation Menu</h2>
            </div>
            <Sidebar mobile onClose={() => setIsMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main
        suppressHydrationWarning
        className={cn(
          "min-h-screen min-w-0 flex-1 transition-all duration-300 ease-in-out",
          "md:ml-0",
          sidebarStyle === "floating"
            ? isCollapsed
              ? "md:ml-24"
              : "md:ml-[18rem]"
            : isCollapsed
              ? "md:ml-16"
              : "md:ml-64",
        )}
      >
        <div className="dashboard-content-shell p-4 pt-16 md:pt-4">
          <div className="mb-4 md:hidden">
            {/* Mobile Breadcrumbs could go here or be part of the page */}
          </div>
          <div className="mb-4">
            <ActiveTimerWidget />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
