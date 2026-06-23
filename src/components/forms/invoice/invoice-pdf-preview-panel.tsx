"use client";

import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type InvoicePdfPreviewInput = {
  invoiceNumber: string;
  invoicePrefix: string;
  businessId: string;
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  status: "draft" | "sent" | "paid";
  notes: string;
  emailMessage: string;
  taxRate: number;
  currency: string;
  items: Array<{
    date: Date;
    description: string;
    hours: number;
    rate: number;
  }>;
};

function canPreview(input: InvoicePdfPreviewInput | null): input is InvoicePdfPreviewInput {
  if (!input?.clientId) return false;
  if (input.items.length === 0) return false;
  return input.items.every((item) => item.description.trim().length > 0);
}

type InvoicePdfPreviewPanelProps = {
  input: InvoicePdfPreviewInput | null;
  enabled?: boolean;
  className?: string;
  heightClassName?: string;
};

export function InvoicePdfPreviewPanel({
  input,
  enabled = true,
  className,
  heightClassName = "h-[min(80vh,760px)]",
}: InvoicePdfPreviewPanelProps) {
  const previewReady = canPreview(input);

  const { data: pdfPreview, isFetching, error, refetch } =
    api.invoices.previewPdf.useQuery(input!, {
      enabled: enabled && previewReady,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          PDF preview
          {isFetching ? <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className={cn(
            "bg-muted/20 overflow-hidden border-t",
            heightClassName,
          )}
        >
          {!previewReady ? (
            <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
              Select a client and add descriptions for all line items to generate the
              PDF preview.
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-destructive text-sm">{error.message}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : isFetching && !pdfPreview ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 p-6 text-center text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating preview…
            </div>
          ) : pdfPreview ? (
            <iframe
              title="Invoice PDF preview"
              src={`data:${pdfPreview.contentType};base64,${pdfPreview.base64}`}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
              PDF preview will appear here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
