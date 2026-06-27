"use client";

import { ExternalLink, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  isImageReceipt,
  isPdfReceipt,
  receiptUrl,
} from "~/components/expenses/receipt-utils";

export interface ReceiptViewerTarget {
  id: string;
  originalFilename: string;
  mimeType: string;
}

interface ReceiptViewerDialogProps {
  receipt: ReceiptViewerTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptViewerDialog({
  receipt,
  open,
  onOpenChange,
}: ReceiptViewerDialogProps) {
  if (!receipt) return null;

  const url = receiptUrl(receipt.id);
  const isImage = isImageReceipt(receipt.mimeType);
  const isPdf = isPdfReceipt(receipt.mimeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate pr-8">
            {receipt.originalFilename}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/30 min-h-[200px] flex-1 overflow-auto rounded-md border">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={receipt.originalFilename}
              className="mx-auto max-h-[min(70vh,720px)] w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title={receipt.originalFilename}
              className="h-[min(70vh,720px)] w-full border-0"
            />
          ) : (
            <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <FileText className="h-10 w-10" />
              <p>Preview not available for this file type.</p>
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open file
                </a>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 sm:justify-between">
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </a>
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
