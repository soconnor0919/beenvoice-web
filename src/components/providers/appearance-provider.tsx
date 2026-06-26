"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultColorMode, isColorMode, type ColorMode } from "~/lib/appearance";

export type AppearancePreferences = {
  colorMode: ColorMode;
};

export type AppearancePatch = Partial<AppearancePreferences>;

export type AppearanceContextValue = AppearancePreferences & {
  updateAppearance: (patch: AppearancePatch) => void;
  isUpdating: boolean;
};

export const STORAGE_KEY = "bv.appearance";

export const defaultAppearance: AppearancePreferences = {
  colorMode: defaultColorMode,
};

export const AppearanceContext =
  createContext<AppearanceContextValue | null>(null);

export function readStoredColorMode(): ColorMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { colorMode?: unknown };
    return isColorMode(parsed.colorMode) ? parsed.colorMode : null;
  } catch {
    return null;
  }
}

export function writeStoredColorMode(colorMode: ColorMode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ colorMode }));
  } catch {
    // Storage can be unavailable in private browsing or locked-down contexts.
  }
}

export function applyColorMode(colorMode: ColorMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.colorMode = colorMode;
  root.classList.toggle("dark", colorMode === "dark");
}

/** Local-only appearance provider for marketing and auth pages (no tRPC). */
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorMode);

  useEffect(() => {
    const stored = readStoredColorMode();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColorMode(stored);
    }
  }, []);

  useEffect(() => {
    applyColorMode(colorMode);
    writeStoredColorMode(colorMode);
  }, [colorMode]);

  const updateAppearance = useCallback((patch: AppearancePatch) => {
    if (patch.colorMode) {
      setColorMode(patch.colorMode);
      applyColorMode(patch.colorMode);
      writeStoredColorMode(patch.colorMode);
    }
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      colorMode,
      updateAppearance,
      isUpdating: false,
    }),
    [colorMode, updateAppearance],
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
