import type { ReactNode } from "react";
import { M } from "../theme";

export interface SupersetBlockProps {
  children: ReactNode;
  showLabel?: boolean;
}

export function SupersetBlock({ children, showLabel = true }: SupersetBlockProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flexShrink: 0,
        paddingLeft: 10,
        borderLeft: `3px solid ${M.acc}`,
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            color: M.acc,
            fontWeight: 700,
            marginLeft: 2,
          }}
        >
          SUPERSATZ
        </span>
      )}
      {children}
    </div>
  );
}

export function supersetLinkButtonStyle(linked: boolean): React.CSSProperties {
  return {
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${linked ? M.acc : M.line}`,
    background: linked ? M.accSoft : "transparent",
    color: linked ? M.acc : M.mut,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.6,
    cursor: "pointer",
    fontFamily: M.disp,
    whiteSpace: "nowrap",
  };
}
