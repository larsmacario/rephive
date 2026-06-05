import type { ReactNode } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";

export interface MStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fmt?: (v: number) => string;
  disabled?: boolean;
}

export function MStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  fmt,
  disabled,
}: MStepperProps) {
  const btn = (d: number) => (
    <button
      disabled={disabled}
      onClick={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        border: "1px solid " + M.line,
        background: M.card,
        color: disabled ? M.mut2 : M.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        flex: "0 0 auto",
      }}
    >
      <Icon name={d > 0 ? "plus" : "minus"} size={14} stroke={2.4} />
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {btn(-step)}
      <span
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 22,
          minWidth: 46,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.5,
        }}
      >
        {fmt ? fmt(value) : value}
      </span>
      {btn(step)}
    </div>
  );
}

export interface MSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function MSwitch({ checked, onChange, disabled }: MSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        border: "1px solid " + (checked ? "transparent" : M.line),
        background: checked ? M.brand : M.card,
        cursor: disabled ? "default" : "pointer",
        position: "relative",
        padding: 0,
        flex: "0 0 auto",
        opacity: disabled ? 0.5 : 1,
        transition: "background .15s",
        ...(checked ? { boxShadow: M.brandGlow } : null),
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 23 : 2,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: checked ? M.brandInk : M.fg,
          transition: "left .15s",
        }}
      />
    </button>
  );
}

// pill tag
export function MTag({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: on ? M.brandInk : M.mut,
        padding: "6px 12px",
        borderRadius: 9,
        background: on ? M.brand : M.card,
        border: "1px solid " + (on ? "transparent" : M.line2),
        whiteSpace: "nowrap",
        ...(on ? { boxShadow: M.brandGlow } : null),
      }}
    >
      {children}
    </span>
  );
}

// stat tile
export function MStat({
  label,
  value,
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: 14,
        padding: "12px 13px",
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: 1.4, color: M.brand, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 26,
          marginTop: 2,
          letterSpacing: 0.3,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, color: M.mut2, marginTop: 3, fontWeight: 600 }}>{sub}</div>
      )}
    </div>
  );
}
