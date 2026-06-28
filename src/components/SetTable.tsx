import type { CSSProperties } from "react";
import type { ExerciseMetric, SetLike } from "../lib/exerciseCatalog";
import { DEFAULT_EXERCISE_METRIC, formatSetLine } from "../lib/exerciseCatalog";
import type { SetField } from "../lib/exerciseSets";
import { M, brandButtonStyle } from "../theme";
import { Icon } from "./Icon";
import { InlineDisclosureMenu, type InlineDisclosureMenuItem } from "./InlineDisclosureMenu";
import { SetMetricFields, setFieldHeaders } from "./SetMetricFields";
import { WARMUP_COLUMN_WIDTH, WarmUpSetToggle } from "./WarmUpSetToggle";

export type SetTableSet = SetLike & {
  done?: boolean;
  suggested?: boolean;
};

function setNumberLabel(index: number, warmUp?: boolean): string {
  if (index === 0 && warmUp) return "W";
  return String(index + 1);
}

function individualActionsWidth(variant: "template" | "tracked", isLg: boolean): number {
  if (variant === "tracked") return isLg ? 96 : 72;
  return isLg ? 44 : 36;
}

function isSuggestedRow(set: SetTableSet): boolean {
  return Boolean(set.suggested && !set.done);
}

export interface SetTableProps {
  sets: SetTableSet[];
  metric?: ExerciseMetric;
  variant: "template" | "tracked";
  compact?: boolean;
  /** Mobile Plan Builder: metrics use their own large, full-width controls. */
  stacked?: boolean;
  size?: "md" | "lg";
  /** Neutral card wrapper (TrackScreen table layout). */
  wrapped?: boolean;
  /** Track stacked cards: collapse when done; footer check button instead of inline check. */
  collapseWhenDone?: boolean;
  /** Hint shown once above the table (history / exercise note). */
  hint?: string;
  hintSuggested?: boolean;
  onBumpSet: (index: number, field: SetField, delta: number) => void;
  onSetValue: (index: number, field: SetField, value: number) => void;
  onToggleDone?: (index: number) => void;
  onRemove: (index: number) => void;
  onWarmUpChange: (enabled: boolean) => void;
  onAddSet: () => void;
  addSetLabel?: string;
}

