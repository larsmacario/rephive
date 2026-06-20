import { M } from "../theme";

export const WARMUP_COLUMN_WIDTH = 44;

export interface WarmUpSetToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  layout?: "full" | "compact";
  size?: "md" | "lg";
}

export function WarmUpSetToggle({ checked, onChange, layout = "full", size = "md" }: WarmUpSetToggleProps) {
  const isLg = size === "lg";

  if (layout === "compact") {
    return (
      <label
        style={{
          width: isLg ? 52 : WARMUP_COLUMN_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
          paddingBottom: isLg ? 2 : 0,
        }}
        title="Satz 1 als Warm-up markieren"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="Satz 1 als Warm-up markieren"
          style={{
            width: isLg ? 18 : 14,
            height: isLg ? 18 : 14,
            accentColor: M.acc,
            cursor: "pointer",
          }}
        />
        <span
          style={{
            fontSize: isLg ? 10 : 9,
            letterSpacing: 1,
            color: checked ? M.acc : M.mut2,
            fontWeight: 700,
            marginTop: isLg ? 4 : 2,
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
      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? M.acc : M.mut }}>S1 als Warm-up</span>
    </label>
  );
}
