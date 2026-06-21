import type { CSSProperties, ReactNode } from "react";
import type { PlanDayBlock, PlanDayExercise } from "../data";
import { M, EXERCISE_ROW, exerciseRowEllipsis } from "../theme";
import { formatSetSummary } from "../lib/exerciseSets";
import { groupExercisesByBlock, BLOCK_LABELS, type TrainingBlockType } from "../lib/planBlocks";
import { configFromPlanDayBlock, formatMetconBlockBadge } from "../lib/metcon";
import { segmentExercises } from "../lib/superset";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import { ExerciseListRow, ExerciseListRowDumbbellIcon } from "./ExerciseListRow";
import { PlanBlockSection } from "./PlanBlockSection";
import { SupersetBlock } from "./SupersetBlock";

const BUILDER_ADD_BUTTON_STYLE = {
  border: "1.5px dashed " + M.line,
  color: M.fg,
  fontFamily: M.disp,
  letterSpacing: 0.4,
  fontSize: 15,
} as const;

export interface PlanDayExercisePreviewProps {
  exercises: PlanDayExercise[];
  blocks?: PlanDayBlock[];
  enabledBlocks?: TrainingBlockType[];
  skippedBlocks?: TrainingBlockType[];
  flat?: boolean;
  onExerciseClick?: (exerciseId: string) => void;
  showEmptyBlocks?: boolean;
  builderMode?: boolean;
  onAddExercise?: (block: TrainingBlockType) => void;
  onRemoveBlock?: (block: TrainingBlockType) => void;
  disabledBlocks?: TrainingBlockType[];
  onRestoreBlock?: (block: TrainingBlockType) => void;
  optionalMetconLink?: { visible: boolean; onAdd: () => void };
  onMetconSettings?: () => void;
}

