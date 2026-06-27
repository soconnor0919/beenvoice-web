"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Label } from "~/components/ui/label";
import { FileUpload } from "~/components/forms/file-upload";
import { ExpenseReceiptItem } from "~/components/expenses/expense-receipt-item";
import { ReceiptViewerDialog } from "~/components/expenses/receipt-viewer-dialog";
import type { ReceiptViewerTarget } from "~/components/expenses/receipt-viewer-dialog";
import {
  fileToBase64,
  RECEIPT_ACCEPT,
  RECEIPT_MAX_SIZE,
  RECEIPT_UPLOAD_HINT,
} from "~/components/expenses/receipt-utils";

interface ExpenseReceiptsPanelProps {
  expenseId: string | null;
  readOnly?: boolean;
}

export function ExpenseReceiptsPanel({
  expenseId,
  readOnly = false,
}: ExpenseReceiptsPanelProps) {
  const [viewerReceipt, setViewerReceipt] = useState<ReceiptViewerTarget | null>(
    null,
  );
  const [uploadKey, setUploadKey] = useState(0);
  const processedFileCountRef = useRef(0);

  const utils = api.useUtils();
  const { data: receipts = [], isLoading } = api.expenses.listReceipts.useQuery(
    { expenseId: expenseId! },
    { enabled: !!expenseId },
  );

  const uploadReceipt = api.expenses.uploadReceipt.useMutation({
    onSuccess: () => {
      if (expenseId) {
        void utils.expenses.listReceipts.invalidate({ expenseId });
        void utils.expenses.getAll.invalidate();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFiles = async (files: File[]) => {
    if (!expenseId || files.length === 0) return;

    const newFiles = files.slice(processedFileCountRef.current);
    processedFileCountRef.current = files.length;
    if (newFiles.length === 0) return;

    let uploaded = 0;
    for (const file of newFiles) {
      try {
        const data = await fileToBase64(file);
        await uploadReceipt.mutateAsync({
          expenseId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          data,
        });
        uploaded++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(`${file.name}: ${message}`);
      }
    }

    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Receipt uploaded" : `${uploaded} receipts uploaded`,
      );
      processedFileCountRef.current = 0;
      setUploadKey((k) => k + 1);
    }
  };

  if (!expenseId) {
    return (
      <div className="space-y-2 border-t pt-4">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Receipts
        </Label>
        <div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
          Save the expense first, then drag and drop receipts here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Receipts
          {receipts.length > 0 && (
            <span className="text-muted-foreground text-xs font-normal">
              ({receipts.length})
            </span>
          )}
        </Label>
        {uploadReceipt.isPending && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading…
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading receipts…
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
          {readOnly
            ? "No receipts attached."
            : "No receipts yet. Drop images or PDFs below."}
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <ExpenseReceiptItem
              key={receipt.id}
              receipt={receipt}
              expenseId={expenseId}
              onView={setViewerReceipt}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <FileUpload
          key={`${expenseId}-${uploadKey}`}
          onFilesSelected={(files) => void handleFiles(files)}
          accept={RECEIPT_ACCEPT}
          maxFiles={5}
          maxSize={RECEIPT_MAX_SIZE}
          disabled={uploadReceipt.isPending}
          placeholder="Drop receipts here or tap to browse"
          description={RECEIPT_UPLOAD_HINT}
          className="[&>div:first-child]:p-4 sm:[&>div:first-child]:p-6"
        />
      )}

      <ReceiptViewerDialog
        receipt={viewerReceipt}
        open={!!viewerReceipt}
        onOpenChange={(open) => {
          if (!open) setViewerReceipt(null);
        }}
      />
    </div>
  );
}
