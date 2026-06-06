import { type ReactNode } from "react";
import { M } from "../theme";

export interface PlanAdviceCollapsibleProps {
  children: ReactNode;
}

export function PlanAdviceCollapsible({ children }: PlanAdviceCollapsibleProps) {
  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 14,
        background: M.card,
        border: "1px solid " + M.line,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px 0",
          fontSize: 13,
          fontWeight: 700,
          color: M.fg,
        }}
      >
        Tipps & Hinweise
      </div>
      <div
        style={{
          padding: "12px 16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}
