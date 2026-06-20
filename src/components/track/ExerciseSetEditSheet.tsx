import type { Exercise } from "../../lib/engine";
import type { SetField } from "../../lib/exerciseSets";
import { M } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { SetTable } from "../SetTable";

export interface ExerciseSetEditSheetProps {
  open: boolean;
  exercise: Exercise | null;
  historyHint?: string;
  hintSuggested?: boolean;
  onClose: () => void;
  onBumpSet: (setIndex: number, field: SetField, delta: number) => void;
  onSetValue: (setIndex: number, field: SetField, value: number) => void;
  onToggleSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onAddSet: () => void;
  onWarmUpChange: (enabled: boolean) => void;
}

export function ExerciseSetEditSheet({
  open,
  exercise,
  historyHint,
  hintSuggested = false,
  onClose,
  onBumpSet,
  onSetValue,
  onToggleSet,
  onRemoveSet,
  onAddSet,
  onWarmUpChange,
}: ExerciseSetEditSheetProps) {
  if (!exercise) return null;

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={`Sätze · ${exercise.name}`}>
      <div style={{ padding: "4px 20px 28px", maxHeight: "min(72vh, 520px)", overflowY: "auto" }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, color: M.fg, marginBottom: 4 }}>
          {exercise.name}
        </div>
        <div style={{ fontSize: 13, color: M.mut, marginBottom: 16 }}>Sätze bearbeiten</div>
        <SetTable
          sets={exercise.sets}
          metric={exercise.metric}
          variant="tracked"
          wrapped
          hint={historyHint}
          hintSuggested={hintSuggested}
          onBumpSet={onBumpSet}
          onSetValue={onSetValue}
          onToggleDone={onToggleSet}
          onRemove={onRemoveSet}
          onWarmUpChange={onWarmUpChange}
          onAddSet={onAddSet}
          addSetLabel="+ Satz hinzufügen"
        />
        <MButton type="button" variant="secondary" size="md" fullWidth onClick={onClose} style={{ marginTop: 16 }}>
          Fertig
        </MButton>
      </div>
    </BottomSheet>
  );
}
