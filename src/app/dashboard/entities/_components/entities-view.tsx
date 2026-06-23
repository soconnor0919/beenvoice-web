"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ClientsTable } from "../../clients/_components/clients-table";
import { BusinessesTable } from "../../businesses/_components/businesses-table";

type EntityTab = "clients" | "businesses";

export function EntitiesView({ initialTab }: { initialTab: EntityTab }) {
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
    <div className="space-y-6">
      <PageHeader
        title="Entities"
        description="Clients you bill and businesses you send from"
        variant="gradient"
      >
        <Button asChild variant="default" className="hover-lift shadow-md">
          <Link href={addHref}>
            <Plus className="mr-2 h-5 w-5" />
            <span>{addLabel}</span>
          </Link>
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          <ClientsTable />
        </TabsContent>

        <TabsContent value="businesses" className="mt-6">
          <BusinessesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
