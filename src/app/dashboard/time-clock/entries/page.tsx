import Link from "next/link";
import { HydrateClient, api } from "~/trpc/server";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { TimeEntriesHistory } from "~/components/time-clock/time-entries-history";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function TimeClockEntriesPage() {
  void api.timeEntries.getAll.prefetch();

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Time entries"
        description="Your completed time tracking history"
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/time-clock">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Time clock
          </Link>
        </Button>
      </DashboardPageHeader>
      <HydrateClient>
        <TimeEntriesHistory />
      </HydrateClient>
    </DashboardPage>
  );
}