export function SetTable({
  sets,
  metric = DEFAULT_EXERCISE_METRIC,
  variant,
  compact = false,
  stacked = false,
  size = "md",
  wrapped = false,
  collapseWhenDone = false,
  hint,
  hintSuggested = false,
  onBumpSet,
  onSetValue,
  onToggleDone,
  onRemove,
  onWarmUpChange,
  onAddSet,
  addSetLabel = "+ Satz",
}: SetTableProps) {
  const headers = setFieldHeaders(metric);
  const isLg = size === "lg";
  const valueFontSize = compact ? 17 : isLg ? 24 : 21;
  const setColWidth = isLg ? 36 : 34;
  const warmUpColWidth = isLg ? 52 : WARMUP_COLUMN_WIDTH;
  const actionBtnSize = isLg ? 44 : 32;
  const actionsWidth = individualActionsWidth(variant, isLg);
  const warmUpChecked = Boolean(sets[0]?.warmUp);
  const canRemove = sets.length > 1;

  const renderSetMenu = (si: number, s: SetTableSet, triggerSize: number, marginLeft = 0) => {
    const menuItems: InlineDisclosureMenuItem[] = [];
    if (s.done && onToggleDone) {
      menuItems.push({
        icon: <Icon name="edit" size={16} stroke={2} color={M.mut2} />,
        label: "Bearbeiten",
        onClick: () => onToggleDone(si),
      });
    }
    return (
      <InlineDisclosureMenu
        triggerSize={triggerSize}
        triggerMarginLeft={marginLeft}
        menuItems={menuItems}
        showDelete
        deleteDisabled={!canRemove}
        onDelete={() => onRemove(si)}
        ariaLabel="Satz-Aktionen"
      />
    );
  };

  const tableContent = (
    <>
      {hint ? (
        <div
          style={{
            fontSize: 13,
            color: hintSuggested ? M.brand : M.mut,
            marginBottom: 12,
            lineHeight: 1.4,
            fontStyle: hintSuggested ? "italic" : "normal",
          }}
        >
          {hint}
        </div>
      ) : null}

      {!stacked && (
        <div
          style={{
            display: "flex",
            fontSize: isLg ? 12 : 13,
            letterSpacing: 1.2,
            color: M.mut2,
            fontWeight: 700,
            padding: wrapped ? "0 0 8px" : isLg ? "6px 6px 10px" : "4px 4px 8px",
          }}
        >
          {headers.map((h) => (
            <span
              key={h.key}
              style={{
                width: h.key === "set" ? setColWidth : undefined,
                flex: h.key === "set" ? undefined : 1,
                textAlign: h.key === "set" ? "left" : "center",
              }}
            >
              {h.label}
            </span>
          ))}
          <span style={{ width: warmUpColWidth, textAlign: "center" }}>W-UP</span>
          <span style={{ width: actionsWidth }} />
        </div>
      )}

      {sets.map((s, si) => {
        const suggested = isSuggestedRow(s);

        if (stacked) {
          const collapsed = collapseWhenDone && Boolean(s.done);
          const footerCheck = collapseWhenDone && variant === "tracked" && onToggleDone;

          return (
            <div
              key={si}
              style={{
                marginTop: si === 0 ? 0 : 12,
                padding: collapsed ? "10px 12px" : "12px",
                border: "1px solid " + (suggested ? M.brandBorder : M.line2),
                borderRadius: 14,
                background: suggested ? M.brandSoft : M.card,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: collapsed ? 36 : 44,
                  marginBottom: collapsed ? 0 : 10,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: collapsed ? 18 : 22,
                    color: s.done ? M.acc : si === 0 && s.warmUp ? M.acc : suggested ? M.brand : M.fg,
                  }}
                >
                  Satz {setNumberLabel(si, s.warmUp)}
                </span>
                {collapsed ? (
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      marginLeft: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: M.mut,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatSetLine(s, metric)}
                  </span>
                ) : (
                  <span style={{ flex: 1 }} />
                )}
                {!collapsed && si === 0 && !footerCheck ? (
                  <WarmUpSetToggle layout="compact" size="lg" checked={warmUpChecked} onChange={onWarmUpChange} />
                ) : null}
                {variant === "tracked" && onToggleDone && !collapseWhenDone ? (
                  <button
                    type="button"
                    onClick={() => onToggleDone(si)}
                    aria-label={s.done ? "Satz wieder öffnen" : suggested ? "Vorschlag bestätigen" : "Satz abschließen"}
                    style={{
                      width: 44,
                      height: 44,
                      marginLeft: 8,
                      borderRadius: 11,
                      border: s.done ? "none" : "1.5px solid " + (suggested ? M.brandBorder : M.line),
                      background: s.done ? M.acc : suggested ? M.brandSoft : "transparent",
                      color: s.done ? M.accInk : suggested ? M.brand : M.mut,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="check" size={20} stroke={2.6} />
                  </button>
                ) : null}
                {renderSetMenu(si, s, 44, 8)}
              </div>
              {!collapsed ? (
                <SetMetricFields
                  set={s}
                  metric={metric}
                  layout="stack"
                  size="lg"
                  onBump={(field, delta) => onBumpSet(si, field, delta)}
                  onSetValue={(field, value) => onSetValue(si, field, value)}
                  muted={suggested}
                />
              ) : null}
              {footerCheck && !collapsed ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {si === 0 ? (
                    <WarmUpSetToggle layout="compact" size="lg" checked={warmUpChecked} onChange={onWarmUpChange} />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onToggleDone(si)}
                    aria-label={suggested ? "Vorschlag bestätigen" : "Satz abschließen"}
                    style={{
                      ...brandButtonStyle(),
                      flex: 1,
                      minHeight: 48,
                      padding: 0,
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="check" size={22} stroke={2.6} color={M.brandInk} />
                  </button>
                </div>
              ) : null}
            </div>
          );
        }

        const rowStyle: CSSProperties = {
          display: "flex",
          alignItems: "center",
          minHeight: isLg ? 68 : undefined,
          padding: wrapped ? (isLg ? "10px 0" : "8px 0") : isLg ? "10px 6px" : "6px 4px",
          borderTop: "1px solid " + (suggested ? "rgba(200,255,0,.22)" : M.line2),
          ...(suggested
            ? {
                margin: wrapped ? "0 -4px" : undefined,
                paddingLeft: wrapped ? 4 : undefined,
                paddingRight: wrapped ? 4 : undefined,
                borderRadius: wrapped ? 10 : undefined,
                boxShadow: "0 0 0 1px rgba(200,255,0,.06)",
              }
            : {}),
        };

        return (
          <div key={si} style={rowStyle}>
            <span
              style={{
                width: setColWidth,
                flexShrink: 0,
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: valueFontSize,
                color: s.done ? M.acc : si === 0 && s.warmUp ? M.acc : suggested ? M.brand : M.mut,
              }}
            >
              {setNumberLabel(si, s.warmUp)}
            </span>
            <SetMetricFields
              set={s}
              metric={metric}
              compact={compact}
              size={size}
              muted={suggested}
              onBump={(field, delta) => onBumpSet(si, field, delta)}
              onSetValue={(field, value) => onSetValue(si, field, value)}
            />
            {si === 0 ? (
              <WarmUpSetToggle layout="compact" size={size} checked={warmUpChecked} onChange={onWarmUpChange} />
            ) : (
              <span style={{ width: warmUpColWidth, flexShrink: 0 }} />
            )}
            <div
              style={{
                width: actionsWidth,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {variant === "tracked" && onToggleDone ? (
                <button
                  type="button"
                  onClick={() => onToggleDone(si)}
                  aria-label={s.done ? "Satz wieder öffnen" : suggested ? "Vorschlag bestätigen" : "Satz abschließen"}
                  style={{
                    width: actionBtnSize,
                    height: actionBtnSize,
                    borderRadius: isLg ? 11 : 9,
                    border: s.done ? "none" : "1.5px solid " + (suggested ? M.brandBorder : M.line),
                    background: s.done ? M.acc : suggested ? M.brandSoft : "transparent",
                    color: s.done ? M.accInk : suggested ? M.brand : M.mut,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="check" size={isLg ? 20 : 17} stroke={2.6} />
                </button>
              ) : null}
              {renderSetMenu(si, s, actionBtnSize)}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddSet}
        style={{
          width: "100%",
          marginTop: isLg ? 12 : 8,
          padding: isLg ? "12px 0" : "8px 0",
          minHeight: isLg ? 48 : undefined,
          borderRadius: isLg ? 12 : 10,
          border: "1px dashed " + M.line,
          background: "transparent",
          color: M.mut,
          fontWeight: 600,
          fontSize: isLg ? 15 : 13,
          cursor: "pointer",
          fontFamily: M.body,
        }}
      >
        {addSetLabel}
      </button>
    </>
  );

  if (!wrapped || stacked) {
    return <div style={{ width: "100%" }}>{tableContent}</div>;
  }

  return (
    <div
      style={{
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: 16,
        padding: "14px 14px 12px",
        flexShrink: 0,
      }}
    >
      {tableContent}
    </div>
  );
}
