import type { CSSProperties } from "react";
import { M } from "../theme";

export const catalogLabelStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 1.2,
  color: M.mut,
  fontWeight: 700,
  marginBottom: 6,
};

export const catalogSelectStyle: CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 28px 0 12px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  backgroundColor: M.card,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "12px",
  color: M.fg,
  fontFamily: M.body,
  fontSize: 15,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  cursor: "pointer",
  WebkitAppearance: "none",
  appearance: "none",
};

export function catalogSelectStyleForValue(value: string): CSSProperties {
  const unselected = !value.trim();
  return {
    ...catalogSelectStyle,
    color: unselected ? M.mut : M.fg,
  };
}