function ExerciseList({
  exercises,
  flat,
  onExerciseClick,
}: {
  exercises: PlanDayExercise[];
  flat?: boolean;
  onExerciseClick?: (exerciseId: string) => void;
}) {
  const segments = segmentExercises(exercises);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: flat ? 8 : 6 }}>
      {segments.map((seg) => {
        const renderEx = (ex: PlanDayExercise) => {
          const summary = formatSetSummary(ex.sets, ex.metric);
          const clickable = Boolean(onExerciseClick);
          return (
            <ExerciseListRow
              key={ex.id}
              title={ex.name}
              leading={flat ? undefined : <ExerciseListRowDumbbellIcon />}
              trailing={
                <span
                  style={{
                    color: M.mut2,
                    flex: "0 0 auto",
                    fontSize: EXERCISE_ROW.metaSize,
                    fontWeight: 500,
                    maxWidth: "42%",
                    ...exerciseRowEllipsis,
                  }}
                >
                  {summary}
                </span>
              }
              onClick={clickable ? () => onExerciseClick?.(ex.id) : undefined}
              background={flat ? "transparent" : "panel"}
              borderRadius={flat ? 10 : undefined}
              style={
                flat
                  ? {
                      background: "rgba(255,255,255,.02)",
                      border: "1px solid " + M.line2,
                    }
                  : undefined
              }
            />
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

export function PlanDayExercisePreview({
  exercises,
  blocks = [],
  enabledBlocks,
  skippedBlocks = [],
  flat = false,
  onExerciseClick,
  showEmptyBlocks = false,
  builderMode = false,
  onAddExercise,
  onRemoveBlock,
  disabledBlocks = [],
  onRestoreBlock,
  optionalMetconLink,
  onMetconSettings,
}: PlanDayExercisePreviewProps) {
  const skippedSet = new Set(skippedBlocks);
  const groups = groupExercisesByBlock(exercises, enabledBlocks);
  const metconBlockDef = blocks.find((b) => b.blockType === "metcon");

  if (groups.length === 0 && exercises.length > 0) {
    return <ExerciseList exercises={exercises} flat={flat} onExerciseClick={onExerciseClick} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {groups.map(({ block, exercises: blockExercises }) => {
        const skipped = skippedSet.has(block);
        if (!showEmptyBlocks && blockExercises.length === 0 && !skipped) return null;
        return (
          <PlanBlockSection
            key={block}
            block={block}
            skipped={skipped}
            headerAction={
              builderMode && (onRemoveBlock || (block === "metcon" && onMetconSettings)) ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {block === "metcon" && onMetconSettings ? (
                    <MButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onMetconSettings}
                      style={{ color: M.mut, fontSize: 13, padding: "4px 8px" }}
                    >
                      Einstellungen
                    </MButton>
                  ) : null}
                  {onRemoveBlock ? (
                    <MButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveBlock(block)}
                      style={{ color: M.mut2, fontSize: 13, padding: "4px 8px" }}
                    >
                      Entfernen
                    </MButton>
                  ) : null}
                </div>
              ) : undefined
            }
          >
            {block === "metcon" && metconBlockDef ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: "#f97316",
                    textTransform: "uppercase",
                  }}
                >
                  {(() => {
                    const cfg = configFromPlanDayBlock(metconBlockDef);
                    return cfg ? formatMetconBlockBadge(cfg) : "MetCon";
                  })()}
                </div>
                {blockExercises.length > 0 ? (
                  <ExerciseList exercises={blockExercises} flat={flat} onExerciseClick={onExerciseClick} />
                ) : (
                  <div style={{ fontSize: 13, color: M.mut, fontWeight: 500, padding: "4px 2px" }}>
                    Noch keine Übungen
                  </div>
                )}
              </div>
            ) : blockExercises.length > 0 ? (
              <ExerciseList exercises={blockExercises} flat={flat} onExerciseClick={onExerciseClick} />
            ) : (
              <div style={{ fontSize: 13, color: M.mut, fontWeight: 500, padding: "4px 2px" }}>
                {skipped ? "Nicht absolviert" : "Noch keine Übungen"}
              </div>
            )}
            {builderMode && onAddExercise && (
              <MButton
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => onAddExercise(block)}
                style={{ marginTop: 10, ...BUILDER_ADD_BUTTON_STYLE }}
              >
                <Icon name="plus" size={16} stroke={2.6} /> Übung hinzufügen
              </MButton>
            )}
          </PlanBlockSection>
        );
      })}
      {builderMode && optionalMetconLink?.visible && (
        <MButton
          type="button"
          variant="ghost"
          size="md"
          fullWidth
          onClick={optionalMetconLink.onAdd}
          style={{ marginTop: 6, ...BUILDER_ADD_BUTTON_STYLE, color: M.mut }}
        >
          <Icon name="plus" size={16} stroke={2.6} /> MetCon hinzufügen
        </MButton>
      )}
      {builderMode && disabledBlocks.length > 0 && onRestoreBlock && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut2, fontWeight: 700 }}>ENTFERNT</div>
          {disabledBlocks.map((block) => (
            <MButton
              key={block}
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => onRestoreBlock(block)}
              style={{
                ...BUILDER_ADD_BUTTON_STYLE,
                color: M.mut,
                justifyContent: "flex-start",
              }}
            >
              <Icon name="plus" size={16} stroke={2.6} /> {BLOCK_LABELS[block]} hinzufügen
            </MButton>
          ))}
        </div>
      )}
    </div>
  );
}

export interface PlanDayAccordionProps {
  dayId: string;
  dayNumber: number;
  label: string;
  isCurrent?: boolean;
  exercises?: PlanDayExercise[];
  blocks?: PlanDayBlock[];
  enabledBlocks?: TrainingBlockType[];
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
  isCurrent = false,
  exercises = [],
  blocks = [],
  enabledBlocks,
  expanded,
  onToggle,
  leading,
  actions,
  variant = "detail",
}: PlanDayAccordionProps) {
  const highlighted = isCurrent;
  const canExpand = exercises.length > 0 || (enabledBlocks?.length ?? 0) > 0;

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
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut2, fontWeight: 700 }}>TAG {dayNumber}</div>
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
        background: variant === "builder" ? M.accSoft : undefined,
        color: variant === "builder" ? M.acc : highlighted ? M.acc : M.mut2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name="dumbbell" size={variant === "builder" ? 18 : 16} stroke={2} />
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

      {canExpand && expanded && (
        <div
          style={{
            padding: variant === "builder" ? "0 14px 14px" : "0 12px 12px",
            borderTop: "1px solid " + M.line2,
          }}
        >
          <PlanDayExercisePreview
            exercises={exercises}
            blocks={blocks}
            enabledBlocks={enabledBlocks}
            showEmptyBlocks
          />
        </div>
      )}
    </div>
  );
}
