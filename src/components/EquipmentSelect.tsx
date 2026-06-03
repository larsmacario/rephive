import { CATALOG_PLACEHOLDER_LABEL, CATALOG_UNSELECTED, EQUIPMENT_OPTIONS } from "../lib/exerciseCatalog";
import { catalogLabelStyle, catalogSelectStyleForValue } from "./catalogSelectStyle";

export interface EquipmentSelectProps {
  value: string;
  onChange: (equipment: string) => void;
  embedded?: boolean;
}

export function EquipmentSelect({ value, onChange, embedded }: EquipmentSelectProps) {
  const inList = (EQUIPMENT_OPTIONS as readonly string[]).includes(value);

  const field = (
    <>
      <div style={catalogLabelStyle}>GERÄT</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={catalogSelectStyleForValue(value)}>
        <option value={CATALOG_UNSELECTED}>{CATALOG_PLACEHOLDER_LABEL}</option>
        {!inList && value ? <option value={value}>{value}</option> : null}
        {EQUIPMENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </>
  );

  if (embedded) {
    return <div style={{ flex: 1, minWidth: 0 }}>{field}</div>;
  }

  return <div style={{ marginBottom: 14 }}>{field}</div>;
}
