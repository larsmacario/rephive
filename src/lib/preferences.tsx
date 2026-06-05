import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import {
  DEFAULT_PREFERENCES,
  mergePartialPreferences,
  mergePreferences,
  saveUserPreferences,
  type UserPreferences,
  type UserPreferencesUpdate,
} from "./preferences";

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (partial: UserPreferencesUpdate, immediate?: boolean) => void | Promise<void>;
  saving: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, profile, profileReady, refreshProfile } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<UserPreferences | null>(null);
  const preferencesRef = useRef(preferences);

  preferencesRef.current = preferences;

  useLayoutEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      return;
    }
    if (!profileReady) return;
    setPreferences(mergePreferences(profile?.preferences ?? null));
  }, [user, profile, profileReady, profile?.preferences, profile?.id]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const persist = useCallback(
    async (next: UserPreferences) => {
      if (!user) return;
      setSaving(true);
      try {
        await saveUserPreferences(user.id, next);
        await refreshProfile();
      } catch (e) {
        console.error("Einstellungen speichern fehlgeschlagen:", e);
        setPreferences(mergePreferences(profile?.preferences ?? null));
      } finally {
        setSaving(false);
        pendingRef.current = null;
      }
    },
    [user, profile?.preferences, refreshProfile],
  );

  const updatePreferences = useCallback(
    (partial: UserPreferencesUpdate, immediate = false) => {
      if (!user) return;

      const next = mergePartialPreferences(preferencesRef.current, partial);
      setPreferences(next);
      pendingRef.current = next;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      if (immediate) {
        return persist(next);
      }

      saveTimerRef.current = setTimeout(() => {
        if (pendingRef.current) void persist(pendingRef.current);
      }, 400);
    },
    [user, persist],
  );

  const value = useMemo(
    () => ({ preferences, updatePreferences, saving }),
    [preferences, updatePreferences, saving],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences muss innerhalb von PreferencesProvider verwendet werden.");
  }
  return ctx;
}
