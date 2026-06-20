import { M } from "../theme";
import { MButton } from "./MButton";
import { Icon } from "./Icon";
import { MSwitch } from "./widgets";
import { playTimerCue } from "../lib/timerSounds";
import { TIMER_SOUND_PACKS } from "../lib/timerSoundPacks";

export interface TimerSoundPackPickerProps {
  enabled: boolean;
  packId: string;
  onEnabledChange: (enabled: boolean) => void;
  onPackChange: (packId: string) => void;
  compact?: boolean;
}

export function TimerSoundPackPicker({
  enabled,
  packId,
  onEnabledChange,
  onPackChange,
  compact = false,
}: TimerSoundPackPickerProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: compact ? "0 0 12px" : "12px 0",
          borderBottom: compact ? "none" : "1px solid " + M.line2,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: M.fg, fontWeight: 600, fontSize: compact ? 14 : 15 }}>Timer-Signale</div>
          <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>
            Countdown, Start, Pause und Ende im Intervall-Timer
          </div>
        </div>
        <MSwitch checked={enabled} onChange={onEnabledChange} />
      </div>

      <div
        style={{
          opacity: enabled ? 1 : 0.45,
          pointerEvents: enabled ? "auto" : "none",
          marginTop: compact ? 8 : 4,
        }}
      >
        <div style={{ color: M.mut, fontSize: 13, marginBottom: 10 }}>Timer-Sound</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TIMER_SOUND_PACKS.map((pack) => {
            const selected = packId === pack.id;
            return (
              <div
                key={pack.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid " + (selected ? M.acc : M.line2),
                  background: selected ? "rgba(212,255,0,0.06)" : M.panel,
                }}
              >
                <MButton
                  onClick={() => onPackChange(pack.id)}
                  variant="ghost"
                  size="sm"
                  style={{
                    flex: 1,
                    justifyContent: "flex-start",
                    padding: 0,
                    minHeight: 0,
                    color: selected ? M.acc : M.fg,
                    fontWeight: selected ? 700 : 600,
                    fontFamily: M.body,
                  }}
                >
                  <div style={{ fontWeight: selected ? 700 : 600, color: selected ? M.acc : M.fg }}>
                    {pack.label}
                  </div>
                  <div style={{ fontSize: 12, color: M.mut, marginTop: 2 }}>{pack.description}</div>
                </MButton>
                <MButton
                  onClick={() => playTimerCue("go", pack.id)}
                  variant="ghost"
                  size="icon"
                  aria-label={`${pack.label} anhören`}
                  style={{ flexShrink: 0 }}
                >
                  <Icon name="volume" size={18} stroke={2} color={M.mut} />
                </MButton>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
