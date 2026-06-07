import type { ExerciseMetric } from "./exerciseCatalog";
import { formatDurationSec } from "./exerciseCatalog";
import type { BlockFormat } from "./planBlocks";
import type { WorkoutSet } from "./engine";
import { roundToKgStep } from "./exerciseSets";

export type SetSuggestionSource = "last_session" | "plan_default" | "progression" | "deload";

export type PerceivedEffort = "easy" | "ok" | "hard";

export interface LastPerformance {
  sets: WorkoutSet[];
  metric: ExerciseMetric;
  blockFormat?: BlockFormat;
  performedAt: string;
  sessionId: string;
  perceivedEffort?: PerceivedEffort | null;
}

export interface SetSuggestion {
  reps: number;
  kg: number;
  durationSec?: number;
  distanceM?: number;
  warmUp?: boolean;
  source: SetSuggestionSource;
  progressionNote?: string;
  suggested?: boolean;
}

export interface WeightIncrementPrefs {
  weightIncrementUpperKg?: number;
  weightIncrementLowerKg?: number;
}

export interface ComputeNextTargetInput {
  lastPerformance: LastPerformance | null;
  planSets: WorkoutSet[];
  format: BlockFormat;
  metric: ExerciseMetric;
  targetRepsMin?: number;
  targetRepsMax?: number;
  weightIncrementKg?: number;
  muscleGroup?: string;
  applyDeload?: boolean;
}

export interface PlateauResult {
  plateaued: boolean;
  reason?: string;
}

export interface DeloadSuggestion {
  kgMultiplier: number;
  dropSets?: number;
  message: string;
}

export interface ProgressTrend {
  deltaKg: number;
  weeks: number;
  label: string;
}

const LOWER_BODY_GROUPS = new Set([
  "beine",
  "legs",
  "quadrizeps",
  "quads",
  "hintere oberschenkel",
  "hamstrings",
  "gesäß",
  "glutes",
  "waden",
  "calves",
  "rücken",
  "back",
  "lats",
]);

export function normalizeBlockFormatForEngine(format?: BlockFormat | string | null): BlockFormat {
  if (
    format === "straight_sets" ||
    format === "superset" ||
    format === "circuit" ||
    format === "emom" ||
    format === "amrap" ||
    format === "for_time"
  ) {
    return format;
  }
  return "straight_sets";
}

export function isAutopilotEligible(format: BlockFormat, metric: ExerciseMetric): boolean {
  const f = normalizeBlockFormatForEngine(format);
  if (f === "straight_sets" || f === "superset") {
    return (
      metric === "weight_reps" ||
      metric === "assisted_bodyweight_reps" ||
      metric === "reps"
    );
  }
  if (f === "circuit" || f === "amrap") return metric === "weight_reps" || metric === "reps";
  if (f === "for_time") return metric === "time" || metric === "distance_time";
  if (f === "emom") return metric === "weight_reps" || metric === "reps";
  if (metric === "time" || metric === "distance_time") return true;
  return false;
}

export { roundToKgStep } from "./exerciseSets";

export function resolveWeightIncrement(
  muscleGroup?: string,
  prefs?: WeightIncrementPrefs,
): number {
  const upper = prefs?.weightIncrementUpperKg ?? 2.5;
  const lower = prefs?.weightIncrementLowerKg ?? 5;
  if (!muscleGroup) return upper;
  const key = muscleGroup.trim().toLowerCase();
  for (const g of LOWER_BODY_GROUPS) {
    if (key.includes(g)) return lower;
  }
  return upper;
}

export function inferTargetRepRange(planSets: WorkoutSet[]): { min: number; max: number } {
  const working = planSets.filter((s) => !s.warmUp);
  const reps = working.map((s) => s.reps).filter((r) => r > 0);
  const max = reps.length ? Math.max(...reps) : 10;
  return { min: Math.max(1, max - 2), max };
}

function hasMeaningfulPerformance(sets: WorkoutSet[], metric: ExerciseMetric): boolean {
  return sets.some((s) => {
    if (!s.done) return false;
    if (metric === "weight_reps" || metric === "assisted_bodyweight_reps") return s.kg > 0 || s.reps > 0;
    if (metric === "reps") return s.reps > 0;
    if (metric === "time" || metric === "distance_time") return (s.durationSec ?? 0) > 0 || (s.distanceM ?? 0) > 0;
    return s.reps > 0 || s.kg > 0;
  });
}

