import { useEffect } from "react";
import { M } from "../theme";
import { useSessions } from "../lib/db";
import { formatTimerHistorySubtitle, isTimerSession } from "../lib/timerSession";
import { Icon } from "../components/Icon";
import { MStat } from "../components/widgets";
import { FLOAT_NAV_SCROLL_BOTTOM_GAP } from "../components/FloatNav";
import { MButton } from "../components/MButton";

export interface HistoryScreenProps {
  onOpenSession: (sessionId: string) => void;
  onOpenStats: () => void;
  refreshKey?: number;
}

export function HistoryScreen({ onOpenSession, onOpenStats, refreshKey = 0 }: HistoryScreenProps) {
  const { data: history, loading, error, reload } = useSessions();

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const list = history ?? [];
  const totV = list.reduce((a, h) => a + h.vol, 0);
  const totT = list.reduce((a, h) => a + h.dur, 0);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 22px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>Verlauf</div>
          <MButton type="button" onClick={onOpenStats} variant="secondary" size="sm" style={{ flexShrink: 0, color: M.fg }}>
            Statistik
            <Icon name="chevR" size={12} color={M.mut} stroke={2.2} />
          </MButton>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <MStat label="SESSIONS" value={list.length} sub="gesamt" />
          <MStat label="VOLUMEN" value={`${totV.toFixed(1)}t`} sub="gesamt" />
          <MStat label="ZEIT" value={list.length ? `${(totT / 60).toFixed(1)}h` : "0h"} sub="trainiert" />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${FLOAT_NAV_SCROLL_BOTTOM_GAP}px`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading && <div style={{ color: M.mut, fontSize: 14 }}>Verlauf wird geladen…</div>}
        {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}
        {!loading && list.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: M.mut,
              textAlign: "center",
              padding: "40px 20px",
              gap: 12,
              marginTop: 24,
            }}
          >
            <Icon name="list" size={32} color={M.mut2} stroke={2} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Noch keine Sessions</div>
            <div style={{ fontSize: 13 }}>Starte ein Workout oder schließe einen Timer ab — dein Verlauf erscheint hier.</div>
          </div>
        )}
        {list.map((h) => (
          <button
            key={h.id}
            onClick={() => onOpenSession(h.id)}
            style={{
              width: "100%",
              textAlign: "left",
              background: h.pr ? M.accSoft : M.card,
              border: "1px solid " + (h.pr ? M.acc : M.line2),
              borderLeft: h.pr ? "3px solid " + M.acc : "1px solid " + M.line2,
              borderRadius: 14,
              padding: "12px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: 1.1,
                    letterSpacing: 0.2,
                    color: M.fg,
                  }}
                >
                  {h.name}
                </div>
                {h.pr && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      color: M.accInk,
                      background: M.acc,
                      padding: "2px 7px",
                      borderRadius: 6,
                    }}
                  >
                    PR
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: M.mut, marginTop: 5, fontWeight: 600 }}>
                {h.day} · {h.date} ·{" "}
                {isTimerSession(h.tags)
                  ? formatTimerHistorySubtitle(h)
                  : `${h.dur} Min · ${h.vol.toFixed(1)}t · ${h.sets} Sätze`}
              </div>
            </div>
            <Icon name="chevR" size={20} color={M.mut2} stroke={2.2} />
          </button>
        ))}
      </div>
    </div>
  );
}
