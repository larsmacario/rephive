import { useId, useState, type ReactNode } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";

export interface PlanAdviceCollapsibleProps {
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function PlanAdviceCollapsible({
  children,
  defaultExpanded = false,
}: PlanAdviceCollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();

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
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={contentId}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
        }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: M.fg }}>Tipps & Hinweise</span>
        <Icon name={expanded ? "chevD" : "chevR"} size={18} stroke={2.2} color={M.mut2} />
      </button>

      {expanded && (
        <div
          id={contentId}
          style={{
            padding: "0 16px 14px",
            borderTop: "1px solid " + M.line2,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
