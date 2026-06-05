import { useState } from "react";
import { M } from "../../theme";
import { MButton } from "../../components/MButton";
import { useAuth } from "../../lib/auth";
import {
  acceptInviteAsCoach,
  declineInvite,
  inviteAthlete,
  useCoachingRelationships,
} from "../../lib/coaching";

export function CoachInviteAthleteScreen({ refreshKey = 0 }: { refreshKey?: number }) {
  const { user } = useAuth();
  const { data: relationships, reload } = useCoachingRelationships(refreshKey);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingOutgoing = relationships.filter(
    (r) => r.initiated_by === "coach" && r.status === "pending" && r.coach_id === user?.id,
  );

  const pendingIncoming = relationships.filter(
    (r) =>
      r.initiated_by === "athlete" &&
      r.status === "pending" &&
      r.coach_email.toLowerCase() === user?.email?.toLowerCase(),
  );

  const handleInvite = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await inviteAthlete(user.id, user.email, email);
      setEmail("");
      setSuccess("Einladung gesendet.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Einladung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "8px 22px 24px" }}>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
        Athlet einladen
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 16, lineHeight: 1.45 }}>
        Der Athlet entscheidet bei der Annahme, welche Daten er teilt.
      </div>

      <input
        type="email"
        placeholder="E-Mail des Athleten"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
          marginBottom: 12,
        }}
      />
      {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {success && <div style={{ color: M.acc, fontSize: 13, marginBottom: 8 }}>{success}</div>}
      <MButton disabled={busy || !email.trim()} onClick={() => void handleInvite()} variant="primary" size="md" fullWidth>
        EINLADUNG SENDEN
      </MButton>

      {pendingIncoming.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
            EINGEHENDE EINLADUNGEN
          </div>
          {pendingIncoming.map((r) => (
            <div
              key={r.id}
              style={{
                background: M.card,
                border: "1px solid " + M.line2,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.athlete_email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <MButton
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={async () => {
                    if (!user?.email) return;
                    setBusy(true);
                    try {
                      await acceptInviteAsCoach(r.id, user.id, user.email);
                      setSuccess("Einladung angenommen.");
                      await reload();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Annahme fehlgeschlagen");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Annehmen
                </MButton>
                <MButton
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void declineInvite(r.id).then(reload)}
                >
                  Ablehnen
                </MButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingOutgoing.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
            OFFENE EINLADUNGEN
          </div>
          {pendingOutgoing.map((r) => (
            <div
              key={r.id}
              style={{
                background: M.card,
                border: "1px solid " + M.line2,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.athlete_email}</div>
              <div style={{ color: M.mut, fontSize: 12, marginTop: 4 }}>Wartet auf Annahme</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
