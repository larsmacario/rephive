import type { ExerciseMetric, SetLike } from "./exerciseCatalog";
import {
  DEFAULT_DISTANCE_M,
  DEFAULT_TIME_SEC,
  DISTANCE_STEP_M,
  TIME_STEP_SEC,
  formatDistanceM,
  formatDurationSec,
  getMetricSpec,
  getSetDistanceM,
  getSetDurationSec,
  countsTowardVolume,
} from "./exerciseCatalog";

export type SetMode = "uniform" | "individual";
export type TemplateSet = SetLike;
export type TrackedSet = SetLike & { done: boolean };
export type SetField = "reps" | "kg" | "durationSec" | "distanceM";

export const KG_STEP = 1.25;

export function clampKg(kg: number): number {
  return Math.max(0, +Math.max(0, kg).toFixed(2));
}

export function parseKgInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return clampKg(n);
}

export function formatKgDisplay(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : String(+kg.toFixed(2));
}

export function isUniform(sets: TemplateSet[]): boolean {
  if (sets.length <= 1) return true;
  const first = sets[0];
  return sets.every(
    (s) =>
      s.reps === first.reps &&
      s.kg === first.kg &&
      (s.durationSec ?? 0) === (first.durationSec ?? 0) &&
      (s.distanceM ?? 0) === (first.distanceM ?? 0),
  );
}

export function detectSetMode(sets: TemplateSet[]): SetMode {
  return isUniform(sets) ? "uniform" : "individual";
}

export function createEmptySet(metric: ExerciseMetric): TemplateSet {
  const spec = getMetricSpec(metric);
  return {
    reps: spec.showReps ? 10 : 0,
    kg: spec.showKg ? 0 : 0,
    ...(spec.showTime ? { durationSec: DEFAULT_TIME_SEC } : {}),
    ...(spec.showDistance ? { distanceM: DEFAULT_DISTANCE_M } : {}),
  };
}

export function defaultSetValue(metric: ExerciseMetric, repsDefault: number): number {
  const spec = getMetricSpec(metric);
  if (spec.showReps) return repsDefault;
  if (spec.showTime) return DEFAULT_TIME_SEC;
  if (spec.showDistance) return DEFAULT_DISTANCE_M;
  return repsDefault;
}

export function applySetField(
  set: TemplateSet,
  field: SetField,
  value: number,
  metric: ExerciseMetric,
): TemplateSet {
  const spec = getMetricSpec(metric);
  if (field === "kg") return { ...set, kg: clampKg(value) };
  if (field === "reps") return { ...set, reps: Math.max(1, Math.round(value)) };
  if (field === "durationSec") {
    return { ...set, durationSec: Math.max(TIME_STEP_SEC, Math.round(value)) };
  }
  if (field === "distanceM") {
    return { ...set, distanceM: Math.max(DISTANCE_STEP_M, Math.round(value)) };
  }
  if (spec.showTime && !spec.showReps && !spec.showDistance) {
    return { ...set, reps: Math.max(TIME_STEP_SEC, Math.round(value)) };
  }
  return set;
}

export function bumpSetField(
  set: TemplateSet,
  field: SetField,
  delta: number,
  metric: ExerciseMetric,
): TemplateSet {
  const spec = getMetricSpec(metric);
  if (field === "kg") return { ...set, kg: clampKg(set.kg + delta * KG_STEP) };
  if (field === "reps") return { ...set, reps: Math.max(1, set.reps + delta) };
  if (field === "durationSec") {
    const cur = getSetDurationSec(set, metric);
    return { ...set, durationSec: Math.max(TIME_STEP_SEC, cur + delta * TIME_STEP_SEC) };
  }
  if (field === "distanceM") {
    const cur = getSetDistanceM(set, metric);
    return { ...set, distanceM: Math.max(DISTANCE_STEP_M, cur + delta * DISTANCE_STEP_M) };
  }
  if (spec.showTime && !spec.showReps && !spec.showDistance) {
    return { ...set, reps: Math.max(TIME_STEP_SEC, set.reps + delta * TIME_STEP_SEC) };
  }
  return set;
}

export function buildUniformTemplateSets(
  count: number,
  reps: number,
  kg: number,
  metric: ExerciseMetric = "weight_reps",
  durationSec = DEFAULT_TIME_SEC,
  distanceM = DEFAULT_DISTANCE_M,
): TemplateSet[] {
  const template = createEmptySet(metric);
  template.reps = getMetricSpec(metric).showReps ? reps : 0;
  template.kg = getMetricSpec(metric).showKg ? kg : 0;
  if (getMetricSpec(metric).showTime) template.durationSec = durationSec;
  if (getMetricSpec(metric).showDistance) template.distanceM = distanceM;
  if (metric === "time") template.reps = durationSec;
  return Array.from({ length: Math.max(1, count) }, () => ({ ...template }));
}

export function buildUniformTrackedSets(
  count: number,
  reps: number,
  kg: number,
  done = false,
  metric: ExerciseMetric = "weight_reps",
): TrackedSet[] {
  return buildUniformTemplateSets(count, reps, kg, metric).map((s) => ({ ...s, done }));
}

export function switchToUniform<T extends TemplateSet>(sets: T[]): T[] {
  if (sets.length === 0) return sets;
  const first = sets[0];
  return sets.map((s) => ({
    ...s,
    reps: first.reps,
    kg: first.kg,
    durationSec: first.durationSec,
    distanceM: first.distanceM,
  }));
}

