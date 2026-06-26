"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { Button } from "~/components/ui/button";
import { ClientsDataTable } from "../../clients/_components/clients-data-table";
import { BusinessesDataTable } from "../../businesses/_components/businesses-data-table";
import type { RouterOutputs } from "~/trpc/react";

type EntityTab = "clients" | "businesses";

type Client = RouterOutputs["clients"]["getAll"][number];
type Business = RouterOutputs["businesses"]["getAll"][number];

export function EntitiesView({
  initialTab,
  clients,
  businesses,
}: {
  initialTab: EntityTab;
  clients: Client[];
  businesses: Business[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: EntityTab =
    searchParams.get("tab") === "businesses" ? "businesses" : initialTab;

  function handleTabChange(value: string) {
    const next = value === "businesses" ? "businesses" : "clients";
    router.replace(`/dashboard/entities?tab=${next}`, { scroll: false });
  }

  const addHref =
    tab === "clients" ? "/dashboard/clients/new" : "/dashboard/businesses/new";
  const addLabel = tab === "clients" ? "Add client" : "Add business";

  return (
    <>
      <DashboardPageHeader
        title="Entities"
        description="Clients you bill and businesses you send from"
      >
        <Button asChild variant="default" className="hover-lift shadow-md">
          <Link href={addHref}>
            <Plus className="mr-2 h-5 w-5" />
            <span>{addLabel}</span>
          </Link>
        </Button>
      </DashboardPageHeader>

      <PageTabs value={tab} onValueChange={handleTabChange}>
        <PageTabsList>
          <PageTabsTrigger value="clients">Clients</PageTabsTrigger>
          <PageTabsTrigger value="businesses">Businesses</PageTabsTrigger>
        </PageTabsList>

        <PageTabsContent value="clients">
          {tab === "clients" ? <ClientsDataTable clients={clients} /> : null}
        </PageTabsContent>

        <PageTabsContent value="businesses">
          {tab === "businesses" ? (
            <BusinessesDataTable businesses={businesses} />
          ) : null}
        </PageTabsContent>
      </PageTabs>
    </>
  );
}
