"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { invoiceLabel } from "~/lib/time-entry-display";
import type { RouterOutputs } from "~/trpc/react";

type TimeEntry = RouterOutputs["timeEntries"]["getById"];

function toDatetimeLocalValue(value: Date | string) {
  const start = new Date(value);
  start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
  return start.toISOString().slice(0, 16);
}

export type TimeEntryEditDialogProps = {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TimeEntryEditFormProps = {
  entry: TimeEntry;
  entryId: string;
  clients: RouterOutputs["clients"]["getAll"];
  onClose: () => void;
};

function TimeEntryEditForm({
  entry,
  entryId,
  clients,
  onClose,
}: TimeEntryEditFormProps) {
  const utils = api.useUtils();
  const [description, setDescription] = useState(entry.description ?? "");
  const [clientId, setClientId] = useState(entry.clientId ?? "");
  const [invoiceId, setInvoiceId] = useState(entry.invoiceId ?? "");
  const [rate, setRate] = useState(entry.rate ?? 0);
  const [startedAt, setStartedAt] = useState(() => toDatetimeLocalValue(entry.startedAt));
  const [endedAt, setEndedAt] = useState(() =>
    entry.endedAt ? toDatetimeLocalValue(entry.endedAt) : "",
  );

  const { data: billableInvoices } = api.invoices.getBillable.useQuery(
    clientId ? { clientId } : undefined,
    { enabled: Boolean(clientId) },
  );

  const hoursPreview = useMemo(() => {
    if (!startedAt || !endedAt) return null;
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  }, [endedAt, startedAt]);

  const updateEntry = api.timeEntries.update.useMutation({
    onSuccess: async () => {
      toast.success("Time entry updated");
      await Promise.all([
        utils.timeEntries.getAll.invalidate(),
        utils.timeEntries.getById.invalidate(),
        utils.invoices.getAll.invalidate(),
        utils.dashboard.getStats.invalidate(),
      ]);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEntry = api.timeEntries.delete.useMutation({
    onSuccess: async () => {
      toast.success("Time entry deleted");
      await Promise.all([
        utils.timeEntries.getAll.invalidate(),
        utils.invoices.getAll.invalidate(),
        utils.dashboard.getStats.invalidate(),
      ]);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : undefined;
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      toast.error("Invalid start or end time");
      return;
    }
    if (end && end <= start) {
      toast.error("End time must be after start time");
      return;
    }

    updateEntry.mutate({
      id: entryId,
      description,
      clientId: clientId || "",
      invoiceId: invoiceId || "",
      rate,
      startedAt: start,
      endedAt: end,
      hours: hoursPreview ?? undefined,
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entry-description">Description</Label>
          <Input
            id="entry-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Client</Label>
          <Select
            value={clientId || "__none__"}
            onValueChange={(v) => {
              setClientId(v === "__none__" ? "" : v);
              setInvoiceId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No client</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Invoice</Label>
          <Select
            value={invoiceId || "__none__"}
            onValueChange={(v) => setInvoiceId(v === "__none__" ? "" : v)}
            disabled={!clientId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Not on invoice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not on invoice</SelectItem>
              {billableInvoices?.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {invoiceLabel(inv)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Hourly rate</Label>
          <NumberInput value={rate} onChange={setRate} min={0} step={0.01} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entry-start">Started</Label>
            <Input
              id="entry-start"
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-end">Ended</Label>
            <Input
              id="entry-end"
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
            />
          </div>
        </div>

        {hoursPreview != null ? (
          <p className="text-muted-foreground text-sm">
            Duration: {hoursPreview.toFixed(2)}h
            {rate > 0 ? ` · $${(hoursPreview * rate).toFixed(2)}` : ""}
          </p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button
          type="button"
          variant="destructive"
          disabled={deleteEntry.isPending}
          onClick={() => deleteEntry.mutate({ id: entryId })}
        >
          Delete
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={updateEntry.isPending}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function TimeEntryEditDialog({
  entryId,
  open,
  onOpenChange,
}: TimeEntryEditDialogProps) {
  const entryQuery = api.timeEntries.getById.useQuery(
    { id: entryId ?? "" },
    { enabled: Boolean(entryId) && open },
  );
  const { data: clients = [] } = api.clients.getAll.useQuery(undefined, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit time entry</DialogTitle>
        </DialogHeader>

        {entryQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : entryQuery.data && entryId ? (
          <TimeEntryEditForm
            key={entryQuery.data.id}
            entry={entryQuery.data}
            entryId={entryId}
            clients={clients}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Time entry not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
