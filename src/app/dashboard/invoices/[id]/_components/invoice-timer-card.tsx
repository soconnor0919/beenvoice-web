"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NumberInput } from "~/components/ui/number-input";
import { Label } from "~/components/ui/label";
import { Clock, Play, Square } from "lucide-react";
import { toast } from "sonner";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

interface InvoiceTimerCardProps {
  invoiceId: string;
  clientId: string;
  defaultRate?: number | null;
}

export function InvoiceTimerCard({ invoiceId, clientId, defaultRate }: InvoiceTimerCardProps) {
  const utils = api.useUtils();
  const { data: running, isLoading } = api.timeEntries.getRunning.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const [description, setDescription] = useState("");
  const [rate, setRate] = useState(defaultRate ?? 0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isThisInvoice = running?.invoiceId === invoiceId;

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isThisInvoice && running) {
      const tick = () =>
        setElapsed(Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isThisInvoice, running]);

  const clockIn = api.timeEntries.clockIn.useMutation({
    onSuccess: () => {
      void utils.timeEntries.getRunning.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOut = api.timeEntries.clockOut.useMutation({
    onSuccess: (data) => {
      if (data.invoice) {
        toast.success("Time added to invoice");
      } else {
        toast.success("Timer stopped");
      }
      void utils.timeEntries.getRunning.invalidate();
      void utils.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;

  // Another timer is running for a different invoice
  if (running && !isThisInvoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            A timer is already running
            {running.invoice
              ? ` for ${running.invoice.invoicePrefix ?? "#"}${running.invoice.invoiceNumber}`
              : ""}
            . Stop it before starting a new one.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isThisInvoice && running) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex h-3 w-3">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
            </span>
            Timer Running
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{running.description || <span className="text-muted-foreground italic">No description</span>}</p>
            </div>
            <span className="text-primary font-mono text-3xl font-bold tabular-nums">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => clockOut.mutate({})}
            disabled={clockOut.isPending}
          >
            <Square className="mr-2 h-4 w-4" />
            {clockOut.isPending ? "Stopping…" : "Stop & Add to Invoice"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Track Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>What are you working on?</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Frontend development"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                clockIn.mutate({ description, clientId, invoiceId, rate: rate || undefined });
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hourly rate</Label>
          <NumberInput
            value={rate}
            onChange={(v) => setRate(v)}
            min={0}
            step={0.01}
            placeholder="0.00"
          />
        </div>
        <Button
          className="w-full"
          onClick={() =>
            clockIn.mutate({ description, clientId, invoiceId, rate: rate || undefined })
          }
          disabled={clockIn.isPending}
        >
          <Play className="mr-2 h-4 w-4" />
          {clockIn.isPending ? "Starting…" : "Start Timer"}
        </Button>
      </CardContent>
    </Card>
  );
}
