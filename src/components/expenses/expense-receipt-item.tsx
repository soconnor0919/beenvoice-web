"use client";

import { useState } from "react";
import { ExternalLink, Eye, FileText, Loader2, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  formatReceiptSize,
  isImageReceipt,
  receiptUrl,
} from "~/components/expenses/receipt-utils";
import type { ReceiptViewerTarget } from "~/components/expenses/receipt-viewer-dialog";

export interface ExpenseReceiptRecord {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

interface ExpenseReceiptItemProps {
  receipt: ExpenseReceiptRecord;
  expenseId: string;
  onView: (receipt: ReceiptViewerTarget) => void;
  compact?: boolean;
  readOnly?: boolean;
}

export function ExpenseReceiptItem({
  receipt,
  expenseId,
  onView,
  compact = false,
  readOnly = false,
}: ExpenseReceiptItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const utils = api.useUtils();

  const deleteReceipt = api.expenses.deleteReceipt.useMutation({
    onSuccess: () => {
      toast.success("Receipt removed");
      void utils.expenses.listReceipts.invalidate({ expenseId });
      void utils.expenses.getAll.invalidate();
      setConfirmDelete(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const url = receiptUrl(receipt.id);
  const isImage = isImageReceipt(receipt.mimeType);

  return (
    <>
      <div
        className={
          compact
            ? "flex items-center gap-2 rounded-md border p-2"
            : "flex items-center gap-3 rounded-md border p-2 sm:p-3"
        }
      >
        <button
          type="button"
          onClick={() => onView(receipt)}
          className="hover:ring-primary/40 focus-visible:ring-ring shrink-0 overflow-hidden rounded transition hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`View ${receipt.originalFilename}`}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className={
                compact ? "h-10 w-10 object-cover" : "h-12 w-12 object-cover sm:h-14 sm:w-14"
              }
            />
          ) : (
            <div
              className={
                compact
                  ? "bg-muted flex h-10 w-10 items-center justify-center"
                  : "bg-muted flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14"
              }
            >
              <FileText className="text-muted-foreground h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {receipt.originalFilename}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatReceiptSize(receipt.sizeBytes)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onView(receipt)}
            title="View receipt"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <a href={url} target="_blank" rel="noreferrer" title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteReceipt.isPending}
              title="Delete receipt"
            >
              {deleteReceipt.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{receipt.originalFilename}&rdquo; will be permanently
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReceipt.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReceipt.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteReceipt.mutate({ id: receipt.id });
              }}
            >
              {deleteReceipt.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
