import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { hasCoachAccess, isCoachRole } from "./roles";

export type AppMode = "athlete" | "coach";

const STORAGE_KEY = "rephive:appMode";

interface CoachModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  canAccessCoach: boolean;
  canAccessAthlete: boolean;
  isCoachView: boolean;
}

const CoachModeContext = createContext<CoachModeContextValue | null>(null);

function readStoredMode(): AppMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "athlete" || v === "coach") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function CoachModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const canAccessCoach = hasCoachAccess(profile);
  const canAccessAthlete = profile?.role !== undefined;

  const defaultMode: AppMode = isCoachRole(profile) ? "coach" : "athlete";

  const [mode, setModeState] = useState<AppMode>(() => readStoredMode() ?? defaultMode);

  useEffect(() => {
    const stored = readStoredMode();
    if (stored) {
      if (stored === "coach" && !canAccessCoach) setModeState("athlete");
      else setModeState(stored);
    } else {
      setModeState(defaultMode);
    }
  }, [defaultMode, canAccessCoach, profile?.id]);

  const setMode = useCallback(
    (next: AppMode) => {
      if (next === "coach" && !canAccessCoach) return;
      setModeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    },
    [canAccessCoach],
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      canAccessCoach,
      canAccessAthlete,
      isCoachView: mode === "coach" && canAccessCoach,
    }),
    [mode, setMode, canAccessCoach, canAccessAthlete],
  );

  return <CoachModeContext.Provider value={value}>{children}</CoachModeContext.Provider>;
}

export function useCoachMode() {
  const ctx = useContext(CoachModeContext);
  if (!ctx) throw new Error("useCoachMode muss innerhalb von CoachModeProvider verwendet werden.");
  return ctx;
}
