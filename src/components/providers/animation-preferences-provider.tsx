"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type AnimationPreferences = {
  prefersReducedMotion: boolean;
  animationSpeedMultiplier: number;
};

type PartialPrefs = Partial<AnimationPreferences>;

export interface AnimationPreferencesContextValue extends AnimationPreferences {
  updatePreferences: (patch: PartialPrefs, opts?: { sync?: boolean }) => void;
  setPrefersReducedMotion: (val: boolean) => void;
  setAnimationSpeedMultiplier: (val: number) => void;
  isUpdating: boolean;
  lastSyncedAt: number | null;
}

export interface AnimationPreferencesProviderProps {
  children: React.ReactNode;
  initial?: PartialPrefs;
}

export const STORAGE_KEY = "bv.animation.prefs";
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;
export const DEFAULT_SPEED = 1;
export const DEFAULT_PREFERS_REDUCED = false;

export const AnimationPreferencesContext =
  createContext<AnimationPreferencesContextValue | null>(null);

export function clampSpeed(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

export function readLocalStorage(): PartialPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartialPrefs;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      ("prefersReducedMotion" in parsed || "animationSpeedMultiplier" in parsed)
    ) {
      return {
        prefersReducedMotion:
          typeof parsed.prefersReducedMotion === "boolean"
            ? parsed.prefersReducedMotion
            : undefined,
        animationSpeedMultiplier:
          typeof parsed.animationSpeedMultiplier === "number"
            ? clampSpeed(parsed.animationSpeedMultiplier)
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeLocalStorage(prefs: AnimationPreferences) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        prefersReducedMotion: prefs.prefersReducedMotion,
        animationSpeedMultiplier: prefs.animationSpeedMultiplier,
      }),
    );
  } catch {
    // Fail silently; storage may be unavailable
  }
}

export function applyPreferencesToDOM(prefs: AnimationPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (prefs.prefersReducedMotion) {
    root.classList.add("user-reduce-motion");
  } else {
    root.classList.remove("user-reduce-motion");
  }

  const multiplier = prefs.animationSpeedMultiplier || 1;

  const fast = prefs.prefersReducedMotion
    ? 0.01
    : parseFloat((0.15 / multiplier).toFixed(4));
  const normal = prefs.prefersReducedMotion
    ? 0.01
    : parseFloat((0.3 / multiplier).toFixed(4));
  const slow = prefs.prefersReducedMotion
    ? 0.01
    : parseFloat((0.5 / multiplier).toFixed(4));

  root.style.setProperty("--animation-speed-fast", `${fast}s`);
  root.style.setProperty("--animation-speed-normal", `${normal}s`);
  root.style.setProperty("--animation-speed-slow", `${slow}s`);
}

/** Local-only animation preferences for marketing and auth pages (no tRPC). */
export function AnimationPreferencesProvider({
  children,
  initial,
}: AnimationPreferencesProviderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    initial?.prefersReducedMotion ?? DEFAULT_PREFERS_REDUCED,
  );
  const [animationSpeedMultiplier, setAnimationSpeedMultiplier] =
    useState<number>(
      clampSpeed(initial?.animationSpeedMultiplier ?? DEFAULT_SPEED),
    );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readLocalStorage();
    const systemReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const finalPrefers =
      stored?.prefersReducedMotion ??
      initial?.prefersReducedMotion ??
      systemReduced ??
      DEFAULT_PREFERS_REDUCED;
    const finalSpeed = clampSpeed(
      stored?.animationSpeedMultiplier ??
        initial?.animationSpeedMultiplier ??
        DEFAULT_SPEED,
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(finalPrefers);
    setAnimationSpeedMultiplier(finalSpeed);
    applyPreferencesToDOM({
      prefersReducedMotion: finalPrefers,
      animationSpeedMultiplier: finalSpeed,
    });
  }, [initial?.prefersReducedMotion, initial?.animationSpeedMultiplier]);

  const updatePreferences = useCallback<
    AnimationPreferencesContextValue["updatePreferences"]
  >((patch) => {
    const nextReduced = patch.prefersReducedMotion ?? prefersReducedMotion;
    let nextSpeed = clampSpeed(
      patch.animationSpeedMultiplier ?? animationSpeedMultiplier,
    );
    if (nextReduced && nextSpeed !== 1) {
      nextSpeed = 1;
    }

    setPrefersReducedMotion(nextReduced);
    setAnimationSpeedMultiplier(nextSpeed);
    applyPreferencesToDOM({
      prefersReducedMotion: nextReduced,
      animationSpeedMultiplier: nextSpeed,
    });
    writeLocalStorage({
      prefersReducedMotion: nextReduced,
      animationSpeedMultiplier: nextSpeed,
    });
  }, [prefersReducedMotion, animationSpeedMultiplier]);

  const value: AnimationPreferencesContextValue = {
    prefersReducedMotion,
    animationSpeedMultiplier,
    updatePreferences,
    setPrefersReducedMotion: (val) => updatePreferences({ prefersReducedMotion: val }),
    setAnimationSpeedMultiplier: (val) =>
      updatePreferences({ animationSpeedMultiplier: clampSpeed(val) }),
    isUpdating: false,
    lastSyncedAt: null,
  };

  return (
    <AnimationPreferencesContext.Provider value={value}>
      {children}
    </AnimationPreferencesContext.Provider>
  );
}

export function useAnimationPreferences(): AnimationPreferencesContextValue {
  const ctx = useContext(AnimationPreferencesContext);
  if (!ctx) {
    console.warn("useAnimationPreferences used without provider");
    return {
      prefersReducedMotion: false,
      animationSpeedMultiplier: 1,
      updatePreferences: () => {
        /* no-op fallback */
      },
      setPrefersReducedMotion: () => {
        /* no-op fallback */
      },
      setAnimationSpeedMultiplier: () => {
        /* no-op fallback */
      },
      isUpdating: false,
      lastSyncedAt: null,
    };
  }
  return ctx;
}

export function getInlineAnimationPrefsScript(): string {
  return `
(function(){
  try {
    var STORAGE_KEY = '${STORAGE_KEY}';
    var raw = localStorage.getItem(STORAGE_KEY);
    var prefersReduced = false;
    var speed = 1;
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (typeof parsed.prefersReducedMotion === 'boolean') {
          prefersReduced = parsed.prefersReducedMotion;
        } else {
          prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        if (typeof parsed.animationSpeedMultiplier === 'number') {
          speed = parsed.animationSpeedMultiplier;
          if (isNaN(speed) || speed < ${MIN_SPEED} || speed > ${MAX_SPEED}) speed = 1;
        }
      } catch (_e) {}
    } else {
      prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    var root = document.documentElement;
    if (prefersReduced) root.classList.add('user-reduce-motion');
    function apply(fast, normal, slow){
      root.style.setProperty('--animation-speed-fast', fast + 's');
      root.style.setProperty('--animation-speed-normal', normal + 's');
      root.style.setProperty('--animation-speed-slow', slow + 's');
    }
    if (prefersReduced) {
      apply(0.01,0.01,0.01);
    } else {
      var fast = (0.15 / speed).toFixed(4);
      var normal = (0.30 / speed).toFixed(4);
      var slow = (0.50 / speed).toFixed(4);
      apply(fast, normal, slow);
    }
  } catch(_e){}
})();`.trim();
}
