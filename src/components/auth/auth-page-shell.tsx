import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "~/components/branding/logo";
import { cn } from "~/lib/utils";

export function AuthPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-dashboard text-foreground flex min-h-screen flex-col px-5 py-6 sm:px-6 sm:py-8">
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col justify-center",
          className,
        )}
      >
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        {children}
      </div>
    </div>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/50 bg-background/80 rounded-3xl border p-6 shadow-xl backdrop-blur-xl sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthCardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 space-y-3">
      <Logo size="md" animated={false} />
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
