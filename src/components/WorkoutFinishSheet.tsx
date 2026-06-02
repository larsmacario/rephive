import { M } from "../theme";
import { fmtUp } from "../lib/engine";
import { Icon } from "./Icon";

export interface WorkoutFinishSheetProps {
  name: string;
  durationSec: number;
  doneSets: number;
  totalSets: number;
  volumeKg: number;
  busy?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function WorkoutFinishSheet({
  name,
  durationSec,
  doneSets,
  totalSets,
  volumeKg,
  busy,
  onSave,
  onDiscard,
  onClose,
}: WorkoutFinishSheetProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: M.panel,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid " + M.line,
          padding: "16px 18px 28px",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px" }} />
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Workout beenden?</div>
        <div
          style={{
            color: M.mut,
            fontSize: 14,
            marginBottom: 16,
            lineHeight: 1.45,
          }}
        >
          {name} · {fmtUp(durationSec)} · {doneSets}/{totalSets} Sätze · {(volumeKg / 1000).toFixed(1)}t
        </div>
        <button
          disabled={busy}
          onClick={onSave}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: "none",
            background: M.acc,
            color: M.accInk,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.8,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Icon name="check" size={18} stroke={2.6} color={M.accInk} /> SPEICHERN
        </button>
        <button
          disabled={busy}
          onClick={onDiscard}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: "1px solid " + M.line,
            background: M.card,
            color: M.fg,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.8,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
            marginBottom: 10,
          }}
        >
          VERWERFEN
        </button>
        <button
          disabled={busy}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 14,
            border: "none",
            background: "transparent",
            color: M.mut,
            fontFamily: M.body,
            fontWeight: 600,
            fontSize: 15,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
