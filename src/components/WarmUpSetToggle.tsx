import { M } from "../theme";

export const WARMUP_COLUMN_WIDTH = 44;

export interface WarmUpSetToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  layout?: "full" | "compact";
}

export function WarmUpSetToggle({ checked, onChange, layout = "full" }: WarmUpSetToggleProps) {
  if (layout === "compact") {
    return (
      <label
        style={{
          width: WARMUP_COLUMN_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
        title="Satz 1 als Warm-up markieren"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="Satz 1 als Warm-up markieren"
          style={{ width: 14, height: 14, accentColor: M.acc, cursor: "pointer" }}
        />
        <span
          style={{
            fontSize: 9,
            letterSpacing: 1,
            color: checked ? M.acc : M.mut2,
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          W-UP
        </span>
      </label>
    );
  }

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
      title="Satz 1 als Warm-up markieren"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Satz 1 als Warm-up markieren"
        style={{ width: 16, height: 16, accentColor: M.acc, cursor: "pointer" }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: checked ? M.acc : M.mut }}>S1 als Warm-up</span>
    </label>
  );
}
