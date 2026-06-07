import type { LibraryExercise } from "../../data";
import { localDb } from "./localDb";

export async function getCachedExercises(userId: string): Promise<LibraryExercise[] | null> {
  const row = await localDb.exercises.get(userId);
  return row?.items ?? null;
}

export async function writeExercisesCache(userId: string, items: LibraryExercise[]): Promise<void> {
  await localDb.exercises.put({ userId, items, updatedAt: Date.now() });
}

export async function upsertCachedExercise(userId: string, exercise: LibraryExercise): Promise<void> {
  const existing = (await getCachedExercises(userId)) ?? [];
  const idx = existing.findIndex((e) => e.id === exercise.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = exercise;
  else next.push(exercise);
  next.sort((a, b) => a.name.localeCompare(b.name, "de"));
  await writeExercisesCache(userId, next);
}

export async function removeCachedExercise(userId: string, exerciseId: string): Promise<void> {
  const existing = await getCachedExercises(userId);
  if (!existing) return;
  await writeExercisesCache(
    userId,
    existing.filter((e) => e.id !== exerciseId),
  );
}
