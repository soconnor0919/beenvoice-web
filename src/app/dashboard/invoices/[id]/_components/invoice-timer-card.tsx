"use client";

import { TimeClockPanel } from "~/components/time-clock/time-clock-panel";

interface InvoiceTimerCardProps {
  invoiceId: string;
  clientId: string;
}

export function InvoiceTimerCard({ invoiceId, clientId }: InvoiceTimerCardProps) {
  return (
    <TimeClockPanel
      compact
      defaultClientId={clientId}
      defaultInvoiceId={invoiceId}
    />
  );
}
