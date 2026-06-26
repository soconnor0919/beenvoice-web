"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { marketingSurfaceClass } from "~/components/marketing/marketing-chrome";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { brand } from "~/lib/branding";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  OnboardingStepIndicator,
  type OnboardingStepId,
} from "./onboarding-step-indicator";

type Step = OnboardingStepId;

function StepIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-primary/10 text-primary mb-5 inline-flex rounded-2xl p-3",
        className,
      )}
    >
      <Icon className="h-6 w-6" />
    </div>
  );
}

function OnboardingPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        marketingSurfaceClass,
        "bg-card/80 px-6 py-8 sm:px-8 sm:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

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

  const displayStep = useMemo((): Step => {
    if (step !== "welcome" || !status || status.completed) {
      return step;
    }
    if (status.businessCount > 0 && status.clientCount > 0) {
      return "done";
    }
    if (status.businessCount > 0) {
      return "client";
    }
    return step;
  }, [step, status]);

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {displayStep !== "done" && <OnboardingStepIndicator step={displayStep} />}

      {displayStep === "welcome" && (
        <OnboardingPanel>
          <div className="text-center">
            <p className="text-primary mb-3 text-sm font-medium tracking-wide uppercase">
              Quick setup
            </p>
            <StepIcon icon={FileText} />
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome to {brand.name}
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base">
              Let&apos;s set up the basics so you can send your first invoice.
              This only takes a minute.
            </p>
          </div>

          <ul className="mt-8 space-y-4">
            <li className="bg-background/50 border-border/50 flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Add your business</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-6">
                  The name and details that appear on invoices you send.
                </p>
              </div>
            </li>
            <li className="bg-background/50 border-border/50 flex items-start gap-3 rounded-xl border p-4">
              <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Add your first client</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-6">
                  Who you&apos;re billing — you can add more details later.
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" size="lg" onClick={() => setStep("business")}>
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              onClick={handleSkip}
              disabled={completeOnboarding.isPending}
            >
              Skip for now
            </Button>
          </div>
        </OnboardingPanel>
      )}

      {displayStep === "business" && (
        <OnboardingPanel>
          <div className="text-center">
            <StepIcon icon={Building2} />
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Your business
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base">
              This appears on invoices as the sender — name, logo, and contact
              details.
            </p>
          </div>

          <form onSubmit={handleBusinessSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Studio LLC"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                size="lg"
                className="h-11 flex-1"
                disabled={createBusiness.isPending}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </form>
        </OnboardingPanel>
      )}

      {displayStep === "client" && (
        <OnboardingPanel>
          <div className="text-center">
            <StepIcon icon={Users} />
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Your first client
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base">
              Who are you billing? You can add more details later.
            </p>
          </div>

          <form onSubmit={handleClientSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="client-name">Client name</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                size="lg"
                className="h-11 flex-1"
                disabled={createClient.isPending}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </form>
        </OnboardingPanel>
      )}

      {displayStep === "done" && (
        <OnboardingPanel className="text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-5 inline-flex rounded-full p-3">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            You&apos;re ready to go
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base">
            Your workspace is set up. Create an invoice or explore the dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="h-11 flex-1" onClick={handleFinish}>
              Go to dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 flex-1"
              onClick={handleCreateInvoice}
            >
              Create first invoice
            </Button>
          </div>
        </OnboardingPanel>
      )}

      {step !== "welcome" && displayStep !== "done" && (
        <div className="mt-6 text-center">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() =>
              setStep(displayStep === "client" ? "business" : "welcome")
            }
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
