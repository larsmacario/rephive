import type { Workout, WorkoutSet } from "./lib/engine";
import type { ExerciseMetric } from "./lib/exerciseCatalog";
import type { BlockFormat, TrainingBlockType } from "./lib/planBlocks";
import type { PerceivedEffort } from "./lib/progressionEngine";

export interface PlanDayExercise {
  id: string;
  name: string;
  note?: string;
  blockId?: string;
  blockType: TrainingBlockType;
  blockFormat?: BlockFormat;
  supersetId?: string;
  catalogExerciseId?: string | null;
  metric: ExerciseMetric;
  sets: WorkoutSet[];
}

export interface PlanDayBlock {
  id: string;
  blockType: TrainingBlockType;
  format: BlockFormat;
  position: number;
  rounds?: number;
  timeCapSeconds?: number;
  intervalSeconds?: number;
  workSeconds?: number;
  restSeconds?: number;
  restBetweenRoundsSeconds?: number;
  prepSeconds?: number;
  note?: string;
}

export interface LibraryExercise {
  id: string;
  name: string;
  nameEn?: string | null;
  category: "strength" | "cardio" | "mobility";
  group: string;
  equip: string;
  userId: string | null;
  metric: ExerciseMetric;
  youtubeUrl?: string | null;
  descriptionDe?: string | null;
  descriptionEn?: string | null;
  primaryMusclesDe?: string[];
  primaryMusclesRaw?: string[];
  secondaryMusclesDe?: string[];
  secondaryMusclesRaw?: string[];
  executionStepsDe?: string[];
  executionStepsEn?: string[];
}

export interface SessionExercise {
  id: string;
  name: string;
  note?: string;
  blockId?: string;
  blockType?: TrainingBlockType;
  blockFormat?: BlockFormat;
  supersetId?: string;
  catalogExerciseId?: string;
  metric: ExerciseMetric;
  perceivedEffort?: PerceivedEffort;
  sets: WorkoutSet[];
}

export interface HistoryEntry {
  id: string;
  day: string;
  date: string;
  performedAt: string;
  name: string;
  tags: string[];
  dur: number;
  vol: number;
  sets: number;
  pr: boolean;
  planDayId: string | null;
  skippedBlocks: TrainingBlockType[];
  exercises: SessionExercise[];
}

export interface PlanDay {
  id: string;
  position: number;
  name: string;
  note?: string;
  enabledBlocks: TrainingBlockType[];
  blocks?: PlanDayBlock[];
  exercises: PlanDayExercise[];
}

export function defaultPlanDayName(dayNumber: number): string {
  return `Tag ${dayNumber}`;
}

export function isDefaultPlanDayName(name: string | undefined | null, dayNumber: number): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === defaultPlanDayName(dayNumber).toLowerCase();
}

export function planDayDisplayName(
  day: Pick<PlanDay, "name" | "position">,
  weekdayLabels?: string[],
): string {
  const trimmed = day.name.trim();
  const base = trimmed || defaultPlanDayName(day.position + 1);
  const wd = weekdayLabels?.[day.position];
  return wd ? `${wd} · ${base}` : base;
}

export interface PlanSummaryNutrition {
  bmr: number;
  tdee: number;
  targetKcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface PlanSummaryInputs {
  gender: "male" | "female" | "other" | null;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
  activityLevel: number;
  minutesPerSession?: number | null;
  occupation?: "sedentary" | "standing" | "physical" | null;
  sleepHours?: number | null;
  stressLevel?: number | null;
  dietPreference?: "omnivore" | "vegetarian" | "vegan" | "pescetarian" | null;
  /** ISO-Wochentage 0=Mo … 6=So — für Anzeige-Präfix pro Plan-Tag */
  trainingWeekdays?: number[];
}

export interface PlanSummaryAdvice {
  trainingFocus: string;
  nutritionTips: string;
  recoveryTips: string;
  hydrationTips: string;
  planDuration: {
    weeksMin: number;
    weeksMax: number;
    note: string;
  };
}

export interface PlanSummary {
  nutrition: PlanSummaryNutrition;
  inputs: PlanSummaryInputs;
  advice: PlanSummaryAdvice;
  createdAt: string;
}

export interface LibraryPlan {
  id: string;
  name: string;
  sub: string;
  isActive: boolean;
  currentDay: number;
  days: PlanDay[];
  summary: PlanSummary | null;
  /** Aus summary.inputs extrahiert; auch bei manuellen Plänen ohne vollständige KI-Summary */
  trainingWeekdays?: number[];
}

export interface PlanDayForTracking {
  id: string;
  name: string;
  planId: string;
  enabledBlocks: TrainingBlockType[];
  blocks: PlanDayBlock[];
  exercises: PlanDayExercise[];
}

/** Deep clone (resets done flags) for live tracking from a plan day. */
export const startPlanDaySession = (
  day: PlanDayForTracking,
  skippedBlocks: TrainingBlockType[] = [],
): Workout =>
  normalizeWorkout({
    name: day.name,
    sub: "",
    enabledBlocks: day.enabledBlocks,
    skippedBlocks,
    blocks: day.blocks,
    exercises: day.exercises.map((e) => ({
      ...e,
      blockId: e.blockId,
      blockType: e.blockType,
      blockFormat: e.blockFormat,
      supersetId: e.supersetId,
      catalogExerciseId: e.catalogExerciseId ?? undefined,
      metric: e.metric,
      sets: e.sets.map((s) => ({ ...s, done: false })),
    })),
  });

export const CUSTOM_SESSION_NAME = "Individuelles Training";
export const EXPRESS_TRACKING_SESSION_NAME = "ExpressTracking";

/** Ensures every exercise has metric (e.g. drafts from older app versions). */
export function normalizeWorkout(session: Workout): Workout {
  return {
    ...session,
    exercises: session.exercises.map((e) => ({
      ...e,
      catalogExerciseId: e.catalogExerciseId,
      metric: e.metric ?? "weight_reps",
    })),
  };
}

/** @deprecated Use ExpressTracking setup wizard. */
export const startCustomSession = (): Workout => ({
  name: CUSTOM_SESSION_NAME,
  sub: "",
  exercises: [],
});
