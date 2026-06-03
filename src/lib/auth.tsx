import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Tables } from "./database.types";

type Profile = Tables<"profiles">;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True once profile fetch finished (or no user). Prevents onboarding flash. */
  profileReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  verifyResetToken: (email: string, token: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateDisplayName: (displayName: string) => Promise<{ error: string | null }>;
  updateBirthDate: (birthDate: string | null) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("Profil laden fehlgeschlagen:", error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  const loadProfile = useCallback(async (userId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setProfileReady(false);
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
    } finally {
      setProfileReady(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setProfile(null);
        setProfileReady(true);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setLoading(true);
        loadProfile(nextSession.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setProfileReady(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  }, []);

  const verifyResetToken = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) return { error: "Nicht angemeldet." };
      const name = displayName.trim();
      if (!name) return { error: "Anzeigename darf nicht leer sein." };

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: name })
        .eq("id", user.id);
      if (profileError) return { error: profileError.message };

      const { error: metaError } = await supabase.auth.updateUser({
        data: { display_name: name },
      });
      if (metaError) return { error: metaError.message };

      await loadProfile(user.id);
      return { error: null };
    },
    [user, loadProfile],
  );

  const updateEmail = useCallback(async (email: string) => {
    if (!user) return { error: "Nicht angemeldet." };
    const nextEmail = email.trim();
    if (!nextEmail) return { error: "E-Mail darf nicht leer sein." };
    if (nextEmail === user.email) return { error: "Das ist bereits deine aktuelle E-Mail." };

    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    return { error: error?.message ?? null };
  }, [user]);

  const updateBirthDate = useCallback(
    async (birthDate: string | null) => {
      if (!user) return { error: "Nicht angemeldet." };
      const normalized = birthDate && birthDate.trim() ? birthDate.trim() : null;
      if (normalized && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return { error: "Ungültiges Datumsformat. Bitte YYYY-MM-DD verwenden." };
      }

      const { error } = await supabase.from("profiles").update({ birth_date: normalized }).eq("id", user.id);
      if (error) return { error: error.message };

      await loadProfile(user.id);
      return { error: null };
    },
    [user, loadProfile],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user?.email) return { error: "Nicht angemeldet." };
      if (newPassword.length < 6) {
        return { error: "Neues Passwort muss mindestens 6 Zeichen haben." };
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (authError) return { error: "Aktuelles Passwort ist falsch." };

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error?.message ?? null };
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id, { silent: true });
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      profileReady,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      verifyResetToken,
      updatePassword,
      updateDisplayName,
      updateBirthDate,
      updateEmail,
      changePassword,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      loading,
      profileReady,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      verifyResetToken,
      updatePassword,
      updateDisplayName,
      updateBirthDate,
      updateEmail,
      changePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  return ctx;
}
