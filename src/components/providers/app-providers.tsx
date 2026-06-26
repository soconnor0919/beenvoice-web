"use client";

import { AnimationPreferencesProviderSynced } from "~/components/providers/animation-preferences-provider-synced";
import { AppearanceProviderSynced } from "~/components/providers/appearance-provider-synced";
import { TRPCReactProvider } from "~/trpc/react";

/** Full app providers for authenticated workspace routes. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <AppearanceProviderSynced>
        <AnimationPreferencesProviderSynced>
          {children}
        </AnimationPreferencesProviderSynced>
      </AppearanceProviderSynced>
    </TRPCReactProvider>
  );
}
