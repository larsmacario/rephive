import type { ReactNode } from "react";
import type { LibraryWorkout } from "../data";
import { M } from "../theme";
import { Icon } from "./Icon";
import { WorkoutExercisePreview } from "./PlanDayAccordion";

export interface PlanDaySlideProps {
  dayNumber: number;
  label: string;
  isRestDay: boolean;
  isCurrent?: boolean;
  workout?: LibraryWorkout | null;
  variant?: "builder" | "detail";
  actions?: ReactNode;
}

export function PlanDaySlide({
  dayNumber,
  label,
  isRestDay,
  isCurrent = false,
  workout,
  variant = "detail",
  actions,
}: PlanDaySlideProps) {
  const highlighted = isCurrent;

  const containerStyle = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  };

  const typeIcon = (
    <div
      style={{
        width: variant === "builder" ? 34 : 32,
        height: variant === "builder" ? 34 : 32,
        borderRadius: variant === "builder" ? 9 : 8,
        background: isRestDay ? M.panel : M.accSoft,
        color: isRestDay ? M.mut : M.acc,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name={isRestDay ? "pause" : "dumbbell"} size={variant === "builder" ? 18 : 16} stroke={2} />
    </div>
  );

  return (
    <div style={containerStyle}>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: variant === "builder" ? 12 : 10,
          padding: variant === "builder" ? "4px 0 12px" : "4px 0 12px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {variant === "builder" ? (
            <>
              <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut2, fontWeight: 700 }}>TAG {dayNumber}</div>
              <div style={{ fontWeight: 600, fontSize: 15.5, marginTop: 2 }}>{label}</div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.2,
                  color: highlighted ? M.acc : M.mut2,
                  fontWeight: 700,
                }}
              >
                TAG {dayNumber}
                {highlighted ? " · AKTUELL" : ""}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2, color: M.fg }}>{label}</div>
            </>
          )}
        </div>
        {typeIcon}
        {actions}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          padding: "0 0 14px",
        }}
      >
        {isRestDay ? (
          <p
            style={{
              margin: "24px 0 0",
              textAlign: "center",
              color: M.mut,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            Kein Workout an diesem Tag — Zeit zur Regeneration.
          </p>
        ) : workout ? (
          <WorkoutExercisePreview workout={workout} flat />
        ) : (
          <div style={{ color: M.mut, fontSize: 13, fontWeight: 600 }}>Workout nicht gefunden.</div>
        )}
      </div>
    </div>
  );
}
