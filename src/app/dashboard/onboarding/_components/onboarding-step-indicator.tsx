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

const TRACK_GRID_COLUMNS = ONBOARDING_STEPS.map((_, index) =>
  index < ONBOARDING_STEPS.length - 1 ? "auto 1fr" : "auto",
).join(" ");

export function OnboardingStepIndicator({ step }: { step: OnboardingStepId }) {
  const currentIndex = stepIndex(step);

  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="sr-only">
        {ONBOARDING_STEPS.map((item, index) => {
          const isCurrent = currentIndex === index;
          return (
            <li key={item.id} aria-current={isCurrent ? "step" : undefined}>
              {item.label}
              {isCurrent ? " (current)" : ""}
            </li>
          );
        })}
      </ol>

      {/* Row 1: circles + connectors. Row 2: labels (same columns as circles). */}
      <div
        className="mx-auto grid w-full max-w-md items-center gap-y-2"
        style={{
          gridTemplateColumns: TRACK_GRID_COLUMNS,
          gridTemplateRows: "auto auto",
        }}
        aria-hidden
      >
        {ONBOARDING_STEPS.map((item, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isUpcoming = currentIndex < index;
          const connectorComplete = currentIndex > index;
          const circleCol = index * 2 + 1;

          return (
            <div key={item.id} className="contents">
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 self-center rounded-full transition-colors",
                    connectorComplete ? "bg-primary" : "bg-border/80",
                  )}
                  style={{ gridColumn: index * 2, gridRow: 1 }}
                />
              )}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center justify-self-center rounded-full border-2 text-sm font-medium transition-colors",
                  isComplete &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-primary/10 text-primary ring-primary/20 ring-4",
                  isUpcoming &&
                    "border-border/80 bg-background/60 text-muted-foreground",
                )}
                style={{ gridColumn: circleCol, gridRow: 1 }}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "hidden min-w-0 justify-self-center text-center text-xs leading-tight font-medium sm:block",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
                style={{ gridColumn: circleCol, gridRow: 2 }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

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
