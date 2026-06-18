"use client";

import Link from "next/link";
import { TimeClockPanel } from "~/components/time-clock/time-clock-panel";
import { Button } from "~/components/ui/button";
import { ExternalLink } from "lucide-react";

interface InvoiceTimerCardProps {
  invoiceId: string;
  clientId: string;
}

export function InvoiceTimerCard({ invoiceId, clientId }: InvoiceTimerCardProps) {
  return (
    <div className="space-y-3">
      <TimeClockPanel
        compact
        defaultClientId={clientId}
        defaultInvoiceId={invoiceId}
      />
      <Button variant="outline" size="sm" className="w-full" asChild>
        <Link href={`/dashboard/time-clock?clientId=${clientId}&invoiceId=${invoiceId}`}>
          Open full time clock
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
