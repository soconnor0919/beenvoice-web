import type { Metadata } from "next";

import { MarketingProviders } from "~/components/providers/marketing-providers";
import { brand } from "~/lib/branding";

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: `Legal | ${brand.name}`,
  },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingProviders>{children}</MarketingProviders>;
}
