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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ChevronDown, Clock, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import {
  getLastTimeClockClientId,
  setLastTimeClockClientId,
} from "~/lib/time-clock-prefs";
import {
  describeClockOutOutcome,
  formatElapsedSeconds,
  formatRunningTimerLabel,
  resolveClockDescription,
  resolveEffectiveHourlyRate,
  startedAtFromMinutesAgo,
} from "~/lib/time-clock";
import { invoiceLabel } from "~/lib/time-entry-display";
import { TimeEntryList } from "~/components/time-clock/time-entry-list";
import { TimeEntryEditDialog } from "~/components/time-clock/time-entry-edit-dialog";

const FEATURED_CLIENT_COUNT = 4;

type StartMode = "now" | "pick" | "ago";

function toDatetimeLocalValue(value: Date | string) {
  const start = new Date(value);
  start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
  return start.toISOString().slice(0, 16);
}

function RunningTextFields({
  running,
  updateRunningPending,
  onDescriptionCommit,
  onStartedAtCommit,
}: {
  running: { id: string; description: string | null; startedAt: Date };
  updateRunningPending: boolean;
  onDescriptionCommit: (description: string) => void;
  onStartedAtCommit: (startedAt: Date) => void;
}) {
  const [title, setTitle] = useState(running.description ?? "");
  const [runningStartedAt, setRunningStartedAt] = useState(() =>
    toDatetimeLocalValue(running.startedAt),
  );

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="clock-running-title">What are you working on?</Label>
        <Input
          id="clock-running-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onDescriptionCommit(title)}
          placeholder="What are you working on?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clock-running-start">Started at</Label>
        <Input
          id="clock-running-start"
          type="datetime-local"
          value={runningStartedAt}
          onChange={(e) => {
            const value = e.target.value;
            setRunningStartedAt(value);
            if (!value) return;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime()) || parsed > new Date()) return;
            onStartedAtCommit(parsed);
          }}
          disabled={updateRunningPending}
        />
      </div>
    </>
  );
}

export type TimeClockPanelProps = {
  defaultClientId?: string;
  defaultInvoiceId?: string;
  compact?: boolean;
};

function ClientChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

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

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: todayEntries } = api.timeEntries.getAll.useQuery({
    from: todayStart,
  });

  const [clientId, setClientId] = useState(() => {
    if (defaultClientId) return defaultClientId;
    return getLastTimeClockClientId() ?? "";
  });
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId);
  const [title, setTitle] = useState("");
  const [stopNote, setStopNote] = useState("");
  const [rate, setRate] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showAllClients, setShowAllClients] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [pickedStart, setPickedStart] = useState("");
  const [minutesAgo, setMinutesAgo] = useState("30");
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const draftClientId = running ? (running.clientId ?? "") : clientId;
  const { data: billableInvoices } = api.invoices.getBillable.useQuery(
    draftClientId ? { clientId: draftClientId } : undefined,
    { enabled: Boolean(draftClientId) },
  );

  const selectedClient = useMemo(
    () => clients?.find((c) => c.id === clientId),
    [clients, clientId],
  );

  const featuredClientIds = useMemo(() => {
    const ids: string[] = [];
    const last = getLastTimeClockClientId();
    if (last) ids.push(last);

    if (running?.clientId && !ids.includes(running.clientId)) {
      ids.unshift(running.clientId);
    }

    for (const entry of todayEntries ?? []) {
      if (entry.clientId && !ids.includes(entry.clientId)) {
        ids.push(entry.clientId);
      }
    }

    for (const client of clients ?? []) {
      if (!ids.includes(client.id)) ids.push(client.id);
      if (ids.length >= FEATURED_CLIENT_COUNT) break;
    }

    return ids;
  }, [clients, todayEntries, running]);

  const visibleClients = useMemo(() => {
    if (!clients?.length) return [];
    if (showAllClients) return clients;
    const featured = featuredClientIds
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    return featured.length > 0 ? featured : clients.slice(0, FEATURED_CLIENT_COUNT);
  }, [clients, featuredClientIds, showAllClients]);

  const hiddenClientCount = Math.max(0, (clients?.length ?? 0) - visibleClients.length);

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

  const updateRunning = api.timeEntries.updateRunning.useMutation({
    onSuccess: () => {
      void utils.timeEntries.getRunning.invalidate();
      void utils.invoices.getBillable.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleRunningDescriptionCommit(nextTitle: string) {
    if (!running) return;
    const next = resolveClockDescription(nextTitle);
    if (next === (running.description ?? "")) return;
    updateRunning.mutate({ description: next });
  }

  function handleRunningStartedAtCommit(parsed: Date) {
    if (!running) return;
    updateRunning.mutate({ startedAt: parsed });
  }

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
      setTitle("");
      setStopNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleClientChange(value: string) {
    if (running) {
      updateRunning.mutate({ clientId: value, invoiceId: "" });
      return;
    }

    setClientId(value);
    setInvoiceId("");
    setLastTimeClockClientId(value);
    const client = clients?.find((c) => c.id === value);
    setRate(client?.defaultHourlyRate ?? 0);
  }

  function handleInvoiceChange(value: string) {
    const next = value === "__none__" ? "" : value;
    if (running) {
      updateRunning.mutate({ invoiceId: next });
      return;
    }
    setInvoiceId(next);
  }

  function resolveStartedAt(): Date | undefined {
    if (startMode === "now") return undefined;
    if (startMode === "pick") {
      if (!pickedStart) {
        toast.error("Choose a start date and time");
        return undefined;
      }
      const parsed = new Date(pickedStart);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Invalid start time");
        return undefined;
      }
      return parsed;
    }
    const minutes = Number(minutesAgo);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) {
      toast.error("Enter minutes between 1 and 1440");
      return undefined;
    }
    return startedAtFromMinutesAgo(minutes);
  }

  function selectStartMode(mode: StartMode) {
    setStartMode(mode);
    if (mode === "pick" && !pickedStart) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setPickedStart(now.toISOString().slice(0, 16));
    }
  }

  function handleStart() {
    const startedAt = resolveStartedAt();
    if (startMode !== "now" && !startedAt) return;

    const description = resolveClockDescription(title);
    const effectiveRate = resolveEffectiveHourlyRate(rate, selectedClient);

    if (clientId) setLastTimeClockClientId(clientId);

    clockIn.mutate({
      description,
      clientId: clientId || "",
      invoiceId: invoiceId || undefined,
      rate: effectiveRate > 0 ? effectiveRate : undefined,
      startedAt,
    });
  }

  if (runningLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">Loading timer…</CardContent>
      </Card>
    );
  }

  const displayRate = running ? (running.rate ?? 0) : rate;
  const runningTitle = formatRunningTimerLabel(running?.description);
  const activeClientId = running ? (running.clientId ?? "") : clientId;
  const activeInvoiceId = running ? (running.invoiceId ?? "") : invoiceId;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {running ? (
        <div className="border-primary/20 bg-primary/5 rounded-2xl border p-6 text-center shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex h-2.5 w-2.5 rounded-full" />
            </span>
            <span className="text-primary text-sm font-medium">Timer running</span>
          </div>
          <p className="text-primary font-mono text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
            {formatElapsedSeconds(elapsed)}
          </p>
          <p className="mt-3 text-lg font-medium">{runningTitle}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {running.client?.name ?? "No client"}
            {running.invoice ? ` · ${invoiceLabel(running.invoice)}` : ""}
            {displayRate ? ` · $${displayRate}/hr` : ""}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {!running ? <Clock className="h-4 w-4" /> : null}
            {running ? "Update & stop" : "Clock in"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!running ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="clock-title" className="sr-only">
                  What are you working on?
                </Label>
                <Input
                  id="clock-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you working on?"
                  className="h-12 border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <div className="flex flex-wrap gap-2">
                  {visibleClients.map((client) => (
                    <ClientChip
                      key={client.id}
                      label={client.name}
                      active={activeClientId === client.id}
                      onClick={() => handleClientChange(client.id)}
                    />
                  ))}
                  {!showAllClients && hiddenClientCount > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setShowAllClients(true)}
                    >
                      +{hiddenClientCount} more
                    </Button>
                  ) : null}
                </div>
                {(showAllClients || (clients?.length ?? 0) > FEATURED_CLIENT_COUNT) && (
                  <Select value={clientId || undefined} onValueChange={handleClientChange}>
                    <SelectTrigger className="mt-1">
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
                )}
              </div>

              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select
                  value={invoiceId || "__none__"}
                  onValueChange={handleInvoiceChange}
                  disabled={!clientId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        clientId ? "Draft invoice (optional)" : "Choose a client first"
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

              <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground h-auto w-full justify-between px-0 py-1 font-normal hover:bg-transparent"
                  >
                    Rate & start time
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        optionsOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Hourly rate</Label>
                    <NumberInput
                      value={rate}
                      onChange={setRate}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                    {clientId && rate === 0 && selectedClient?.defaultHourlyRate ? (
                      <p className="text-muted-foreground text-xs">
                        Client default: ${selectedClient.defaultHourlyRate}/hr (used when left at zero).
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>When to start</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["now", "Now"],
                          ["pick", "Pick time"],
                          ["ago", "Time ago"],
                        ] as const
                      ).map(([mode, label]) => (
                        <Button
                          key={mode}
                          type="button"
                          size="sm"
                          variant={startMode === mode ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => selectStartMode(mode)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {startMode === "pick" ? (
                      <Input
                        type="datetime-local"
                        value={pickedStart}
                        onChange={(e) => setPickedStart(e.target.value)}
                        className="mt-2"
                      />
                    ) : null}
                    {startMode === "ago" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={1440}
                          value={minutesAgo}
                          onChange={(e) => setMinutesAgo(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground text-sm">minutes ago</span>
                      </div>
                    ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <>
              <RunningTextFields
                key={running.id}
                running={running}
                updateRunningPending={updateRunning.isPending}
                onDescriptionCommit={handleRunningDescriptionCommit}
                onStartedAtCommit={handleRunningStartedAtCommit}
              />

              <div className="space-y-2">
                <Label>Client</Label>
                <div className="flex flex-wrap gap-2">
                  {visibleClients.map((client) => (
                    <ClientChip
                      key={client.id}
                      label={client.name}
                      active={activeClientId === client.id}
                      onClick={() => handleClientChange(client.id)}
                    />
                  ))}
                  {!showAllClients && hiddenClientCount > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setShowAllClients(true)}
                    >
                      +{hiddenClientCount} more
                    </Button>
                  ) : null}
                </div>
                {(showAllClients || (clients?.length ?? 0) > FEATURED_CLIENT_COUNT) && (
                  <Select
                    value={activeClientId || undefined}
                    onValueChange={handleClientChange}
                    disabled={updateRunning.isPending}
                  >
                    <SelectTrigger className="mt-1">
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
                )}
              </div>

              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select
                  value={activeInvoiceId || "__none__"}
                  onValueChange={handleInvoiceChange}
                  disabled={!activeClientId || updateRunning.isPending}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        activeClientId
                          ? "Draft invoice (optional)"
                          : "Choose a client first"
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

              <div className="space-y-2">
                <Label htmlFor="clock-stop-note">Note on stop (optional)</Label>
                <Input
                  id="clock-stop-note"
                  value={stopNote}
                  onChange={(e) => setStopNote(e.target.value)}
                  placeholder={
                    running?.description?.trim()
                      ? running.description
                      : "Update description when you stop"
                  }
                />
              </div>
            </>
          )}

          {running ? (
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={() =>
                clockOut.mutate({
                  description: stopNote.trim() || undefined,
                })
              }
              disabled={clockOut.isPending}
            >
              <Square className="mr-2 h-4 w-4" />
              {clockOut.isPending ? "Stopping…" : "Stop & save"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={clockIn.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {clockIn.isPending ? "Starting…" : "Start timer"}
            </Button>
          )}
        </CardContent>
      </Card>

      {!compact ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Today&apos;s entries</CardTitle>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/dashboard/time-clock/entries">View all entries</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todayEntries?.some((e) => e.endedAt) ? (
              <TimeEntryList
                entries={todayEntries}
                onEdit={(entry) => setEditEntryId(entry.id)}
              />
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No entries today.{" "}
                <Link
                  href="/dashboard/time-clock/entries"
                  className="text-primary hover:underline"
                >
                  View history
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <TimeEntryEditDialog
        entryId={editEntryId}
        open={editEntryId != null}
        onOpenChange={(open) => {
          if (!open) setEditEntryId(null);
        }}
      />
    </div>
  );
}
