"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

type Step = "welcome" | "business" | "client" | "done";

export function OnboardingWizard() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: status, isLoading } = api.settings.getOnboardingStatus.useQuery();

  const [step, setStep] = useState<Step>("welcome");
  const [businessName, setBusinessName] = useState("");
  const [clientName, setClientName] = useState("");

  const createBusiness = api.businesses.create.useMutation({
    onSuccess: async () => {
      toast.success("Business added");
      await utils.settings.getOnboardingStatus.invalidate();
      setStep("client");
    },
    onError: (error) => toast.error(error.message),
  });

  const createClient = api.clients.create.useMutation({
    onSuccess: async () => {
      toast.success("Client added");
      await utils.settings.getOnboardingStatus.invalidate();
      setStep("done");
    },
    onError: (error) => toast.error(error.message),
  });

  const completeOnboarding = api.settings.completeOnboarding.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (status?.completed) {
      router.replace("/dashboard");
    }
  }, [status?.completed, router]);

  useEffect(() => {
    if (!isLoading && status && !status.completed && step === "welcome") {
      if (status.businessCount > 0 && status.clientCount > 0) {
        setStep("done");
      } else if (status.businessCount > 0) {
        setStep("client");
      }
    }
  }, [isLoading, status, step]);

  function handleSkip() {
    completeOnboarding.mutate();
  }

  function handleBusinessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    createBusiness.mutate({
      name: businessName.trim(),
      isDefault: true,
    });
  }

  function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    createClient.mutate({ name: clientName.trim() });
  }

  function handleFinish() {
    completeOnboarding.mutate();
  }

  function handleCreateInvoice() {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        router.push("/dashboard/invoices/new");
        router.refresh();
      },
    });
  }

  if (isLoading || status?.completed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center py-8">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Sparkles className="text-primary h-5 w-5" />
        <p className="text-muted-foreground text-sm font-medium">
          {step === "welcome" && "Step 1 of 3"}
          {step === "business" && "Step 2 of 3"}
          {step === "client" && "Step 3 of 3"}
          {step === "done" && "All set"}
        </p>
      </div>

      {step === "welcome" && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to BeenVoice</CardTitle>
            <CardDescription>
              Let&apos;s set up the basics so you can send your first invoice.
              This only takes a minute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <p>Add the business you send invoices from</p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <p>Add your first client to bill</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => setStep("business")}>
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={completeOnboarding.isPending}
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "business" && (
        <Card>
          <CardHeader>
            <CardTitle>Your business</CardTitle>
            <CardDescription>
              This appears on invoices as the sender — name, logo, and contact
              details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Studio LLC"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createBusiness.isPending}
                >
                  Continue
                </Button>
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "client" && (
        <Card>
          <CardHeader>
            <CardTitle>Your first client</CardTitle>
            <CardDescription>
              Who are you billing? You can add more details later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Corp"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createClient.isPending}
                >
                  Continue
                </Button>
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary h-5 w-5" />
              You&apos;re ready to go
            </CardTitle>
            <CardDescription>
              Your workspace is set up. Create an invoice or explore the
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={handleFinish}>
              Go to dashboard
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleCreateInvoice}>
              Create first invoice
            </Button>
          </CardContent>
        </Card>
      )}

      {step !== "welcome" && step !== "done" && (
        <Button
          variant="link"
          className="text-muted-foreground mt-4"
          onClick={() =>
            setStep(step === "client" ? "business" : "welcome")
          }
        >
          Back
        </Button>
      )}
    </div>
  );
}
