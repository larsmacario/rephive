import { useEffect, useState } from "react";
import { M } from "../../theme";
import { Icon } from "../../components/Icon";
import { MButton } from "../../components/MButton";
import { CoachingChat } from "../../components/CoachingChat";
import {
  createCoachingNote,
  fetchAthleteBodyMeasurementsForCoach,
  fetchAthletePlansForCoach,
  fetchAthleteSessionsForCoach,
  fetchCoachClientProfile,
  fetchSharePermissions,
  type CoachingRelationship,
} from "../../lib/coaching";
import { useAuth } from "../../lib/auth";

export interface CoachClientDetailScreenProps {
  relationship: CoachingRelationship;
  onBack: () => void;
}

type DetailTab = "sessions" | "plans" | "body" | "chat";

function CoachingNoteForm({
  relationshipId,
  targetType,
  targetId,
  onSaved,
}: {
  relationshipId: string;
  targetType: "session" | "plan";
  targetId: string;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    try {
      await createCoachingNote(relationshipId, user.id, targetType, targetId, body);
      setBody("");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Notiz für Athlet…"
        style={{
          flex: 1,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid " + M.line,
          background: M.panel,
          color: M.fg,
          fontSize: 13,
        }}
      />
      <MButton size="sm" variant="secondary" disabled={busy || !body.trim()} onClick={() => void save()}>
        Notiz
      </MButton>
    </div>
  );
}

export function CoachClientDetailScreen({ relationship, onBack }: CoachClientDetailScreenProps) {
  const athleteId = relationship.athlete_id;
  const [tab, setTab] = useState<DetailTab>("sessions");
  const [displayName, setDisplayName] = useState(relationship.athlete_email);
  const [perms, setPerms] = useState<Awaited<ReturnType<typeof fetchSharePermissions>>>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchAthleteSessionsForCoach>>>([]);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof fetchAthletePlansForCoach>>>([]);
  const [measurements, setMeasurements] = useState<
    Awaited<ReturnType<typeof fetchAthleteBodyMeasurementsForCoach>>
  >([]);

  useEffect(() => {
    if (!athleteId) return;
    void fetchCoachClientProfile(athleteId).then((p) => {
      if (p?.displayName) setDisplayName(p.displayName);
    });
    void fetchSharePermissions(relationship.id).then(setPerms);
  }, [athleteId, relationship.id]);

  useEffect(() => {
    if (!athleteId) return;
    if (tab === "sessions" && perms?.sessions) {
      void fetchAthleteSessionsForCoach(athleteId).then(setSessions);
    }
    if (tab === "plans" && perms?.plans) {
      void fetchAthletePlansForCoach(athleteId).then(setPlans);
    }
    if (tab === "body" && perms?.body_measurements) {
      void fetchAthleteBodyMeasurementsForCoach(athleteId).then(setMeasurements);
    }
  }, [athleteId, tab, perms]);

  const tabs: { id: DetailTab; label: string; enabled: boolean }[] = [
    { id: "sessions", label: "Verlauf", enabled: !!perms?.sessions },
    { id: "plans", label: "Pläne", enabled: !!perms?.plans },
    { id: "body", label: "Körper", enabled: !!perms?.body_measurements },
    { id: "chat", label: "Chat", enabled: true },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 22px",
          borderBottom: "1px solid " + M.line2,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
        >
          <Icon name="chevL" size={22} color={M.fg} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22 }}>{displayName}</div>
          <div style={{ fontSize: 12, color: M.mut }}>Klient</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 22px", overflowX: "auto" }}>
        {tabs
          .filter((t) => t.enabled)
          .map((t) => (
            <MButton
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </MButton>
          ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: "0 22px 24px", overflowY: "auto" }}>
        {tab === "chat" && <CoachingChat relationshipId={relationship.id} />}

        {tab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.length === 0 ? (
              <div style={{ color: M.mut, fontSize: 13, padding: 16 }}>Keine geteilten Sessions.</div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: M.card,
                    border: "1px solid " + M.line2,
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                  <div style={{ color: M.mut, fontSize: 12, marginTop: 4 }}>
                    {new Date(s.performed_at).toLocaleDateString("de-DE")} · {s.duration_min} min ·{" "}
                    {(s.volume_kg / 1000).toFixed(1)}t
                  </div>
                  <CoachingNoteForm
                    relationshipId={relationship.id}
                    targetType="session"
                    targetId={s.id}
                    onSaved={() => undefined}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plans.length === 0 ? (
              <div style={{ color: M.mut, fontSize: 13, padding: 16 }}>Keine geteilten Pläne.</div>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: M.card,
                    border: "1px solid " + M.line2,
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ color: M.mut, fontSize: 12, marginTop: 4 }}>
                    {p.is_active ? "Aktiv" : "Inaktiv"} · Tag {p.current_day + 1}
                  </div>
                  <CoachingNoteForm
                    relationshipId={relationship.id}
                    targetType="plan"
                    targetId={p.id}
                    onSaved={() => undefined}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "body" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {measurements.length === 0 ? (
              <div style={{ color: M.mut, fontSize: 13, padding: 16 }}>Keine Körperwerte geteilt.</div>
            ) : (
              measurements.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: M.card,
                    border: "1px solid " + M.line2,
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{m.weight_kg} kg</div>
                  <div style={{ color: M.mut, fontSize: 12, marginTop: 4 }}>
                    {new Date(m.performed_at).toLocaleDateString("de-DE")}
                    {m.body_fat_pct != null ? ` · KFA ${m.body_fat_pct}%` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
