"use client";

import {
  AlertCircle,
  Building2,
  DollarSign,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FileUpload } from "~/components/forms/file-upload";
import {
  dashboardGapClass,
  dashboardGridClass,
  dashboardStatGridClass,
} from "~/components/layout/dashboard-page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
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
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  detectImportFormat,
  parseInvoiceCSV,
  parseInvoiceJSON,
  type ImportFormat,
  type ImportInvoice,
} from "~/lib/invoice-import";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface StagedInvoice extends ImportInvoice {
  id: string;
  clientId: string;
  format: ImportFormat;
}

const NONE = "__none__";

function newId() {
  return crypto.randomUUID();
}

export function InvoiceImportPage() {
  const [invoices, setInvoices] = useState<StagedInvoice[]>([]);
  const [globalClientId, setGlobalClientId] = useState("");
  const [globalBusinessId, setGlobalBusinessId] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: clients, isLoading: loadingClients } =
    api.clients.getAll.useQuery();
  const { data: businesses, isLoading: loadingBusinesses } =
    api.businesses.getAll.useQuery();

  const utils = api.useUtils();

  const bulkImport = api.invoices.bulkImport.useMutation({
    onSuccess: (result) => {
      void utils.invoices.getAll.invalidate();
      if (result.clientsCreated > 0) {
        void utils.clients.getAll.invalidate();
      }
      const parts = [
        `${result.invoicesCreated} invoice${result.invoicesCreated !== 1 ? "s" : ""} created`,
      ];
      if (result.clientsCreated > 0) {
        parts.push(
          `${result.clientsCreated} client${result.clientsCreated !== 1 ? "s" : ""} created`,
        );
      }
      toast.success(parts.join(", "));
      if (result.errors.length > 0) {
        toast.warning(
          `${result.errors.length} invoice${result.errors.length !== 1 ? "s" : ""} skipped:\n${result.errors.slice(0, 3).join("\n")}${result.errors.length > 3 ? "\n..." : ""}`,
        );
      }
      setInvoices([]);
    },
    onError: (error) => {
      toast.error(error.message || "Import failed");
    },
  });

  const applyGlobalClient = (clientId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => ({
        ...inv,
        clientId: inv.clientId || clientId,
      })),
    );
  };

  const handleFileSelect = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      const format = detectImportFormat(file.name);
      const text = await file.text();

      if (format === "json") {
        const parsed = parseInvoiceJSON(text);
        const staged: StagedInvoice[] = parsed.map((inv) => ({
          ...inv,
          id: newId(),
          clientId: globalClientId,
          format: "json" as const,
          sourceFile: file.name,
        }));
        setInvoices((prev) => [...prev, ...staged]);

        const errorCount = staged.filter((s) => s.errors.length > 0).length;
        if (errorCount > 0) {
          toast.error(
            `${file.name}: ${errorCount} invoice${errorCount !== 1 ? "s" : ""} with validation issues`,
          );
        } else {
          toast.success(
            `Parsed ${staged.length} invoice${staged.length !== 1 ? "s" : ""} from ${file.name}`,
          );
        }
      } else {
        const parsed = parseInvoiceCSV(text, file.name);
        const staged: StagedInvoice = {
          ...parsed,
          id: newId(),
          clientId: globalClientId,
          format: "csv",
        };
        setInvoices((prev) => [...prev, staged]);

        if (parsed.errors.length > 0) {
          toast.error(
            `${file.name}: ${parsed.errors.length} issue${parsed.errors.length !== 1 ? "s" : ""}`,
          );
        } else {
          toast.success(
            `Parsed ${parsed.items.length} items from ${file.name}`,
          );
        }
      }
    }
  };

  const removeInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const updateInvoice = (id: string, updates: Partial<StagedInvoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const updated = { ...inv, ...updates };
        if (updates.issueDate !== undefined && !updates.dueDate) {
          const due = new Date(updated.issueDate ?? new Date());
          due.setDate(due.getDate() + 30);
          updated.dueDate = due;
        }
        return updated;
      }),
    );
  };

  const isReady = (inv: StagedInvoice) =>
    inv.errors.length === 0 &&
    inv.items.length > 0 &&
    !!(inv.clientId || globalClientId || inv.client?.name) &&
    !!inv.issueDate &&
    !!inv.dueDate;

  const readyCount = invoices.filter(isReady).length;

  const validateBeforeImport = (): string[] => {
    const errors: string[] = [];
    if (!globalBusinessId && (!businesses || businesses.length === 0)) {
      errors.push("Create a business in Settings before importing");
    }
    invoices.forEach((inv) => {
      if (inv.errors.length > 0) {
        errors.push(`${inv.name}: ${inv.errors.join("; ")}`);
      }
      if (inv.items.length === 0) {
        errors.push(`${inv.name}: no line items`);
      }
      if (!inv.clientId && !globalClientId && !inv.client?.name) {
        errors.push(`${inv.name}: client required`);
      }
      if (!inv.issueDate) errors.push(`${inv.name}: issue date required`);
      if (!inv.dueDate) errors.push(`${inv.name}: due date required`);
    });
    return errors;
  };

  const processImport = async () => {
    const errors = validateBeforeImport();
    if (errors.length > 0) {
      toast.error(`Fix these issues first:\n${errors.slice(0, 5).join("\n")}`);
      return;
    }

    const readyInvoices = invoices.filter(isReady);
    if (readyInvoices.length === 0) return;

    setIsProcessing(true);
    try {
      await bulkImport.mutateAsync({
        defaultClientId: globalClientId || undefined,
        defaultBusinessId: globalBusinessId || undefined,
        invoices: readyInvoices.map((inv) => ({
          name: inv.name,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          clientId: inv.clientId || globalClientId || undefined,
          client: inv.client,
          items: inv.items.map((item) => ({
            date: item.date,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
          })),
          sourceFile: inv.sourceFile,
        })),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const previewInvoice = previewId
    ? invoices.find((i) => i.id === previewId)
    : null;

  const totalItems = invoices.reduce((sum, inv) => sum + inv.items.length, 0);
  const totalAmount = invoices.reduce(
    (sum, inv) =>
      sum + inv.items.reduce((s, item) => s + item.quantity * item.rate, 0),
    0,
  );

  return (
    <div className={cn("flex flex-col", dashboardGapClass)}>
      {/* Upload — primary action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-primary h-5 w-5" />
            Upload files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onFilesSelected={handleFileSelect}
            accept={{
              "text/csv": [".csv"],
              "application/json": [".json"],
            }}
            maxFiles={50}
            maxSize={10 * 1024 * 1024}
            placeholder="Drag & drop CSV or JSON files here, or click to select"
            description="CSV: one file = one invoice. JSON: multiple invoices per file."
          />

          {invoices.length > 0 && (
            <div className={cn("bg-primary/10 p-4", dashboardStatGridClass)}>
              <SummaryStat label="Invoices" value={invoices.length} />
              <SummaryStat label="Line items" value={totalItems} />
              <SummaryStat
                label="Total amount"
                value={totalAmount.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              />
              <SummaryStat
                label="Ready"
                value={`${readyCount}/${invoices.length}`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Defaults */}
      <div className={cn(dashboardGridClass, "lg:grid-cols-2")}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="text-primary h-5 w-5" />
              Default business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="global-business" className="text-sm font-medium">
                Business for imported invoices
              </Label>
              <Select
                value={globalBusinessId || NONE}
                onValueChange={(value) =>
                  setGlobalBusinessId(value === NONE ? "" : value)
                }
                disabled={loadingBusinesses}
              >
                <SelectTrigger id="global-business" className="h-11">
                  <SelectValue placeholder="Use default business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Use default business</SelectItem>
                  {businesses?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Required — your default business is used if none is selected.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="text-primary h-5 w-5" />
              Default client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="global-client" className="text-sm font-medium">
                Client for CSV imports (optional)
              </Label>
              <Select
                value={globalClientId || NONE}
                onValueChange={(value) => {
                  const id = value === NONE ? "" : value;
                  setGlobalClientId(id);
                  if (id) applyGlobalClient(id);
                }}
                disabled={loadingClients}
              >
                <SelectTrigger id="global-client" className="h-11">
                  <SelectValue placeholder="No default client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    No default (JSON client or per-invoice)
                  </SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                CSV files need a client. JSON can include client details per
                invoice.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staged invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="border-border bg-muted/20 space-y-4 rounded-lg border p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {inv.format === "json" ? (
                      <FileJson className="text-primary h-5 w-5 shrink-0" />
                    ) : (
                      <FileSpreadsheet className="text-primary h-5 w-5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-foreground truncate font-medium">
                        {inv.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {inv.items.length} items
                        {inv.sourceFile ? ` • ${inv.sourceFile}` : ""}
                        {inv.client?.name ? ` • ${inv.client.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(inv.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeInvoice(inv.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      Invoice title
                    </Label>
                    <Input
                      value={inv.name}
                      className="h-9 text-sm"
                      onChange={(e) =>
                        updateInvoice(inv.id, { name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      Client
                    </Label>
                    <Select
                      value={inv.clientId || NONE}
                      onValueChange={(value) =>
                        updateInvoice(inv.id, {
                          clientId: value === NONE ? "" : value,
                        })
                      }
                      disabled={loadingClients}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue
                          placeholder={
                            inv.client?.name
                              ? `Use JSON: ${inv.client.name}`
                              : "Select client"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          {inv.client?.name
                            ? `Use JSON: ${inv.client.name}`
                            : "Select client"}
                        </SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      Issue date
                    </Label>
                    <DatePicker
                      date={inv.issueDate}
                      onDateChange={(date) =>
                        updateInvoice(inv.id, { issueDate: date })
                      }
                      placeholder="Issue date"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs font-medium">
                      Due date
                    </Label>
                    <DatePicker
                      date={inv.dueDate}
                      onDateChange={(date) =>
                        updateInvoice(inv.id, { dueDate: date })
                      }
                      placeholder="Due date"
                      className="h-9"
                    />
                  </div>
                </div>

                {inv.errors.length > 0 && (
                  <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertCircle className="text-destructive h-4 w-4" />
                      <span className="text-destructive text-sm font-medium">
                        Issues
                      </span>
                    </div>
                    <ul className="text-destructive space-y-1 text-sm">
                      {inv.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Total:{" "}
                    {inv.items
                      .reduce((s, item) => s + item.quantity * item.rate, 0)
                      .toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                  </span>
                  <Badge variant={isReady(inv) ? "default" : "secondary"}>
                    {isReady(inv) ? "Ready" : "Pending"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="text-primary h-5 w-5" />
              Import invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {isProcessing && (
                <div className="flex w-full flex-col gap-2">
                  <span className="text-muted-foreground text-sm">
                    Importing {readyCount} invoice
                    {readyCount !== 1 ? "s" : ""}...
                  </span>
                  <Progress value={50} className="h-2" />
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground text-sm">
                  {readyCount} of {invoices.length} ready • all imported as
                  drafts
                </span>
                <Button
                  onClick={processImport}
                  disabled={readyCount === 0 || isProcessing}
                  className="sm:shrink-0"
                >
                  {isProcessing
                    ? "Importing..."
                    : `Import ${readyCount} Invoice${readyCount !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              {previewInvoice?.name}
            </DialogTitle>
            <DialogDescription>Line item preview</DialogDescription>
          </DialogHeader>

          {previewInvoice && (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-muted-foreground p-2 text-left text-sm font-medium">
                      Date
                    </th>
                    <th className="text-muted-foreground p-2 text-left text-sm font-medium">
                      Description
                    </th>
                    <th className="text-muted-foreground p-2 text-right text-sm font-medium">
                      Qty
                    </th>
                    <th className="text-muted-foreground p-2 text-right text-sm font-medium">
                      Rate
                    </th>
                    <th className="text-muted-foreground p-2 text-right text-sm font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-border border-b">
                      <td className="p-2 text-sm whitespace-nowrap">
                        {item.date?.toLocaleDateString() ?? "—"}
                      </td>
                      <td className="max-w-xs truncate p-2 text-sm">
                        {item.description}
                      </td>
                      <td className="p-2 text-right text-sm">{item.quantity}</td>
                      <td className="p-2 text-right text-sm">
                        {item.rate.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </td>
                      <td className="p-2 text-right text-sm font-medium">
                        {(item.quantity * item.rate).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="text-center">
      <div className="text-primary text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}
