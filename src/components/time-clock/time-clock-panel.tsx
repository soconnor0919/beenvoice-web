"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NumberInput } from "~/components/ui/number-input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Clock, Play, Square, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { describeClockOutOutcome, formatElapsedSeconds } from "~/lib/time-clock";

export type TimeClockPanelProps = {
  defaultClientId?: string;
  defaultInvoiceId?: string;
  compact?: boolean;
};

export function TimeClockPanel({
  defaultClientId = "",
  defaultInvoiceId = "",
  compact = false,
}: TimeClockPanelProps) {
  const utils = api.useUtils();
  const { data: running, isLoading: runningLoading } = api.timeEntries.getRunning.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );
  const { data: clients } = api.clients.getAll.useQuery();

  const [clientId, setClientId] = useState(defaultClientId);
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId);
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const draftClientId = running ? (running.clientId ?? "") : clientId;
  const { data: billableInvoices } = api.invoices.getBillable.useQuery(
    draftClientId ? { clientId: draftClientId } : undefined,
    { enabled: Boolean(draftClientId) },
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: todayEntries } = api.timeEntries.getAll.useQuery({
    from: todayStart,
  });

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!running) return;

    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const clockIn = api.timeEntries.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Timer started");
      void utils.timeEntries.getRunning.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOut = api.timeEntries.clockOut.useMutation({
    onSuccess: (data) => {
      const message = describeClockOutOutcome({
        outcome: data.outcome,
        hours: data.hours,
        rate: data.rate,
        invoice: data.invoice,
      });

      if (data.outcome === "linked_to_invoice" && data.invoice) {
        toast.success("Time logged", {
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
      void utils.timeEntries.getAll.invalidate();
      void utils.invoices.getAll.invalidate();
      void utils.invoices.getBillable.invalidate();
      void utils.dashboard.getStats.invalidate();
      setDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleClientChange(value: string) {
    setClientId(value);
    setInvoiceId("");
    const client = clients?.find((c) => c.id === value);
    setRate(client?.defaultHourlyRate ?? 0);
  }

  if (runningLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">Loading timer…</CardContent>
      </Card>
    );
  }

  const invoiceLabel = (inv: {
    invoicePrefix: string | null;
    invoiceNumber: string;
    status: string;
  }) => `${inv.invoicePrefix ?? "#"}${inv.invoiceNumber} (${inv.status})`;

  const displayDescription = running ? running.description : description;
  const displayRate = running ? (running.rate ?? 0) : rate;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <Card className={running ? "border-primary/30 bg-primary/5" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {running ? (
              <span className="relative flex h-3 w-3">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
              </span>
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {running ? "Timer running" : "Time clock"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {running ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {displayDescription || (
                    <span className="text-muted-foreground italic">No description</span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {running.client?.name ?? "No client"}
                  {running.invoice
                    ? ` · ${running.invoice.invoicePrefix ?? "#"}${running.invoice.invoiceNumber}`
                    : ""}
                  {displayRate ? ` · $${displayRate}/hr` : ""}
                </p>
              </div>
              <span className="text-primary font-mono text-4xl font-bold tabular-nums">
                {formatElapsedSeconds(elapsed)}
              </span>
            </div>
          ) : null}

          {!running ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select value={clientId || undefined} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Invoice</Label>
                  <Select
                    value={invoiceId || "__none__"}
                    onValueChange={(v) => setInvoiceId(v === "__none__" ? "" : v)}
                    disabled={!clientId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          clientId ? "Select invoice (optional)" : "Choose a client first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No invoice — save entry only</SelectItem>
                      {billableInvoices?.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {invoiceLabel(inv)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you working on?"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hourly rate</Label>
                <NumberInput
                  value={rate}
                  onChange={setRate}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
                {clientId && rate === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Set a rate or add a default on the client record.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Update description on stop (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={running.description || "What did you work on?"}
              />
            </div>
          )}

          {running ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => clockOut.mutate({ description: description || undefined })}
              disabled={clockOut.isPending}
            >
              <Square className="mr-2 h-4 w-4" />
              {clockOut.isPending ? "Stopping…" : "Stop & save"}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                clockIn.mutate({
                  description,
                  clientId: clientId || "",
                  invoiceId: invoiceId || undefined,
                  rate: rate || undefined,
                })
              }
              disabled={clockIn.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {clockIn.isPending ? "Starting…" : "Start timer"}
            </Button>
          )}
        </CardContent>
      </Card>

      {!compact && todayEntries && todayEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s entries</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {todayEntries
              .filter((e) => e.endedAt)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {entry.description || (
                        <span className="text-muted-foreground italic">No description</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {entry.client?.name ?? "No client"}
                      {entry.invoice
                        ? ` · ${entry.invoice.invoicePrefix ?? "#"}${entry.invoice.invoiceNumber}`
                        : entry.hours
                          ? " · not on invoice"
                          : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-mono font-semibold">{entry.hours ?? "—"}h</p>
                    {entry.rate ? (
                      <p className="text-muted-foreground">${entry.rate}/hr</p>
                    ) : null}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {compact ? (
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href="/dashboard/time-clock">
            Open full time clock
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
