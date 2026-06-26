"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "~/trpc/react";
import {
  AnimationPreferencesContext,
  DEFAULT_PREFERS_REDUCED,
  DEFAULT_SPEED,
  applyPreferencesToDOM,
  clampSpeed,
  readLocalStorage,
  writeLocalStorage,
  type AnimationPreferencesContextValue,
  type AnimationPreferencesProviderProps,
} from "~/components/providers/animation-preferences-provider";

type PartialPrefs = {
  prefersReducedMotion?: boolean;
  animationSpeedMultiplier?: number;
};

/** Dashboard animation preferences with tRPC sync. Must render inside TRPCReactProvider. */
export function AnimationPreferencesProviderSynced({
  children,
  initial,
  autoSync = true,
}: AnimationPreferencesProviderProps & { autoSync?: boolean }) {
  const updateMutation = api.settings.updateAnimationPreferences.useMutation();

  const { data: serverPrefs } = api.settings.getAnimationPreferences.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: false,
    },
  );

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    initial?.prefersReducedMotion ?? DEFAULT_PREFERS_REDUCED,
  );
  const [animationSpeedMultiplier, setAnimationSpeedMultiplier] =
    useState<number>(
      clampSpeed(initial?.animationSpeedMultiplier ?? DEFAULT_SPEED),
    );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const pendingSyncRef = useRef<PartialPrefs | null>(null);
  const isHydratedRef = useRef(false);
  const serverHydratedRef = useRef(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
    isHydratedRef.current = true;
  }, [initial?.prefersReducedMotion, initial?.animationSpeedMultiplier]);

  const performUpdate = useCallback(
    (patch: PartialPrefs, opts?: { sync?: boolean }) => {
      setIsUpdating(true);
      setPrefersReducedMotion((prev) => patch.prefersReducedMotion ?? prev);
      setAnimationSpeedMultiplier((prev) =>
        clampSpeed(patch.animationSpeedMultiplier ?? prev),
      );

      const normalizedPatch: PartialPrefs = { ...patch };

      if (
        normalizedPatch.prefersReducedMotion === true &&
        normalizedPatch.animationSpeedMultiplier === undefined &&
        animationSpeedMultiplier !== 1
      ) {
        normalizedPatch.animationSpeedMultiplier = 1;
      }

      const nextReduced =
        normalizedPatch.prefersReducedMotion ?? prefersReducedMotion;

      let nextSpeed = clampSpeed(
        normalizedPatch.animationSpeedMultiplier ?? animationSpeedMultiplier,
      );

      if (nextReduced && nextSpeed !== 1) {
        nextSpeed = 1;
        normalizedPatch.animationSpeedMultiplier ??= 1;
      }

      const newPrefs = {
        prefersReducedMotion: nextReduced,
        animationSpeedMultiplier: nextSpeed,
      };

      applyPreferencesToDOM(newPrefs);
      writeLocalStorage(newPrefs);

      const shouldSync = opts?.sync ?? autoSync;

      if (shouldSync && serverPrefs) {
        pendingSyncRef.current = {
          prefersReducedMotion: patch.prefersReducedMotion,
          animationSpeedMultiplier: patch.animationSpeedMultiplier,
        };
        updateMutation.mutate(
          {
            ...(normalizedPatch.prefersReducedMotion !== undefined && {
              prefersReducedMotion: normalizedPatch.prefersReducedMotion,
            }),
            ...(normalizedPatch.animationSpeedMultiplier !== undefined && {
              animationSpeedMultiplier: clampSpeed(
                normalizedPatch.animationSpeedMultiplier,
              ),
            }),
          },
          {
            onSuccess: () => {
              setLastSyncedAt(Date.now());
              pendingSyncRef.current = null;
              setIsUpdating(false);
            },
            onError: () => {
              setIsUpdating(false);
            },
          },
        );
      } else {
        setIsUpdating(false);
      }
    },
    [
      prefersReducedMotion,
      animationSpeedMultiplier,
      autoSync,
      updateMutation,
      serverPrefs,
    ],
  );

  useEffect(() => {
    if (!isHydratedRef.current) return;
    if (serverHydratedRef.current) return;
    if (!serverPrefs) return;

    const localIsDefault =
      prefersReducedMotion === DEFAULT_PREFERS_REDUCED &&
      animationSpeedMultiplier === DEFAULT_SPEED;

    const differs =
      serverPrefs.prefersReducedMotion !== prefersReducedMotion ||
      serverPrefs.animationSpeedMultiplier !== animationSpeedMultiplier;

    if (localIsDefault || differs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time server hydration after local storage
      performUpdate(
        {
          prefersReducedMotion: serverPrefs.prefersReducedMotion,
          animationSpeedMultiplier: serverPrefs.animationSpeedMultiplier,
        },
        { sync: false },
      );
    }
    serverHydratedRef.current = true;
    // One-time hydration from server after local storage is read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPrefs]);

  const updatePreferences = useCallback<
    AnimationPreferencesContextValue["updatePreferences"]
  >(
    (patch, opts) => {
      performUpdate(patch, opts);
    },
    [performUpdate],
  );

  const handleSetReduced = useCallback(
    (val: boolean) => {
      updatePreferences({ prefersReducedMotion: val });
    },
    [updatePreferences],
  );

  const handleSetSpeed = useCallback(
    (val: number) => {
      updatePreferences({ animationSpeedMultiplier: clampSpeed(val) });
    },
    [updatePreferences],
  );

  const value: AnimationPreferencesContextValue = {
    prefersReducedMotion,
    animationSpeedMultiplier,
    updatePreferences,
    setPrefersReducedMotion: handleSetReduced,
    setAnimationSpeedMultiplier: handleSetSpeed,
    isUpdating: isUpdating || updateMutation.isPending,
    lastSyncedAt,
  };

  return (
    <AnimationPreferencesContext.Provider value={value}>
      {children}
    </AnimationPreferencesContext.Provider>
  );
}
