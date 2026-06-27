"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";
import { generateInvoicePDF } from "~/lib/pdf-export";
import { formatLineItemDetail } from "~/lib/invoice-line-item";
import { toast } from "sonner";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function StatusPill({ status, dueDate }: { status: string; dueDate: Date }) {
  const overdue = status === "sent" && new Date(dueDate) < new Date();
  const label = overdue ? "Overdue" : status.charAt(0).toUpperCase() + status.slice(1);
  const cls = overdue
    ? "bg-red-50 text-red-700 border-red-200"
    : status === "paid"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-yellow-50 text-yellow-700 border-yellow-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function PublicInvoiceView({ token }: { token: string }) {
  const [downloading, setDownloading] = useState(false);

  const { data: invoice, isLoading, error } = api.invoices.getByPublicToken.useQuery({ token });

  const handleDownload = async () => {
    if (!invoice || downloading) return;
    setDownloading(true);
    try {
      await generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        invoicePrefix: invoice.invoicePrefix,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        taxRate: invoice.taxRate,
        currency: invoice.currency ?? "USD",
        notes: invoice.notes,
        business: invoice.business,
        client: invoice.client,
        items: invoice.items,
      });
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error ?? !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl font-bold text-gray-800">Invoice not found</p>
        <p className="text-sm text-gray-500">This link may have expired or been revoked.</p>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = (subtotal * invoice.taxRate) / 100;
  const total = subtotal + taxAmount;
  const senderName = invoice.business
    ? invoice.business.nickname
      ? `${invoice.business.name} (${invoice.business.nickname})`
      : invoice.business.name
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-6">
            <p className="text-lg font-bold text-white">{senderName ?? "Invoice"}</p>
            {invoice.business?.email && (
              <p className="mt-0.5 text-sm text-gray-400">{invoice.business.email}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">
            {/* Invoice meta */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <StatusPill status={invoice.status} dueDate={invoice.dueDate} />
            </div>

            {/* Bill to */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Bill to</p>
              <p className="font-semibold text-gray-900">{invoice.client.name}</p>
              {invoice.client.email && (
                <p className="text-sm text-gray-500">{invoice.client.email}</p>
              )}
            </div>

            <Separator />

            {/* Line items */}
            <div className="space-y-3">
              {invoice.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 break-words">{item.description}</p>
                    <p className="text-gray-500">
                      {formatLineItemDetail(
                        item.hours,
                        item.rate,
                        (amount) => formatCurrency(amount, invoice.currency ?? "USD"),
                      )}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">
                    {formatCurrency(item.amount, invoice.currency ?? "USD")}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, invoice.currency ?? "USD")}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(taxAmount, invoice.currency ?? "USD")}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>Total</span>
                <span>{formatCurrency(total, invoice.currency ?? "USD")}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* PDF download */}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
              className="w-full"
            >
              {downloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download PDF</>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50 px-8 py-4 text-center">
            <p className="text-xs text-gray-400">Powered by beenvoice</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;
  return <PublicInvoiceView token={token} />;
}
