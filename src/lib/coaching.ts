import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Tables, Enums } from "./database.types";
import { useAuth } from "./auth";

export type CoachingRelationship = Tables<"coaching_relationships">;
export type SharePermissions = Tables<"coaching_share_permissions">;
export type CoachingMessage = Tables<"coaching_messages">;
export type CoachingNote = Tables<"coaching_notes">;
export type SharePermissionKey = keyof Pick<
  SharePermissions,
  | "sessions"
  | "plans"
  | "workouts"
  | "body_measurements"
  | "body_photos"
  | "anamnesis"
  | "stats_summary"
>;

export interface SharePermissionsInput {
  sessions: boolean;
  plans: boolean;
  workouts: boolean;
  body_measurements: boolean;
  body_photos: boolean;
  anamnesis: boolean;
  stats_summary: boolean;
}

export const CONSERVATIVE_SHARE_DEFAULTS: SharePermissionsInput = {
  sessions: true,
  plans: false,
  workouts: false,
  body_measurements: false,
  body_photos: false,
  anamnesis: false,
  stats_summary: true,
};

export const SHARE_PERMISSION_LABELS: Record<SharePermissionKey, { label: string; hint: string }> = {
  sessions: { label: "Trainingsverlauf", hint: "Abgeschlossene Workouts und Sätze" },
  plans: { label: "Trainingspläne", hint: "Aktive und gespeicherte Pläne" },
  workouts: { label: "Workout-Vorlagen", hint: "Eigene Workouts in der Bibliothek" },
  body_measurements: { label: "Körperwerte", hint: "Gewicht, Umfänge und KFA" },
  body_photos: { label: "Fortschrittsfotos", hint: "Vorher/Nachher-Fotos" },
  anamnesis: { label: "Anamnese", hint: "Ziele, Erfahrung und Gesundheitsangaben" },
  stats_summary: { label: "Statistik-Überblick", hint: "Volumen und Trainingsfrequenz" },
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function fetchMyRelationships(): Promise<CoachingRelationship[]> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .order("invited_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRelationship(id: string): Promise<CoachingRelationship | null> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSharePermissions(relationshipId: string): Promise<SharePermissions | null> {
  const { data, error } = await supabase
    .from("coaching_share_permissions")
    .select("*")
    .eq("relationship_id", relationshipId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function sendInviteEmail(relationshipId: string): Promise<void> {
  try {
    await supabase.functions.invoke("send-coaching-invite", {
      body: { relationshipId },
    });
  } catch (e) {
    console.warn("Einladungs-E-Mail konnte nicht gesendet werden:", e);
  }
}

export async function inviteCoach(athleteId: string, athleteEmail: string, coachEmail: string): Promise<string> {
  const email = normalizeEmail(coachEmail);
  if (!email.includes("@")) throw new Error("Ungültige Coach-E-Mail.");

  const { data, error } = await supabase
    .from("coaching_relationships")
    .insert({
      athlete_id: athleteId,
      athlete_email: normalizeEmail(athleteEmail),
      coach_email: email,
      initiated_by: "athlete" satisfies Enums<"coaching_initiator">,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("coaching_share_permissions").insert({
    relationship_id: data.id,
    ...CONSERVATIVE_SHARE_DEFAULTS,
    consent_at: new Date().toISOString(),
  });

  void sendInviteEmail(data.id);
  return data.id;
}

export async function inviteAthlete(coachId: string, coachEmail: string, athleteEmail: string): Promise<string> {
  const email = normalizeEmail(athleteEmail);
  if (!email.includes("@")) throw new Error("Ungültige Athleten-E-Mail.");

  const { data, error } = await supabase
    .from("coaching_relationships")
    .insert({
      coach_id: coachId,
      coach_email: normalizeEmail(coachEmail),
      athlete_email: email,
      initiated_by: "coach" satisfies Enums<"coaching_initiator">,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;

  void sendInviteEmail(data.id);
  return data.id;
}

export async function acceptInviteAsCoach(
  relationshipId: string,
  coachId: string,
  coachEmail: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("coaching_relationships")
    .update({
      coach_id: coachId,
      coach_email: normalizeEmail(coachEmail),
      status: "active",
      accepted_at: now,
    })
    .eq("id", relationshipId);
  if (error) throw error;

  await supabase.from("profiles").update({ coach_enabled: true }).eq("id", coachId);
}

export async function acceptInviteAsAthlete(
  relationshipId: string,
  athleteId: string,
  athleteEmail: string,
  permissions: SharePermissionsInput,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("coaching_relationships")
    .update({
      athlete_id: athleteId,
      athlete_email: normalizeEmail(athleteEmail),
      status: "active",
      accepted_at: now,
    })
    .eq("id", relationshipId);
  if (error) throw error;

  const { error: permError } = await supabase.from("coaching_share_permissions").upsert({
    relationship_id: relationshipId,
    ...permissions,
    consent_at: now,
    updated_at: now,
  });
  if (permError) throw permError;
}

export async function declineInvite(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from("coaching_relationships")
    .update({ status: "declined" })
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function revokeRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from("coaching_relationships")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function updateSharePermissions(
  relationshipId: string,
  permissions: SharePermissionsInput,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("coaching_share_permissions")
    .update({ ...permissions, consent_at: now, updated_at: now })
    .eq("relationship_id", relationshipId);
  if (error) throw error;
}

export async function fetchCoachClients(): Promise<CoachingRelationship[]> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("status", "active")
    .not("athlete_id", "is", null)
    .order("accepted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface CoachClientProfile {
  displayName: string | null;
  birthDate: string | null;
  anamnesis: unknown;
}

export async function fetchCoachClientProfile(athleteId: string): Promise<CoachClientProfile | null> {
  const { data, error } = await supabase.rpc("coach_client_profile", { p_athlete_id: athleteId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    displayName: row.display_name ?? null,
    birthDate: row.birth_date ?? null,
    anamnesis: row.anamnesis ?? null,
  };
}

export async function fetchAthleteSessionsForCoach(athleteId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", athleteId)
    .order("performed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAthletePlansForCoach(athleteId: string) {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", athleteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAthleteBodyMeasurementsForCoach(athleteId: string) {
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", athleteId)
    .order("performed_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(relationshipId: string): Promise<CoachingMessage[]> {
  const { data, error } = await supabase
    .from("coaching_messages")
    .select("*")
    .eq("relationship_id", relationshipId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  relationshipId: string,
  senderId: string,
  body: string,
): Promise<CoachingMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Nachricht darf nicht leer sein.");
  const { data, error } = await supabase
    .from("coaching_messages")
    .insert({ relationship_id: relationshipId, sender_id: senderId, body: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function markMessagesRead(relationshipId: string, readerId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("coaching_messages")
    .update({ read_at: now })
    .eq("relationship_id", relationshipId)
    .neq("sender_id", readerId)
    .is("read_at", null);
  if (error) throw error;
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { data: rels, error: relError } = await supabase
    .from("coaching_relationships")
    .select("id")
    .eq("status", "active")
    .or(`athlete_id.eq.${userId},coach_id.eq.${userId}`);
  if (relError) throw relError;
  const ids = (rels ?? []).map((r) => r.id);
  if (ids.length === 0) return 0;

  const { count, error } = await supabase
    .from("coaching_messages")
    .select("id", { count: "exact", head: true })
    .in("relationship_id", ids)
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export function subscribeToMessages(
  relationshipId: string,
  onMessage: (msg: CoachingMessage) => void,
): () => void {
  const channel = supabase
    .channel(`coaching-messages:${relationshipId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "coaching_messages",
        filter: `relationship_id=eq.${relationshipId}`,
      },
      (payload) => {
        onMessage(payload.new as CoachingMessage);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function createCoachingNote(
  relationshipId: string,
  authorId: string,
  targetType: Enums<"coaching_note_target">,
  targetId: string,
  body: string,
): Promise<CoachingNote> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Notiz darf nicht leer sein.");
  const { data, error } = await supabase
    .from("coaching_notes")
    .insert({
      relationship_id: relationshipId,
      author_id: authorId,
      target_type: targetType,
      target_id: targetId,
      body: trimmed,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchNotesForTarget(
  targetType: Enums<"coaching_note_target">,
  targetId: string,
): Promise<CoachingNote[]> {
  const { data, error } = await supabase
    .from("coaching_notes")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findActiveRelationshipForAthleteCoach(
  athleteId: string,
  coachId: string,
): Promise<CoachingRelationship | null> {
  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("status", "active")
    .eq("athlete_id", athleteId)
    .eq("coach_id", coachId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useCoachingRelationships(refreshKey = 0) {
  const { user } = useAuth();
  const [data, setData] = useState<CoachingRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMyRelationships());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return { data, loading, error, reload };
}

export function useUnreadCoachingCount(refreshKey = 0) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    void countUnreadMessages(user.id)
      .then(setCount)
      .catch(() => setCount(0));
  }, [user?.id, refreshKey]);

  return count;
}
