import Link from "next/link";
import { Logo } from "~/components/branding/logo";
import { Button } from "~/components/ui/button";
import { brand } from "~/lib/branding";
import { cn } from "~/lib/utils";

export const marketingSurfaceClass =
  "border-border/50 bg-background/80 rounded-3xl border shadow-xl backdrop-blur-xl";

export function MarketingPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dashboard text-foreground relative min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-5 pt-4 pb-6 sm:px-6 sm:pt-5 sm:pb-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export function MarketingHeader({
  allowRegistration = true,
  sticky = true,
}: {
  allowRegistration?: boolean;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        marketingSurfaceClass,
        "mb-8 flex items-center justify-between gap-4 px-4 py-3 sm:px-5",
        sticky && "sticky top-4 z-20 sm:top-5",
      )}
    >
      <Link href="/">
        <Logo animated={false} />
      </Link>
      <nav className="flex items-center gap-2">
        <Link href="/auth/signin">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        {allowRegistration && (
          <Link href="/auth/register">
            <Button size="sm">Create account</Button>
          </Link>
        )}
      </nav>
    </header>
  );
}

export function MarketingFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        marketingSurfaceClass,
        "text-muted-foreground mt-8 flex flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <span>© 2026 {brand.name}</span>
      <div className="flex gap-5">
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="hover:text-foreground transition-colors"
        >
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
