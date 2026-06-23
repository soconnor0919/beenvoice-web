import { Suspense } from "react";
import { DataTableSkeleton } from "~/components/data/data-table";
import { api, HydrateClient } from "~/trpc/server";
import { EntitiesView } from "./_components/entities-view";

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "businesses" ? "businesses" : "clients";

  void api.clients.getAll.prefetch();
  void api.businesses.getAll.prefetch();

  return (
    <div className="page-enter space-y-6">
      <HydrateClient>
        <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
          <EntitiesView initialTab={initialTab} />
        </Suspense>
      </HydrateClient>
    </div>
  );
}
