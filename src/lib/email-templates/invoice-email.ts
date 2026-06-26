import { getAppUrl } from "~/lib/app-url";

interface InvoiceEmailTemplateProps {
  invoice: {
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    status: string;
    totalAmount: number;
    taxRate: number;
    currency?: string | null;
    client: {
      name: string;
      email: string | null;
    };
    business?: {
      name: string;
      nickname?: string | null;
      email?: string | null;
      phone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
    items: Array<{
      date: Date;
      description: string;
      hours: number;
      rate: number;
      amount: number;
    }>;
  };
  customContent?: string;
  customMessage?: string;
  userName?: string;
  userEmail?: string;
  baseUrl?: string;
}

export function generateInvoiceEmailTemplate({
  invoice,
  customContent,
  customMessage,
  userName,
  userEmail,
  baseUrl = getAppUrl(),
}: InvoiceEmailTemplateProps): { html: string; text: string } {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency ?? "USD",
    }).format(amount);
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const total = subtotal + taxAmount;

  const businessAddress = invoice.business
    ? [
        invoice.business.addressLine1,
        invoice.business.addressLine2,
        invoice.business.city && invoice.business.state
          ? `${invoice.business.city}, ${invoice.business.state} ${invoice.business.postalCode ?? ""}`.trim()
          : (invoice.business.city ?? invoice.business.state),
        invoice.business.country !== "United States"
          ? invoice.business.country
          : null,
      ]
        .filter(Boolean)
        .join("<br>")
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="format-detection" content="telephone=no">
    <meta name="format-detection" content="date=no">
    <meta name="format-detection" content="address=no">
    <meta name="format-detection" content="email=no">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
            line-height: 1.6;
            color: #0f0f0f;
            background-color: #f9fafb;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 0;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .header {
            background: #0f0f0f;
            padding: 32px 24px;
            text-align: center;
            color: white;
        }

        .header-content {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .header-subtitle {
            font-size: 16px;
            opacity: 0.8;
            font-weight: normal;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .content {
            padding: 32px 24px;
        }

        .greeting {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 24px;
            color: #0f0f0f;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .message {
            font-size: 15px;
            line-height: 1.7;
            margin-bottom: 32px;
            color: #374151;
        }

        .invoice-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0;
            padding: 16px;
            margin: 24px 0;
        }

        .invoice-summary {
            margin-bottom: 20px;
        }

        .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #0f0f0f;
            margin-bottom: 8px;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .invoice-date {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 4px;
        }



        .invoice-details {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            margin-top: 20px;
        }

        .detail-row {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            border-bottom: 1px solid #f3f4f6;
        }



        .detail-row:last-child {
            border-bottom: none;
            font-weight: 600;
            padding-top: 12px;
            border-top: 2px solid #e5e7eb;
            margin-top: 8px;
        }

        .detail-label {
            font-size: 14px;
            color: #6b7280;
            text-align: left;
            padding: 8px 0;
        }

        .detail-value {
            font-size: 14px;
            color: #1f2937;
            font-weight: bold;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            text-align: right;
            padding: 8px 0;
        }

        .business-info {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .business-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f0f0f;
            margin-bottom: 8px;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .business-details {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.5;
        }

        .custom-content ul {
            margin: 16px 0;
            padding-left: 24px;
        }

        .custom-content li {
            margin: 8px 0;
            padding-left: 4px;
        }

        .cta-section {
            text-align: center;
            margin: 32px 0;
            padding: 24px;
            background-color: #f9fafb;
            border-radius: 0;
        }

        .cta-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
        }

        .attachment-notice {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0;
            padding: 16px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .attachment-icon {
            width: 20px;
            height: 20px;
            background-color: #374151;
            border-radius: 0;
            flex-shrink: 0;
        }

        .attachment-text {
            font-size: 14px;
            color: #374151;
            font-weight: bold;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
        }

        .signature-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f0f0f;
            margin-bottom: 4px;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        .signature-email {
            font-size: 14px;
            color: #6b7280;
        }

        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer-brand {
            font-size: 18px;
            font-weight: bold;
            color: #0f0f0f;
            margin: 0 auto 8px;
            display: block;
            text-align: center;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
            letter-spacing: 0.5px;
        }

        .footer-text {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.5;
            font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
        }

        /* Email client specific fixes */
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                max-width: 600px !important;
            }
        }

        /* Outlook specific fixes */
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        /* Gmail specific fixes */
        .gmail-fix {
            border-collapse: separate !important;
            border-spacing: 0 !important;
        }

        /* Apple Mail attachment preview fix */
        .attachment-notice {
            border: 1px solid #e5e7eb !important;
            background-color: #f9fafb !important;
        }

        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }

            .header, .content, .footer {
                padding-left: 16px;
                padding-right: 16px;
            }

            .invoice-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .invoice-amount {
                text-align: left;
            }

            .detail-row td {
                display: block !important;
                width: 100% !important;
                text-align: left !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="header-content">Invoice ${invoice.invoiceNumber}</div>
            <div class="header-subtitle">From ${invoice.business?.name ?? "Your Business"}</div>
        </div>

        <div class="content">
            <div class="message">
                <div class="greeting">${getTimeOfDayGreeting()},</div>
                <p>I hope this email finds you well. Please find attached invoice <strong>#${invoice.invoiceNumber}</strong>
                for the services provided. The invoice details are summarized below for your reference.</p>
                ${customMessage ? `<div style="margin: 16px 0; padding: 16px; background-color: #f9fafb; border-left: 4px solid #374151; border-radius: 0;">${customMessage}</div>` : ""}
            </div>
            ${customContent ? `<div class="message custom-content">${customContent}</div>` : ""}

            <div class="invoice-card">
                <div class="invoice-summary">
                    <div class="invoice-number">#${invoice.invoiceNumber}</div>
                    <div class="invoice-date">Issue Date: ${formatDate(invoice.issueDate)}</div>
                    <div class="invoice-date">Due Date: ${formatDate(invoice.dueDate)}</div>
                </div>

                <div class="invoice-details">
                    <table class="detail-row" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0; width: 100%; border-bottom: 1px solid #f3f4f6;">
                        <tr>
                            <td class="detail-label" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: left;">Client</td>
                            <td class="detail-value" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: right;">${invoice.client.name}</td>
                        </tr>
                    </table>
                    <table class="detail-row" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0; width: 100%; border-bottom: 1px solid #f3f4f6;">
                        <tr>
                            <td class="detail-label" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: left;">Subtotal</td>
                            <td class="detail-value" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: right;">${formatCurrency(subtotal)}</td>
                        </tr>
                    </table>
                    ${
                      invoice.taxRate > 0
                        ? `<table class="detail-row" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0; width: 100%; border-bottom: 1px solid #f3f4f6;">
                            <tr>
                                <td class="detail-label" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: left;">Tax (${invoice.taxRate}%)</td>
                                <td class="detail-value" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: right;">${formatCurrency(taxAmount)}</td>
                            </tr>
                           </table>`
                        : ""
                    }
                    <table class="detail-row" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: separate; border-spacing: 0; width: 100%; border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 12px;">
                        <tr>
                            <td class="detail-label" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: left; font-weight: bold; font-size: 16px;">Total</td>
                            <td class="detail-value" style="width: 50%; vertical-align: top; padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #0f0f0f;">${formatCurrency(total)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="attachment-notice">
                <div class="attachment-icon"></div>
                <div class="attachment-text">
                    PDF invoice attached: invoice-${invoice.invoiceNumber}.pdf
                </div>
            </div>

            <div class="cta-section">
                <div class="cta-text">
                    If you have any questions about this invoice, please don't hesitate to reach out.
                    Thank you for your business!
                </div>
            </div>

            ${
              !customContent
                ? `<div class="signature">
                <div class="signature-name">${userName ?? invoice.business?.name ?? "Best regards"}</div>
                ${userEmail ? `<div class="signature-email">${userEmail}</div>` : ""}
            </div>`
                : ""
            }
        </div>

        <div class="footer">
            <div class="footer-brand">beenvoice</div>
            ${
              invoice.business
                ? `<div class="footer-text">
                    <strong>${invoice.business.name}</strong><br>
                    ${invoice.business.email ? `${invoice.business.email}<br>` : ""}
                    ${invoice.business.phone ? `${invoice.business.phone}<br>` : ""}
                    ${businessAddress ? `${businessAddress}` : ""}
                   </div>`
                : `<div class="footer-text">
                    Professional invoicing for modern businesses
                   </div>`
            }
        </div>
    </div>
</body>
</html>`;

  // Generate plain text version
  const text = `
${getTimeOfDayGreeting()},

I hope this email finds you well. Please find attached invoice #${invoice.invoiceNumber} for the services provided.${
    customMessage
      ? `\n\n${customMessage
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim()}`
      : ""
  }${
    customContent
      ? `\n\n${customContent
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim()}`
      : ""
  }

INVOICE DETAILS
═══════════════
Invoice Number: #${invoice.invoiceNumber}
Issue Date: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}
Client: ${invoice.client.name}

AMOUNT BREAKDOWN
═══════════════
Subtotal: ${formatCurrency(subtotal)}${
    invoice.taxRate > 0
      ? `\nTax (${invoice.taxRate}%): ${formatCurrency(taxAmount)}`
      : ""
  }
Total: ${formatCurrency(total)}

ATTACHMENT
═══════════════
PDF invoice attached: invoice-${invoice.invoiceNumber}.pdf

If you have any questions about this invoice, please don't hesitate to reach out.
Thank you for your business!

${userName ?? invoice.business?.name ?? "Best regards"}${
    userEmail ? `\n${userEmail}` : ""
  }

---
${
  invoice.business
    ? `${invoice.business.name}${invoice.business.email ? `\n${invoice.business.email}` : ""}${
        invoice.business.phone ? `\n${invoice.business.phone}` : ""
      }${businessAddress ? `\n${businessAddress.replace(/<br>/g, "\n")}` : ""}`
    : "Professional invoicing for modern businesses"
}
`.trim();

  return { html, text };
}
