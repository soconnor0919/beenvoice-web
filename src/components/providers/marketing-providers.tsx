"use client";

import { AnimationPreferencesProvider } from "~/components/providers/animation-preferences-provider";
import { AppearanceProvider } from "~/components/providers/appearance-provider";

/** Client providers for public/marketing pages — no tRPC or DB-backed settings sync. */
export function MarketingProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppearanceProvider>
      <AnimationPreferencesProvider>{children}</AnimationPreferencesProvider>
    </AppearanceProvider>
  );
}
