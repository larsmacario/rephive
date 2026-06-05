import type { CSSProperties, ReactNode } from "react";
import type { LibraryWorkout } from "../data";
import { M } from "../theme";
import { formatSetSummary, isUniform } from "../lib/exerciseSets";
import { segmentExercises } from "../lib/superset";
import { Icon } from "./Icon";
import { SupersetBlock } from "./SupersetBlock";

export interface WorkoutExercisePreviewProps {
  workout: LibraryWorkout;
  flat?: boolean;
}

export function WorkoutExercisePreview({ workout, flat = false }: WorkoutExercisePreviewProps) {
  const segments = segmentExercises(workout.exercises);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: flat ? 8 : 6 }}>
      {segments.map((seg) => {
        const renderEx = (ex: (typeof workout.exercises)[number]) => {
          const summary = formatSetSummary(ex.sets, ex.metric);
          const uniform = isUniform(ex.sets);
          return (
            <div
              key={ex.id}
              style={{
                padding: flat ? "11px 12px" : "10px 12px",
                borderRadius: flat ? 10 : 12,
                background: flat ? "rgba(255,255,255,.02)" : M.panel,
                border: "1px solid " + M.line2,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: flat ? 0 : 10 }}>
                {!flat && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: M.accSoft,
                      color: M.acc,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "0 0 auto",
                    }}
                  >
                    <Icon name="dumbbell" size={16} stroke={2} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: M.fg }}>{ex.name}</div>
                      {ex.note && (
                        <div style={{ color: M.mut, fontSize: 12, marginTop: 2, fontWeight: 500 }}>{ex.note}</div>
                      )}
                    </div>
                    <span style={{ color: M.mut2, flex: "0 0 auto", fontSize: 12.5, paddingTop: 1 }}>{summary}</span>
                  </div>
                </div>
              </div>
              {!uniform && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, paddingLeft: flat ? 0 : 42 }}>
                  {ex.sets.map((s, si) => (
                    <div
                      key={si}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: flat ? "2px 0" : "4px 8px",
                        borderRadius: flat ? 0 : 8,
                        background: flat ? "transparent" : M.accSoft,
                        fontSize: 12,
                        color: M.mut,
                      }}
                    >
                      <span>Satz {si + 1}</span>
                      <span style={{ fontFamily: M.disp, fontWeight: 700, color: M.fg }}>
                        {s.kg} kg × {s.reps}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        };

        if (seg.kind === "single") return renderEx(seg.exercise);
        return (
          <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
            {seg.exercises.map((ex) => renderEx(ex))}
          </SupersetBlock>
        );
      })}
    </div>
  );
}

export interface PlanDayAccordionProps {
  dayId: string;
  dayNumber: number;
  label: string;
  isRestDay: boolean;
  isCurrent?: boolean;
  workout?: LibraryWorkout | null;
  expanded: boolean;
  onToggle?: (dayId: string) => void;
  leading?: ReactNode;
  actions?: ReactNode;
  variant?: "detail" | "builder";
}

export function PlanDayAccordion({
  dayId,
  dayNumber,
  label,
  isRestDay,
  isCurrent = false,
  workout,
  expanded,
  onToggle,
  leading,
  actions,
  variant = "detail",
}: PlanDayAccordionProps) {
  const highlighted = isCurrent;
  const canExpand = !isRestDay && Boolean(workout);

  const containerStyle: CSSProperties =
    variant === "builder"
      ? {
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 16,
          overflow: "hidden",
        }
      : {
          borderRadius: 12,
          background: highlighted ? M.accSoft : M.card,
          border: "1px solid " + (highlighted ? M.acc : M.line2),
          overflow: "hidden",
        };

  const headerRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: variant === "builder" ? 12 : 0,
    padding: variant === "builder" ? "13px 14px" : 0,
  };

  const toggleStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: variant === "builder" ? 12 : 10,
    padding: variant === "builder" ? 0 : "10px 12px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: canExpand ? "pointer" : "default",
    font: "inherit",
    color: "inherit",
  };

  const staticRowStyle: CSSProperties = {
    ...toggleStyle,
    cursor: "default",
  };

  const mainContent =
    variant === "builder" ? (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut2, fontWeight: 700 }}>TAG {dayNumber}</div>
        <div style={{ fontWeight: 600, fontSize: 15.5, marginTop: 2 }}>{label}</div>
      </div>
    ) : (
      <>
        <span style={{ color: highlighted ? M.acc : M.mut2, minWidth: 42, fontSize: 13, fontWeight: 600 }}>
          Tag {dayNumber}
        </span>
        <span style={{ color: M.fg, flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</span>
      </>
    );

  const typeIcon = (
    <div
      style={{
        width: variant === "builder" ? 34 : undefined,
        height: variant === "builder" ? 34 : undefined,
        borderRadius: variant === "builder" ? 9 : undefined,
        background: isRestDay ? M.panel : variant === "builder" ? M.accSoft : undefined,
        color: isRestDay ? M.mut : variant === "builder" ? M.acc : highlighted ? M.acc : M.mut2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name={isRestDay ? "pause" : "dumbbell"} size={variant === "builder" ? 18 : 16} stroke={2} />
    </div>
  );

  const chevron = canExpand ? (
    <Icon name={expanded ? "chevD" : "chevR"} size={18} stroke={2.2} color={highlighted ? M.acc : M.mut2} />
  ) : null;

  const headerInner = (
    <>
      {mainContent}
      {typeIcon}
      {chevron}
    </>
  );

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        {leading}
        {canExpand ? (
          <button type="button" onClick={() => onToggle?.(dayId)} style={toggleStyle}>
            {headerInner}
          </button>
        ) : (
          <div style={staticRowStyle}>{headerInner}</div>
        )}
        {actions}
      </div>

      {canExpand && expanded && workout && (
        <div
          style={{
            padding: variant === "builder" ? "0 14px 14px" : "0 12px 12px",
            borderTop: "1px solid " + M.line2,
          }}
        >
          <WorkoutExercisePreview workout={workout} />
        </div>
      )}
    </div>
  );
}
