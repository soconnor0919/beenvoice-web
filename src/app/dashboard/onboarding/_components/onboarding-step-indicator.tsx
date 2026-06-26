import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

export const ONBOARDING_STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "business", label: "Business" },
  { id: "client", label: "Client" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"] | "done";

function stepIndex(step: OnboardingStepId) {
  if (step === "done") return ONBOARDING_STEPS.length;
  return ONBOARDING_STEPS.findIndex((item) => item.id === step);
}

export function OnboardingStepIndicator({ step }: { step: OnboardingStepId }) {
  const currentIndex = stepIndex(step);

  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="mx-auto flex w-full max-w-md">
        {ONBOARDING_STEPS.map((item, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isUpcoming = currentIndex < index;
          const connectorComplete = currentIndex > index;

          return (
            <li key={item.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      connectorComplete || isCurrent
                        ? "bg-primary"
                        : "bg-border/80",
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isComplete &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary/10 text-primary ring-primary/20 ring-4",
                    isUpcoming &&
                      "border-border/80 bg-background/60 text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      connectorComplete ? "bg-primary" : "bg-border/80",
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 hidden text-xs font-medium sm:block",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground mt-4 text-center text-sm sm:hidden">
        Step {Math.min(currentIndex + 1, ONBOARDING_STEPS.length)} of{" "}
        {ONBOARDING_STEPS.length}
        {step !== "done" && ONBOARDING_STEPS[currentIndex]
          ? ` · ${ONBOARDING_STEPS[currentIndex].label}`
          : ""}
      </p>
    </nav>
  );
}
