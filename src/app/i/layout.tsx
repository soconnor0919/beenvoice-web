"use client";

import { MarketingProviders } from "~/components/providers/marketing-providers";
import { TRPCReactProvider } from "~/trpc/react";

/** Public invoice links need tRPC but not authenticated settings sync. */
export default function PublicInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCReactProvider>
      <MarketingProviders>{children}</MarketingProviders>
    </TRPCReactProvider>
  );
}
