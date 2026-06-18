import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/branding/logo";
import { LEGAL_LAST_UPDATED } from "~/lib/legal";

type LegalPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card/80 border-b backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo size="sm" />
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to app
              </Button>
            </Link>
          </div>

          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {description ? (
              <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              Last updated {LEGAL_LAST_UPDATED}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
