"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { getNavigationForUser, isNavLinkActive } from "~/lib/navigation";
import { useSidebar } from "./sidebar-provider";
import { cn } from "~/lib/utils";
import { Logo } from "~/components/branding/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getGravatarUrl } from "~/lib/gravatar";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useAuthSession } from "~/hooks/use-auth-session";
import { useDashboardUser } from "~/components/layout/dashboard-user-context";
import { ActiveTimerWidget } from "~/app/dashboard/_components/active-timer-widget";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useAuthSession();
  const { isAdmin } = useDashboardUser();
  const { isCollapsed, toggleCollapse } = useSidebar();
  const navSections = getNavigationForUser(isAdmin);

  // If mobile, always expanded
  const collapsed = mobile ? false : isCollapsed;

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Header / Logo */}
        <div
          className={cn(
            "mb-2 flex h-14 items-center px-4",
            collapsed ? "justify-center px-2" : "justify-between",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
          )}
          {collapsed && <Logo size="icon" />}

          {!mobile && !collapsed && (
            <div className="h-8 w-8" /> // Spacer to keep alignment if needed, or just remove
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "mt-4 flex flex-col gap-6 px-2",
            collapsed && "items-center",
          )}
        >
          {navSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <div className="text-muted-foreground/60 mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
                  {section.title}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-1">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = isNavLinkActive(pathname, link.href);

                    if (collapsed) {
                      return (
                        <TooltipProvider key={link.href} delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={link.href}
                                data-active={isActive ? "true" : undefined}
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="font-medium"
                            >
                              {link.name}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        data-active={isActive ? "true" : undefined}
                        onClick={mobile ? onClose : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {link.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / User */}
      <div className="mt-auto space-y-2 p-2">
        {!mobile && (
          <div
            className={cn(
              "flex",
              collapsed ? "justify-center" : "justify-end px-2",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              onClick={toggleCollapse}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <ActiveTimerWidget collapsed={collapsed} />

        <div
          className={cn(
            "border-border/50 border-t pt-4",
            collapsed ? "flex flex-col items-center gap-2" : "px-2",
          )}
        >
          {isPending ? (
            <div
              className={cn(
                "flex items-center gap-3",
                collapsed ? "justify-center" : "px-2",
              )}
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              {!collapsed && (
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-24" />
                </div>
              )}
            </div>
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-0 hover:bg-transparent",
                    collapsed && "justify-center",
                  )}
                >
                  {/* FIXED: Changed div to span to prevent hydration error */}
                  <span
                    className={cn(
                      "flex items-center gap-3",
                      collapsed ? "justify-center" : "w-full",
                    )}
                  >
                    <Avatar className="border-border h-9 w-9 border">
                      <AvatarImage
                        src={getGravatarUrl(session.user.email)}
                        alt={session.user.name ?? "User"}
                      />
                      <AvatarFallback>
                        {session.user.name?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium">
                          {session.user.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {session.user.email}
                        </span>
                      </span>
                    )}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="bg-background/80 border-border/50 w-56 backdrop-blur-xl"
                sideOffset={10}
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {session.user.name}
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut();
                    window.location.href = "/";
                  }}
                  className="text-red-600 focus:bg-red-100/50 focus:text-red-600 dark:focus:bg-red-900/20"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return <div className="bg-background h-full">{SidebarContent}</div>;
  }

  return (
    <aside
      className={cn(
        "border-border bg-background fixed top-0 bottom-0 left-0 z-30 hidden flex-col rounded-none border-r shadow-none transition-all duration-300 ease-in-out md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {SidebarContent}
    </aside>
  );
}
