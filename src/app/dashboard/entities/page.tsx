import { api } from "~/trpc/server";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { EntitiesView } from "./_components/entities-view";

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "businesses" ? "businesses" : "clients";

  const [clients, businesses] = await Promise.all([
    api.clients.getAll(),
    api.businesses.getAll(),
  ]);

  return (
    <DashboardPage>
      <EntitiesView
        initialTab={initialTab}
        clients={clients}
        businesses={businesses}
      />
    </DashboardPage>
  );
}
