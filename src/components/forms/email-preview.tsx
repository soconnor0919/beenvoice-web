"use client";

import { generateInvoiceEmailTemplate } from "~/lib/email-templates";
import { getAppUrl } from "~/lib/app-url";
import { calculateLineItemAmount } from "~/lib/invoice-line-item";

interface EmailPreviewProps {
  subject: string;
  fromEmail: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  content: string;
  customMessage?: string;
  invoice?: {
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    taxRate: number;
    status?: string;
    totalAmount?: number;
    currency?: string | null;
    client?: {
      name: string;
      email: string | null;
    };
    business?: {
      name: string;
      email: string | null;
    };
    items?: Array<{
      id: string;
      date?: Date;
      description?: string;
      hours: number;
      rate: number;
      amount?: number;
    }>;
  };
  className?: string;
}

export function EmailPreview({
  subject,
  fromEmail,
  toEmail,
  ccEmail,
  bccEmail,
  content,
  customMessage,
  invoice,
  className,
}: EmailPreviewProps) {
  // Calculate total from invoice items if available
  const calculateTotal = () => {
    if (!invoice?.items) return 0;
    const subtotal = invoice.items.reduce(
      (sum, item) => sum + calculateLineItemAmount(item.hours, item.rate),
      0,
    );
    const taxAmount = subtotal * (invoice.taxRate / 100);
    return subtotal + taxAmount;
  };

  // Generate the branded email template if invoice is provided
  const emailTemplate = invoice
    ? generateInvoiceEmailTemplate({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          status: invoice.status ?? "draft",
          totalAmount: invoice.totalAmount ?? calculateTotal(),
          taxRate: invoice.taxRate,
          currency: invoice.currency,
          client: {
            name: invoice.client?.name ?? "Client",
            email: invoice.client?.email ?? null,
          },
          business: invoice.business ?? null,
          items:
            invoice.items?.map((item) => ({
              date: item.date ?? new Date(),
              description: item.description ?? "Service",
              hours: item.hours,
              rate: item.rate,
              amount: item.amount ?? calculateLineItemAmount(item.hours, item.rate),
            })) ?? [],
        },
        customContent: content,
        customMessage: customMessage,
        userName: invoice.business?.name ?? "Your Business",
        userEmail: fromEmail,
        baseUrl: getAppUrl(),
      })
    : null;

  return (
    <div className={className}>
      {/* Email Headers */}
      <div className="bg-muted/20 mb-4 space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              From:
            </span>
            <span className="font-mono text-sm break-all">{fromEmail}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              To:
            </span>
            <span className="font-mono text-sm break-all">{toEmail}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs font-medium">
              Subject:
            </span>
            <span className="text-sm font-semibold break-words">
              {subject || "No subject"}
            </span>
          </div>
        </div>
        {(ccEmail ?? bccEmail) && (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {ccEmail && (
              <div>
                <span className="text-muted-foreground block text-xs font-medium">
                  CC:
                </span>
                <span className="font-mono text-sm break-all">{ccEmail}</span>
              </div>
            )}
            {bccEmail && (
              <div>
                <span className="text-muted-foreground block text-xs font-medium">
                  BCC:
                </span>
                <span className="font-mono text-sm break-all">{bccEmail}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Content */}
      {emailTemplate ? (
        <div className="border bg-gray-50 p-1 shadow-sm">
          <iframe
            srcDoc={emailTemplate.html}
            className="h-[700px] w-full rounded border-0"
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      ) : (
        <div className="text-muted-foreground flex min-h-[400px] items-center justify-center">
          <p className="text-center text-sm">
            Email preview will appear here...
            <br />
            <span className="text-xs">
              Professional beenvoice-branded template will be generated
              automatically
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
