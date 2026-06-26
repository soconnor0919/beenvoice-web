import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppProviders } from "~/components/providers/app-providers";
import { DashboardShell } from "~/components/layout/dashboard-shell";
import { DashboardUserProvider } from "~/components/layout/dashboard-user-context";
import { getOptionalServerSessionFromHeaders } from "~/lib/auth-server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

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

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      role: true,
      onboardingCompletedAt: true,
    },
  });

  const isAdmin = user?.role === "admin";
  const needsOnboarding = user?.onboardingCompletedAt == null;

  return (
    <AppProviders>
      <DashboardUserProvider isAdmin={isAdmin} needsOnboarding={needsOnboarding}>
        <DashboardShell>{children}</DashboardShell>
      </DashboardUserProvider>
    </AppProviders>
  );
}
