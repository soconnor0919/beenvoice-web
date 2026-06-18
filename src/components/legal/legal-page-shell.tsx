import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { LEGAL_LAST_UPDATED } from "~/lib/legal";

type LegalPageShellProps = {
  title: string;
  children: React.ReactNode;
};

export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b">
        <div className="container mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground text-sm">
                Last updated: {LEGAL_LAST_UPDATED}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
