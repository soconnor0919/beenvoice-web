"use client";
import { authClient } from "~/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "~/components/branding/logo";
import { SidebarTrigger } from "~/components/navigation/sidebar-trigger";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuthSession } from "~/hooks/use-auth-session";
import { useRouter } from "next/navigation";

interface NavbarProps {
  allowRegistration?: boolean;
}

export function Navbar({ allowRegistration = true }: NavbarProps) {
  const { data: session, isPending } = useAuthSession();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const router = useRouter();

  // Get current open invoice for quick access
  // const { data: currentInvoice } = api.invoices.getCurrentOpen.useQuery();

  return (
    <header className="bg-navbar border-navbar-border text-navbar-foreground fixed top-0 right-0 left-0 z-30 border-b">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-8">
        <div className="flex items-center gap-4 md:gap-6">
          <SidebarTrigger
            isOpen={isMobileNavOpen}
            onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
          />
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {isPending ? (
            <>
              <Skeleton className="bg-muted/20 hidden h-5 w-20 sm:inline" />
              <Skeleton className="bg-muted/20 h-8 w-16" />
            </>
          ) : session?.user ? (
            <>
              <span className="text-muted-foreground hidden text-xs font-medium sm:inline md:text-sm">
                {session.user.name ?? session.user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await authClient.signOut();
                  router.push("/");
                }}
                className="text-xs md:text-sm"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs md:text-sm"
                >
                  Sign In
                </Button>
              </Link>
              {allowRegistration && (
                <Link href="/auth/register">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs font-medium md:text-sm"
                  >
                    Register
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
