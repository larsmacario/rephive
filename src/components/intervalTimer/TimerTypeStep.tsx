import { M } from "../../theme";
import { TIMER_MODES, type TimerMode } from "../../lib/engine";
import { TIMER_MODE_COLORS } from "../../lib/intervalTimer/timerModeColors";

export interface TimerTypeStepProps {
  mode: TimerMode;
  onSelect: (mode: TimerMode) => void;
}

function tileStyle(id: TimerMode, selected: boolean): React.CSSProperties {
  const colors = TIMER_MODE_COLORS[id];
  return {
    width: "100%",
    padding: "18px 16px",
    borderRadius: 14,
    border: selected ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
    background: selected ? colors.soft : M.card,
    color: M.fg,
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color .15s, background .15s, box-shadow .15s",
    boxShadow: selected ? `0 0 18px ${colors.soft}` : "none",
  };
}

export function TimerTypeStep({ mode, onSelect }: TimerTypeStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, color: M.fg, marginBottom: 6 }}>
          Timer-Typ
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: M.mut }}>
          Wähle das Format für dein Intervall-Training.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          {TIMER_MODES.map((m) => {
            const colors = TIMER_MODE_COLORS[m.id];
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                style={tileStyle(m.id, selected)}
              >
                <div
                  style={{
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: 0.5,
                    color: selected ? colors.accent : M.fg,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: selected ? colors.accent : M.mut,
                    opacity: selected ? 0.85 : 1,
                    marginTop: 4,
                    lineHeight: 1.35,
                  }}
                >
                  {m.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
