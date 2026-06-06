import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";
import { M } from "../theme";
import {
  BLOCK_ACCENT,
  BLOCK_GUIDE_HINTS,
  BLOCK_LABELS,
  type TrainingBlockType,
} from "../lib/planBlocks";

export interface PlanBlockSectionProps {
  block: TrainingBlockType;
  children: ReactNode;
  /** Optional action in header (e.g. skip block, remove block). */
  headerAction?: ReactNode;
  /** Muted style when block was skipped in a session. */
  skipped?: boolean;
  /** Header toggles visibility of children. */
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Shown under title when collapsed (e.g. "3 Übungen"). */
  collapsedSummary?: string;
  /** All exercises in block have every set done. */
  complete?: boolean;
  /** 1-based index for progress badge (TrackScreen). When set, badge is always shown. */
  blockIndex?: number;
  style?: CSSProperties;
}

export function PlanBlockSection({
  block,
  children,
  headerAction,
  skipped = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  collapsedSummary,
  complete = false,
  blockIndex,
  style,
}: PlanBlockSectionProps) {
  const accent = BLOCK_ACCENT[block];
  const subtitle = skipped
    ? "Für diese Einheit übersprungen"
    : collapsed && collapsedSummary
      ? collapsedSummary
      : BLOCK_GUIDE_HINTS[block];

  const headerInner = (
    <>
      {blockIndex != null && (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: complete && !skipped ? M.brand : M.brandSoft,
            color: complete && !skipped ? M.brandInk : M.brand,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 16,
            opacity: skipped ? 0.5 : 1,
          }}
          aria-hidden
        >
          {complete && !skipped ? (
            <Icon name="check" size={18} stroke={2.6} />
          ) : (
            blockIndex
          )}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: skipped ? M.mut2 : accent,
          }}
        >
          {BLOCK_LABELS[block]}
        </div>
        <div
          style={{
            fontSize: 11,
            color: M.mut2,
            marginTop: 3,
            fontWeight: 400,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      </div>
      {collapsible && (
        <Icon
          name={collapsed ? "chevR" : "chevD"}
          size={16}
          color={M.mut2}
          stroke={2.2}
          style={{ flexShrink: 0 }}
        />
      )}
      {headerAction}
    </>
  );

  return (
    <section
      style={{
        borderRadius: 14,
        border: `1px solid ${M.line2}`,
        background: skipped ? "rgba(255,255,255,.01)" : M.card,
        opacity: skipped ? 0.55 : 1,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            border: "none",
            borderBottom: collapsed ? "none" : `1px solid ${M.line2}`,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            color: "inherit",
            font: "inherit",
          }}
        >
          {headerInner}
        </button>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            borderBottom: `1px solid ${M.line2}`,
          }}
        >
          {headerInner}
        </div>
      )}
      {!collapsed && <div style={{ padding: "8px 10px 10px" }}>{children}</div>}
    </section>
  );
}
