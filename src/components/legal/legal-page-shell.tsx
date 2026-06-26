import {
  MarketingFooter,
  MarketingHeader,
  MarketingPageShell,
  marketingSurfaceClass,
} from "~/components/marketing/marketing-chrome";
import { LEGAL_LAST_UPDATED } from "~/lib/legal";
import { cn } from "~/lib/utils";
import { env } from "~/env";

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
  const allowRegistration = env.DISABLE_SIGNUPS !== true;

  return (
    <MarketingPageShell>
      <MarketingHeader allowRegistration={allowRegistration} />

      <div
        className={cn(
          marketingSurfaceClass,
          "mb-8 space-y-3 px-6 py-8 sm:px-8 sm:py-10",
        )}
      >
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-3xl text-base leading-7">
            {description}
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
      </div>

      <main>{children}</main>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
