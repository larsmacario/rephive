let hapticsReady = false;
let hapticsModule: { Haptics: { impact: (options: { style: string }) => Promise<void> } } | null = null;

export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const loadHaptics = async () => {
  if (hapticsReady) return hapticsModule;
  hapticsReady = true;
  try {
    hapticsModule = (await import("@capacitor/haptics")) as typeof hapticsModule;
  } catch {
    hapticsModule = null;
  }
  return hapticsModule;
};

export const triggerTapHaptic = async () => {
  if (prefersReducedMotion()) return;
  const mod = await loadHaptics();
  if (mod?.Haptics) {
    try {
      await mod.Haptics.impact({ style: "LIGHT" });
      return;
    } catch {
      // Web fallback below.
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
};
