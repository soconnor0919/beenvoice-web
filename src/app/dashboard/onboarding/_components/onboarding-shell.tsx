import { Logo } from "~/components/branding/logo";
import { brand } from "~/lib/branding";
import { cn } from "~/lib/utils";

export function OnboardingShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-dashboard text-foreground flex min-h-screen flex-col px-5 py-8 sm:px-6 sm:py-10">
      <div
        className={cn(
          "mx-auto flex w-full max-w-xl flex-1 flex-col justify-center",
          className,
        )}
      >
        <div className="mb-8 space-y-4 text-center">
          <div className="flex justify-center">
            <Logo size="lg" animated={false} />
          </div>
          <p className="text-muted-foreground text-sm leading-6">{brand.tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
