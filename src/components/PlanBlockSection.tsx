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
            fontSize: 13,
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
            fontSize: 13,
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

  const headerRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "0 0 10px",
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        ...style,
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            ...headerRowStyle,
            width: "100%",
            border: "none",
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
        <div style={headerRowStyle}>{headerInner}</div>
      )}
      {!collapsed && (
        <>
          <div style={{ height: 1, background: M.line2, flexShrink: 0 }} />
          <div style={{ paddingTop: 10 }}>{children}</div>
        </>
      )}
    </section>
  );
}
