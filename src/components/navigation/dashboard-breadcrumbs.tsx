"use client";

import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Skeleton } from "~/components/ui/skeleton";
import { getRouteLabel } from "~/lib/pluralize";
import { api } from "~/trpc/react";

function isUUID(str: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    str,
  );
}

// Special segment labels
const SPECIAL_SEGMENTS: Record<string, string> = {
  new: "New",
  edit: "Edit",
  import: "Import",
  export: "Export",
  dashboard: "Dashboard",
  entries: "All entries",
  "time-clock": "Time clock",
};

import { cn } from "~/lib/utils";

export function DashboardBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Determine resource type and ID from path
  const resourceType = segments[1]; // e.g., 'clients', 'invoices', 'businesses'
  const resourceId =
    segments[2] && isUUID(segments[2]) ? segments[2] : undefined;
  // const action = segments[3]; // e.g., 'edit'

  // Fetch client data if needed
  const { data: client, isLoading: clientLoading } =
    api.clients.getById.useQuery(
      { id: resourceId ?? "" },
      { enabled: resourceType === "clients" && !!resourceId },
    );

  // Fetch invoice data if needed
  const { data: invoice, isLoading: invoiceLoading } =
    api.invoices.getById.useQuery(
      { id: resourceId ?? "" },
      { enabled: resourceType === "invoices" && !!resourceId },
    );

  // Fetch business data if needed
  const { data: business, isLoading: businessLoading } =
    api.businesses.getById.useQuery(
      { id: resourceId ?? "" },
      { enabled: resourceType === "businesses" && !!resourceId },
    );

  // Generate breadcrumb items based on pathname
  const breadcrumbs = React.useMemo(() => {
    const items = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = `/${segments.slice(0, i + 1).join("/")}`;

      // Skip dashboard segment as it's always shown as root
      if (segment === "dashboard") continue;

      let label: string | React.ReactElement = "";
      let shouldShow = true;

      // Handle UUID segments
      if (segment && isUUID(segment)) {
        // Determine which resource we're looking at
        const prevSegment = segments[i - 1];

        if (prevSegment === "clients") {
          if (clientLoading) {
            label = <Skeleton className="inline-block h-5 w-24 align-middle" />;
          } else if (client) {
            label = client.name;
          }
        } else if (prevSegment === "invoices") {
          if (invoiceLoading) {
            label = <Skeleton className="inline-block h-5 w-24 align-middle" />;
          } else if (invoice) {
            label = format(new Date(invoice.issueDate), "MMM dd, yyyy");
          }
        } else if (prevSegment === "businesses") {
          if (businessLoading) {
            label = <Skeleton className="inline-block h-5 w-24 align-middle" />;
          } else if (business) {
            label = business.name;
          }
        }
      }
      // Handle action segments (edit, new, etc.)
      else if (segment && SPECIAL_SEGMENTS[segment]) {
        // Don't show 'edit' as the last breadcrumb when we have the resource name
        if (segment === "edit" && i === segments.length - 1 && resourceId) {
          shouldShow = false;
        } else {
          label = SPECIAL_SEGMENTS[segment];
        }
      }
      // Handle resource segments (clients, invoices, etc.)
      else if (segment) {
        // Use plural form for list pages, singular when there's a specific ID
        const nextSegment = segments[i + 1];
        const isListPage =
          !nextSegment || (!isUUID(nextSegment) && nextSegment !== "new");
        label = getRouteLabel(segment, isListPage);
      }

      if (shouldShow && label) {
        items.push({
          label,
          href: path,
          isLast: i === segments.length - 1,
        });
      }
    }

    return items;
  }, [
    segments,
    client,
    invoice,
    business,
    clientLoading,
    invoiceLoading,
    businessLoading,
    resourceId,
  ]);

  if (breadcrumbs.length === 0) return null;

  return (
    <Breadcrumb className={cn("mb-4 sm:mb-6", className)}>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href="/dashboard"
              className="truncate text-sm sm:text-base dark:text-gray-300"
            >
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.href}-${index}`}>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage className="truncate text-sm sm:text-base dark:text-white">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={crumb.href}
                    className="truncate text-sm sm:text-base dark:text-gray-300"
                  >
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
