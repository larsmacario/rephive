import {
  DEFAULT_MUSCLE_GROUP,
  MUSCLE_GROUP_SECTIONS,
  isLegacyMuscleGroup,
  normalizeMuscleGroup,
} from "../lib/exerciseCatalog";
import { M } from "../theme";

export interface MuscleGroupPickerProps {
  value: string;
  rawValue?: string;
  onChange: (group: string) => void;
}

export function MuscleGroupPicker({ value, rawValue, onChange }: MuscleGroupPickerProps) {
  const legacyHint =
    rawValue && rawValue !== value && isLegacyMuscleGroup(rawValue) ? rawValue : null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
        MUSKELGRUPPE
      </div>
      {MUSCLE_GROUP_SECTIONS.map((section) => (
        <div key={section.id} style={{ marginBottom: section.id === "upper" ? 12 : 0 }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 1.1,
              color: M.mut2,
              fontWeight: 700,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            {section.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {section.groups.map((group) => {
              const on = value === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => onChange(group)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid " + (on ? M.acc : M.line2),
                    background: on ? M.accSoft : M.card,
                    color: on ? M.acc : M.fg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {legacyHint && (
        <div style={{ fontSize: 13, color: M.mut2, marginTop: 8 }}>Früher: {legacyHint}</div>
      )}
    </div>
  );
}

export function initialMuscleGroupFromStored(stored: string | undefined): {
  value: string;
  rawValue?: string;
} {
  if (!stored) return { value: DEFAULT_MUSCLE_GROUP };
  const normalized = normalizeMuscleGroup(stored);
  if (stored !== normalized) return { value: normalized, rawValue: stored };
  return { value: stored };
}
