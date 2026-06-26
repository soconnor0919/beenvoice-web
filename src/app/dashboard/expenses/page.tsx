"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { DashboardPageHeader } from "~/components/layout/page-header";
import { DashboardPage, dashboardStatGridClass } from "~/components/layout/dashboard-page";
import { EmptyState } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
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
import { DatePicker } from "~/components/ui/date-picker";
import { NumberInput } from "~/components/ui/number-input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { formatCurrency, SUPPORTED_CURRENCIES } from "~/lib/currency";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";

interface ExpenseFormData {
  date: Date;
  description: string;
  amount: number;
  currency: string;
  category: string;
  billable: boolean;
  reimbursable: boolean;
  taxDeductible: boolean;
  notes: string;
  clientId: string;
}

const defaultForm: ExpenseFormData = {
  date: new Date(),
  description: "",
  amount: 0,
  currency: "USD",
  category: "",
  billable: false,
  reimbursable: false,
  taxDeductible: false,
  notes: "",
  clientId: "",
};

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: expenses = [], isLoading } = api.expenses.getAll.useQuery();
  const { data: clients = [] } = api.clients.getAll.useQuery();

  const create = api.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense added");
      void utils.expenses.getAll.invalidate();
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });
  const update = api.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated");
      void utils.expenses.getAll.invalidate();
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });
  const del = api.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted");
      void utils.expenses.getAll.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = () => {
    setEditId(null);
    setForm(defaultForm);
    setOpen(true);
  };
  const handleEdit = (expense: (typeof expenses)[0]) => {
    setEditId(expense.id);
    setForm({
      date: new Date(expense.date),
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category ?? "",
      billable: expense.billable,
      reimbursable: expense.reimbursable,
      taxDeductible: expense.taxDeductible ?? false,
      notes: expense.notes ?? "",
      clientId: expense.clientId ?? "",
    });
    setOpen(true);
  };
  const handleSubmit = () => {
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    const payload = {
      ...form,
      clientId: form.clientId || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      taxDeductible: form.taxDeductible,
    };
    if (editId) update.mutate({ id: editId, ...payload });
    else create.mutate(payload);
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const billableTotal = expenses
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.amount, 0);
  const deductibleTotal = expenses
    .filter((e) => e.taxDeductible)
    .reduce((s, e) => s + e.amount, 0);

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Expenses"
        description="Track billable and non-billable expenses"
      >
        <Button
          onClick={handleOpen}
          variant="default"
          className="hover-lift shadow-md"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Expense
        </Button>
      </DashboardPageHeader>

      <div className={dashboardStatGridClass}>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Billable
            </p>
            <p className="text-primary mt-1 text-2xl font-bold">
              {formatCurrency(billableTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Deductible
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(deductibleTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Count
            </p>
            <p className="mt-1 text-2xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> All Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-muted-foreground p-6 text-center text-sm">
              Loading…
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="Create your first expense"
              description="Track billable costs, reimbursements, and tax-deductible spending."
              action={
                <Button onClick={handleOpen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add expense
                </Button>
              }
            />
          ) : (
            <div className="divide-y">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{expense.description}</p>
                      {expense.billable && (
                        <Badge variant="secondary" className="text-xs">
                          Billable
                        </Badge>
                      )}
                      {expense.reimbursable && (
                        <Badge variant="outline" className="text-xs">
                          Reimbursable
                        </Badge>
                      )}
                      {expense.taxDeductible && (
                        <Badge
                          variant="outline"
                          className="border-green-300 text-xs text-green-600"
                        >
                          Tax Deductible
                        </Badge>
                      )}
                      {expense.category && (
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(expense.date))}
                      {expense.client ? ` · ${expense.client.name}` : ""}
                    </p>
                    {expense.notes && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <p className="font-semibold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(expense)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 w-8 p-0"
                      onClick={() => setDeleteId(expense.id)}
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

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g. Laptop charger"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <NumberInput
                  value={form.amount}
                  onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  date={form.date}
                  onDateChange={(d) =>
                    setForm((p) => ({ ...p, date: d ?? new Date() }))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category || "none"}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select
                value={form.clientId || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, clientId: v === "none" ? "" : v }))
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
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.billable}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, billable: !!v }))
                  }
                />
                <span className="text-sm">Billable</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.reimbursable}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, reimbursable: !!v }))
                  }
                />
                <span className="text-sm">Reimbursable</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.taxDeductible}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, taxDeductible: !!v }))
                  }
                />
                <span className="text-sm">Tax Deductible</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Additional details…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? "Saving…"
                : editId
                  ? "Update"
                  : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
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
    </DashboardPage>
  );
}
