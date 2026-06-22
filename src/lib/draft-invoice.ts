/** Default invoice number format (matches web/mobile create forms). */
export function generateInvoiceNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${date}-${String(now.getTime()).slice(-6)}`;
}

export function defaultDueDate(issueDate: Date): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + 30);
  return due;
}
