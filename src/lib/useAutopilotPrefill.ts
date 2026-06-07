import { useEffect, useMemo, useState } from "react";
import type { Exercise } from "./engine";
import type { LibraryExercise } from "../data";
import {
  fetchExercisePerformanceByRef,
  type LastPerformance,
} from "./db";
import {
  computeNextTarget,
  computeProgressTrend,
  detectPlateau,
  formatLastPerformanceHint,
  inferExerciseBlockFormat,
  inferTargetRepRange,
  isAutopilotEligible,
  resolveWeightIncrement,
  type SetSuggestion,
} from "./progressionEngine";
import type { UserPreferences } from "./preferences";

export interface ExercisePrefillResult {
  suggestions: SetSuggestion[];
  hint: string | null;
  progressionNote?: string;
  trendLabel?: string | null;
  plateaued: boolean;
  plateauReason?: string;
  history: LastPerformance[];
}

export interface AutopilotPrefillState {
  loading: boolean;
  prefills: Map<string, ExercisePrefillResult>;
}

export function exerciseIsPrefillEligible(exercise: Exercise): boolean {
  if (exercise.sets.length === 0) return false;
  return exercise.sets.every((s) => !s.done && !s.suggested);
}

function muscleGroupForExercise(
  exercise: Exercise,
  groupByCatalogId: ReadonlyMap<string, string>,
): string | undefined {
  if (exercise.muscleGroup) return exercise.muscleGroup;
  if (!exercise.catalogExerciseId) return undefined;
  return groupByCatalogId.get(exercise.catalogExerciseId);
}

export function useAutopilotPrefill(
  userId: string | undefined,
  exercises: Exercise[],
  preferences: Pick<UserPreferences, "weightIncrementUpperKg" | "weightIncrementLowerKg">,
  library: LibraryExercise[] = [],
  applyDeloadExerciseIds: Set<string> = new Set(),
): AutopilotPrefillState {
  const exerciseKey = useMemo(
    () =>
      exercises
        .map(
          (e) =>
            `${e.id}:${e.catalogExerciseId ?? ""}:${e.name}:${e.sets.length}:${applyDeloadExerciseIds.has(e.id)}`,
        )
        .join("|"),
    [exercises, applyDeloadExerciseIds],
  );

  const libraryGroupById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of library) {
      map.set(item.id, item.group);
    }
    return map;
  }, [library]);

  const libraryGroupKey = useMemo(
    () => [...libraryGroupById.entries()].sort(([a], [b]) => a.localeCompare(b)).join("|"),
    [libraryGroupById],
  );

  const [state, setState] = useState<AutopilotPrefillState>({
    loading: Boolean(userId && exercises.length > 0),
    prefills: new Map(),
  });

  useEffect(() => {
    if (!userId || exercises.length === 0) {
      setState({ loading: false, prefills: new Map() });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    void (async () => {
      const prefills = new Map<string, ExercisePrefillResult>();

      await Promise.all(
        exercises.map(async (exercise) => {
          if (!exerciseIsPrefillEligible(exercise)) return;

          const format = inferExerciseBlockFormat(exercise);
          if (!isAutopilotEligible(format, exercise.metric)) return;

          const ref = {
            catalogExerciseId: exercise.catalogExerciseId,
            name: exercise.name,
          };

          const { lastPerformance, history } = await fetchExercisePerformanceByRef(userId, ref, 10);

          const muscleGroup = muscleGroupForExercise(exercise, libraryGroupById);
          const { min, max } = inferTargetRepRange(exercise.sets);
          const increment = resolveWeightIncrement(muscleGroup, preferences);

          const suggestions = computeNextTarget({
            lastPerformance,
            planSets: exercise.sets,
            format,
            metric: exercise.metric,
            targetRepsMin: min,
            targetRepsMax: max,
            weightIncrementKg: increment,
            muscleGroup,
            applyDeload: applyDeloadExerciseIds.has(exercise.id),
          });

          if (!suggestions.some((s) => s.source !== "plan_default")) return;

          const plateau = detectPlateau(history, 3);
          const trend = computeProgressTrend(history);
          const progressionNote = suggestions.find((s) => s.progressionNote)?.progressionNote;

          prefills.set(exercise.id, {
            suggestions,
            hint: lastPerformance
              ? formatLastPerformanceHint(lastPerformance.sets, lastPerformance.metric)
              : null,
            progressionNote,
            trendLabel: trend?.label ?? null,
            plateaued: plateau.plateaued,
            plateauReason: plateau.reason,
            history,
          });
        }),
      );

      if (!cancelled) setState({ loading: false, prefills });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, exerciseKey, preferences.weightIncrementUpperKg, preferences.weightIncrementLowerKg, libraryGroupKey]);

  return state;
}
