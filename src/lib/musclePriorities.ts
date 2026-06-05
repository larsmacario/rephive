import { MUSCLE_GROUPS, type MuscleGroup } from "./exerciseCatalog";

export const MUSCLE_PRIORITY_MIN = 1;
export const MUSCLE_PRIORITY_MAX = 5;
export const MUSCLE_PRIORITY_DEFAULT = 3;

export type MusclePriorities = Record<MuscleGroup, number>;

const PRIORITY_LABELS: Record<number, string> = {
  1: "Nicht wichtig",
  2: "Wenig wichtig",
  3: "Wichtig",
  4: "Sehr wichtig",
  5: "Top-Priorität",
};

export function musclePriorityLabel(value: number): string {
  const clamped = clampMusclePriority(value);
  return PRIORITY_LABELS[clamped] ?? PRIORITY_LABELS[MUSCLE_PRIORITY_DEFAULT];
}

export function clampMusclePriority(value: number): number {
  const rounded = Math.round(value);
  return Math.min(MUSCLE_PRIORITY_MAX, Math.max(MUSCLE_PRIORITY_MIN, rounded));
}

export function defaultMusclePriorities(): MusclePriorities {
  return Object.fromEntries(
    MUSCLE_GROUPS.map((group) => [group, MUSCLE_PRIORITY_DEFAULT])
  ) as MusclePriorities;
}

export function normalizeMusclePriorities(raw: unknown): MusclePriorities {
  const defaults = defaultMusclePriorities();
  if (!raw || typeof raw !== "object") return defaults;

  const result = { ...defaults };
  for (const group of MUSCLE_GROUPS) {
    const value = (raw as Record<string, unknown>)[group];
    if (typeof value === "number" && !Number.isNaN(value)) {
      result[group] = clampMusclePriority(value);
    }
  }
  return result;
}

export function formatMusclePrioritiesForPrompt(priorities: MusclePriorities): string {
  return MUSCLE_GROUPS.map((group) => `${group}: ${priorities[group]}/5`).join(", ");
}
