"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DashboardPageHeader } from "~/components/layout/page-header";
import {
  DashboardPage,
  dashboardGapClass,
  dashboardGridClass,
} from "~/components/layout/dashboard-page";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { cn } from "~/lib/utils";
import { NOREPLY_EMAIL } from "~/lib/app-email";
import { FloatingActionBar } from "~/components/layout/floating-action-bar";
import { EmailComposer } from "~/components/forms/email-composer";
import { EmailPreview } from "~/components/forms/email-preview";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Eye,
  Edit3,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";

function SendEmailPageSkeleton() {
  return (
    <DashboardPage className="pb-32">
      <DashboardPageHeader
        title="Loading..."
        description="Loading invoice email"
      />
      <div className={cn(dashboardGridClass, "lg:grid-cols-3")}>
        <div className={cn("lg:col-span-2", dashboardGapClass, "flex flex-col")}>
          <div className="bg-muted h-96 animate-pulse" />
        </div>
        <div className={cn(dashboardGapClass, "flex flex-col")}>
          <div className="bg-muted h-64 animate-pulse" />
        </div>
      </div>
    </DashboardPage>
  );
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

function normalizeEmailNoteHtml(value: string) {
  const visibleText = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  return visibleText ? value.trim() : "";
}

export default function SendEmailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  // State management
  const [activeTab, setActiveTab] = useState("compose");
  const [isSending, setIsSending] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Email content state
  const [subject, setSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [bccEmail, setBccEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // Fetch invoice data
  const { data: invoiceData, isLoading: invoiceLoading } =
    api.invoices.getById.useQuery({
      id: invoiceId,
    });

  // Get utils for cache invalidation
  const utils = api.useUtils();

  // Email sending mutation
  const sendEmailMutation = api.email.sendInvoice.useMutation({
    onSuccess: (data) => {
      toast.success("Email sent successfully!", {
        description: data.message,
        duration: 5000,
      });

      // Navigate back to invoice view
      router.push(`/dashboard/invoices/${invoiceId}`);

      // Refresh invoice data
      void utils.invoices.getById.invalidate({ id: invoiceId });
    },
    onError: (error) => {
      let errorMessage = "Failed to send invoice email";
      let errorDescription = error.message;
      let canRetry = false;

      if (error.message.includes("Invalid recipient")) {
        errorMessage = "Invalid Email Address";
        errorDescription =
          "Please check the client's email address and try again.";
      } else if (error.message.includes("domain not verified")) {
        errorMessage = "Email Configuration Issue";
        errorDescription = "Please contact support to configure email sending.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Too Many Emails";
        errorDescription = "Please wait a moment before sending another email.";
        canRetry = true;
      } else if (error.message.includes("no email address")) {
        errorMessage = "No Email Address";
        errorDescription = "This client doesn't have an email address on file.";
      } else if (
        error.message.includes("unavailable") ||
        error.message.includes("timeout")
      ) {
        errorMessage = "Service Temporarily Unavailable";
        errorDescription =
          "The email service is temporarily unavailable. Please try again.";
        canRetry = true;
      } else {
        canRetry = true; // Allow retry for unknown errors
      }

      toast.error(errorMessage, {
        description:
          canRetry && retryCount < 2
            ? `${errorDescription} You can retry this operation.`
            : errorDescription,
        duration: 6000,
        action:
          canRetry && retryCount < 2
            ? {
                label: "Retry",
                onClick: () => handleRetry(),
              }
            : undefined,
      });

      setIsSending(false);
    },
  });

  // Transform invoice data for components
  const invoice = useMemo(() => {
    return invoiceData
      ? {
          id: invoiceData.id,
          invoiceNumber: invoiceData.invoiceNumber,
          issueDate: invoiceData.issueDate,
          dueDate: invoiceData.dueDate,
          status: invoiceData.status,
          totalAmount: invoiceData.totalAmount,
          taxRate: invoiceData.taxRate,
          currency: invoiceData.currency,
          emailMessage: invoiceData.emailMessage,
          client: invoiceData.client
            ? {
                name: invoiceData.client.name,
                email: invoiceData.client.email,
              }
            : undefined,
          business: invoiceData.business
            ? {
                name: invoiceData.business.name,
                nickname: invoiceData.business.nickname,
                email: invoiceData.business.email,
              }
            : undefined,
          items: invoiceData.items?.map((item) => ({
            id: item.id,
            date: item.date,
            description: item.description,
            hours: item.hours,
            rate: item.rate,
            amount: item.amount,
          })),
        }
      : undefined;
  }, [invoiceData]);

  const normalizedCustomMessage = useMemo(
    () => normalizeEmailNoteHtml(customMessage),
    [customMessage],
  );

  // Initialize email content when invoice loads
  useEffect(() => {
    if (!invoice || isInitialized) return;

    // Set default subject
    const defaultSubject = `Invoice ${invoice.invoiceNumber} from ${invoice.business?.name ?? "Your Business"}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubject(defaultSubject);

    // Set default content (empty since template handles everything)
    const defaultContent = ``;

    setEmailContent(defaultContent);
    setCustomMessage(
      invoice.emailMessage ? plainTextToHtml(invoice.emailMessage) : "",
    );
    setIsInitialized(true);
  }, [invoice, isInitialized]);

  const handleSendEmail = async () => {
    if (!invoice?.client?.email || invoice.client.email.trim() === "") {
      toast.error("No email address", {
        description: "This client doesn't have an email address on file.",
      });
      return;
    }

    if (!subject.trim()) {
      toast.error("Subject required", {
        description: "Please enter an email subject before sending.",
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmSendEmail = async () => {
    setShowConfirmDialog(false);
    setIsSending(true);

    try {
      await sendEmailMutation.mutateAsync({
        invoiceId,
        customSubject: subject,
        customContent: emailContent,
        customMessage: normalizedCustomMessage,
        useHtml: true,
        ccEmails: ccEmail.trim() || undefined,
        bccEmails: bccEmail.trim() || undefined,
      });
      setRetryCount(0); // Reset retry count on success
    } catch {
      // Error handling is done in the mutation's onError
    }
  };

  const handleRetry = () => {
    if (retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      void confirmSendEmail();
    }
  };

  const fromEmail = invoice?.business?.email ?? NOREPLY_EMAIL;
  const toEmail = invoice?.client?.email ?? "";

  const canSend =
    !isSending && subject.trim() && toEmail && toEmail.trim() !== "";

  if (invoiceLoading) {
    return <SendEmailPageSkeleton />;
  }

  if (!invoice) {
    return (
      <DashboardPage>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Invoice not found.</AlertDescription>
        </Alert>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage className="pb-32">
      <DashboardPageHeader
        title={`Send Invoice ${invoice.invoiceNumber}`}
        description={`Compose and send invoice email to ${invoice.client?.name ?? "client"} • ${new Intl.DateTimeFormat(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        ).format(new Date())}`}
      >
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoice
        </Button>
      </DashboardPageHeader>

      {/* Warning for missing email */}
      {(!toEmail || toEmail.trim() === "") && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This client doesn&apos;t have an email address. Please add an email
            address to the client before sending the invoice.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className={cn(dashboardGridClass, "lg:grid-cols-3")}>
        <div className="lg:col-span-2">
          <PageTabs value={activeTab} onValueChange={setActiveTab}>
            <PageTabsList>
              <PageTabsTrigger value="compose" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Compose
              </PageTabsTrigger>
              <PageTabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </PageTabsTrigger>
            </PageTabsList>

            <PageTabsContent value="compose">
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Compose Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isInitialized ? (
                      <EmailComposer
                        subject={subject}
                        onSubjectChange={setSubject}
                        content={emailContent}
                        onContentChange={setEmailContent}
                        customMessage={customMessage}
                        onCustomMessageChange={setCustomMessage}
                        fromEmail={fromEmail}
                        toEmail={toEmail}
                        ccEmail={ccEmail}
                        onCcEmailChange={setCcEmail}
                        bccEmail={bccEmail}
                        onBccEmailChange={setBccEmail}
                      />
                    ) : (
                      <div className="bg-muted flex h-[400px] items-center justify-center border">
                        <div className="text-center">
                          <div className="border-primary mx-auto mb-2 h-4 w-4 animate-spin border-2 border-t-transparent"></div>
                          <p className="text-muted-foreground text-sm">
                            Initializing email content...
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </PageTabsContent>

            <PageTabsContent value="preview">
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Email Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <EmailPreview
                        subject={subject}
                        fromEmail={fromEmail}
                        toEmail={toEmail}
                        ccEmail={ccEmail}
                        bccEmail={bccEmail}
                        content={emailContent}
                        customMessage={normalizedCustomMessage}
                        invoice={invoice}
                        className="min-w-0 border-0"
                      />
                    </div>
                  </CardContent>
                </Card>
            </PageTabsContent>
          </PageTabs>
        </div>

        {/* Sidebar */}
        <div className={cn(dashboardGapClass, "flex flex-col")}>
          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="text-primary h-5 w-5" />
                Invoice #{invoice.invoiceNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Client
                </Label>
                <p className="text-sm font-medium">
                  {invoice.client?.name ?? "Client"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Issue Date
                </Label>
                <p className="text-sm">
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(invoice.issueDate))}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Status
                </Label>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  From
                </Label>
                <p className="font-mono text-sm break-all">{fromEmail}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  To
                </Label>
                <p className="font-mono text-sm break-all">
                  {toEmail || "No email address"}
                </p>
              </div>
              {ccEmail && (
                <div>
                  <Label className="text-muted-foreground text-sm font-medium">
                    CC
                  </Label>
                  <p className="font-mono text-sm break-all">{ccEmail}</p>
                </div>
              )}
              {bccEmail && (
                <div>
                  <Label className="text-muted-foreground text-sm font-medium">
                    BCC
                  </Label>
                  <p className="font-mono text-sm break-all">{bccEmail}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Subject
                </Label>
                <p className="text-sm break-words">{subject || "No subject"}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Attachment
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-3 w-3" />
                  <span>invoice-{invoice.invoiceNumber}.pdf</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTab === "compose" && (
                <Button
                  onClick={() => setActiveTab("preview")}
                  disabled={!subject.trim()}
                  className="w-full"
                  variant="outline"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Email
                </Button>
              )}

              {activeTab === "preview" && (
                <Button
                  onClick={() => setActiveTab("compose")}
                  variant="outline"
                  className="w-full"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Email
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        leftContent={
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2">
              <Send className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground font-medium">Send Invoice</p>
              <p className="text-muted-foreground text-sm">
                Email invoice to {invoice.client?.name ?? "client"}
              </p>
            </div>
          </div>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSendEmail}
          disabled={!canSend || isSending}
          variant="default"
          size="sm"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              <span className="hidden sm:inline">Sending...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send Email</span>
            </>
          )}
        </Button>
      </FloatingActionBar>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>
              Send this invoice email to <strong>{toEmail}</strong>
              {ccEmail && (
                <>
                  {" "}
                  with CC to <strong>{ccEmail}</strong>
                </>
              )}
              {bccEmail && (
                <>
                  {" "}
                  and BCC to <strong>{bccEmail}</strong>
                </>
              )}
              ?
            </DialogDescription>
            {retryCount > 0 && (
              <p className="text-muted-foreground text-sm">
                Retry attempt {retryCount} of 2
              </p>
            )}
          </DialogHeader>
          <div className="bg-muted/30 space-y-2 border p-3 text-sm">
            <div>
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{subject}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Attachment: </span>
              <span>invoice-{invoice.invoiceNumber}.pdf</span>
            </div>
            {normalizedCustomMessage && (
              <div>
                <span className="text-muted-foreground">Email note: </span>
                <span>Included</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmSendEmail} variant="default">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPage>
  );
}
