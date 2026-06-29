export const RECEIPT_ACCEPT: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic"],
  "application/pdf": [".pdf"],
};

export const RECEIPT_MAX_SIZE = 10 * 1024 * 1024;

export const RECEIPT_UPLOAD_HINT =
  "PNG, JPG, or PDF · up to 10MB each";

export function receiptUrl(receiptId: string) {
  return `/api/receipts/${receiptId}`;
}

export function isImageReceipt(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isPdfReceipt(mimeType: string) {
  return mimeType === "application/pdf";
}

export function formatReceiptSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error instanceof Error ? reader.error : new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
