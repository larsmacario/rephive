const UPPER_BODY_GROUPS = [
  "Brust",
  "Latissimus",
  "Oberer Rücken",
  "Unterer Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Unterarme",
  "Bauch / Core",
] as const;

const LOWER_BODY_GROUPS = ["Quadrizeps", "Hamstrings", "Gesäß", "Waden"] as const;

export const MUSCLE_GROUP_SECTIONS = [
  { id: "upper" as const, label: "Oberkörper", groups: UPPER_BODY_GROUPS },
  { id: "lower" as const, label: "Unterkörper", groups: LOWER_BODY_GROUPS },
];

export const MUSCLE_GROUPS = [...UPPER_BODY_GROUPS, ...LOWER_BODY_GROUPS] as const;

export const DEFAULT_MUSCLE_GROUP: MuscleGroup = "Brust";

export const LEGACY_MUSCLE_GROUP_MAP: Partial<Record<string, MuscleGroup>> = {
  Rücken: "Latissimus",
  Beine: "Quadrizeps",
  Arme: "Bizeps",
};

export function normalizeMuscleGroup(value: string): string {
  return LEGACY_MUSCLE_GROUP_MAP[value] ?? value;
}

export function isLegacyMuscleGroup(value: string): boolean {
  return value in LEGACY_MUSCLE_GROUP_MAP;
}

export const EQUIPMENT_OPTIONS = [
  "Langhantel",
  "Kurzhantel",
  "Kettlebell",
  "Kabel",
  "Maschine",
  "Körpergewicht",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type EquipmentOption = (typeof EQUIPMENT_OPTIONS)[number];

export type ExerciseMetric =
  | "weight_reps"
  | "weight_time"
  | "weight_reps_time"
  | "assisted_bodyweight_reps"
  | "reps"
  | "reps_time"
  | "distance_time"
  | "time";

export const DEFAULT_EXERCISE_METRIC: ExerciseMetric = "weight_reps";

export const EXERCISE_METRICS: { id: ExerciseMetric; label: string }[] = [
  { id: "weight_reps", label: "Gewicht und Wiederholungen" },
  { id: "weight_time", label: "Gewicht und Zeit" },
  { id: "weight_reps_time", label: "Gewicht, Wiederholungen und Zeit" },
  { id: "assisted_bodyweight_reps", label: "Unterstütztes Körpergewicht und Wiederholungen" },
  { id: "reps", label: "Wiederholungen" },
  { id: "reps_time", label: "Wiederholungen und Zeit" },
  { id: "distance_time", label: "Entfernung und Zeit" },
  { id: "time", label: "Zeit" },
];

const METRIC_IDS = new Set(EXERCISE_METRICS.map((m) => m.id));

export interface MetricSpec {
  showKg: boolean;
  kgLabel: string;
  showReps: boolean;
  showTime: boolean;
  showDistance: boolean;
}

const METRIC_SPECS: Record<ExerciseMetric, MetricSpec> = {
  weight_reps: { showKg: true, kgLabel: "KG", showReps: true, showTime: false, showDistance: false },
  weight_time: { showKg: true, kgLabel: "KG", showReps: false, showTime: true, showDistance: false },
  weight_reps_time: { showKg: true, kgLabel: "KG", showReps: true, showTime: true, showDistance: false },
  assisted_bodyweight_reps: {
    showKg: true,
    kgLabel: "HILFE",
    showReps: true,
    showTime: false,
    showDistance: false,
  },
  reps: { showKg: false, kgLabel: "KG", showReps: true, showTime: false, showDistance: false },
  reps_time: { showKg: false, kgLabel: "KG", showReps: true, showTime: true, showDistance: false },
  distance_time: { showKg: false, kgLabel: "KG", showReps: false, showTime: true, showDistance: true },
  time: { showKg: false, kgLabel: "KG", showReps: false, showTime: true, showDistance: false },
};

export const DEFAULT_TIME_SEC = 45;
export const DEFAULT_DISTANCE_M = 100;
export const TIME_STEP_SEC = 5;
export const DISTANCE_STEP_M = 10;

export interface SetLike {
  reps: number;
  kg: number;
  durationSec?: number;
  distanceM?: number;
}

export function getMetricSpec(metric: ExerciseMetric): MetricSpec {
  return METRIC_SPECS[metric];
}

export function parseExerciseMetric(raw: string | null | undefined): ExerciseMetric {
  if (!raw) return DEFAULT_EXERCISE_METRIC;
  if (METRIC_IDS.has(raw as ExerciseMetric)) return raw as ExerciseMetric;
  return DEFAULT_EXERCISE_METRIC;
}

export function formatDurationSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${m}m`;
}

export function formatDistanceM(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km`;
  return `${m} m`;
}

export function getSetDurationSec(set: SetLike, metric: ExerciseMetric): number {
  if (set.durationSec != null) return set.durationSec;
  const spec = getMetricSpec(metric);
  if (spec.showTime && !spec.showReps && !spec.showDistance) return set.reps;
  return DEFAULT_TIME_SEC;
}

export function getSetDistanceM(set: SetLike, metric: ExerciseMetric): number {
  if (set.distanceM != null) return set.distanceM;
  const spec = getMetricSpec(metric);
  if (spec.showDistance && !spec.showReps) return set.reps;
  return DEFAULT_DISTANCE_M;
}

export function countsTowardVolume(metric: ExerciseMetric): boolean {
  return (
    metric === "weight_reps" ||
    metric === "weight_reps_time" ||
    metric === "assisted_bodyweight_reps"
  );
}

export function setVolumeKg(set: SetLike, metric: ExerciseMetric): number {
  if (!countsTowardVolume(metric)) return 0;
  return set.reps * set.kg;
}

export function metricLabel(metric: ExerciseMetric): string {
  return EXERCISE_METRICS.find((m) => m.id === metric)?.label ?? metric;
}

export function metricShort(metric: ExerciseMetric): string {
  switch (metric) {
    case "weight_reps":
      return "Gew.+Wdh.";
    case "weight_time":
      return "Gew.+Zeit";
    case "weight_reps_time":
      return "Gew.+Wdh.+Zeit";
    case "assisted_bodyweight_reps":
      return "Assist+Wdh.";
    case "reps":
      return "Wdh.";
    case "reps_time":
      return "Wdh.+Zeit";
    case "distance_time":
      return "Distanz+Zeit";
    case "time":
      return "Zeit";
    default:
      return metric;
  }
}

export function formatSetLine(set: SetLike, metric: ExerciseMetric): string {
  const spec = getMetricSpec(metric);
  const parts: string[] = [];
  if (spec.showKg && set.kg > 0) {
    parts.push(`${set.kg} kg${spec.kgLabel === "HILFE" ? " Hilfe" : ""}`);
  }
  if (spec.showReps) parts.push(`${set.reps} Wdh.`);
  if (spec.showDistance) parts.push(formatDistanceM(getSetDistanceM(set, metric)));
  if (spec.showTime) parts.push(formatDurationSec(getSetDurationSec(set, metric)));
  return parts.join(" · ") || "—";
}
