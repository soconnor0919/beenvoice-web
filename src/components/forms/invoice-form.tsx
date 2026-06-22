"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { NumberInput } from "~/components/ui/number-input";
import { PageHeader } from "~/components/layout/page-header";
import { InvoiceLineItems } from "./invoice-line-items";
import { InvoiceCalendarView } from "./invoice-calendar-view";
import { EmailPreview } from "./email-preview";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Save,
  Calendar as CalendarIcon,
  Tag,
  User,
  List,
  FileText,
  ChevronDown,
  Mail,
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "~/lib/currency";
import { Textarea } from "~/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { STATUS_OPTIONS } from "./invoice/types";
import type { InvoiceFormData, InvoiceItem } from "./invoice/types";
import type { ParsedLineItem } from "~/lib/parse-line-item";

import { CountUp } from "~/components/ui/count-up";

interface InvoiceFormProps {
  invoiceId?: string;
}

function InvoiceFormSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Loading..."
        description="Loading invoice form"
        variant="gradient"
      />
      <div className="bg-muted h-12 w-full animate-pulse rounded-xl p-1" />{" "}
      {/* Tabs Skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-muted h-[200px] animate-pulse rounded-xl" />
        <div className="bg-muted h-[200px] animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

function getDefaultHourlyRate(value: unknown) {
  if (typeof value !== "object" || value === null) return null;

  const rate = (value as { defaultHourlyRate?: unknown }).defaultHourlyRate;
  return typeof rate === "number" ? rate : null;
}

function plainTextToHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

function createDefaultInvoiceFormData(): InvoiceFormData {
  return {
    invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`,
    invoicePrefix: "#",
    businessId: "",
    clientId: "",
    issueDate: new Date(),
    dueDate: new Date(),
    status: "draft",
    notes: "",
    emailMessage: "",
    taxRate: 0,
    currency: "USD",
    defaultHourlyRate: null,
    items: [
      {
        id: crypto.randomUUID(),
        date: new Date(),
        description: "",
        hours: 1,
        rate: 0,
        amount: 0,
      },
    ],
  };
}

export default function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const utils = api.useUtils();

  // State
  const [formData, setFormData] = useState<InvoiceFormData>(
    createDefaultInvoiceFormData,
  );

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [previewTab, setPreviewTab] = useState("pdf");

  // Queries (Same as before)
  const { data: clients, isLoading: loadingClients } =
    api.clients.getAll.useQuery();
  const { data: noteTemplates } = api.invoiceTemplates.getByType.useQuery({
    type: "notes",
  });
  const { data: businesses, isLoading: loadingBusinesses } =
    api.businesses.getAll.useQuery();
  const { data: existingInvoice, isLoading: loadingInvoice } =
    api.invoices.getById.useQuery(
      { id: invoiceId! },
      { enabled: !!invoiceId && invoiceId !== "new" },
    );

  const deleteInvoice = api.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted");
      router.push("/dashboard/invoices");
    },
    onError: (e) => toast.error(e.message ?? "Failed to delete"),
  });

  // Init Effects (Same as before)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset initialization state when the routed invoice changes.
    setInitialized(false);
  }, [invoiceId]);
  useEffect(() => {
    if (invoiceId && invoiceId !== "new" && existingInvoice && !initialized) {
      // ... (Mapping logic same as before)
      const mappedItems: InvoiceItem[] =
        existingInvoice.items?.map((item) => ({
          id: crypto.randomUUID(),
          date: new Date(item.date),
          description: item.description,
          hours: item.hours,
          rate: item.rate,
          amount: item.amount,
        })) || [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync loaded invoice data into the edit form.
      setFormData({
        invoiceNumber: existingInvoice.invoiceNumber,
        invoicePrefix: existingInvoice.invoicePrefix ?? "#",
        businessId: existingInvoice.businessId ?? "",
        clientId: existingInvoice.clientId,
        issueDate: new Date(existingInvoice.issueDate),
        dueDate: new Date(existingInvoice.dueDate),
        status: existingInvoice.status as "draft" | "sent" | "paid",
        notes: existingInvoice.notes ?? "",
        emailMessage: existingInvoice.emailMessage ?? "",
        taxRate: existingInvoice.taxRate,
        currency: existingInvoice.currency ?? "USD",
        defaultHourlyRate: existingInvoice.client?.defaultHourlyRate ?? null,
        items:
          mappedItems.length > 0
            ? mappedItems
            : [
                {
                  id: crypto.randomUUID(),
                  date: new Date(),
                  description: "",
                  hours: 1,
                  rate: 0,
                  amount: 0,
                },
              ],
      });
      setInitialized(true);
    } else if (
      (!invoiceId || invoiceId === "new") &&
      businesses &&
      !initialized
    ) {
      const defaultBusiness =
        businesses.find((b) => b.isDefault) ?? businesses[0];
      if (defaultBusiness)
        setFormData((prev) => ({ ...prev, businessId: defaultBusiness.id }));
      setInitialized(true);
    }
  }, [invoiceId, existingInvoice, businesses, initialized]);

  const totals = React.useMemo(() => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.hours * item.rate,
      0,
    );
    const taxAmount = (subtotal * formData.taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [formData.items, formData.taxRate]);
  const emailPreviewMessage = React.useMemo(
    () => plainTextToHtml(formData.emailMessage.trim()),
    [formData.emailMessage],
  );

  const pdfPreviewInput = React.useMemo(
    () => ({
      invoiceNumber: formData.invoiceNumber,
      invoicePrefix: formData.invoicePrefix,
      businessId: formData.businessId || "",
      clientId: formData.clientId,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      status: formData.status,
      notes: formData.notes,
      emailMessage: formData.emailMessage,
      taxRate: formData.taxRate,
      currency: formData.currency,
      items: formData.items.map((item) => ({
        date: item.date,
        description: item.description || "Service",
        hours: item.hours,
        rate: item.rate,
      })),
    }),
    [formData],
  );

  const { data: pdfPreview, isFetching: pdfPreviewLoading } =
    api.invoices.previewPdf.useQuery(pdfPreviewInput, {
      enabled:
        activeTab === "preview" &&
        previewTab === "pdf" &&
        Boolean(formData.clientId) &&
        formData.items.length > 0 &&
        formData.items.every((item) => item.description.trim() !== ""),
      refetchOnWindowFocus: false,
      staleTime: 0,
    });
  const selectedClient = React.useMemo(
    () => clients?.find((client) => client.id === formData.clientId),
    [clients, formData.clientId],
  );
  const selectedBusiness = React.useMemo(
    () =>
      businesses?.find((business) => business.id === formData.businessId) ??
      businesses?.find((business) => business.isDefault),
    [businesses, formData.businessId],
  );

  // Handlers (addItem, updateItem etc. - same as before)
  const addItem = (date?: unknown) => {
    const validDate = date instanceof Date ? date : new Date();
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          date: validDate,
          description: "",
          hours: 1,
          rate: prev.defaultHourlyRate ?? 0,
          amount: prev.defaultHourlyRate ?? 0,
        },
      ],
    }));
  };
  const addItemWithValues = (parsed: ParsedLineItem) => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          date: new Date(),
          description: parsed.description,
          hours: parsed.hours ?? 1,
          rate: parsed.rate ?? prev.defaultHourlyRate ?? 0,
          amount: (parsed.hours ?? 1) * (parsed.rate ?? prev.defaultHourlyRate ?? 0),
        },
      ],
    }));
  };
  const removeItem = (idx: number) => {
    if (formData.items.length > 1)
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      }));
  };
  const updateItem = (
    idx: number,
    field: string,
    value: string | number | Date,
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === idx) {
          const updated = { ...item, [field]: value };
          if (field === "hours" || field === "rate") {
            updated.amount = updated.hours * updated.rate;
          }
          return updated;
        }
        return item;
      }),
    }));
  };

  const createInvoice = api.invoices.create.useMutation({
    onSuccess: (inv) => {
      toast.success("Created");
      void utils.invoices.getAll.invalidate();
      router.push(`/dashboard/invoices/${inv.id}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateInvoice = api.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      if (invoiceId && invoiceId !== "new") {
        void utils.invoices.getById.invalidate({ id: invoiceId });
      }
      void utils.invoices.getAll.invalidate();
      router.push(
        invoiceId === "new"
          ? "/dashboard/invoices"
          : `/dashboard/invoices/${invoiceId}`,
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = async () => {
    setLoading(true);
    if (!formData.clientId) {
      toast.error("Select Client");
      setLoading(false);
      return;
    }

    // Validate Items - Check for empty description
    let invalidItemIndex = -1;
    for (let i = 0; i < formData.items.length; i++) {
      if (
        !formData.items[i]?.description ||
        formData.items[i]?.description.trim() === ""
      ) {
        invalidItemIndex = i;
        break;
      }
    }

    if (invalidItemIndex !== -1) {
      toast.error(`Item #${invalidItemIndex + 1} is missing a description`);
      setLoading(false);
      setActiveTab("items"); // Switch to items tab

      // Timeout to allow tab switch rendering
      setTimeout(() => {
        const element = document.getElementById(
          `invoice-item-${invalidItemIndex}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Optional: Highlight effect
          element.classList.add("ring-2", "ring-destructive", "ring-offset-2");
          setTimeout(
            () =>
              element.classList.remove(
                "ring-2",
                "ring-destructive",
                "ring-offset-2",
              ),
            2000,
          );
        }
      }, 100);
      return;
    }

    try {
      const payload = {
        invoiceNumber: formData.invoiceNumber,
        invoicePrefix: formData.invoicePrefix,
        businessId: formData.businessId || "",
        clientId: formData.clientId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: formData.status,
        notes: formData.notes,
        emailMessage: formData.emailMessage,
        taxRate: formData.taxRate,
        currency: formData.currency,
        items: formData.items.map((i) => ({
          date: i.date,
          description: i.description,
          hours: i.hours,
          rate: i.rate,
          amount: i.hours * i.rate,
        })),
      };
      if (invoiceId && invoiceId !== "new" && invoiceId !== undefined)
        await updateInvoice.mutateAsync({ id: invoiceId, ...payload });
      else await createInvoice.mutateAsync(payload);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K],
  ) => setFormData((p) => ({ ...p, [field]: value }));
  const handleDelete = () => setDeleteDialogOpen(true);
  const confirmDelete = () => {
    if (invoiceId) deleteInvoice.mutate({ id: invoiceId });
  };

  if (
    !initialized ||
    loadingClients ||
    loadingBusinesses ||
    (invoiceId && invoiceId !== "new" && loadingInvoice)
  )
    return <InvoiceFormSkeleton />;

  return (
    <>
      <div className="page-enter space-y-6 pb-8">
        <PageHeader
          title={invoiceId !== "new" ? "Edit Invoice" : "Create Invoice"}
          description="Manage your invoice"
          variant="gradient"
        >
          {invoiceId !== "new" && (
            <Button
              variant="secondary"
              onClick={handleDelete}
              className="text-destructive"
            >
              Delete
            </Button>
          )}
          <Button onClick={handleSubmit} variant="secondary" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save"}
          </Button>
        </PageHeader>

        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          {/* TAB SELECTOR: w-full, p-1, visible background */}
          <TabsList className="bg-muted grid h-auto w-full grid-cols-4 rounded-xl p-1">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
            >
              Items
            </TabsTrigger>
            <TabsTrigger
              value="timesheet"
              className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
            >
              Timesheet
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
            >
              Preview
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent
            value="details"
            className="mt-6 grid grid-cols-1 gap-6 focus-visible:outline-none lg:grid-cols-2"
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex gap-2 text-base">
                  <User className="h-4 w-4" /> Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(v) => {
                      updateField("clientId", v);
                      const selectedClient = clients?.find((c) => c.id === v);
                      const currentBusiness = businesses?.find(
                        (b) => b.id === formData.businessId,
                      );
                      const clientRate = getDefaultHourlyRate(selectedClient);
                      const businessRate =
                        getDefaultHourlyRate(currentBusiness);
                      updateField(
                        "defaultHourlyRate",
                        clientRate ?? businessRate ?? 0,
                      );
                      // Auto-fill currency from client
                      if (
                        selectedClient &&
                        "currency" in selectedClient &&
                        selectedClient.currency
                      ) {
                        updateField("currency", selectedClient.currency);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Client" />
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
                <div className="space-y-2">
                  <Label>Business</Label>
                  <Select
                    value={formData.businessId}
                    onValueChange={(v) => updateField("businessId", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex gap-2 text-base">
                  <Tag className="h-4 w-4" /> Invoice Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <DatePicker
                      date={formData.issueDate}
                      onDateChange={(d) =>
                        updateField("issueDate", d ?? new Date())
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <DatePicker
                      date={formData.dueDate}
                      onDateChange={(d) =>
                        updateField("dueDate", d ?? new Date())
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <div className="space-y-2">
                    <Label>Prefix</Label>
                    <Input
                      value={formData.invoicePrefix}
                      onChange={(e) =>
                        updateField("invoicePrefix", e.target.value)
                      }
                      placeholder="#"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        updateField("invoiceNumber", e.target.value)
                      }
                      placeholder="INV-20260428-000001"
                      className="w-full font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Rate</Label>
                    <NumberInput
                      value={formData.taxRate}
                      onChange={(v) => updateField("taxRate", v)}
                      suffix="%"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate</Label>
                    <NumberInput
                      value={formData.defaultHourlyRate ?? 0}
                      onChange={(v) => updateField("defaultHourlyRate", v)}
                      prefix="$"
                      disabled={!formData.clientId}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: "draft" | "sent" | "paid") =>
                        updateField("status", v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => updateField("currency", v)}
                    >
                      <SelectTrigger className="w-full">
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
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email Message
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.emailMessage}
                  onChange={(e) => updateField("emailMessage", e.target.value)}
                  placeholder="Add a note that appears only in the email body..."
                  className="min-h-[140px]"
                />
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Invoice Notes
                  </span>
                  {noteTemplates && noteTemplates.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                        >
                          Use template <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {noteTemplates.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => updateField("notes", t.content)}
                          >
                            {t.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Add notes, payment terms, or other information for the invoice/PDF..."
                  className="min-h-[140px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ITEMS TAB */}
          <TabsContent
            value="items"
            className="mt-6 focus-visible:outline-none"
          >
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono text-2xl font-bold">
                    <CountUp value={totals.total} prefix="$" />
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono text-xl font-semibold">
                    <CountUp value={totals.subtotal} prefix="$" />
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-mono text-xl font-semibold">
                    <CountUp
                      value={formData.items.reduce((s, i) => s + i.hours, 0)}
                      suffix="h"
                    />
                  </span>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2">
                  <List className="h-5 w-5" /> Invoice Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceLineItems
                  items={formData.items}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  onUpdateItem={updateItem}
                  onAddItemWithValues={addItemWithValues}
                  invoiceId={invoiceId && invoiceId !== "new" ? invoiceId : undefined}
                  clientId={formData.clientId || undefined}
                  defaultRate={formData.items[0]?.rate}
                  readOnly={formData.status !== "draft"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TIMESHEET TAB */}
          <TabsContent
            value="timesheet"
            className="mt-6 focus-visible:outline-none"
          >
            <Card className="min-h-[600px] w-full">
              <CardHeader>
                <CardTitle className="flex gap-2">
                  <CalendarIcon className="h-5 w-5" /> Timesheet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                <InvoiceCalendarView
                  items={formData.items}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  onUpdateItem={updateItem}
                  defaultHourlyRate={formData.defaultHourlyRate}
                  readOnly={formData.status !== "draft"}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="preview"
            className="mt-6 focus-visible:outline-none"
          >
            <Tabs
              value={previewTab}
              onValueChange={setPreviewTab}
              className="w-full"
            >
              <TabsList className="bg-muted grid h-auto w-full grid-cols-2 rounded-xl p-1">
                <TabsTrigger
                  value="pdf"
                  className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
                >
                  PDF
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="data-[state=active]:bg-background rounded-lg py-2.5 data-[state=active]:shadow-sm"
                >
                  Email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2">
                      <FileText className="h-5 w-5" /> PDF Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-muted/20 h-[760px] overflow-hidden border-t">
                      {!formData.clientId ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                          Select a client to generate the PDF preview.
                        </div>
                      ) : formData.items.some(
                          (item) => item.description.trim() === "",
                        ) ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                          Add descriptions for all line items to generate the
                          PDF preview.
                        </div>
                      ) : pdfPreviewLoading && !pdfPreview ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                          Generating server PDF preview...
                        </div>
                      ) : pdfPreview ? (
                        <iframe
                          title="Server-generated PDF preview"
                          src={`data:${pdfPreview.contentType};base64,${pdfPreview.base64}`}
                          className="h-full w-full border-0"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                          PDF preview will appear here.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex gap-2">
                      <Mail className="h-5 w-5" /> Email Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmailPreview
                      subject={`Invoice ${formData.invoiceNumber} from ${
                        selectedBusiness?.name ?? "Your Business"
                      }`}
                      fromEmail={selectedBusiness?.email ?? ""}
                      toEmail={selectedClient?.email ?? ""}
                      content=""
                      customMessage={emailPreviewMessage}
                      invoice={{
                        invoiceNumber: formData.invoiceNumber,
                        issueDate: formData.issueDate,
                        dueDate: formData.dueDate,
                        taxRate: formData.taxRate,
                        status: formData.status,
                        totalAmount: totals.total,
                        currency: formData.currency,
                        client: selectedClient
                          ? {
                              name: selectedClient.name,
                              email: selectedClient.email,
                            }
                          : undefined,
                        business: selectedBusiness
                          ? {
                              name: selectedBusiness.name,
                              email: selectedBusiness.email,
                            }
                          : undefined,
                        items: formData.items.map((item) => ({
                          id: item.id,
                          date: item.date,
                          description: item.description,
                          hours: item.hours,
                          rate: item.rate,
                          amount: item.hours * item.rate,
                        })),
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete?</DialogTitle>
            <DialogDescription>Cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
