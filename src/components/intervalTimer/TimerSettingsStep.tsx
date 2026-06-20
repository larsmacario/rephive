import { M } from "../../theme";
import { TIMER_MODES, type TimerCfg, type TimerMode } from "../../lib/engine";
import { TimerConfigPanel } from "../TimerConfigPanel";
import { MButton } from "../MButton";

export interface TimerSettingsStepProps {
  mode: TimerMode;
  cfg: TimerCfg;
  setCfg: (p: Partial<TimerCfg>) => void;
  disabled: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function TimerSettingsStep({ mode, cfg, setCfg, disabled, onBack, onNext }: TimerSettingsStepProps) {
  const modeMeta = TIMER_MODES.find((m) => m.id === mode)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, color: M.fg, marginBottom: 6 }}>
          Einstellung
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: M.mut }}>
          {modeMeta.name} — {modeMeta.blurb}
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
        <div
          style={{
            width: "100%",
            padding: "24px 20px",
            borderRadius: 16,
            background: M.card,
            border: "1px solid " + M.line2,
          }}
        >
          <TimerConfigPanel
            mode={mode}
            cfg={cfg}
            setCfg={setCfg}
            disabled={disabled}
            layout="stack"
            size="lg"
          />
        </div>
      </div>

      <div style={{ flexShrink: 0, display: "flex", gap: 10, paddingTop: 8 }}>
        <MButton type="button" variant="secondary" size="md" style={{ flex: 1 }} onClick={onBack}>
          Zurück
        </MButton>
        <MButton type="button" variant="primary" size="md" style={{ flex: 2 }} onClick={onNext}>
          Zum Timer
        </MButton>
      </div>
    </div>
  );
}
