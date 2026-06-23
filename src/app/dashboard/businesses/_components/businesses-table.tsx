"use client";

import { api } from "~/trpc/react";
import { DataTableSkeleton } from "~/components/data/data-table";
import { BusinessesDataTable } from "./businesses-data-table";

export function BusinessesTable() {
  const { data: businesses, isLoading } = api.businesses.getAll.useQuery();

  if (isLoading) {
    return <DataTableSkeleton columns={7} rows={5} />;
  }

  if (!businesses) {
    return null;
  }

  return <BusinessesDataTable businesses={businesses} />;
}
