import type { LibraryExercise } from "../data";

export interface WorkoutExerciseLookup {
  name: string;
  catalogExerciseId?: string | null;
}

/** Katalog-Übung zur Session-Übung (ID, dann Name: eigen → global). */
export function resolveLibraryExercise(
  exercise: WorkoutExerciseLookup,
  library: LibraryExercise[],
): LibraryExercise | null {
  if (exercise.catalogExerciseId) {
    const byId = library.find((e) => e.id === exercise.catalogExerciseId);
    if (byId) return byId;
  }

  const owned = library.find((e) => e.name === exercise.name && e.userId !== null);
  if (owned) return owned;

  return library.find((e) => e.name === exercise.name && e.userId === null) ?? null;
}
