"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultColorMode, type ColorMode } from "~/lib/appearance";
import { api } from "~/trpc/react";
import {
  AppearanceContext,
  applyColorMode,
  defaultAppearance,
  readStoredColorMode,
  writeStoredColorMode,
  type AppearanceContextValue,
  type AppearancePatch,
} from "~/components/providers/appearance-provider";

/** Dashboard appearance provider with per-user color mode sync. */
export function AppearanceProviderSynced({
  children,
}: {
  children: React.ReactNode;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorMode);
  const serverHydratedRef = useRef(false);
  const utils = api.useUtils();
  const updateMutation = api.settings.updateColorMode.useMutation({
    onError: () => {
      const cached = utils.settings.getColorMode.getData();
      const fallback = cached?.colorMode ?? defaultColorMode;
      setColorMode(fallback);
      applyColorMode(fallback);
      writeStoredColorMode(fallback);
    },
  });

  const { data: serverColorMode } = api.settings.getColorMode.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  );

  useEffect(() => {
    const stored = readStoredColorMode();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColorMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!serverColorMode?.colorMode) return;
    if (serverHydratedRef.current) return;

     
    setColorMode(serverColorMode.colorMode);
    serverHydratedRef.current = true;
  }, [serverColorMode?.colorMode]);

  useEffect(() => {
    applyColorMode(colorMode);
    writeStoredColorMode(colorMode);
  }, [colorMode]);

  const updateAppearance = useCallback(
    (patch: AppearancePatch) => {
      if (!patch.colorMode) return;

      setColorMode(patch.colorMode);
      applyColorMode(patch.colorMode);
      writeStoredColorMode(patch.colorMode);
      updateMutation.mutate({ colorMode: patch.colorMode });
    },
    [updateMutation],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...defaultAppearance,
      colorMode,
      updateAppearance,
      isUpdating: updateMutation.isPending,
    }),
    [colorMode, updateAppearance, updateMutation.isPending],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}
