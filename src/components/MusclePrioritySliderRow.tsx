import { M } from "../theme";
import {
  MUSCLE_PRIORITY_MAX,
  MUSCLE_PRIORITY_MIN,
  musclePriorityLabel,
} from "../lib/musclePriorities";

export interface MusclePrioritySliderRowProps {
  group: string;
  value: number;
  onChange: (value: number) => void;
}

export function MusclePrioritySliderRow({ group, value, onChange }: MusclePrioritySliderRowProps) {
  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid " + M.line,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{group}</span>
        <span style={{ fontSize: 12, color: M.acc, fontWeight: 600 }}>{musclePriorityLabel(value)}</span>
      </div>
      <input
        type="range"
        min={MUSCLE_PRIORITY_MIN}
        max={MUSCLE_PRIORITY_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label={`Priorität ${group}`}
        style={{
          width: "100%",
          height: 4,
          appearance: "none",
          WebkitAppearance: "none",
          background: `linear-gradient(to right, ${M.acc} 0%, ${M.acc} ${((value - MUSCLE_PRIORITY_MIN) / (MUSCLE_PRIORITY_MAX - MUSCLE_PRIORITY_MIN)) * 100}%, ${M.line} ${((value - MUSCLE_PRIORITY_MIN) / (MUSCLE_PRIORITY_MAX - MUSCLE_PRIORITY_MIN)) * 100}%, ${M.line} 100%)`,
          borderRadius: 2,
          outline: "none",
          cursor: "pointer",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 10,
          color: M.mut2,
          fontWeight: 500,
        }}
      >
        <span>Nicht wichtig</span>
        <span>Sehr wichtig</span>
      </div>
    </div>
  );
}
