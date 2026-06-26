"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDashboardUser } from "./dashboard-user-context";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { needsOnboarding } = useDashboardUser();
  const pathname = usePathname();
  const router = useRouter();
  const onOnboardingPage = pathname === "/dashboard/onboarding";

  useEffect(() => {
    if (needsOnboarding && !onOnboardingPage) {
      router.replace("/dashboard/onboarding");
    }
  }, [needsOnboarding, onOnboardingPage, router]);

  if (needsOnboarding && !onOnboardingPage) {
    return null;
  }

  return children;
}
