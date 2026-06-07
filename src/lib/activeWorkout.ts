import type { Workout } from "./engine";
import type { TrainingBlockType } from "./planBlocks";
import { setVolumeKg } from "./exerciseCatalog";

export interface ActiveWorkoutDraft {
  session: Workout;
  startedAt: number;
  planDayId?: string;
  tags: string[];
  planId?: string;
  turboTracking?: boolean;
  enabledBlocks?: TrainingBlockType[];
  skippedBlocks?: TrainingBlockType[];
  pausedAt: number;
}

export interface ActiveWorkoutSnapshot {
  session: Workout;
  startedAt: number;
  planDayId?: string;
  tags: string[];
  planId?: string;
  turboTracking?: boolean;
  enabledBlocks?: TrainingBlockType[];
  skippedBlocks?: TrainingBlockType[];
}

const STORAGE_PREFIX = "hejcoach:activeWorkout:";

function storageKey(userId: string): string {
  return STORAGE_PREFIX + userId;
}

export function getActiveDurationSec(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function loadActiveWorkout(userId: string): ActiveWorkoutDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkoutDraft;
    if (!parsed.session || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveWorkout(userId: string, draft: ActiveWorkoutDraft): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(draft));
}

export function clearActiveWorkout(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}

export function snapshotToDraft(snapshot: ActiveWorkoutSnapshot): ActiveWorkoutDraft {
  return { ...snapshot, pausedAt: Date.now() };
}

export function getDraftMetrics(draft: ActiveWorkoutDraft) {
  const totalSets = draft.session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = draft.session.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).length,
    0,
  );
  const volumeKg = draft.session.exercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? "weight_reps"), 0),
    0,
  );
  return { totalSets, doneSets, volumeKg };
}
