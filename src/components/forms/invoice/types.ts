import { type RouterOutputs } from "~/trpc/react";

export type ClientType = RouterOutputs["clients"]["getAll"][number];
export type BusinessType = RouterOutputs["businesses"]["getAll"][number];

import type { LineItemBillingType } from "~/lib/invoice-line-item";

export interface InvoiceItem {
  id: string;
  date: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  billingType: LineItemBillingType;
}

export interface InvoiceFormData {
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
  defaultHourlyRate: number | null;
  items: InvoiceItem[];
}

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
] as const;
