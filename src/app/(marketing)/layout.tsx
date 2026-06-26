import { MarketingProviders } from "~/components/providers/marketing-providers";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingProviders>{children}</MarketingProviders>;
}
