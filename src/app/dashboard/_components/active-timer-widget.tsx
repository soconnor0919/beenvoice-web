"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { describeClockOutOutcome, formatElapsedSeconds } from "~/lib/time-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

interface ActiveTimerWidgetProps {
  collapsed?: boolean;
  compact?: boolean;
}

export function ActiveTimerWidget({
  collapsed = false,
  compact = false,
}: ActiveTimerWidgetProps) {
  const utils = api.useUtils();
  const { data: running, isLoading } = api.timeEntries.getRunning.useQuery(
    undefined,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchInterval: 60_000,
    },
  );

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
      const message = describeClockOutOutcome({
        outcome: data.outcome,
        hours: data.hours,
        rate: data.rate,
        invoice: data.invoice,
      });

      if (data.outcome === "linked_to_invoice" && data.invoice) {
        toast.success("Timer stopped", {
          description: message,
          action: {
            label: "View invoice",
            onClick: () =>
              window.location.assign(`/dashboard/invoices/${data.invoice!.id}`),
          },
        });
      } else if (data.outcome === "saved_no_invoice" || data.outcome === "saved_no_client") {
        toast.warning("Time saved", { description: message });
      } else {
        toast.success(message);
      }

      void utils.timeEntries.getRunning.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !running) return null;

  const invoiceLabel = running.invoice
    ? `${running.invoice.invoicePrefix ?? "#"}${running.invoice.invoiceNumber}`
    : null;

  const description =
    running.description || (
      <span className="text-muted-foreground italic">No description</span>
    );

  const renderStopButton = (className?: string) => (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => clockOut.mutate({})}
      disabled={clockOut.isPending}
      className={cn(compact && "h-8 px-2", className)}
    >
      <Square className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
      {!compact && (clockOut.isPending ? "Stopping…" : "Stop")}
    </Button>
  );

  if (compact) {
    return (
      <div className="ml-auto flex flex-col items-center gap-1">
        <Link
          href="/dashboard/time-clock"
          className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-md border px-2.5 py-1.5"
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          <span className="text-primary font-mono text-sm font-bold tabular-nums">
            {formatElapsedSeconds(elapsed)}
          </span>
        </Link>
        {renderStopButton()}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/time-clock"
                className="border-primary/30 bg-primary/5 relative flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-primary/10"
              >
                <Clock className="text-primary h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-56 space-y-2 p-3">
              <p className="text-sm font-medium">
                {description}
                {running.client && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {running.client.name}
                  </span>
                )}
              </p>
              <p className="text-primary font-mono text-lg font-bold tabular-nums">
                {formatElapsedSeconds(elapsed)}
              </p>
              {invoiceLabel ? (
                <p className="text-muted-foreground text-xs">
                  Billing to{" "}
                  <Link
                    href={`/dashboard/invoices/${running.invoice!.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoiceLabel}
                  </Link>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">No invoice selected</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" asChild className="h-8 flex-1">
                  <Link href="/dashboard/time-clock">Open</Link>
                </Button>
                {renderStopButton()}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2">
          <span className="relative mt-1 flex h-2.5 w-2.5 flex-shrink-0">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex h-2.5 w-2.5 rounded-full" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug font-medium">
              {description}
              {running.client && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {running.client.name}
                </span>
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-snug">
              {invoiceLabel ? (
                <>
                  Billing to{" "}
                  <Link
                    href={`/dashboard/invoices/${running.invoice!.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoiceLabel}
                  </Link>
                </>
              ) : (
                <>No invoice selected — open time clock to assign</>
              )}
              {" · "}
              <Link href="/dashboard/time-clock" className="text-primary hover:underline">
                Time clock
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-primary text-center font-mono text-xl font-bold tabular-nums">
            {formatElapsedSeconds(elapsed)}
          </span>
          <div className="flex w-full flex-col gap-1.5">
            <Button variant="outline" size="sm" asChild className="h-8 w-full">
              <Link href="/dashboard/time-clock">
                <Clock className="mr-1 h-3.5 w-3.5" />
                Open
              </Link>
            </Button>
            {renderStopButton("w-full")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
