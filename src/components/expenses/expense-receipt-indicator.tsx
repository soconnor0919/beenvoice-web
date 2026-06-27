"use client";

import { useState } from "react";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ExpenseReceiptItem } from "~/components/expenses/expense-receipt-item";
import { ReceiptViewerDialog } from "~/components/expenses/receipt-viewer-dialog";
import type { ReceiptViewerTarget } from "~/components/expenses/receipt-viewer-dialog";
import { isImageReceipt, receiptUrl } from "~/components/expenses/receipt-utils";
import { cn } from "~/lib/utils";

interface ReceiptPreview {
  id: string;
  mimeType: string;
  originalFilename: string;
}

interface ExpenseReceiptIndicatorProps {
  expenseId: string;
  receiptCount: number;
  receiptPreview: ReceiptPreview | null;
  className?: string;
}

export function ExpenseReceiptIndicator({
  expenseId,
  receiptCount,
  receiptPreview,
  className,
}: ExpenseReceiptIndicatorProps) {
  const [listOpen, setListOpen] = useState(false);
  const [viewerReceipt, setViewerReceipt] = useState<ReceiptViewerTarget | null>(
    null,
  );

  const { data: receipts = [], isLoading } = api.expenses.listReceipts.useQuery(
    { expenseId },
    { enabled: listOpen && receiptCount > 1 },
  );

  if (receiptCount === 0) {
    return (
      <span className={cn("text-muted-foreground text-xs", className)}>—</span>
    );
  }

  const handleClick = () => {
    if (receiptCount === 1 && receiptPreview) {
      setViewerReceipt({
        id: receiptPreview.id,
        originalFilename: receiptPreview.originalFilename,
        mimeType: receiptPreview.mimeType,
      });
      return;
    }
    setListOpen(true);
  };

  const previewIsImage =
    receiptPreview && isImageReceipt(receiptPreview.mimeType);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn(
          "hover:bg-muted h-auto gap-2 px-2 py-1.5 font-normal",
          className,
        )}
        title={
          receiptCount === 1
            ? "View receipt"
            : `View ${receiptCount} receipts`
        }
      >
        {previewIsImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receiptUrl(receiptPreview.id)}
            alt=""
            className="h-8 w-8 rounded object-cover ring-1 ring-black/5"
          />
        ) : (
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded ring-1 ring-black/5">
            <FileText className="text-muted-foreground h-4 w-4" />
          </div>
        )}
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Paperclip className="h-3 w-3" />
          {receiptCount}
        </span>
      </Button>

      <ReceiptViewerDialog
        receipt={viewerReceipt}
        open={!!viewerReceipt}
        onOpenChange={(open) => {
          if (!open) setViewerReceipt(null);
        }}
      />

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipts ({receiptCount})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading receipts…
              </div>
            ) : (
              receipts.map((receipt) => (
              <ExpenseReceiptItem
                key={receipt.id}
                receipt={receipt}
                expenseId={expenseId}
                onView={(r) => {
                  setListOpen(false);
                  setViewerReceipt(r);
                }}
                compact
              />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
