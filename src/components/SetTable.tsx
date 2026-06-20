import type { CSSProperties } from "react";
import type { ExerciseMetric, SetLike } from "../lib/exerciseCatalog";
import { DEFAULT_EXERCISE_METRIC } from "../lib/exerciseCatalog";
import type { SetField } from "../lib/exerciseSets";
import { M } from "../theme";
import { Icon } from "./Icon";
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

function individualActionsWidth(variant: "template" | "tracked"): number {
  return variant === "tracked" ? 72 : 36;
}

function isSuggestedRow(set: SetTableSet): boolean {
  return Boolean(set.suggested && !set.done);
}

export interface SetTableProps {
  sets: SetTableSet[];
  metric?: ExerciseMetric;
  variant: "template" | "tracked";
  compact?: boolean;
  /** Neutral card wrapper (TrackScreen). */
  wrapped?: boolean;
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
  wrapped = false,
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
  const valueFontSize = compact ? 17 : 21;
  const actionsWidth = individualActionsWidth(variant);
  const warmUpChecked = Boolean(sets[0]?.warmUp);
  const canRemove = sets.length > 1;

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

      <div
        style={{
          display: "flex",
          fontSize: 13,
          letterSpacing: 1.2,
          color: M.mut2,
          fontWeight: 700,
          padding: wrapped ? "0 0 8px" : "4px 4px 8px",
        }}
      >
        {headers.map((h) => (
          <span
            key={h.key}
            style={{
              width: h.key === "set" ? 34 : undefined,
              flex: h.key === "set" ? undefined : 1,
              textAlign: h.key === "set" ? "left" : "center",
            }}
          >
            {h.label}
          </span>
        ))}
        <span style={{ width: WARMUP_COLUMN_WIDTH, textAlign: "center" }}>W-UP</span>
        <span style={{ width: actionsWidth }} />
      </div>

      {sets.map((s, si) => {
        const suggested = isSuggestedRow(s);
        const rowStyle: CSSProperties = {
          display: "flex",
          alignItems: "center",
          padding: wrapped ? "8px 0" : "6px 4px",
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
                width: 34,
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
              muted={suggested}
              onBump={(field, delta) => onBumpSet(si, field, delta)}
              onSetValue={(field, value) => onSetValue(si, field, value)}
            />
            {si === 0 ? (
              <WarmUpSetToggle layout="compact" checked={warmUpChecked} onChange={onWarmUpChange} />
            ) : (
              <span style={{ width: WARMUP_COLUMN_WIDTH, flexShrink: 0 }} />
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
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: s.done ? "none" : "1.5px solid " + (suggested ? M.brandBorder : M.line),
                    background: s.done ? M.acc : suggested ? M.brandSoft : "transparent",
                    color: s.done ? M.accInk : suggested ? M.brand : M.mut,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="check" size={17} stroke={2.6} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(si)}
                disabled={!canRemove}
                aria-label="Satz entfernen"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: "1px solid " + M.line2,
                  background: "transparent",
                  color: M.mut2,
                  cursor: canRemove ? "pointer" : "not-allowed",
                  opacity: canRemove ? 1 : 0.4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="minus" size={16} stroke={2.2} />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddSet}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "8px 0",
          borderRadius: 10,
          border: "1px dashed " + M.line,
          background: "transparent",
          color: M.mut,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: M.body,
        }}
      >
        {addSetLabel}
      </button>
    </>
  );

  if (!wrapped) {
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
