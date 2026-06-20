import type { CSSProperties } from "react";
import { MUSCLE_GROUP_SECTIONS } from "../lib/exerciseCatalog";
import { M } from "../theme";

export interface MuscleGroupFilterChipsProps {
  groupFilter: string | null;
  onGroupFilterChange: (group: string | null) => void;
}

const chipStyle = (active: boolean): CSSProperties => ({
  padding: "5px 9px",
  borderRadius: 7,
  border: "1px solid " + (active ? M.acc : M.line2),
  background: active ? M.accSoft : "transparent",
  color: active ? M.fg : M.mut,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
});

export function MuscleGroupFilterChips({ groupFilter, onGroupFilterChange }: MuscleGroupFilterChipsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onGroupFilterChange(null)} style={chipStyle(groupFilter === null)}>
          Alle
        </button>
      </div>
      {MUSCLE_GROUP_SECTIONS.map((section) => (
        <div key={section.id}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 1.1,
              color: M.mut2,
              fontWeight: 700,
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            {section.label}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {section.groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGroupFilterChange(groupFilter === g ? null : g)}
                style={chipStyle(groupFilter === g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
