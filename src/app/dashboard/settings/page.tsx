import { Suspense } from "react";
import { HydrateClient } from "~/trpc/server";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { DataTableSkeleton } from "~/components/data/data-table";
import { SettingsContent } from "./_components/settings-content";

export default async function SettingsPage() {
  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Settings"
        description="Manage your account preferences and data"
      />

      <HydrateClient>
        <Suspense fallback={<DataTableSkeleton columns={1} rows={4} />}>
          <SettingsContent />
        </Suspense>
      </HydrateClient>
    </DashboardPage>
  );
}
