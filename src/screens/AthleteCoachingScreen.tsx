import { useState } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { BottomSheet } from "../components/BottomSheet";
import { SharePermissionsEditor } from "../components/SharePermissionsEditor";
import { CoachingChat } from "../components/CoachingChat";
import { useAuth } from "../lib/auth";
import {
  acceptInviteAsAthlete,
  acceptInviteAsCoach,
  CONSERVATIVE_SHARE_DEFAULTS,
  declineInvite,
  fetchSharePermissions,
  inviteCoach,
  revokeRelationship,
  updateSharePermissions,
  useCoachingRelationships,
  type SharePermissionsInput,
} from "../lib/coaching";

export interface AthleteCoachingScreenProps {
  onBack: () => void;
  refreshKey?: number;
}

export function AthleteCoachingScreen({ onBack, refreshKey = 0 }: AthleteCoachingScreenProps) {
  const { user } = useAuth();
  const { data: relationships, reload } = useCoachingRelationships(refreshKey);
  const [coachEmail, setCoachEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptSheet, setAcceptSheet] = useState<string | null>(null);
  const [acceptPerms, setAcceptPerms] = useState<SharePermissionsInput>(CONSERVATIVE_SHARE_DEFAULTS);
  const [editPermsId, setEditPermsId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<SharePermissionsInput>(CONSERVATIVE_SHARE_DEFAULTS);
  const [chatRelId, setChatRelId] = useState<string | null>(null);

  const pendingCoachInvites = relationships.filter(
    (r) => r.status === "pending" && r.initiated_by === "coach",
  );
  const pendingAthleteInvites = relationships.filter(
    (r) => r.status === "pending" && r.initiated_by === "athlete" && r.athlete_id === user?.id,
  );
  const activeCoaches = relationships.filter((r) => r.status === "active" && r.athlete_id === user?.id);
  const pendingAsCoach = relationships.filter(
    (r) => r.status === "pending" && r.initiated_by === "athlete" && r.coach_email === user?.email?.toLowerCase(),
  );

  const handleInviteCoach = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await inviteCoach(user.id, user.email, coachEmail);
      setCoachEmail("");
      setSuccess("Einladung an den Coach gesendet.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Einladung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptCoachInvite = async (relationshipId: string) => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInviteAsAthlete(relationshipId, user.id, user.email, acceptPerms);
      setAcceptSheet(null);
      setSuccess("Verbindung mit Coach hergestellt.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Annahme fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptAsCoach = async (relationshipId: string) => {
    if (!user?.email) return;
    setBusy(true);
    try {
      await acceptInviteAsCoach(relationshipId, user.id, user.email);
      setSuccess("Coach-Einladung angenommen. Wechsle zum Coach-Modus in deinem Profil.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Annahme fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const openEditPerms = async (relationshipId: string) => {
    const perms = await fetchSharePermissions(relationshipId);
    if (perms) {
      setEditPerms({
        sessions: perms.sessions,
        plans: perms.plans,
        workouts: perms.workouts,
        body_measurements: perms.body_measurements,
        body_photos: perms.body_photos,
        anamnesis: perms.anamnesis,
        stats_summary: perms.stats_summary,
      });
    }
    setEditPermsId(relationshipId);
  };

  const saveEditPerms = async () => {
    if (!editPermsId) return;
    setBusy(true);
    try {
      await updateSharePermissions(editPermsId, editPerms);
      setEditPermsId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

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
        <button type="button" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon name="chevL" size={22} color={M.fg} />
        </button>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22 }}>Coaching</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 32px" }}>
        {error && (
          <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 12, padding: "10px 12px", background: "rgba(255,80,80,.1)", borderRadius: 10 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: M.acc, fontSize: 13, marginBottom: 12, padding: "10px 12px", background: M.accSoft, borderRadius: 10 }}>
            {success}
          </div>
        )}

        {pendingCoachInvites.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
              EINLADUNGEN VON COACHES
            </div>
            {pendingCoachInvites.map((r) => (
              <div
                key={r.id}
                style={{
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 16,
                  padding: "16px",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.coach_email}</div>
                <div style={{ color: M.mut, fontSize: 13, marginTop: 6 }}>
                  Möchte dich coachen. Du legst fest, was geteilt wird.
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <MButton size="sm" variant="primary" onClick={() => { setAcceptSheet(r.id); setAcceptPerms(CONSERVATIVE_SHARE_DEFAULTS); }}>
                    Annehmen
                  </MButton>
                  <MButton size="sm" variant="secondary" disabled={busy} onClick={() => void declineInvite(r.id).then(reload)}>
                    Ablehnen
                  </MButton>
                </div>
              </div>
            ))}
          </section>
        )}

        {pendingAsCoach.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
              COACH-EINLADUNGEN
            </div>
            {pendingAsCoach.map((r) => (
              <div key={r.id} style={{ background: M.card, border: "1px solid " + M.line2, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{r.athlete_email} lädt dich als Coach ein</div>
                <MButton size="sm" variant="primary" style={{ marginTop: 12 }} disabled={busy} onClick={() => void handleAcceptAsCoach(r.id)}>
                  Als Coach annehmen
                </MButton>
              </div>
            ))}
          </section>
        )}

        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
            COACH EINLADEN
          </div>
          <input
            type="email"
            placeholder="E-Mail des Coaches"
            value={coachEmail}
            onChange={(e) => setCoachEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontFamily: M.body,
              fontSize: 15,
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />
          <MButton disabled={busy || !coachEmail.trim()} onClick={() => void handleInviteCoach()} variant="primary" size="md" fullWidth>
            EINLADUNG SENDEN
          </MButton>
        </section>

        {activeCoaches.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
              MEINE COACHES
            </div>
            {activeCoaches.map((r) => (
              <div key={r.id} style={{ background: M.card, border: "1px solid " + M.line2, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.coach_email}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <MButton size="sm" variant="secondary" onClick={() => void openEditPerms(r.id)}>
                    Freigaben
                  </MButton>
                  <MButton size="sm" variant="secondary" onClick={() => setChatRelId(r.id)}>
                    Chat
                  </MButton>
                  <MButton size="sm" variant="secondary" disabled={busy} onClick={() => void revokeRelationship(r.id).then(reload)}>
                    Entfernen
                  </MButton>
                </div>
              </div>
            ))}
          </section>
        )}

        {pendingAthleteInvites.length > 0 && (
          <section>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
              AUSSTEHENDE EINLADUNGEN
            </div>
            {pendingAthleteInvites.map((r) => (
              <div key={r.id} style={{ color: M.mut, fontSize: 13, marginBottom: 6 }}>
                {r.coach_email} — wartet auf Annahme
              </div>
            ))}
          </section>
        )}
      </div>

      <BottomSheet open={!!acceptSheet} onClose={() => setAcceptSheet(null)} aria-label="Freigaben festlegen">
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Freigaben festlegen</div>
        <p style={{ color: M.mut, fontSize: 13, marginBottom: 16, lineHeight: 1.45 }}>
          Wähle, welche Daten dein Coach sehen darf. Du kannst das später ändern.
        </p>
        <SharePermissionsEditor value={acceptPerms} onChange={setAcceptPerms} disabled={busy} />
        <MButton
          fullWidth
          variant="primary"
          size="md"
          style={{ marginTop: 16 }}
          disabled={busy || !acceptSheet}
          onClick={() => acceptSheet && void handleAcceptCoachInvite(acceptSheet)}
        >
          VERBINDUNG HERSTELLEN
        </MButton>
      </BottomSheet>

      <BottomSheet open={!!editPermsId} onClose={() => setEditPermsId(null)} aria-label="Freigaben bearbeiten">
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Freigaben bearbeiten</div>
        <SharePermissionsEditor value={editPerms} onChange={setEditPerms} disabled={busy} />
        <MButton fullWidth variant="primary" size="md" style={{ marginTop: 16 }} disabled={busy} onClick={() => void saveEditPerms()}>
          SPEICHERN
        </MButton>
      </BottomSheet>

      <BottomSheet open={!!chatRelId} onClose={() => setChatRelId(null)} aria-label="Coach-Chat">
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Coach-Chat</div>
        {chatRelId && <CoachingChat relationshipId={chatRelId} />}
      </BottomSheet>
    </div>
  );
}
