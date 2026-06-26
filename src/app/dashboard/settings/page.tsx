import { Suspense } from "react";
import { HydrateClient } from "~/trpc/server";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { DataTableSkeleton } from "~/components/data/data-table";
import { SettingsContent } from "./_components/settings-content";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const validTabs = ["general", "preferences", "data", "api"] as const;
  const initialTab = validTabs.includes(
    params.tab as (typeof validTabs)[number],
  )
    ? (params.tab as (typeof validTabs)[number])
    : "general";

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Settings"
        description="Manage your account preferences and data"
      />

      <HydrateClient>
        <Suspense fallback={<DataTableSkeleton columns={1} rows={4} />}>
          <SettingsContent initialTab={initialTab} />
        </Suspense>
      </HydrateClient>
    </DashboardPage>
  );
}
