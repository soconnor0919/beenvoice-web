"use client";

import { createContext, useContext } from "react";

interface DashboardUserContextValue {
  isAdmin: boolean;
  needsOnboarding: boolean;
}

const DashboardUserContext = createContext<DashboardUserContextValue>({
  isAdmin: false,
  needsOnboarding: false,
});

export function DashboardUserProvider({
  isAdmin,
  needsOnboarding,
  children,
}: DashboardUserContextValue & { children: React.ReactNode }) {
  return (
    <DashboardUserContext.Provider value={{ isAdmin, needsOnboarding }}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  return useContext(DashboardUserContext);
}
