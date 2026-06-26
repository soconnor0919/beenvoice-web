"use client";

import {
  Check,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage } from "~/components/layout/dashboard-page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
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
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

const SCHEDULES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

type Schedule = (typeof SCHEDULES)[number]["value"];

interface RecurringItemInput {
  description: string;
  hours: number;
  rate: number;
}

interface RecurringFormState {
  name: string;
  clientId: string;
  businessId: string;
  schedule: Schedule;
  invoicePrefix: string;
  taxRate: number;
  currency: string;
  notes: string;
  emailMessage: string;
  items: RecurringItemInput[];
}

const defaultForm = (): RecurringFormState => ({
  name: "",
  clientId: "",
  businessId: "",
  schedule: "monthly",
  invoicePrefix: "#",
  taxRate: 0,
  currency: "USD",
  notes: "",
  emailMessage: "",
  items: [{ description: "", hours: 0, rate: 0 }],
});

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function scheduleLabel(s: string) {
  return SCHEDULES.find((x) => x.value === s)?.label ?? s;
}

function RecurringForm({
  form,
  setForm,
  clients,
  businesses,
}: {
  form: RecurringFormState;
  setForm: React.Dispatch<React.SetStateAction<RecurringFormState>>;
  clients: { id: string; name: string }[];
  businesses: { id: string; name: string }[];
}) {
  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { description: "", hours: 0, rate: 0 }] }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, field: keyof RecurringItemInput, value: string | number) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>Template name</Label>
        <Input
          placeholder="e.g. Monthly retainer"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select
            value={form.clientId}
            onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Business (optional)</Label>
          <Select
            value={form.businessId}
            onValueChange={(v) => setForm((f) => ({ ...f, businessId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {businesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Schedule</Label>
          <Select
            value={form.schedule}
            onValueChange={(v) => setForm((f) => ({ ...f, schedule: v as Schedule }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Input
            maxLength={3}
            placeholder="USD"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tax rate (%)</Label>
        <NumberInput
          value={form.taxRate}
          onChange={(v) => setForm((f) => ({ ...f, taxRate: v ?? 0 }))}
          min={0}
          max={100}
          step={0.1}
        />
      </div>

      {/* Line items */}
      <div className="space-y-2">
        <Label>Line items</Label>
        {form.items.map((item, idx) => (
          <div key={idx} className="bg-secondary space-y-2 rounded-lg p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
                className="flex-1"
              />
              {form.items.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive h-8 w-8 p-0 shrink-0"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Hours</Label>
                <NumberInput
                  value={item.hours}
                  onChange={(v) => updateItem(idx, "hours", v ?? 0)}
                  min={0}
                  step={0.25}
                />
              </div>
              <div>
                <Label className="text-xs">Rate ($/hr)</Label>
                <NumberInput
                  value={item.rate}
                  onChange={(v) => updateItem(idx, "rate", v ?? 0)}
                  min={0}
                  step={1}
                />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add item
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Notes shown on generated invoices"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
      </div>
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringFormState>(defaultForm());

  const { data: recurring, isLoading } = api.recurringInvoices.getAll.useQuery();
  const { data: clients = [] } = api.clients.getAll.useQuery();
  const { data: businesses = [] } = api.businesses.getAll.useQuery();
  const utils = api.useUtils();

  const invalidate = () => void utils.recurringInvoices.getAll.invalidate();

  const create = api.recurringInvoices.create.useMutation({
    onSuccess: () => { toast.success("Recurring invoice created"); setCreateOpen(false); setForm(defaultForm()); invalidate(); },
    onError: (e) => toast.error(e.message ?? "Failed to create"),
  });

  const update = api.recurringInvoices.update.useMutation({
    onSuccess: () => { toast.success("Updated"); setEditId(null); setForm(defaultForm()); invalidate(); },
    onError: (e) => toast.error(e.message ?? "Failed to update"),
  });

  const pause = api.recurringInvoices.pause.useMutation({
    onSuccess: () => { toast.success("Paused"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resume = api.recurringInvoices.resume.useMutation({
    onSuccess: () => { toast.success("Resumed"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const del = api.recurringInvoices.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); setDeleteId(null); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const generateNow = api.recurringInvoices.generateNow.useMutation({
    onSuccess: (data) => {
      toast.success("Invoice generated");
      invalidate();
      router.push(`/dashboard/invoices/${data.invoiceId}`);
    },
    onError: (e) => toast.error(e.message ?? "Failed to generate"),
  });

  function handleOpenEdit(rec: NonNullable<typeof recurring>[number]) {
    setForm({
      name: rec.name,
      clientId: rec.clientId,
      businessId: rec.businessId ?? "",
      schedule: rec.schedule as Schedule,
      invoicePrefix: rec.invoicePrefix ?? "#",
      taxRate: rec.taxRate,
      currency: rec.currency,
      notes: rec.notes ?? "",
      emailMessage: rec.emailMessage ?? "",
      items: rec.items.map((i) => ({
        description: i.description,
        hours: i.hours,
        rate: i.rate,
      })),
    });
    setEditId(rec.id);
  }

  function handleSubmit() {
    const payload = {
      ...form,
      businessId: form.businessId || undefined,
      notes: form.notes || undefined,
      emailMessage: form.emailMessage || undefined,
      items: form.items.map((item, idx) => ({ ...item, position: idx })),
    };
    if (editId) {
      update.mutate({ id: editId, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  const isSubmitting = create.isPending || update.isPending;

  return (
    <DashboardPage className="pb-24">
      <DashboardPageHeader
        title="Recurring Invoices"
        description="Schedule automatic invoice generation"
      >
        <Button onClick={() => { setForm(defaultForm()); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New recurring
        </Button>
      </DashboardPageHeader>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (recurring ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <RefreshCw className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              No recurring invoices yet. Create one to automatically generate draft invoices on a
              schedule.
            </p>
            <Button onClick={() => { setForm(defaultForm()); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create first recurring invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(recurring ?? []).map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{rec.name}</p>
                      <Badge variant={rec.status === "active" ? "default" : "secondary"}>
                        {rec.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {rec.client.name} · {scheduleLabel(rec.schedule)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Next: {formatDate(rec.nextDueAt)}
                      {rec.lastGeneratedAt && (
                        <> · Last generated: {formatDate(rec.lastGeneratedAt)}</>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateNow.mutate({ id: rec.id })}
                      disabled={generateNow.isPending}
                    >
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Generate now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(rec)}
                    >
                      Edit
                    </Button>
                    {rec.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pause.mutate({ id: rec.id })}
                        disabled={pause.isPending}
                      >
                        <Pause className="mr-1.5 h-3.5 w-3.5" />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resume.mutate({ id: rec.id })}
                        disabled={resume.isPending}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Resume
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(rec.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={createOpen || editId !== null}
        onOpenChange={(open) => {
          if (!open) { setCreateOpen(false); setEditId(null); setForm(defaultForm()); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit recurring invoice" : "New recurring invoice"}</DialogTitle>
            <DialogDescription>
              Configure the template. Invoices will be generated as drafts on the selected schedule.
            </DialogDescription>
          </DialogHeader>
          <RecurringForm
            form={form}
            setForm={setForm}
            clients={clients}
            businesses={businesses}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); setEditId(null); setForm(defaultForm()); }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !form.name || !form.clientId}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : editId ? (
                <><Check className="mr-2 h-4 w-4" /> Save changes</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Create</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recurring invoice</DialogTitle>
            <DialogDescription>
              This will stop automatic generation. Already-generated invoices are not affected.
            </DialogDescription>
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
    </DashboardPage>
  );
}
