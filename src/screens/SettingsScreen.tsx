import { useState } from "react";
import { M } from "../theme";
import { fmt, TIMER_DEFAULTS, TIMER_MODES, type TimerMode } from "../lib/engine";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { TimerConfigPanel } from "../components/TimerConfigPanel";
import { MStepper, MSwitch } from "../components/widgets";

export interface SettingsScreenProps {
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 16,
          padding: "16px 16px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
  last,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid " + M.line2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{label}</div>
        {hint && <div style={{ color: M.mut, fontSize: 12, marginTop: 3 }}>{hint}</div>}
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
    </div>
  );
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { preferences, updatePreferences, saving } = usePreferences();
  const [timerMode, setTimerMode] = useState<TimerMode>("emom");

  const timerCfg = preferences.timerDefaults[timerMode];
  const setTimerCfg = (p: Partial<typeof timerCfg>) => {
    updatePreferences({
      timerDefaults: {
        [timerMode]: { ...preferences.timerDefaults[timerMode], ...p },
      },
    });
  };

  const resetTimerDefaults = () => {
    updatePreferences({ timerDefaults: JSON.parse(JSON.stringify(TIMER_DEFAULTS)) }, true);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>EINSTELLUNGEN</span>
        <span style={{ width: 24, fontSize: 11, color: saving ? M.acc : "transparent", fontWeight: 700 }}>
          {saving ? "…" : ""}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 24px" }}>
        <Section title="TRAINING">
          <SettingRow label="Pausenzeit" hint="Pause nach abgehaktem Satz">
            <MStepper
              value={preferences.restSeconds}
              min={30}
              max={180}
              step={15}
              fmt={fmt}
              onChange={(v) => updatePreferences({ restSeconds: v })}
            />
          </SettingRow>
          <SettingRow label="Auto-Pause" hint="Pause automatisch nach Satz starten" last>
            <MSwitch
              checked={preferences.autoRest}
              onChange={(v) => updatePreferences({ autoRest: v }, true)}
            />
          </SettingRow>
        </Section>

        <Section title="WORKOUT-BUILDER">
          <SettingRow label="Standard-Sätze">
            <MStepper
              value={preferences.defaultSets}
              min={1}
              max={10}
              onChange={(v) => updatePreferences({ defaultSets: v })}
            />
          </SettingRow>
          <SettingRow label="Standard-Wiederholungen" last>
            <MStepper
              value={preferences.defaultReps}
              min={1}
              max={30}
              onChange={(v) => updatePreferences({ defaultReps: v })}
            />
          </SettingRow>
        </Section>

        <Section title="SIGNALE">
          <SettingRow label="Signaletöne" hint="Akustische Signale für Timer und Pausen" last>
            <MSwitch
              checked={preferences.timerSounds}
              onChange={(v) => updatePreferences({ timerSounds: v }, true)}
            />
          </SettingRow>
        </Section>

        <Section title="INTERVAL-TIMER">
          <div
            style={{
              display: "flex",
              gap: 6,
              background: M.panel,
              padding: 4,
              borderRadius: 12,
              border: "1px solid " + M.line2,
              marginBottom: 14,
            }}
          >
            {TIMER_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setTimerMode(m.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: M.disp,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: 0.4,
                  background: timerMode === m.id ? M.acc : "transparent",
                  color: timerMode === m.id ? M.accInk : M.mut,
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <TimerConfigPanel mode={timerMode} cfg={timerCfg} setCfg={setTimerCfg} layout="wrap" />
          <button
            onClick={resetTimerDefaults}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "12px 0",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: "transparent",
              color: M.mut,
              fontFamily: M.body,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Auf Werkseinstellungen zurücksetzen
          </button>
        </Section>

        <div style={{ fontSize: 11, color: M.mut2, textAlign: "center", paddingTop: 4 }}>
          Änderungen werden automatisch gespeichert
        </div>
      </div>
    </div>
  );
}
