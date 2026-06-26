import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  DashboardPage,
  dashboardGapClass,
  dashboardGridClass,
} from "~/components/layout/dashboard-page";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";
import Link from "next/link";
import {
  Edit,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  Globe,
  Hash,
  ArrowLeft,
} from "lucide-react";

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessDetailPage({
  params,
}: BusinessDetailPageProps) {
  const { id } = await params;

  const business = await api.businesses.getById({ id });

  if (!business) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <DashboardPage className="pb-32">
      <DashboardPageHeader
        title={`${business.name}${business.nickname ? ` (${business.nickname})` : ""}`}
        description="View business details and information"
      >
        <Button asChild variant="outline" className="shadow-sm">
          <Link href="/dashboard/entities?tab=businesses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to Businesses</span>
          </Link>
        </Button>
        <Button asChild variant="default" className="shadow-md">
          <Link href={`/dashboard/businesses/${business.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Business</span>
          </Link>
        </Button>
      </DashboardPageHeader>

      <div className={cn(dashboardGridClass, "lg:grid-cols-3")}>
        {/* Business Information Card */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-2">
                  <Building className="text-primary h-5 w-5" />
                </div>
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="mb-4 text-lg font-semibold">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {business.email && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Mail className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Email
                        </p>
                        <p className="text-foreground text-sm">
                          {business.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Phone className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Phone
                        </p>
                        <p className="text-foreground text-sm">
                          {business.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Globe className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Website
                        </p>
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm hover:underline"
                        >
                          {business.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {business.taxId && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Hash className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Tax ID
                        </p>
                        <p className="text-foreground text-sm">
                          {business.taxId}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(business.addressLine1 ?? business.city ?? business.state) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-4 text-lg font-semibold">
                      Business Address
                    </h3>
                    <div className="flex items-start space-x-3">
                      <div className="bg-primary/10 p-2">
                        <MapPin className="text-primary h-4 w-4" />
                      </div>
                      <div className="space-y-1 text-sm">
                        {business.addressLine1 && (
                          <p className="text-foreground">
                            {business.addressLine1}
                          </p>
                        )}
                        {business.addressLine2 && (
                          <p className="text-foreground">
                            {business.addressLine2}
                          </p>
                        )}
                        {(business.city ??
                          business.state ??
                          business.postalCode) && (
                          <p className="text-foreground">
                            {[
                              business.city,
                              business.state,
                              business.postalCode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                        {business.country && (
                          <p className="text-foreground">{business.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Business Metadata */}
              <div>
                <h3 className="mb-4 text-lg font-semibold">Business Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2">
                      <Calendar className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Business Added
                      </p>
                      <p className="text-foreground text-sm">
                        {formatDate(business.createdAt)}
                      </p>
                    </div>
                  </div>

                  {business.nickname && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Building className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground text-sm font-medium">
                            Nickname
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Internal only
                          </Badge>
                        </div>
                        <p className="text-foreground text-sm">
                          {business.nickname}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Default Business Badge */}
                  {business.isDefault && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2">
                        <Building className="text-primary h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Status
                        </p>
                        <Badge
                          variant="default"
                          className="bg-primary/10 text-primary"
                        >
                          Default Business
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings & Actions Card */}
        <div className={cn("flex flex-col", dashboardGapClass)}>
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-2">
                  <Building className="text-primary h-5 w-5" />
                </div>
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link href={`/dashboard/businesses/${business.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Business
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link href="/dashboard/invoices/new">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="text-lg">About This Business</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground space-y-3 text-sm">
                <p>
                  This business profile is used for generating invoices and
                  represents your company information to clients.
                </p>
                {business.isDefault && (
                  <p className="text-primary">
                    This is your default business and will be automatically
                    selected when creating new invoices.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
