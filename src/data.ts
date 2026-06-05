import type { Workout, WorkoutSet } from "./lib/engine";
import type { ExerciseMetric } from "./lib/exerciseCatalog";

export interface LibraryWorkout {
  id: string;
  name: string;
  sub: string;
  tags: string[];
  dur: number;
  userId: string | null;
  exercises: {
    id: string;
    name: string;
    note?: string;
    supersetId?: string;
    catalogExerciseId?: string | null;
    metric: ExerciseMetric;
    sets: WorkoutSet[];
  }[];
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
  supersetId?: string;
  metric: ExerciseMetric;
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
  workoutId: string | null;
  exercises: SessionExercise[];
}

export interface PlanDayWorkoutSummary {
  id: string;
  name: string;
  tags: string[];
  dur: number;
  exerciseCount: number;
}

export interface PlanDay {
  id: string;
  position: number;
  isRestDay: boolean;
  note?: string;
  workout?: PlanDayWorkoutSummary;
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
}

/** Default global workout id (Push Day) for the home screen. */
export const DEFAULT_WORKOUT_ID = "b0000001-0000-4000-8000-000000000001";

// deep clone (resets done flags) so a tracking session is independent
export const startSession = (w: LibraryWorkout): Workout => normalizeWorkout({
  name: w.name,
  sub: w.sub,
  exercises: w.exercises.map((e) => ({
    ...e,
    supersetId: e.supersetId,
    catalogExerciseId: e.catalogExerciseId ?? undefined,
    metric: e.metric,
    sets: e.sets.map((s) => ({ ...s, done: false })),
  })),
});

export const CUSTOM_SESSION_NAME = "Individuelles Training";

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

/** Empty ad-hoc session — exercises added live during tracking. */
export const startCustomSession = (): Workout => ({
  name: CUSTOM_SESSION_NAME,
  sub: "",
  exercises: [],
});
