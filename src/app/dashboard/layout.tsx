import { redirect } from "next/navigation";
import { AppProviders } from "~/components/providers/app-providers";
import { DashboardShell } from "~/components/layout/dashboard-shell";
import { getOptionalServerSessionFromHeaders } from "~/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalServerSessionFromHeaders();

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  return (
    <AppProviders>
      <DashboardShell>{children}</DashboardShell>
    </AppProviders>
  );
}
