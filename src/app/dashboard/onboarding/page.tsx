import { DashboardPage } from "~/components/layout/dashboard-page";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <DashboardPage>
      <OnboardingWizard />
    </DashboardPage>
  );
}
