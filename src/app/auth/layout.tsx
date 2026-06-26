import { MarketingProviders } from "~/components/providers/marketing-providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingProviders>{children}</MarketingProviders>;
}
