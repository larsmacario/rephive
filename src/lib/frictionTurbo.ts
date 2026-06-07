import { DEFAULT_EXERCISE_METRIC, getMetricSpec } from "./exerciseCatalog";
import type { Exercise } from "./engine";
import { segmentExercises } from "./superset";

export interface TurboSetTarget {
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  totalSetsInExercise: number;
}

/** Turbo v0: linear weight_reps only, no supersets, no metcon. */
export function isWorkoutTurboEligible(exercises: Exercise[]): boolean {
  if (exercises.length === 0) return false;
  for (const ex of exercises) {
    const metric = ex.metric ?? DEFAULT_EXERCISE_METRIC;
    if (metric !== "weight_reps") return false;
    const spec = getMetricSpec(metric);
    if (!spec.showKg || !spec.showReps) return false;
    if (ex.sets.length === 0) return false;
  }
  const segments = segmentExercises(exercises);
  if (segments.some((s) => s.kind === "superset")) return false;
  return true;
}

export interface TurboExercisePreview {
  exerciseId: string;
  exerciseName: string;
}

/** Next exercise in workout order after `currentExerciseId`, or null if last. */
export function findNextTurboExercise(
  exercises: Exercise[],
  currentExerciseId: string,
): TurboExercisePreview | null {
  const idx = exercises.findIndex((e) => e.id === currentExerciseId);
  if (idx < 0 || idx >= exercises.length - 1) return null;
  const next = exercises[idx + 1]!;
  return { exerciseId: next.id, exerciseName: next.name };
}

export function findNextTurboTarget(exercises: Exercise[]): TurboSetTarget | null {
  for (const ex of exercises) {
    const undoneIndex = ex.sets.findIndex((s) => !s.done);
    if (undoneIndex >= 0) {
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        setIndex: undoneIndex,
        totalSetsInExercise: ex.sets.length,
      };
    }
  }
  return null;
}

export function countTurboProgress(exercises: Exercise[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of exercises) {
    total += ex.sets.length;
    done += ex.sets.filter((s) => s.done).length;
  }
  return { done, total };
}

export function formatTurboSetDisplay(kg: number, reps: number): string {
  return `${kg} kg × ${reps}`;
}
