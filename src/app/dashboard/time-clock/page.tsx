"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { NumberInput } from "~/components/ui/number-input";
import { DatePicker } from "~/components/ui/date-picker";
import { toast } from "sonner";
import { Clock, Play, Square, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import Link from "next/link";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatDuration(hours: number | null | undefined) {
  if (!hours) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface ManualEntryForm {
  description: string;
  clientId: string;
  startedAt: Date;
  endedAt: Date | undefined;
  rate: number;
  notes: string;
}

const defaultManualForm: ManualEntryForm = {
  description: "",
  clientId: "",
  startedAt: new Date(),
  endedAt: undefined,
  rate: 0,
  notes: "",
};

export default function TimeClockPage() {
  const utils = api.useUtils();

  const { data: running, isLoading: runningLoading } =
    api.timeEntries.getRunning.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: entries = [], isLoading: entriesLoading } =
    api.timeEntries.getAll.useQuery();
  const { data: summary } = api.timeEntries.getSummary.useQuery();
  const { data: clients = [] } = api.clients.getAll.useQuery();

  const [clockInDesc, setClockInDesc] = useState("");
  const [clockInClientId, setClockInClientId] = useState("");
  const [clockInRate, setClockInRate] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [manualOpen, setManualOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState<ManualEntryForm>(defaultManualForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      const tick = () => {
        setElapsed(Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const clockIn = api.timeEntries.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Timer started");
      void utils.timeEntries.getRunning.invalidate();
      void utils.timeEntries.getAll.invalidate();
      setClockInDesc("");
      setClockInClientId("");
      setClockInRate(0);
    },
    onError: (e) => toast.error(e.message),
  });

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
      void utils.timeEntries.getAll.invalidate();
      void utils.timeEntries.getSummary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const create = api.timeEntries.create.useMutation({
    onSuccess: (data) => {
      if (data.invoice) {
        const label = `${data.invoice.invoicePrefix}${data.invoice.invoiceNumber}`;
        toast.success("Entry added", {
          description: `Added to invoice ${label}`,
          action: {
            label: "View Invoice",
            onClick: () => window.location.assign(`/dashboard/invoices/${data.invoice!.id}`),
          },
        });
      } else {
        toast.success("Entry added");
      }
      void utils.timeEntries.getAll.invalidate();
      void utils.timeEntries.getSummary.invalidate();
      setManualOpen(false);
      setManualForm(defaultManualForm);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = api.timeEntries.update.useMutation({
    onSuccess: () => {
      toast.success("Entry updated");
      void utils.timeEntries.getAll.invalidate();
      void utils.timeEntries.getSummary.invalidate();
      setManualOpen(false);
      setManualForm(defaultManualForm);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const del = api.timeEntries.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry deleted");
      void utils.timeEntries.getAll.invalidate();
      void utils.timeEntries.getSummary.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleEdit(entry: (typeof entries)[0]) {
    setEditId(entry.id);
    setManualForm({
      description: entry.description,
      clientId: entry.clientId ?? "",
      startedAt: new Date(entry.startedAt),
      endedAt: entry.endedAt ? new Date(entry.endedAt) : undefined,
      rate: entry.rate ?? 0,
      notes: entry.notes ?? "",
    });
    setManualOpen(true);
  }

  function handleManualSubmit() {
    if (!manualForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    const payload = {
      description: manualForm.description,
      clientId: manualForm.clientId || undefined,
      startedAt: manualForm.startedAt,
      endedAt: manualForm.endedAt,
      rate: manualForm.rate || undefined,
      notes: manualForm.notes || undefined,
    };
    if (editId) update.mutate({ id: editId, ...payload });
    else create.mutate(payload);
  }

  const completedEntries = entries.filter((e) => e.endedAt !== null);

  return (
    <div className="page-enter space-y-6 pb-6">
      <PageHeader
        title="Time Clock"
        description="Track billable hours with a live timer"
        variant="gradient"
      >
        <Button
          onClick={() => {
            setEditId(null);
            setManualForm(defaultManualForm);
            setManualOpen(true);
          }}
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Manual Entry
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Total Hours
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatDuration(summary?.totalHours)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Earnings
            </p>
            <p className="text-primary mt-1 text-2xl font-bold">
              {formatCurrency(summary?.totalEarnings ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Entries
            </p>
            <p className="mt-1 text-2xl font-bold">{summary?.count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active timer */}
      <Card className={running ? "border-primary/30 bg-primary/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {running ? "Timer Running" : "Start Timer"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runningLoading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : running ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-primary font-mono text-4xl font-bold tabular-nums">
                  {formatElapsed(elapsed)}
                </span>
                <div className="flex-1">
                  {running.description && (
                    <p className="font-medium">{running.description}</p>
                  )}
                  {running.client && (
                    <p className="text-muted-foreground text-sm">{running.client.name}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Started{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(running.startedAt))}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => clockOut.mutate({})}
                  disabled={clockOut.isPending}
                >
                  <Square className="mr-2 h-4 w-4" />
                  {clockOut.isPending ? "Stopping…" : "Stop Timer"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>What are you working on?</Label>
                  <Input
                    value={clockInDesc}
                    onChange={(e) => setClockInDesc(e.target.value)}
                    placeholder="e.g. Frontend development"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        clockIn.mutate({
                          description: clockInDesc,
                          clientId: clockInClientId || undefined,
                          rate: clockInRate || undefined,
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client (optional)</Label>
                  <Select
                    value={clockInClientId || "none"}
                    onValueChange={(v) => {
                      const id = v === "none" ? "" : v;
                      setClockInClientId(id);
                      if (id) {
                        const client = clients.find((c) => c.id === id);
                        if (client?.defaultHourlyRate && clockInRate === 0) {
                          setClockInRate(client.defaultHourlyRate);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-40 space-y-2">
                  <Label>Hourly Rate (optional)</Label>
                  <NumberInput
                    value={clockInRate}
                    onChange={(v) => setClockInRate(v)}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>
                <Button
                  onClick={() =>
                    clockIn.mutate({
                      description: clockInDesc,
                      clientId: clockInClientId || undefined,
                      rate: clockInRate || undefined,
                    })
                  }
                  disabled={clockIn.isPending}
                  className="hover-lift shadow-md"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {clockIn.isPending ? "Starting…" : "Start Timer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entriesLoading ? (
            <div className="text-muted-foreground p-6 text-center text-sm">Loading…</div>
          ) : completedEntries.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                No completed entries yet. Start a timer or add a manual entry.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {completedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {entry.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </p>
                      {entry.client && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.client.name}
                        </Badge>
                      )}
                      {entry.invoice && (
                        <Link href={`/dashboard/invoices/${entry.invoice.id}`}>
                          <Badge variant="outline" className="gap-1 text-xs hover:bg-accent">
                            <FileText className="h-3 w-3" />
                            {entry.invoice.invoicePrefix}{entry.invoice.invoiceNumber}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(entry.startedAt))}
                      {entry.endedAt
                        ? ` → ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(entry.endedAt))}`
                        : ""}
                    </p>
                    {entry.notes && (
                      <p className="text-muted-foreground mt-1 text-xs">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatDuration(entry.hours)}
                      </p>
                      {entry.rate && entry.hours ? (
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(entry.hours * entry.rate)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(entry)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 w-8 p-0"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual entry dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Entry" : "Add Manual Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={manualForm.description}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What did you work on?"
              />
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select
                value={manualForm.clientId || "none"}
                onValueChange={(v) =>
                  setManualForm((p) => ({ ...p, clientId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={manualForm.startedAt}
                  onDateChange={(d) =>
                    setManualForm((p) => ({ ...p, startedAt: d ?? new Date() }))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <DatePicker
                  date={manualForm.endedAt}
                  onDateChange={(d) =>
                    setManualForm((p) => ({ ...p, endedAt: d ?? undefined }))
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate (optional)</Label>
              <NumberInput
                value={manualForm.rate}
                onChange={(v) => setManualForm((p) => ({ ...p, rate: v }))}
                min={0}
                step={0.01}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={manualForm.notes}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Additional details…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? "Saving…"
                : editId
                  ? "Update"
                  : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && del.mutate({ id: deleteId })}
              disabled={del.isPending}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