export function doneWorkingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.done && !s.warmUp && (s.kg > 0 || s.reps > 0 || (s.durationSec ?? 0) > 0 || (s.distanceM ?? 0) > 0));
}

function planDefaultSuggestions(planSets: WorkoutSet[]): SetSuggestion[] {
  return planSets.map((s) => ({
    reps: s.reps,
    kg: s.kg,
    durationSec: s.durationSec,
    distanceM: s.distanceM,
    warmUp: s.warmUp,
    source: "plan_default" as const,
  }));
}

function formatKgDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Number.isInteger(delta) ? delta : delta.toFixed(2).replace(/\.?0+$/, "")} kg`;
}

function workingSetSnapshot(sets: WorkoutSet[]): { kg: number; reps: number }[] {
  return doneWorkingSets(sets).map((s) => ({ kg: s.kg, reps: s.reps }));
}

function allWorkingSetsAtRepMax(last: WorkoutSet[], targetRepsMax: number): boolean {
  const working = doneWorkingSets(last);
  return working.length > 0 && working.every((s) => s.reps >= targetRepsMax);
}

function computeWeightRepsProgression(
  lastPerformance: LastPerformance,
  planSets: WorkoutSet[],
  format: BlockFormat,
  incrementKg: number,
  targetRepsMin: number,
  targetRepsMax: number,
  applyDeload: boolean,
): SetSuggestion[] {
  const lastSets = lastPerformance.sets;
  const doneSets = doneWorkingSets(lastSets);
  if (doneSets.length === 0) return planDefaultSuggestions(planSets);

  const deloadMult = applyDeload ? 0.9 : 1;
  const shouldProgressLoad =
    !applyDeload &&
    (format === "straight_sets" || format === "superset") &&
    allWorkingSetsAtRepMax(lastSets, targetRepsMax);

  let progressionNote: string | undefined;
  if (applyDeload) progressionNote = "Deload −10 %";
  else if (shouldProgressLoad) progressionNote = formatKgDelta(incrementKg);

  return planSets.map((planSet, index) => {
    const isWarmUp = index === 0 && (lastSets[0]?.warmUp || planSet.warmUp);
    if (isWarmUp) {
      const warm = lastSets.find((s, i) => i === 0 && s.warmUp) ?? lastSets[0];
      const warmKg = warm?.kg ?? planSet.kg;
      return {
        reps: warm?.reps ?? planSet.reps,
        kg: roundToKgStep(applyDeload ? warmKg * deloadMult : warmKg),
        warmUp: true,
        source: applyDeload ? "deload" : "last_session",
        progressionNote: index === 0 && applyDeload ? progressionNote : undefined,
        suggested: true,
      };
    }

    const lastAt = doneSets[Math.min(index, doneSets.length - 1)] ?? doneSets[doneSets.length - 1];
    let kg = lastAt.kg;
    let reps = lastAt.reps;

    if (applyDeload) {
      kg = roundToKgStep(kg * deloadMult);
    } else if (shouldProgressLoad) {
      kg = roundToKgStep(kg + incrementKg);
      reps = targetRepsMin;
    } else {
      reps = Math.min(targetRepsMax, reps + 1);
    }

    const source: SetSuggestionSource = applyDeload
      ? "deload"
      : shouldProgressLoad
        ? "progression"
        : reps > lastAt.reps
          ? "progression"
          : "last_session";

    const note =
      index === 0
        ? progressionNote ?? (reps > lastAt.reps && !shouldProgressLoad ? "Reps +1" : undefined)
        : undefined;

    return {
      reps,
      kg,
      source,
      progressionNote: note,
      suggested: true,
    };
  });
}

function mirrorLastSession(
  lastPerformance: LastPerformance,
  planSets: WorkoutSet[],
  _metric: ExerciseMetric,
): SetSuggestion[] {
  const doneSets = lastPerformance.sets.filter((s) => s.done);
  const meaningful = doneSets.filter(
    (s) => s.kg > 0 || s.reps > 0 || (s.durationSec ?? 0) > 0 || (s.distanceM ?? 0) > 0,
  );
  const source = meaningful.length ? doneSets : lastPerformance.sets;

  return planSets.map((_, index) => {
    const at = source[index] ?? source[source.length - 1];
    return {
      reps: at.reps,
      kg: at.kg,
      durationSec: at.durationSec,
      distanceM: at.distanceM,
      warmUp: index === 0 ? at.warmUp : undefined,
      source: "last_session" as const,
      suggested: true,
    };
  });
}

function computeTimeDistanceSuggestion(
  lastPerformance: LastPerformance,
  planSets: WorkoutSet[],
  format: BlockFormat,
): SetSuggestion[] {
  const last = lastPerformance.sets.find((s) => s.done) ?? lastPerformance.sets[0];
  if (!last) return planDefaultSuggestions(planSets);

  const note =
    format === "for_time" && last.durationSec
      ? `Schneller als ${formatDurationSec(last.durationSec)}`
      : undefined;

  return planSets.map((planSet, index) => {
    const base = index === 0 ? last : lastPerformance.sets[index] ?? last;
    const durationSec =
      format === "for_time"
        ? base.durationSec ?? planSet.durationSec
        : base.durationSec != null
          ? Math.round(base.durationSec * 1.03)
          : planSet.durationSec;
    const distanceM =
      base.distanceM != null ? Math.round(base.distanceM * 1.02) : planSet.distanceM;

    return {
      reps: base.reps,
      kg: base.kg,
      durationSec,
      distanceM,
      source: "last_session" as const,
      progressionNote: index === 0 ? note : undefined,
      suggested: true,
    };
  });
}

function computeBodyweightRepsSuggestion(
  lastPerformance: LastPerformance,
  planSets: WorkoutSet[],
): SetSuggestion[] {
  const working = doneWorkingSets(lastPerformance.sets);
  const lastReps = working[0]?.reps ?? 0;
  return planSets.map((planSet, index) => ({
    reps: Math.max(1, lastReps + (index === 0 ? 1 : 0)),
    kg: planSet.kg,
    source: "progression" as const,
    progressionNote: index === 0 ? "Reps +1" : undefined,
    suggested: true,
  }));
}

function computeAssistedSuggestion(
  lastPerformance: LastPerformance,
  planSets: WorkoutSet[],
  incrementKg: number,
): SetSuggestion[] {
  const working = doneWorkingSets(lastPerformance.sets);
  const last = working[0];
  if (!last) return planDefaultSuggestions(planSets);
  const lessHelp = roundToKgStep(Math.max(0, last.kg - incrementKg));
  return planSets.map((_planSet, index) => ({
    reps: last.reps,
    kg: index === 0 ? lessHelp : last.kg,
    source: lessHelp < last.kg ? "progression" : "last_session",
    progressionNote: index === 0 && lessHelp < last.kg ? formatKgDelta(-incrementKg) : undefined,
    suggested: true,
  }));
}

export function computeNextTarget(input: ComputeNextTargetInput): SetSuggestion[] {
  const {
    lastPerformance,
    planSets,
    format: rawFormat,
    metric,
    applyDeload = false,
  } = input;
  const format = normalizeBlockFormatForEngine(rawFormat);

  if (!isAutopilotEligible(format, metric)) {
    return planDefaultSuggestions(planSets);
  }

  if (!lastPerformance || !hasMeaningfulPerformance(lastPerformance.sets, metric)) {
    return planDefaultSuggestions(planSets);
  }

  const incrementKg =
    input.weightIncrementKg ??
    resolveWeightIncrement(input.muscleGroup, {
      weightIncrementUpperKg: undefined,
      weightIncrementLowerKg: undefined,
    });

  const { min: targetRepsMin, max: targetRepsMax } =
    input.targetRepsMin != null && input.targetRepsMax != null
      ? { min: input.targetRepsMin, max: input.targetRepsMax }
      : inferTargetRepRange(planSets);

  if (metric === "weight_reps" && (format === "straight_sets" || format === "superset" || format === "emom")) {
    return computeWeightRepsProgression(
      lastPerformance,
      planSets,
      format,
      incrementKg,
      targetRepsMin,
      targetRepsMax,
      applyDeload,
    );
  }

  if (metric === "assisted_bodyweight_reps" && format === "straight_sets") {
    return computeAssistedSuggestion(lastPerformance, planSets, incrementKg);
  }

  if (metric === "reps") {
    return computeBodyweightRepsSuggestion(lastPerformance, planSets);
  }

  if (metric === "time" || metric === "distance_time" || format === "for_time") {
    return computeTimeDistanceSuggestion(lastPerformance, planSets, format);
  }

  if (format === "circuit" || format === "amrap") {
    return mirrorLastSession(lastPerformance, planSets, metric);
  }

  return mirrorLastSession(lastPerformance, planSets, metric);
}

export function formatLastPerformanceHint(sets: WorkoutSet[], metric: ExerciseMetric): string | null {
  if (metric === "weight_reps" || metric === "assisted_bodyweight_reps") {
    const working = doneWorkingSets(sets);
    if (!working.length) return null;
    const reps = working[0].reps;
    const kg = working[0].kg;
    return `Letzte Session: ${working.length}×${kg > 0 ? `${kg} kg × ` : ""}${reps}`;
  }
  if (metric === "time" || metric === "distance_time") {
    const s = sets.find((x) => x.done && (x.durationSec ?? 0) > 0);
    if (!s?.durationSec) return null;
    return `Letzte Session: ${formatDurationSec(s.durationSec)}`;
  }
  if (metric === "reps") {
    const working = doneWorkingSets(sets);
    if (!working.length) return null;
    return `Letzte Session: ${working[0].reps} Wdh.`;
  }
  return null;
}

function maxWorkingKgReps(sets: WorkoutSet[]): { kg: number; reps: number } {
  const working = doneWorkingSets(sets);
  if (!working.length) return { kg: 0, reps: 0 };
  return working.reduce(
    (best, s) => (s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps) ? s : best),
    working[0],
  );
}

export function detectPlateau(history: LastPerformance[], window = 3): PlateauResult {
  if (history.length < window) return { plateaued: false };
  const slice = history.slice(0, window);
  const snapshots = slice.map((h) => workingSetSnapshot(h.sets));
  if (snapshots.some((s) => s.length === 0)) return { plateaued: false };

  const first = snapshots[0];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i];
    const improved = prev.some((set, idx) => {
      const base = first[idx] ?? first[first.length - 1];
      const cmp = set ?? prev[prev.length - 1];
      return cmp.kg > base.kg || (cmp.kg === base.kg && cmp.reps > base.reps);
    });
    if (improved) return { plateaued: false };
  }

  return {
    plateaued: true,
    reason: `${window}× kein Fortschritt`,
  };
}

export function suggestDeload(_lastPerformance: LastPerformance): DeloadSuggestion {
  return {
    kgMultiplier: 0.9,
    dropSets: 1,
    message: "Eine Woche −10 % Last, dann Progression neu aufbauen.",
  };
}

export function computeProgressTrend(history: LastPerformance[]): ProgressTrend | null {
  const withWeight = history.filter((h) => doneWorkingSets(h.sets).some((s) => s.kg > 0));
  if (withWeight.length < 2) return null;

  const newest = maxWorkingKgReps(withWeight[0].sets);
  const oldest = maxWorkingKgReps(withWeight[withWeight.length - 1].sets);
  const deltaKg = roundToKgStep(newest.kg - oldest.kg);
  if (deltaKg === 0) return null;

  const t0 = new Date(withWeight[withWeight.length - 1].performedAt).getTime();
  const t1 = new Date(withWeight[0].performedAt).getTime();
  const weeks = Math.max(1, Math.round((t1 - t0) / (7 * 24 * 3600 * 1000)));
  const sign = deltaKg > 0 ? "+" : "";
  return {
    deltaKg,
    weeks,
    label: `${sign}${deltaKg} kg in ${weeks} Woche${weeks === 1 ? "" : "n"}`,
  };
}

export function isWorkingSetPr(
  currentSets: WorkoutSet[],
  history: LastPerformance[],
  metric: ExerciseMetric,
): boolean {
  if (metric !== "weight_reps" && metric !== "assisted_bodyweight_reps") return false;
  const current = maxWorkingKgReps(currentSets.filter((s) => s.done));
  if (current.kg <= 0 && current.reps <= 0) return false;

  for (const h of history) {
    const past = maxWorkingKgReps(h.sets);
    if (past.kg > current.kg) return false;
    if (past.kg === current.kg && past.reps >= current.reps) return false;
  }
  return history.length > 0;
}

export function inferExerciseBlockFormat(exercise: {
  blockFormat?: BlockFormat;
  supersetId?: string;
  blockType?: string;
}): BlockFormat {
  if (exercise.blockFormat) return normalizeBlockFormatForEngine(exercise.blockFormat);
  if (exercise.supersetId) return "superset";
  if (exercise.blockType === "metcon") return "amrap";
  return "straight_sets";
}

export function suggestionsToWorkoutSets(suggestions: SetSuggestion[]): WorkoutSet[] {
  return suggestions.map((s) => ({
    reps: s.reps,
    kg: s.kg,
    done: false,
    durationSec: s.durationSec,
    distanceM: s.distanceM,
    warmUp: s.warmUp,
    suggested: s.source !== "plan_default",
  }));
}
