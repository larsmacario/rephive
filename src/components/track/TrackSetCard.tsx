import { useEffect, useRef, useState } from "react";
import { formatSetLine, type ExerciseMetric } from "../../lib/exerciseCatalog";
import type { WorkoutSet } from "../../lib/engine";
import type { SetField } from "../../lib/exerciseSets";
import { M } from "../../theme";
import { SetMetricFields } from "../SetMetricFields";
import { WarmUpSetToggle } from "../WarmUpSetToggle";
import { MButton } from "../MButton";
import { Icon } from "../Icon";

export interface TrackSetCardProps {
  setIndex: number;
  set: WorkoutSet;
  metric: ExerciseMetric;
  targetHint?: string;
  onBump: (field: SetField, delta: number) => void;
  onSetValue: (field: SetField, value: number) => void;
  onToggleDone: () => void;
  onRemove: () => void;
  onWarmUpChange?: (enabled: boolean) => void;
  canRemove: boolean;
}

export function TrackSetCard({
  setIndex,
  set,
  metric,
  targetHint,
  onBump,
  onSetValue,
  onToggleDone,
  onRemove,
  onWarmUpChange,
  canRemove,
}: TrackSetCardProps) {
  const label = setIndex === 0 && set.warmUp ? "Warm-up" : `Satz ${setIndex + 1}`;
  const showWarmUp = setIndex === 0 && Boolean(onWarmUpChange);
  const resultLine = formatSetLine(set, metric);

  const [expanded, setExpanded] = useState(!set.done);
  const prevDone = useRef(set.done);

  useEffect(() => {
    if (!prevDone.current && set.done) setExpanded(false);
    if (prevDone.current && !set.done) setExpanded(true);
    prevDone.current = set.done;
  }, [set.done]);

  const isCollapsed = set.done && !expanded;

  const toggleExpanded = () => {
    if (set.done) setExpanded((open) => !open);
  };

  return (
    <div
      style={{
        background: M.cardHi,
        border: "1px solid " + (set.done ? M.brandBorder : M.line2),
        borderRadius: 18,
        padding: isCollapsed ? "12px 14px" : "16px 16px 14px",
        flexShrink: 0,
      }}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={false}
          aria-label={`${label} bearbeiten`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: M.body,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: M.brandSoft,
              border: "1px solid " + M.brandBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: M.brand,
            }}
          >
            <Icon name="check" size={14} stroke={2.8} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 15,
                color: M.fg,
                flexShrink: 0,
              }}
            >
              {label}
            </span>
            <span style={{ color: M.mut2, fontSize: 13, flexShrink: 0 }}>·</span>
            <span
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 15,
                color: M.fg,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {resultLine}
            </span>
          </div>
          <Icon name="chevR" size={18} stroke={2.2} color={M.mut2} />
        </button>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              {set.done ? (
                <button
                  type="button"
                  onClick={toggleExpanded}
                  aria-expanded
                  aria-label={`${label} einklappen`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: M.body,
                  }}
                >
                  <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, color: M.fg }}>{label}</div>
                  <Icon name="chevD" size={18} stroke={2.2} color={M.mut2} />
                </button>
              ) : (
                <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, color: M.fg }}>{label}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {canRemove ? (
                  <MButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Satz entfernen"
                    onClick={onRemove}
                    style={{ color: M.mut2, width: 36, height: 36 }}
                  >
                    <Icon name="trash" size={16} stroke={2} />
                  </MButton>
                ) : null}
              </div>
            </div>
            {targetHint ? (
              <div style={{ fontSize: 12, color: M.mut, marginTop: 6, lineHeight: 1.4 }}>{targetHint}</div>
            ) : null}
          </div>

          <div style={{ marginBottom: 14, padding: "4px 0 8px" }}>
            <SetMetricFields
              set={set}
              metric={metric}
              layout="stack"
              size="lg"
              areaWidth="80%"
              onBump={onBump}
              onSetValue={onSetValue}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {showWarmUp ? (
              <WarmUpSetToggle
                checked={Boolean(set.warmUp)}
                onChange={onWarmUpChange!}
                layout="compact"
                size="lg"
              />
            ) : null}
            <MButton
              type="button"
              variant={set.done ? "secondary" : "primary"}
              size="md"
              fullWidth
              onClick={onToggleDone}
              style={{
                flex: 1,
                minWidth: 0,
                ...(set.done
                  ? { fontFamily: M.disp, letterSpacing: 0.4 }
                  : { fontFamily: M.disp, letterSpacing: 0.5, fontWeight: 700 }),
              }}
            >
              {set.done ? (
                <>
                  <Icon name="check" size={17} stroke={2.6} /> Satz wieder öffnen
                </>
              ) : (
                "Satz abschließen"
              )}
            </MButton>
          </div>
        </>
      )}
    </div>
  );
}
