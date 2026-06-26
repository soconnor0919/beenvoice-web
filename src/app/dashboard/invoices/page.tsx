import Link from "next/link";
import { Suspense } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { FileText, Plus, Upload } from "lucide-react";
import { InvoicesDataTable } from "./_components/invoices-data-table";
import { DataTableSkeleton } from "~/components/data/data-table";

// Invoices Table Component
async function InvoicesTable() {
  const invoices = await api.invoices.getAll();

  return <InvoicesDataTable invoices={invoices} />;
}

export default async function InvoicesPage() {
  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Invoices"
        description="Manage your invoices and track payments"
      >
        <Button asChild variant="outline" className="hover-lift shadow-sm">
          <Link href="/dashboard/invoices/import">
            <Upload className="mr-2 h-5 w-5" />
            <span>Import CSV</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="hover-lift shadow-sm">
          <Link href="/dashboard/invoices/new?blank=1">
            <FileText className="mr-2 h-5 w-5" />
            <span>Blank invoice</span>
          </Link>
        </Button>
        <Button asChild variant="default" className="hover-lift shadow-md">
          <Link href="/dashboard/invoices/new">
            <Plus className="mr-2 h-5 w-5" />
            <span>Create Invoice</span>
          </Link>
        </Button>
      </DashboardPageHeader>

      <HydrateClient>
        <Suspense fallback={<DataTableSkeleton columns={7} rows={5} />}>
          <InvoicesTable />
        </Suspense>
      </HydrateClient>
    </DashboardPage>
  );
}
