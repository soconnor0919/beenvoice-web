import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageHeader } from "~/components/layout/page-header";
import Link from "next/link";
import {
  Edit,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { getEffectiveInvoiceStatus } from "~/lib/invoice-status";
import type { StoredInvoiceStatus } from "~/types/invoice";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;

  const client = await api.clients.getById({ id });

  if (!client) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const totalInvoiced =
    client.invoices?.reduce((sum, invoice) => sum + invoice.totalAmount, 0) ||
    0;
  const paidInvoices =
    client.invoices?.filter((invoice) => invoice.status === "paid").length || 0;
  const pendingInvoices =
    client.invoices?.filter((invoice) => invoice.status === "sent").length || 0;

  return (
    <div className="space-y-6 pb-32">
      <PageHeader
        title={client.name}
        description="View client details and information"
        variant="gradient"
      >
        <Button asChild variant="outline" className="shadow-sm">
          <Link href="/dashboard/entities?tab=clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to Clients</span>
          </Link>
        </Button>
        <Button asChild variant="default" className="shadow-md">
          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Client</span>
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Client Information Card */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-2">
                  <Building className="text-primary h-5 w-5" />
                </div>
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {client.email && (
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2">
                      <Mail className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Email
                      </p>
                      <p className="text-foreground text-sm">{client.email}</p>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2">
                      <Phone className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Phone
                      </p>
                      <p className="text-foreground text-sm">{client.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              {(client.addressLine1 ?? client.city ?? client.state) && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Client Address</h3>
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2">
                      <MapPin className="text-primary h-4 w-4" />
                    </div>
                    <div className="space-y-1 text-sm">
                      {client.addressLine1 && (
                        <p className="text-foreground">{client.addressLine1}</p>
                      )}
                      {client.addressLine2 && (
                        <p className="text-foreground">{client.addressLine2}</p>
                      )}
                      {(client.city ?? client.state ?? client.postalCode) && (
                        <p className="text-foreground">
                          {[client.city, client.state, client.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {client.country && (
                        <p className="text-foreground">{client.country}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Client Since */}
              <div>
                <h3 className="mb-4 text-lg font-semibold">Client Details</h3>
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2">
                    <Calendar className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Client Since
                    </p>
                    <p className="text-foreground text-sm">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Card */}
        <div className="space-y-6">
          <Card className="bg-card border-border border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-2">
                  <DollarSign className="text-primary h-5 w-5" />
                </div>
                <span>Invoice Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-primary text-3xl font-bold">
                  {formatCurrency(totalInvoiced)}
                </p>
                <p className="text-muted-foreground text-sm">Total Invoiced</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-foreground text-xl font-semibold">
                    {paidInvoices}
                  </p>
                  <p className="text-muted-foreground text-sm">Paid</p>
                </div>
                <div>
                  <p className="text-foreground text-xl font-semibold">
                    {pendingInvoices}
                  </p>
                  <p className="text-muted-foreground text-sm">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          {client.invoices && client.invoices.length > 0 && (
            <Card className="">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2">
                    <DollarSign className="text-primary h-5 w-5" />
                  </div>
                  <span>Recent Invoices</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {client.invoices.slice(0, 3).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="card-secondary hover:bg-muted/50 border p-3 transition-colors"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-foreground font-medium break-words">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {formatDate(invoice.issueDate)}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2 self-start sm:flex-col sm:items-end sm:gap-1">
                          <p className="text-foreground font-semibold">
                            {formatCurrency(invoice.totalAmount)}
                          </p>
                          <Badge
                            variant={
                              getEffectiveInvoiceStatus(
                                invoice.status as StoredInvoiceStatus,
                                invoice.dueDate,
                              ) === "paid"
                                ? "default"
                                : getEffectiveInvoiceStatus(
                                      invoice.status as StoredInvoiceStatus,
                                      invoice.dueDate,
                                    ) === "sent"
                                  ? "secondary"
                                  : getEffectiveInvoiceStatus(
                                        invoice.status as StoredInvoiceStatus,
                                        invoice.dueDate,
                                      ) === "overdue"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="text-xs"
                          >
                            {getEffectiveInvoiceStatus(
                              invoice.status as StoredInvoiceStatus,
                              invoice.dueDate,
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
