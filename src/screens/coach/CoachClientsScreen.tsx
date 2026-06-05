import { useEffect, useState } from "react";
import { M } from "../../theme";
import { Icon } from "../../components/Icon";
import { fetchCoachClients, fetchCoachClientProfile, type CoachingRelationship } from "../../lib/coaching";
import { useUnreadCoachingCount } from "../../lib/coaching";

export interface CoachClientsScreenProps {
  onOpenClient: (relationship: CoachingRelationship) => void;
  refreshKey?: number;
}

export function CoachClientsScreen({ onOpenClient, refreshKey = 0 }: CoachClientsScreenProps) {
  const [clients, setClients] = useState<CoachingRelationship[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const unread = useUnreadCoachingCount(refreshKey);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await fetchCoachClients();
        if (cancelled) return;
        setClients(list);
        const nameMap: Record<string, string> = {};
        await Promise.all(
          list.map(async (c) => {
            if (!c.athlete_id) return;
            const profile = await fetchCoachClientProfile(c.athlete_id);
            nameMap[c.id] = profile?.displayName ?? c.athlete_email;
          }),
        );
        if (!cancelled) setNames(nameMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: 22, color: M.mut, fontSize: 14 }}>Klienten werden geladen…</div>
    );
  }

  if (clients.length === 0) {
    return (
      <div style={{ padding: "32px 22px", textAlign: "center" }}>
        <Icon name="users" size={40} color={M.mut} />
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginTop: 16 }}>
          Noch keine Klienten
        </div>
        <div style={{ color: M.mut, fontSize: 14, marginTop: 8, lineHeight: 1.45 }}>
          Lade einen Athleten per E-Mail ein oder warte auf eine Einladung.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      {unread > 0 && (
        <div
          style={{
            background: M.accSoft,
            border: "1px solid " + M.line,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            color: M.acc,
          }}
        >
          {unread} ungelesene Nachricht{unread === 1 ? "" : "en"}
        </div>
      )}
      {clients.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onOpenClient(c)}
          style={{
            textAlign: "left",
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 16,
            padding: "16px 16px",
            cursor: "pointer",
            color: M.fg,
          }}
        >
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20 }}>
            {names[c.id] ?? c.athlete_email}
          </div>
          <div style={{ color: M.mut, fontSize: 12, marginTop: 4 }}>
            Seit {c.accepted_at ? new Date(c.accepted_at).toLocaleDateString("de-DE") : "—"}
          </div>
        </button>
      ))}
    </div>
  );
}