export function switchToIndividual<T extends TemplateSet>(sets: T[]): T[] {
  return [...sets];
}

export function bumpUniformField<T extends TemplateSet>(
  sets: T[],
  field: "count" | SetField,
  delta: number,
  metric: ExerciseMetric = "weight_reps",
): T[] {
  const count = sets.length || 1;

  if (field === "count") {
    const newCount = Math.max(1, count + delta);
    if (newCount > count) {
      const template = sets[0] ?? createEmptySet(metric);
      return [
        ...sets,
        ...Array.from({ length: newCount - count }, () => ({ ...template })),
      ] as T[];
    }
    return sets.slice(0, newCount) as T[];
  }

  return sets.map((s) => bumpSetField(s, field, delta, metric)) as T[];
}

export function setUniformField<T extends TemplateSet>(
  sets: T[],
  field: SetField,
  value: number,
  metric: ExerciseMetric = "weight_reps",
): T[] {
  return sets.map((s) => applySetField(s, field, value, metric)) as T[];
}

export function editIndividualSet<T extends TemplateSet>(
  sets: T[],
  index: number,
  field: SetField,
  delta: number,
  metric: ExerciseMetric = "weight_reps",
): T[] {
  return sets.map((s, i) =>
    i !== index ? s : (bumpSetField(s, field, delta, metric) as T),
  );
}

export function setIndividualSetValue<T extends TemplateSet>(
  sets: T[],
  index: number,
  field: SetField,
  value: number,
  metric: ExerciseMetric = "weight_reps",
): T[] {
  return sets.map((s, i) =>
    i !== index ? s : (applySetField(s, field, value, metric) as T),
  );
}

export function addIndividualSet<T extends TemplateSet>(sets: T[]): T[] {
  const last = sets[sets.length - 1];
  const base = last ?? ({ reps: 10, kg: 0 } as T);
  if ("done" in base) {
    return [...sets, { ...base, done: false } as T];
  }
  return [...sets, { ...base }];
}

export function removeIndividualSet<T extends TemplateSet>(sets: T[], index: number): T[] {
  if (sets.length <= 1) return sets;
  return sets.filter((_, i) => i !== index);
}

export function formatSetSummary(sets: TemplateSet[], metric: ExerciseMetric = "weight_reps"): string {
  if (sets.length === 0) return "0 Sätze";
  const count = sets.length;
  if (isUniform(sets)) {
    return `${count}×${formatSetLine(sets[0], metric)}`;
  }
  return `${count} Sätze (individuell)`;
}

function formatSetLine(set: TemplateSet, metric: ExerciseMetric): string {
  const spec = getMetricSpec(metric);
  const parts: string[] = [];
  if (spec.showKg && set.kg > 0) {
    parts.push(`${formatKgDisplay(set.kg)} kg`);
  }
  if (spec.showReps) parts.push(String(set.reps));
  if (spec.showDistance) parts.push(formatDistanceM(getSetDistanceM(set, metric)));
  if (spec.showTime) parts.push(formatDurationSec(getSetDurationSec(set, metric)));
  if (parts.length === 0) return "—";
  if (spec.showKg && set.kg > 0 && spec.showReps) {
    return `${parts[1]} @ ${parts[0]}${parts[2] ? ` · ${parts.slice(2).join(" · ")}` : ""}`;
  }
  return parts.join(" · ");
}

export function setsFromStored(
  stored: { reps: number; kg?: number; durationSec?: number; distanceM?: number; done?: boolean }[],
  defaults: { sets: number; reps: number; kg?: number },
  metric: ExerciseMetric = "weight_reps",
): { setMode: SetMode; setRows: TemplateSet[] } {
  const rows: TemplateSet[] = stored.map((s) => ({
    reps: s.reps,
    kg: s.kg ?? 0,
    durationSec: s.durationSec,
    distanceM: s.distanceM,
  }));
  if (rows.length === 0) {
    return {
      setMode: "uniform",
      setRows: buildUniformTemplateSets(defaults.sets, defaults.reps, defaults.kg ?? 0, metric),
    };
  }
  return { setMode: detectSetMode(rows), setRows: rows };
}

export function trackedSetsFromStored(
  stored: {
    reps: number;
    kg?: number;
    durationSec?: number;
    distanceM?: number;
    done?: boolean;
  }[],
  defaults: { sets: number; reps: number; kg?: number },
  metric: ExerciseMetric = "weight_reps",
): { setMode: SetMode; setRows: TrackedSet[] } {
  const rows: TrackedSet[] = stored.map((s) => ({
    reps: s.reps,
    kg: s.kg ?? 0,
    durationSec: s.durationSec,
    distanceM: s.distanceM,
    done: Boolean(s.done),
  }));
  if (rows.length === 0) {
    return {
      setMode: "uniform",
      setRows: buildUniformTrackedSets(defaults.sets, defaults.reps, defaults.kg ?? 0, false, metric),
    };
  }
  return { setMode: detectSetMode(rows), setRows: rows };
}

export function countTemplateSets(items: { setRows: TemplateSet[] }[]): number {
  return items.reduce((a, x) => a + x.setRows.length, 0);
}

export { countsTowardVolume };
