import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  DashboardPage,
  dashboardGapClass,
  dashboardGridClass,
} from "~/components/layout/dashboard-page";
import { cn } from "~/lib/utils";

export function InvoiceDetailsSkeleton() {
  return (
    <DashboardPage className="pb-24">
      <DashboardPageHeader
        title="Loading..."
        description="View and manage invoice information"
      >
        <Skeleton className="h-10 w-10 sm:w-32" />
        <Skeleton className="h-10 w-24" />
      </DashboardPageHeader>

      <div className={cn(dashboardGridClass, "lg:grid-cols-3")}>
        <div className={cn("flex flex-col lg:col-span-2", dashboardGapClass)}>
          {/* Invoice Header Skeleton */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="space-y-1 text-sm sm:space-y-0">
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="hidden h-4 w-32 sm:block" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right">
                    <Skeleton className="mb-1 h-4 w-24 sm:ml-auto" />
                    <Skeleton className="h-9 w-32 sm:ml-auto" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & Business Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client Skeleton */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-16" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-7 w-48" />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Skeleton */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-16" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-7 w-48" />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Item Rows */}
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-secondary/50 border-0">
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <Skeleton className="mb-2 h-5 w-3/4" />
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Totals */}
              <div className="bg-secondary rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className={cn("flex flex-col", dashboardGapClass)}>
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
