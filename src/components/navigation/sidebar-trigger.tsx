"use client";

import { MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuthSession } from "~/hooks/use-auth-session";
import { navigationConfig, isNavLinkActive } from "~/lib/navigation";

interface SidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarTrigger({ isOpen, onToggle }: SidebarTriggerProps) {
  const pathname = usePathname();
  const { isPending } = useAuthSession();

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Toggle navigation"
        onClick={onToggle}
        className="h-8 w-8 md:hidden"
      >
        {isOpen ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
      </Button>

      {/* Mobile dropdown navigation */}
      {isOpen && (
        <div className="bg-background border-border absolute top-full right-0 left-0 z-40 mt-1 border-t">
          {/* Navigation content */}
          <nav className="flex flex-col p-4">
            {navigationConfig.map((section, sectionIndex) => (
              <div
                key={section.title}
                className={sectionIndex > 0 ? "mt-4" : ""}
              >
                {sectionIndex > 0 && (
                  <div className="border-border/40 my-3 border-t" />
                )}
                <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  {section.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {isPending ? (
                    <>
                      {Array.from({ length: section.links.length }).map(
                        (_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-3 py-2.5"
                          >
                            <Skeleton className="bg-muted/20 h-4 w-4" />
                            <Skeleton className="bg-muted/20 h-4 w-20" />
                          </div>
                        ),
                      )}
                    </>
                  ) : (
                    section.links.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          aria-current={
                            isNavLinkActive(pathname, link.href) ? "page" : undefined
                          }
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                            isNavLinkActive(pathname, link.href)
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                          onClick={onToggle}
                        >
                          <Icon className="h-4 w-4" />
                          {link.name}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
