"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { generateInvoicePDF } from "~/lib/pdf-export";
import { Download, Loader2 } from "lucide-react";

interface PDFDownloadButtonProps {
  invoiceId: string;
  variant?: "default" | "outline" | "ghost" | "icon" | "secondary";
  className?: string;
}

export function PDFDownloadButton({
  invoiceId,
  variant = "outline",
  className,
}: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch invoice data when PDF generation is triggered
  const { refetch: fetchInvoice } = api.invoices.getById.useQuery(
    { id: invoiceId },
    { enabled: false },
  );
  const { data: pdfSettings } = api.settings.getPdfSettings.useQuery(undefined, {
    staleTime: 60_000,
  });

  const handleDownloadPDF = async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      // Fetch fresh invoice data
      const { data: invoiceData } = await fetchInvoice();

      if (!invoiceData) {
        throw new Error("Invoice not found");
      }

      // Map invoice to PDF format with currency support
      const pdfData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoicePrefix: invoiceData.invoicePrefix,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        status: invoiceData.status,
        totalAmount: invoiceData.totalAmount,
        taxRate: invoiceData.taxRate,
        currency: invoiceData.currency ?? "USD",
        notes: invoiceData.notes,
        business: invoiceData.business,
        client: invoiceData.client,
        items: invoiceData.items,
      };

      await generateInvoicePDF(pdfData, {
        pdfTemplate: pdfSettings?.pdfTemplate,
        pdfAccentColor: pdfSettings?.pdfAccentColor,
        pdfFontFamily: pdfSettings?.pdfFontFamily,
        pdfNumericFontFamily: pdfSettings?.pdfNumericFontFamily,
        pdfFooterText: pdfSettings?.pdfFooterText,
        pdfShowLogo: pdfSettings?.pdfShowLogo,
        pdfShowPageNumbers: pdfSettings?.pdfShowPageNumbers,
      });
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        onClick={handleDownloadPDF}
        disabled={isGenerating}
        variant="ghost"
        className={className}
      >
        {isGenerating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Download className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleDownloadPDF}
      disabled={isGenerating}
      variant={variant}
      className={`shadow-sm ${className ?? ""}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download className="mr-2 h-5 w-5" />
          <span>Download PDF</span>
        </>
      )}
    </Button>
  );
}
