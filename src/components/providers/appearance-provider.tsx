"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fallbackAppearance,
  isColorMode,
  isColorTheme,
  isFontPreference,
  isHslChannels,
  isInterfaceTheme,
  isPdfTemplate,
  isRadiusPreference,
  isSidebarStyle,
  type PdfTemplate,
} from "~/lib/appearance";
import {
  defaultBodyFontPreference,
  defaultHeadingFontPreference,
  defaultInterfaceTheme,
  defaultRadiusPreference,
  defaultSidebarStyle,
  brand as defaultBrand,
  type ColorMode,
  type ColorTheme,
  type FontPreference,
  type InterfaceTheme,
  type RadiusPreference,
  type SidebarStyle,
} from "~/lib/branding";

export type AppearancePreferences = {
  interfaceTheme: InterfaceTheme;
  bodyFontPreference: FontPreference;
  headingFontPreference: FontPreference;
  radiusPreference: RadiusPreference;
  sidebarStyle: SidebarStyle;
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  customColor?: string;
  brandName: string;
  brandTagline: string;
  brandLogoText: string;
  brandIcon: string;
  pdfTemplate: PdfTemplate;
  pdfAccentColor: string;
  pdfFooterText: string;
  pdfShowLogo: boolean;
  pdfShowPageNumbers: boolean;
};

export type AppearancePatch = Partial<AppearancePreferences>;

export type AppearanceContextValue = AppearancePreferences & {
  updateAppearance: (patch: AppearancePatch) => void;
  updateAppearanceDebounced: (patch: AppearancePatch) => void;
  isUpdating: boolean;
};

export const STORAGE_KEY = "bv.appearance";

export const defaultAppearance: AppearancePreferences = {
  interfaceTheme: defaultInterfaceTheme,
  bodyFontPreference: defaultBodyFontPreference,
  headingFontPreference: defaultHeadingFontPreference,
  radiusPreference: defaultRadiusPreference,
  sidebarStyle: defaultSidebarStyle,
  colorMode: fallbackAppearance.colorMode,
  colorTheme: fallbackAppearance.colorTheme,
  brandName: defaultBrand.name,
  brandTagline: defaultBrand.tagline,
  brandLogoText: defaultBrand.logoText,
  brandIcon: defaultBrand.icon,
  pdfTemplate: fallbackAppearance.pdfTemplate,
  pdfAccentColor: fallbackAppearance.pdfAccentColor,
  pdfFooterText: fallbackAppearance.pdfFooterText,
  pdfShowLogo: fallbackAppearance.pdfShowLogo,
  pdfShowPageNumbers: fallbackAppearance.pdfShowPageNumbers,
};

export const AppearanceContext =
  createContext<AppearanceContextValue | null>(null);

export function readStoredAppearance(): Partial<AppearancePreferences> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      interfaceTheme: isInterfaceTheme(parsed.interfaceTheme)
        ? parsed.interfaceTheme
        : undefined,
      bodyFontPreference: isFontPreference(parsed.bodyFontPreference)
        ? parsed.bodyFontPreference
        : isFontPreference(parsed.fontPreference)
          ? parsed.fontPreference
          : undefined,
      headingFontPreference: isFontPreference(parsed.headingFontPreference)
        ? parsed.headingFontPreference
        : isFontPreference(parsed.fontPreference)
          ? parsed.fontPreference
          : undefined,
      radiusPreference: isRadiusPreference(parsed.radiusPreference)
        ? parsed.radiusPreference
        : undefined,
      sidebarStyle: isSidebarStyle(parsed.sidebarStyle)
        ? parsed.sidebarStyle
        : undefined,
      colorMode: isColorMode(parsed.colorMode) ? parsed.colorMode : undefined,
      colorTheme: isColorTheme(parsed.colorTheme)
        ? parsed.colorTheme
        : undefined,
      customColor: isHslChannels(parsed.customColor)
        ? parsed.customColor
        : undefined,
      brandName:
        typeof parsed.brandName === "string" ? parsed.brandName : undefined,
      brandTagline:
        typeof parsed.brandTagline === "string"
          ? parsed.brandTagline
          : undefined,
      brandLogoText:
        typeof parsed.brandLogoText === "string"
          ? parsed.brandLogoText
          : undefined,
      brandIcon:
        typeof parsed.brandIcon === "string" ? parsed.brandIcon : undefined,
      pdfTemplate: isPdfTemplate(parsed.pdfTemplate)
        ? parsed.pdfTemplate
        : undefined,
      pdfAccentColor:
        typeof parsed.pdfAccentColor === "string"
          ? parsed.pdfAccentColor
          : undefined,
      pdfFooterText:
        typeof parsed.pdfFooterText === "string"
          ? parsed.pdfFooterText
          : undefined,
      pdfShowLogo:
        typeof parsed.pdfShowLogo === "boolean"
          ? parsed.pdfShowLogo
          : undefined,
      pdfShowPageNumbers:
        typeof parsed.pdfShowPageNumbers === "boolean"
          ? parsed.pdfShowPageNumbers
          : undefined,
    };
  } catch {
    return null;
  }
}

export function writeStoredAppearance(prefs: AppearancePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable in private browsing or locked-down contexts.
  }
}

export function applyAppearance(prefs: AppearancePreferences) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.interfaceTheme = prefs.interfaceTheme;
  root.dataset.bodyFont = prefs.bodyFontPreference;
  root.dataset.headingFont = prefs.headingFontPreference;
  root.dataset.radius = prefs.radiusPreference;
  root.dataset.sidebarStyle = prefs.sidebarStyle;
  root.dataset.colorMode = prefs.colorMode;
  root.dataset.colorTheme = prefs.colorTheme;

  root.classList.toggle("dark", prefs.colorMode === "dark");

  if (prefs.customColor) {
    root.style.setProperty("--custom-primary", prefs.customColor);
  } else {
    root.style.removeProperty("--custom-primary");
  }
}

/** Local-only appearance provider for marketing and auth pages (no tRPC). */
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appearance, setAppearance] =
    useState<AppearancePreferences>(defaultAppearance);

  useEffect(() => {
    const storedAppearance = readStoredAppearance();
    if (!storedAppearance) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance((prev) => ({ ...prev, ...storedAppearance }));
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
    writeStoredAppearance(appearance);
  }, [appearance]);

  const updateAppearance = useCallback((patch: AppearancePatch) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      applyAppearance(next);
      writeStoredAppearance(next);
      return next;
    });
  }, []);

  const updateAppearanceDebounced = useCallback((patch: AppearancePatch) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      applyAppearance(next);
      writeStoredAppearance(next);
      return next;
    });
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...appearance,
      updateAppearance,
      updateAppearanceDebounced,
      isUpdating: false,
    }),
    [appearance, updateAppearance, updateAppearanceDebounced],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return ctx;
}
