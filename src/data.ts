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
    metric: ExerciseMetric;
    sets: WorkoutSet[];
  }[];
}

export interface LibraryExercise {
  id: string;
  name: string;
  group: string;
  equip: string;
  userId: string | null;
  metric: ExerciseMetric;
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

export interface LibraryPlan {
  id: string;
  name: string;
  sub: string;
  isActive: boolean;
  currentDay: number;
  days: PlanDay[];
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
