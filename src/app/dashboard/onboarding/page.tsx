import { OnboardingShell } from "./_components/onboarding-shell";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <OnboardingShell>
      <OnboardingWizard />
    </OnboardingShell>
  );
}
