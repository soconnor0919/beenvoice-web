"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Square } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function ActiveTimerWidget() {
  const utils = api.useUtils();
  const { data: running, isLoading } = api.timeEntries.getRunning.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (running) {
      const tick = () =>
        setElapsed(Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const clockOut = api.timeEntries.clockOut.useMutation({
    onSuccess: (data) => {
      if (data.invoice) {
        const label = `${data.invoice.invoicePrefix}${data.invoice.invoiceNumber}`;
        toast.success("Timer stopped", {
          description: `Added to invoice ${label}`,
          action: {
            label: "View Invoice",
            onClick: () => window.location.assign(`/dashboard/invoices/${data.invoice!.id}`),
          },
        });
      } else {
        toast.success("Timer stopped");
      }
      void utils.timeEntries.getRunning.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !running) return null;

  const invoiceLabel = running.invoice
    ? `${running.invoice.invoicePrefix ?? "#"}${running.invoice.invoiceNumber}`
    : null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        {/* Pulse indicator */}
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
          <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {running.description || (
              <span className="text-muted-foreground italic">No description</span>
            )}
            {running.client && (
              <span className="text-muted-foreground font-normal"> · {running.client.name}</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {invoiceLabel ? (
              <>Tracking for{" "}
                <Link
                  href={`/dashboard/invoices/${running.invoice!.id}`}
                  className="text-primary hover:underline"
                >
                  {invoiceLabel}
                </Link>
              </>
            ) : (
              <>Started{" "}
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(running.startedAt))}
              </>
            )}
          </p>
        </div>

        <span className="text-primary font-mono text-2xl font-bold tabular-nums">
          {formatElapsed(elapsed)}
        </span>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => clockOut.mutate({})}
          disabled={clockOut.isPending}
        >
          <Square className="mr-1.5 h-3.5 w-3.5" />
          {clockOut.isPending ? "Stopping…" : "Stop"}
        </Button>
      </CardContent>
    </Card>
  );
}
