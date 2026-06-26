"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isHslChannels } from "~/lib/appearance";
import type { ColorMode, ColorTheme, FontPreference, InterfaceTheme, RadiusPreference, SidebarStyle } from "~/lib/branding";
import { api } from "~/trpc/react";
import {
  AppearanceContext,
  applyAppearance,
  defaultAppearance,
  readStoredAppearance,
  writeStoredAppearance,
  type AppearanceContextValue,
  type AppearancePatch,
  type AppearancePreferences,
} from "~/components/providers/appearance-provider";

type ServerAppearance = {
  interfaceTheme: InterfaceTheme;
  bodyFontPreference: FontPreference;
  headingFontPreference: FontPreference;
  radiusPreference: RadiusPreference;
  sidebarStyle: SidebarStyle;
  theme: ColorMode;
  colorTheme: ColorTheme;
  customColor?: string;
  brandName: string;
  brandTagline: string;
  brandLogoText: string;
  brandIcon: string;
  pdfTemplate: AppearancePreferences["pdfTemplate"];
  pdfAccentColor: string;
  pdfFooterText: string;
  pdfShowLogo: boolean;
  pdfShowPageNumbers: boolean;
};

function getServerAppearancePatch(
  serverAppearance: ServerAppearance,
): AppearancePatch {
  return {
    interfaceTheme: serverAppearance.interfaceTheme,
    bodyFontPreference: serverAppearance.bodyFontPreference,
    headingFontPreference: serverAppearance.headingFontPreference,
    radiusPreference: serverAppearance.radiusPreference,
    sidebarStyle: serverAppearance.sidebarStyle,
    colorMode: serverAppearance.theme,
    colorTheme: serverAppearance.colorTheme,
    customColor: serverAppearance.customColor,
    brandName: serverAppearance.brandName,
    brandTagline: serverAppearance.brandTagline,
    brandLogoText: serverAppearance.brandLogoText,
    brandIcon: serverAppearance.brandIcon,
    pdfTemplate: serverAppearance.pdfTemplate,
    pdfAccentColor: serverAppearance.pdfAccentColor,
    pdfFooterText: serverAppearance.pdfFooterText,
    pdfShowLogo: serverAppearance.pdfShowLogo,
    pdfShowPageNumbers: serverAppearance.pdfShowPageNumbers,
  };
}

/** Dashboard appearance provider with tRPC theme sync. Must render inside TRPCReactProvider. */
export function AppearanceProviderSynced({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appearance, setAppearance] =
    useState<AppearancePreferences>(defaultAppearance);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebouncedPatchRef = useRef<AppearancePatch>({});
  const utils = api.useUtils();
  const updateMutation = api.settings.updateTheme.useMutation({
    onSuccess: async () => {
      await utils.settings.getTheme.invalidate();
    },
    onError: () => {
      const cachedAppearance = utils.settings.getTheme.getData();
      const fallback = cachedAppearance
        ? {
            ...defaultAppearance,
            ...getServerAppearancePatch(cachedAppearance),
          }
        : defaultAppearance;

      setAppearance(fallback);
      applyAppearance(fallback);
      writeStoredAppearance(fallback);
    },
  });

  const persistAppearance = useCallback(
    (patch: AppearancePatch) => {
      if (
        patch.customColor !== undefined &&
        !isHslChannels(patch.customColor)
      ) {
        return;
      }

      updateMutation.mutate({
        interfaceTheme: patch.interfaceTheme,
        bodyFontPreference: patch.bodyFontPreference,
        headingFontPreference: patch.headingFontPreference,
        radiusPreference: patch.radiusPreference,
        sidebarStyle: patch.sidebarStyle,
        theme: patch.colorMode,
        colorTheme: patch.colorTheme,
        customColor: patch.customColor,
        brandName: patch.brandName,
        brandTagline: patch.brandTagline,
        brandLogoText: patch.brandLogoText,
        brandIcon: patch.brandIcon,
        pdfTemplate: patch.pdfTemplate,
        pdfAccentColor: patch.pdfAccentColor,
        pdfFooterText: patch.pdfFooterText,
        pdfShowLogo: patch.pdfShowLogo,
        pdfShowPageNumbers: patch.pdfShowPageNumbers,
      });
    },
    [updateMutation],
  );

  const { data: serverAppearance } = api.settings.getTheme.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    const storedAppearance = readStoredAppearance();
    if (!storedAppearance) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance((prev) => ({ ...prev, ...storedAppearance }));
  }, []);

  useEffect(() => {
    if (!serverAppearance) return;
    const next = getServerAppearancePatch(serverAppearance);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance((prev) => ({ ...prev, ...next }));
  }, [serverAppearance]);

  useEffect(() => {
    applyAppearance(appearance);
    writeStoredAppearance(appearance);
  }, [appearance]);

  const updateAppearance = useCallback(
    (patch: AppearancePatch) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (Object.keys(pendingDebouncedPatchRef.current).length > 0) {
        persistAppearance(pendingDebouncedPatchRef.current);
        pendingDebouncedPatchRef.current = {};
      }

      setAppearance((prev) => {
        const next = { ...prev, ...patch };
        applyAppearance(next);
        writeStoredAppearance(next);
        return next;
      });

      persistAppearance(patch);
    },
    [persistAppearance],
  );

  const updateAppearanceDebounced = useCallback(
    (patch: AppearancePatch) => {
      pendingDebouncedPatchRef.current = {
        ...pendingDebouncedPatchRef.current,
        ...patch,
      };

      setAppearance((prev) => {
        const next = { ...prev, ...patch };
        applyAppearance(next);
        writeStoredAppearance(next);
        return next;
      });

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        persistAppearance(pendingDebouncedPatchRef.current);
        pendingDebouncedPatchRef.current = {};
        debounceTimerRef.current = null;
      }, 500);
    },
    [persistAppearance],
  );

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      pendingDebouncedPatchRef.current = {};
    },
    [],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...appearance,
      updateAppearance,
      updateAppearanceDebounced,
      isUpdating: updateMutation.isPending,
    }),
    [
      appearance,
      updateAppearance,
      updateAppearanceDebounced,
      updateMutation.isPending,
    ],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}
