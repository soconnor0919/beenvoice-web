"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  DashboardPage,
  dashboardStatGridClass,
} from "~/components/layout/dashboard-page";
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
import { ExpenseReceiptsPanel } from "~/components/expenses/expense-receipts-panel";
import { ExpenseReceiptIndicator } from "~/components/expenses/expense-receipt-indicator";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { formatCurrency, SUPPORTED_CURRENCIES } from "~/lib/currency";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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
  businessId: string;
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
  businessId: "",
};

type ExpenseDialogMode = "create" | "view" | "edit";
type ExpenseFilter = "all" | "billable" | "deductible" | "receipts";

function expenseToForm(
  expense: {
    date: Date | string;
    description: string;
    amount: number;
    currency: string;
    category: string | null;
    billable: boolean;
    reimbursable: boolean;
    taxDeductible: boolean | null;
    notes: string | null;
    clientId: string | null;
    businessId: string | null;
  },
  defaultBusinessId: string,
): ExpenseFormData {
  return {
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
    businessId: expense.businessId ?? defaultBusinessId,
  };
}

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<ExpenseDialogMode>("create");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [businessFilter, setBusinessFilter] = useState("all");
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");
  const [search, setSearch] = useState("");

  const utils = api.useUtils();
  const { data: businesses = [] } = api.businesses.getAll.useQuery();
  const { data: expenses = [], isLoading } = api.expenses.getAll.useQuery(
    businessFilter === "all" ? undefined : { businessId: businessFilter },
  );
  const { data: clients = [] } = api.clients.getAll.useQuery();

  const defaultBusinessId = useMemo(
    () => businesses.find((b) => b.isDefault)?.id ?? businesses[0]?.id ?? "",
    [businesses],
  );

  const create = api.expenses.create.useMutation({
    onSuccess: (expense) => {
      if (!expense) return;
      toast.success("Expense saved — you can now attach receipts");
      void utils.expenses.getAll.invalidate();
      setEditId(expense.id);
      setDialogMode("edit");
    },
    onError: (e) => toast.error(e.message),
  });
  const update = api.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated");
      void utils.expenses.getAll.invalidate();
      setOpen(false);
      setEditId(null);
      setDialogMode("create");
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

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setDialogMode("create");
    setForm(defaultForm);
  };

  const handleOpen = () => {
    setEditId(null);
    setDialogMode("create");
    setForm({ ...defaultForm, businessId: defaultBusinessId });
    setOpen(true);
  };
  const handleView = (expense: (typeof expenses)[0]) => {
    setEditId(expense.id);
    setDialogMode("view");
    setForm(expenseToForm(expense, defaultBusinessId));
    setOpen(true);
  };
  const handleEdit = (expense: (typeof expenses)[0]) => {
    setEditId(expense.id);
    setDialogMode("edit");
    setForm(expenseToForm(expense, defaultBusinessId));
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
      businessId: form.businessId || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      taxDeductible: form.taxDeductible,
    };
    if (editId) update.mutate({ id: editId, ...payload });
    else create.mutate(payload);
  };

  const filteredExpenses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (expenseFilter === "billable" && !expense.billable) return false;
      if (expenseFilter === "deductible" && !expense.taxDeductible)
        return false;
      if (expenseFilter === "receipts" && expense.receiptCount === 0)
        return false;
      if (!needle) return true;
      return [
        expense.description,
        expense.category,
        expense.notes,
        expense.business?.name,
        expense.client?.name,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [expenseFilter, expenses, search]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const visibleTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const billableTotal = expenses
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.amount, 0);
  const deductibleTotal = expenses
    .filter((e) => e.taxDeductible)
    .reduce((s, e) => s + e.amount, 0);
  const withReceipts = expenses.filter((e) => e.receiptCount > 0).length;
  const hasActiveFilters =
    search.trim().length > 0 ||
    expenseFilter !== "all" ||
    businessFilter !== "all";

  const isViewMode = dialogMode === "view";
  const isEditMode = dialogMode === "edit";
  const isCreateMode = dialogMode === "create";

  const dialogTitle = isCreateMode
    ? "Add expense"
    : isViewMode
      ? "View expense"
      : "Edit expense";

  const businessName =
    businesses.find((b) => b.id === form.businessId)?.name ??
    (form.businessId ? "Unknown business" : "Default business");
  const clientName = form.clientId
    ? (clients.find((c) => c.id === form.clientId)?.name ?? "Unknown client")
    : "No client";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(form.date);

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
              With receipts
            </p>
            <p className="mt-1 text-2xl font-bold">{withReceipts}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Expenses
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {filteredExpenses.length === expenses.length
                  ? `${expenses.length} recorded`
                  : `${filteredExpenses.length} of ${expenses.length} shown`}
                {filteredExpenses.length !== expenses.length
                  ? ` · ${formatCurrency(visibleTotal)} visible`
                  : ""}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expenses"
                  className="pl-9"
                />
              </div>
              <Select value={businessFilter} onValueChange={setBusinessFilter}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue placeholder="All businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All businesses</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"] as const,
              ["billable", "Billable"] as const,
              ["deductible", "Deductible"] as const,
              ["receipts", "With receipts"] as const,
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={expenseFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setExpenseFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
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
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No matching expenses"
              description="Adjust the search or filters to bring expenses back into view."
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setExpenseFilter("all");
                      setBusinessFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="text-muted-foreground hidden border-b px-4 py-2 text-xs font-medium tracking-wide uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_104px_116px_44px] sm:gap-3">
                <span>Expense</span>
                <span className="text-center">Receipts</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              <div className="divide-y">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleView(expense)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleView(expense);
                      }
                    }}
                    className="hover:bg-muted/40 focus-visible:ring-ring flex cursor-pointer flex-col gap-3 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:grid sm:grid-cols-[minmax(0,1fr)_104px_116px_44px] sm:items-center sm:gap-3"
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
                        {expense.business ? ` · ${expense.business.name}` : ""}
                        {expense.client ? ` · ${expense.client.name}` : ""}
                      </p>
                      {expense.notes && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {expense.notes}
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center sm:justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-muted-foreground mr-2 text-xs sm:hidden">
                        Receipts
                      </span>
                      <ExpenseReceiptIndicator
                        expenseId={expense.id}
                        receiptCount={expense.receiptCount}
                        receiptPreview={expense.receiptPreview}
                      />
                    </div>

                    <p className="font-semibold sm:text-right">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>

                    <div
                      className="flex justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                            aria-label={`Actions for ${expense.description}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(expense)}>
                            <Receipt className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(expense.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditId(null);
            setDialogMode("create");
            setForm(defaultForm);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            {isCreateMode && (
              <DialogDescription>
                Fill in the details below. You can attach receipts after saving.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isViewMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Description
                  </p>
                  <p className="text-sm">{form.description}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Amount
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(form.amount, form.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Date
                  </p>
                  <p className="text-sm">{formattedDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Category
                  </p>
                  <p className="text-sm">{form.category || "None"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Business
                  </p>
                  <p className="text-sm">{businessName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Client
                  </p>
                  <p className="text-sm">{clientName}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Flags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.billable ? (
                      <Badge variant="secondary">Billable</Badge>
                    ) : (
                      <Badge variant="outline">Not billable</Badge>
                    )}
                    {form.reimbursable ? (
                      <Badge variant="outline">Reimbursable</Badge>
                    ) : null}
                    {form.taxDeductible ? (
                      <Badge
                        variant="outline"
                        className="border-green-300 text-green-600"
                      >
                        Tax deductible
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {form.notes ? (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-muted-foreground text-sm font-medium">
                      Notes
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{form.notes}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
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
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, currency: v }))
                      }
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
                        setForm((p) => ({
                          ...p,
                          category: v === "none" ? "" : v,
                        }))
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
                  <Label>Business</Label>
                  <Select
                    value={form.businessId || "none"}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        businessId: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default business</SelectItem>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                          {b.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client (optional)</Label>
                  <Select
                    value={form.clientId || "none"}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        clientId: v === "none" ? "" : v,
                      }))
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
              </>
            )}

            <ExpenseReceiptsPanel expenseId={editId} readOnly={isViewMode} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {isViewMode ? (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Close
                </Button>
                <Button onClick={() => setDialogMode("edit")}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={create.isPending || update.isPending}
                >
                  {create.isPending || update.isPending
                    ? "Saving…"
                    : isEditMode
                      ? "Update"
                      : "Save & add receipts"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
