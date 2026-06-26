import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DataTableSkeleton } from "~/components/data/data-table";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { getOptionalServerSessionFromHeaders } from "~/lib/auth-server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { HydrateClient } from "~/trpc/server";
import { AdministrationContent } from "./_components/administration-content";

export default async function AdministrationPage() {
  const session = await getOptionalServerSessionFromHeaders();

  if (session?.user) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { role: true },
    });

    if (user?.role !== "admin") {
      redirect("/dashboard");
    }
  }

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Administration"
        description="Manage account access and platform administration"
      />

      <HydrateClient>
        <Suspense fallback={<DataTableSkeleton columns={1} rows={4} />}>
          <AdministrationContent />
        </Suspense>
      </HydrateClient>
    </DashboardPage>
  );
}
