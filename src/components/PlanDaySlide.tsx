import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LibraryWorkout } from "../data";
import { prefersReducedMotion } from "../lib/haptics";
import { M } from "../theme";
import { Icon } from "./Icon";
import { WorkoutExercisePreview } from "./PlanDayAccordion";

const ENTRANCE_EASE = [0.25, 0.1, 0.25, 1] as const;

export interface PlanDaySlideProps {
  dayNumber: number;
  label: string;
  isRestDay: boolean;
  isCurrent?: boolean;
  isActive?: boolean;
  workout?: LibraryWorkout | null;
  variant?: "builder" | "detail";
  actions?: ReactNode;
}

export function PlanDaySlide({
  dayNumber,
  label,
  isRestDay,
  isCurrent = false,
  isActive = true,
  workout,
  variant = "detail",
  actions,
}: PlanDaySlideProps) {
  const highlighted = isCurrent;
  const reducedMotion = prefersReducedMotion();
  const animateEntrance = isActive && !reducedMotion;

  const containerStyle = {
    flex: 1,
    minHeight: 0,
    height: "100%",
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
        background: isRestDay ? M.panel : M.brandSoft,
        color: isRestDay ? M.mut : M.brand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name={isRestDay ? "pause" : "dumbbell"} size={variant === "builder" ? 18 : 16} stroke={2} />
    </div>
  );

  const bodyContent = isRestDay ? (
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
  );

  return (
    <div style={containerStyle}>
      <motion.div
        key={isActive ? `header-active-${dayNumber}` : `header-idle-${dayNumber}`}
        initial={animateEntrance ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: ENTRANCE_EASE }}
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
                  color: highlighted ? M.brand : M.mut2,
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
      </motion.div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
          padding: "0 0 14px",
        }}
      >
        <motion.div
          key={isActive ? `body-active-${dayNumber}` : `body-idle-${dayNumber}`}
          initial={animateEntrance ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: animateEntrance ? 0.08 : 0, ease: ENTRANCE_EASE }}
        >
          {bodyContent}
        </motion.div>
      </div>
    </div>
  );
}
