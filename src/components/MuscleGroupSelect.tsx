import {
  CATALOG_PLACEHOLDER_LABEL,
  CATALOG_UNSELECTED,
  DEFAULT_MUSCLE_GROUP,
  MUSCLE_GROUP_SECTIONS,
  isLegacyMuscleGroup,
  normalizeMuscleGroup,
} from "../lib/exerciseCatalog";
import { M } from "../theme";
import { catalogLabelStyle, catalogSelectStyle, catalogSelectStyleForValue } from "./catalogSelectStyle";

function MuscleGroupOptions({ includeAll, includePlaceholder }: { includeAll?: boolean; includePlaceholder?: boolean }) {
  return (
    <>
      {includePlaceholder && (
        <option value={CATALOG_UNSELECTED}>{CATALOG_PLACEHOLDER_LABEL}</option>
      )}
      {includeAll && <option value="">Alle</option>}
      {MUSCLE_GROUP_SECTIONS.map((section) => (
        <optgroup key={section.id} label={section.label}>
          {section.groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export interface MuscleGroupFilterSelectProps {
  mode: "filter";
  value: string | null;
  onChange: (group: string | null) => void;
}

export interface MuscleGroupFormSelectProps {
  mode: "form";
  value: string;
  rawValue?: string;
  onChange: (group: string) => void;
  /** Renders label + select only for side-by-side rows (e.g. with equipment). */
  embedded?: boolean;
}

export type MuscleGroupSelectProps = MuscleGroupFilterSelectProps | MuscleGroupFormSelectProps;

export function MuscleGroupSelect(props: MuscleGroupSelectProps) {
  if (props.mode === "filter") {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={catalogLabelStyle}>MUSKELGRUPPE</div>
        <select
          value={props.value ?? ""}
          onChange={(e) => props.onChange(e.target.value ? e.target.value : null)}
          style={catalogSelectStyle}
        >
          <MuscleGroupOptions includeAll />
        </select>
      </div>
    );
  }

  const legacyHint =
    props.rawValue && props.rawValue !== props.value && isLegacyMuscleGroup(props.rawValue)
      ? props.rawValue
      : null;

  const field = (
    <>
      <div style={catalogLabelStyle}>MUSKELGRUPPE</div>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={catalogSelectStyleForValue(props.value)}
      >
        <MuscleGroupOptions includePlaceholder />
      </select>
    </>
  );

  if (props.embedded) {
    return <div style={{ flex: 1, minWidth: 0 }}>{field}</div>;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {field}
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
