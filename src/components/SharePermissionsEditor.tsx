import { M } from "../theme";
import { MSwitch } from "./widgets";
import {
  SHARE_PERMISSION_LABELS,
  type SharePermissionKey,
  type SharePermissionsInput,
} from "../lib/coaching";

export interface SharePermissionsEditorProps {
  value: SharePermissionsInput;
  onChange: (next: SharePermissionsInput) => void;
  disabled?: boolean;
}

const KEYS = Object.keys(SHARE_PERMISSION_LABELS) as SharePermissionKey[];

export function SharePermissionsEditor({ value, onChange, disabled }: SharePermissionsEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {KEYS.map((key, i) => {
        const meta = SHARE_PERMISSION_LABELS[key];
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "12px 0",
              borderBottom: i === KEYS.length - 1 ? "none" : "1px solid " + M.line2,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{meta.label}</div>
              <div style={{ color: M.mut, fontSize: 12, marginTop: 3 }}>{meta.hint}</div>
            </div>
            <MSwitch
              checked={value[key]}
              onChange={(checked) => onChange({ ...value, [key]: checked })}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
