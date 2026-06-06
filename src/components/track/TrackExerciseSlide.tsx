import type { CSSProperties } from "react";
import type { Exercise } from "../../lib/engine";
import type { SetField } from "../../lib/exerciseSets";
import { BLOCK_ACCENT, BLOCK_ORDER } from "../../lib/planBlocks";
import { M } from "../../theme";
import { Icon } from "../Icon";
import { MButton } from "../MButton";
import { TrackSetCard } from "./TrackSetCard";

function blockBadgeForExercise(exercise: Exercise): { index: number; accent: string } {
  const block = exercise.blockType ?? "strength";
  return {
    index: BLOCK_ORDER.indexOf(block) + 1,
    accent: BLOCK_ACCENT[block],
  };
}

function fmtRestSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface TrackExerciseSlideProps {
  exercise: Exercise;
  restSeconds: number;
  onBumpSet: (setIndex: number, field: SetField, delta: number) => void;
  onSetValue: (setIndex: number, field: SetField, value: number) => void;
  onToggleSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onAddSet: () => void;
  onWarmUpChange: (enabled: boolean) => void;
  onOpenHistory: () => void;
  onOpenNotes: () => void;
}

export function TrackExerciseSlide({
  exercise,
  restSeconds,
  onBumpSet,
  onSetValue,
  onToggleSet,
  onRemoveSet,
  onAddSet,
  onWarmUpChange,
  onOpenHistory,
  onOpenNotes,
}: TrackExerciseSlideProps) {
  const { index: blockIndex, accent: blockAccent } = blockBadgeForExercise(exercise);
  const pillStyle: CSSProperties = {
    padding: "7px 14px",
    borderRadius: 999,
    border: "1px solid " + M.line,
    background: M.card,
    color: M.fg,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: M.body,
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        padding: "0 18px 16px",
        paddingTop: 12,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14, flexShrink: 0 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: `color-mix(in srgb, ${blockAccent} 18%, ${M.cardHi})`,
            border: `1px solid color-mix(in srgb, ${blockAccent} 42%, ${M.line2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: blockAccent,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 24,
            lineHeight: 1,
          }}
          aria-hidden
        >
          {blockIndex}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 20,
              lineHeight: 1.15,
              color: M.fg,
            }}
          >
            {exercise.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              fontSize: 12,
              color: M.mut,
            }}
          >
            <Icon name="clock" size={14} stroke={2} color={M.mut2} />
            Pausendauer · {fmtRestSec(restSeconds)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: "wrap" }}>
        <button type="button" onClick={onOpenHistory} style={pillStyle}>
          Verlauf
        </button>
        <button type="button" onClick={onOpenNotes} style={pillStyle}>
          Notizen
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {exercise.sets.map((s, si) => (
          <TrackSetCard
            key={si}
            setIndex={si}
            set={s}
            metric={exercise.metric}
            targetHint={exercise.note && si === 0 ? exercise.note : undefined}
            onBump={(field, delta) => onBumpSet(si, field, delta)}
            onSetValue={(field, value) => onSetValue(si, field, value)}
            onToggleDone={() => onToggleSet(si)}
            onRemove={() => onRemoveSet(si)}
            onWarmUpChange={si === 0 ? onWarmUpChange : undefined}
            canRemove={exercise.sets.length > 1}
          />
        ))}
      </div>

      <MButton
        type="button"
        variant="ghost"
        size="sm"
        fullWidth
        onClick={onAddSet}
        style={{
          marginTop: 12,
          border: "1px dashed " + M.line,
          color: M.fg,
          fontFamily: M.disp,
          letterSpacing: 0.4,
          flexShrink: 0,
        }}
      >
        <Icon name="plus" size={14} stroke={2.4} /> Satz hinzufügen
      </MButton>
    </div>
  );
}
