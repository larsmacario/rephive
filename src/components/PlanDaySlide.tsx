import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { PlanDayBlock, PlanDayExercise } from "../data";
import { prefersReducedMotion } from "../lib/haptics";
import type { TrainingBlockType } from "../lib/planBlocks";
import { M } from "../theme";
import { Icon } from "./Icon";
import { PlanDayExercisePreview } from "./PlanDayAccordion";

const ENTRANCE_EASE = [0.25, 0.1, 0.25, 1] as const;

export interface PlanDaySlideExercise {
  id: string;
  name: string;
  note?: string;
  blockType?: TrainingBlockType;
  metric: PlanDayExercise["metric"];
  sets: PlanDayExercise["sets"];
}

export interface PlanDaySlideProps {
  dayNumber: number;
  label: string;
  isCurrent?: boolean;
  isActive?: boolean;
  exercises?: PlanDaySlideExercise[];
  blocks?: PlanDayBlock[];
  enabledBlocks?: TrainingBlockType[];
  variant?: "builder" | "detail";
  builderMode?: boolean;
  onAddExerciseToBlock?: (block: TrainingBlockType) => void;
  onRemoveBlock?: (block: TrainingBlockType) => void;
  disabledBlocks?: TrainingBlockType[];
  onRestoreBlock?: (block: TrainingBlockType) => void;
  optionalMetconLink?: { visible: boolean; onAdd: () => void };
  onMetconSettings?: () => void;
  editableName?: boolean;
  nameValue?: string;
  onNameChange?: (value: string) => void;
  onExerciseClick?: (exerciseId: string) => void;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function PlanDaySlide({
  dayNumber,
  label,
  isCurrent = false,
  isActive = true,
  exercises = [],
  blocks = [],
  enabledBlocks,
  variant = "detail",
  builderMode = false,
  onAddExerciseToBlock,
  onRemoveBlock,
  disabledBlocks = [],
  onRestoreBlock,
  optionalMetconLink,
  onMetconSettings,
  editableName = false,
  nameValue,
  onNameChange,
  onExerciseClick,
  actions,
  footer,
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
        background: M.brandSoft,
        color: M.brand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name="dumbbell" size={variant === "builder" ? 18 : 16} stroke={2} />
    </div>
  );

  const previewExercises: PlanDayExercise[] = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    note: e.note,
    blockType: e.blockType ?? "strength",
    metric: e.metric,
    sets: e.sets,
  }));

  const bodyContent =
    previewExercises.length > 0 || (enabledBlocks?.length ?? 0) > 0 ? (
      <PlanDayExercisePreview
        exercises={previewExercises}
        blocks={blocks}
        enabledBlocks={enabledBlocks}
        showEmptyBlocks
        builderMode={builderMode}
        onExerciseClick={onExerciseClick}
        onAddExercise={onAddExerciseToBlock}
        onRemoveBlock={onRemoveBlock}
        disabledBlocks={disabledBlocks}
        onRestoreBlock={onRestoreBlock}
        optionalMetconLink={optionalMetconLink}
        onMetconSettings={onMetconSettings}
      />
    ) : (
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
        Noch keine Übungen — füge welche hinzu.
      </p>
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
              {editableName && onNameChange ? (
                <input
                  value={nameValue ?? label}
                  onChange={(e) => onNameChange(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 2,
                    fontWeight: 600,
                    fontSize: 15.5,
                    background: "transparent",
                    border: "none",
                    color: M.fg,
                    outline: "none",
                    padding: 0,
                  }}
                />
              ) : (
                <div style={{ fontWeight: 600, fontSize: 15.5, marginTop: 2 }}>{label}</div>
              )}
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
          {footer}
        </motion.div>
      </div>
    </div>
  );
}
