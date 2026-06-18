import { HydrateClient, api } from "~/trpc/server";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { TimeClockPanel } from "~/components/time-clock/time-clock-panel";

export default async function TimeClockPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; invoiceId?: string }>;
}) {
  const params = await searchParams;
  void api.timeEntries.getRunning.prefetch();
  void api.clients.getAll.prefetch();
  if (params.clientId) {
    void api.invoices.getBillable.prefetch({ clientId: params.clientId });
  } else {
    void api.invoices.getBillable.prefetch();
  }

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-6">
      <DashboardPageHeader
        title="Time clock"
        description="Track billable hours and save them directly to an invoice"
      />
      <HydrateClient>
        <TimeClockPanel
          defaultClientId={params.clientId}
          defaultInvoiceId={params.invoiceId}
        />
      </HydrateClient>
    </div>
  );
}
