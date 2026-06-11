"use client";

import {
  AlertTriangle,
  Bell,
  Building,
  Check,
  Copy,
  DollarSign,
  Edit,
  FileText,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StatusBadge } from "~/components/data/status-badge";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  getEffectiveInvoiceStatus,
  isInvoiceOverdue,
} from "~/lib/invoice-status";
import { api } from "~/trpc/react";
import type { StoredInvoiceStatus } from "~/types/invoice";
import { InvoiceDetailsSkeleton } from "./_components/invoice-details-skeleton";
import { PDFDownloadButton } from "./_components/pdf-download-button";
import { EnhancedSendInvoiceButton } from "~/components/forms/enhanced-send-invoice-button";
import { InvoiceTimerCard } from "./_components/invoice-timer-card";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Other" },
] as const;

function methodLabel(method: string) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function InvoiceViewContent({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("other");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: invoice, isLoading } = api.invoices.getById.useQuery({
    id: invoiceId,
  });
  const { data: payments, isLoading: paymentsLoading } =
    api.payments.getByInvoice.useQuery({ invoiceId });
  const utils = api.useUtils();

  const invalidate = () => {
    void utils.invoices.getById.invalidate({ id: invoiceId });
    void utils.payments.getByInvoice.invalidate({ invoiceId });
  };

  const deleteInvoice = api.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted");
      router.push("/dashboard/invoices");
    },
    onError: (e) => toast.error(e.message ?? "Failed to delete invoice"),
  });

  const updateStatus = api.invoices.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to update status"),
  });

  const createPayment = api.payments.create.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      setRecordPaymentOpen(false);
      setPaymentAmount("");
      setPaymentMethod("other");
      setPaymentNotes("");
      invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to record payment"),
  });

  const deletePayment = api.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment removed");
      invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to remove payment"),
  });

  const generatePublicToken = api.invoices.generatePublicToken.useMutation({
    onSuccess: () => {
      toast.success("Share link generated");
      void utils.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to generate link"),
  });

  const revokePublicToken = api.invoices.revokePublicToken.useMutation({
    onSuccess: () => {
      toast.success("Share link revoked");
      void utils.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to revoke link"),
  });

  const sendReminder = api.invoices.sendReminder.useMutation({
    onSuccess: () => {
      toast.success("Reminder sent");
      setReminderOpen(false);
      setReminderMessage("");
      void utils.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to send reminder"),
  });

  if (isLoading) return <InvoiceDetailsSkeleton />;
  if (!invoice) notFound();

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(date),
    );

  const formatCurrency = (amount: number, currency = invoice.currency) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = (subtotal * invoice.taxRate) / 100;
  const total = subtotal + taxAmount;
  const totalPaid = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const balanceDue = total - totalPaid;
  const storedStatus = invoice.status as StoredInvoiceStatus;
  const effectiveStatus = getEffectiveInvoiceStatus(storedStatus, invoice.dueDate);
  const isOverdue = isInvoiceOverdue(storedStatus, invoice.dueDate);
  const canSendReminder = effectiveStatus === "sent" || effectiveStatus === "overdue";

  const publicUrl = invoice.publicToken
    ? `${window.location.origin}/i/${invoice.publicToken}`
    : null;

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    createPayment.mutate({
      invoiceId,
      amount,
      date: new Date(),
      method: paymentMethod as Parameters<typeof createPayment.mutate>[0]["method"],
      notes: paymentNotes || undefined,
    });
  };

  return (
    <div className="page-enter space-y-6 pb-24">
      <PageHeader
        title="Invoice Details"
        description="View and manage invoice information"
        variant="gradient"
      >
        <PDFDownloadButton invoiceId={invoice.id} variant="outline" className="hover-lift" />
        <Button asChild variant="default" className="hover-lift">
          <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
            <Edit className="mr-2 h-5 w-5" />
            Edit
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Invoice Header */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <h2 className="text-foreground text-2xl font-bold break-words">
                        {invoice.invoiceNumber}
                      </h2>
                      <StatusBadge status={effectiveStatus} />
                    </div>
                    <div className="text-muted-foreground space-y-1 text-sm sm:space-y-0">
                      <div className="sm:inline">Issued {formatDate(invoice.issueDate)}</div>
                      <div className="sm:inline sm:before:content-['_•_']">
                        Due {formatDate(invoice.dueDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right">
                    <p className="text-muted-foreground text-sm">Total Amount</p>
                    <p className="text-primary text-3xl font-bold">{formatCurrency(total)}</p>
                    {totalPaid > 0 && balanceDue > 0 && (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        Balance due: {formatCurrency(balanceDue)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Alert */}
          {isOverdue && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="text-destructive flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Invoice Overdue</p>
                    <p className="text-sm">
                      {Math.ceil(
                        (new Date().getTime() - new Date(invoice.dueDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days past due date
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client & Business */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Bill To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-foreground text-xl font-semibold">{invoice.client.name}</h3>
                <div className="space-y-3">
                  {invoice.client.email && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2">
                        <Mail className="text-primary h-4 w-4" />
                      </div>
                      <span className="text-sm break-all">{invoice.client.email}</span>
                    </div>
                  )}
                  {invoice.client.phone && (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2">
                        <Phone className="text-primary h-4 w-4" />
                      </div>
                      <span className="text-sm">{invoice.client.phone}</span>
                    </div>
                  )}
                  {(invoice.client.addressLine1 ?? invoice.client.city) && (
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2">
                        <MapPin className="text-primary h-4 w-4" />
                      </div>
                      <div className="space-y-1 text-sm">
                        {invoice.client.addressLine1 && <div>{invoice.client.addressLine1}</div>}
                        {invoice.client.addressLine2 && <div>{invoice.client.addressLine2}</div>}
                        {(invoice.client.city ??
                          invoice.client.state ??
                          invoice.client.postalCode) && (
                          <div>
                            {[
                              invoice.client.city,
                              invoice.client.state,
                              invoice.client.postalCode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {invoice.client.country && <div>{invoice.client.country}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {invoice.business && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    From
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="text-foreground text-xl font-semibold">
                    {invoice.business.name}
                  </h3>
                  <div className="space-y-3">
                    {invoice.business.email && (
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2">
                          <Mail className="text-primary h-4 w-4" />
                        </div>
                        <span className="text-sm break-all">{invoice.business.email}</span>
                      </div>
                    )}
                    {invoice.business.phone && (
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2">
                          <Phone className="text-primary h-4 w-4" />
                        </div>
                        <span className="text-sm">{invoice.business.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.items.map((item) => (
                <Card key={item.id} className="invoice-item bg-secondary">
                  <CardContent className="p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground mb-2 text-base font-medium break-words">
                          {item.description}
                        </p>
                        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span className="whitespace-nowrap">
                            {formatDate(item.date).replace(/ /g, " ")}
                          </span>
                          <span className="whitespace-nowrap">
                            {item.hours.toString()}&nbsp;hours
                          </span>
                          <span className="whitespace-nowrap">@&nbsp;${item.rate}/hr</span>
                        </div>
                      </div>
                      <p className="text-primary flex-shrink-0 self-start text-lg font-semibold">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Totals */}
              <div className="bg-secondary rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="text-green-600 font-medium">
                        − {formatCurrency(totalPaid)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-bold">
                      <span>Balance Due:</span>
                      <span className={balanceDue <= 0 ? "text-green-600" : "text-primary"}>
                        {formatCurrency(Math.max(0, balanceDue))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payments
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRecordPaymentOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Record
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : (payments ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(payments ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="bg-secondary flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                        <Badge variant="secondary">{methodLabel(p.method)}</Badge>
                        <span className="text-muted-foreground">{formatDate(p.date)}</span>
                        {p.notes && (
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {p.notes}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 shrink-0"
                        onClick={() => deletePayment.mutate({ id: p.id })}
                        disabled={deletePayment.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {effectiveStatus !== "paid" && (
            <InvoiceTimerCard
              invoiceId={invoiceId}
              clientId={invoice.clientId}
              defaultRate={invoice.client?.defaultHourlyRate}
            />
          )}

          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Invoice
                </Link>
              </Button>

              {invoice.items && invoice.client && (
                <PDFDownloadButton invoiceId={invoice.id} className="w-full" variant="secondary" />
              )}

              {effectiveStatus === "draft" && (
                <EnhancedSendInvoiceButton
                  invoiceId={invoice.id}
                  className="w-full"
                  variant="secondary"
                />
              )}

              {(effectiveStatus === "sent" || effectiveStatus === "overdue") && (
                <EnhancedSendInvoiceButton
                  invoiceId={invoice.id}
                  className="w-full"
                  showResend={true}
                  variant="secondary"
                />
              )}

              {/* Send Reminder */}
              {canSendReminder && (
                <div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setReminderOpen(true)}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Send Reminder
                  </Button>
                  {invoice.lastReminderSentAt && (
                    <p className="text-muted-foreground mt-1 text-center text-xs">
                      Last sent {daysSince(invoice.lastReminderSentAt)} day
                      {daysSince(invoice.lastReminderSentAt) === 1 ? "" : "s"} ago
                    </p>
                  )}
                </div>
              )}

              {/* Share Link */}
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" className="w-full">
                    <Link2 className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-3" align="end">
                  <p className="text-sm font-semibold">Client share link</p>
                  {publicUrl ? (
                    <>
                      <div className="bg-secondary flex items-center gap-2 rounded-md px-3 py-2">
                        <p className="flex-1 truncate text-xs">{publicUrl}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={handleCopyLink}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 w-full"
                        onClick={() => revokePublicToken.mutate({ id: invoiceId })}
                        disabled={revokePublicToken.isPending}
                      >
                        <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                        Revoke link
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-xs">
                        Generate a shareable link your client can use to view this invoice without
                        logging in.
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => generatePublicToken.mutate({ id: invoiceId })}
                        disabled={generatePublicToken.isPending}
                      >
                        {generatePublicToken.isPending ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-3.5 w-3.5" />
                        )}
                        Generate link
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>

              {/* Mark as Paid */}
              {(effectiveStatus === "sent" || effectiveStatus === "overdue") && (
                <Button
                  onClick={() => updateStatus.mutate({ id: invoiceId, status: "paid" })}
                  disabled={updateStatus.isPending}
                  variant="secondary"
                  className="w-full"
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="mr-2 h-4 w-4" />
                  )}
                  Mark as Paid
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteInvoice.isPending}
                className="text-destructive hover:bg-destructive/10 w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment received for invoice {invoice.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input
                id="pay-notes"
                placeholder="e.g. cheque #1234"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={createPayment.isPending}>
              {createPayment.isPending ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder to {invoice.client.name} for invoice{" "}
              {invoice.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-msg">Custom message (optional)</Label>
            <Textarea
              id="reminder-msg"
              placeholder="Leave blank to use the default reminder message."
              rows={4}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                sendReminder.mutate({
                  id: invoiceId,
                  customMessage: reminderMessage || undefined,
                })
              }
              disabled={sendReminder.isPending}
            >
              {sendReminder.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Bell className="mr-2 h-4 w-4" /> Send Reminder</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice <strong>{invoice.invoiceNumber}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteInvoice.mutate({ id: invoiceId })}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? "Deleting…" : "Delete Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id === "new") router.replace("/dashboard/invoices/new");
  }, [id, router]);

  if (id === "new") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <InvoiceViewContent invoiceId={id} />;
}
