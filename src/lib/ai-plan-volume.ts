/**
 * KI-Plan: Übungsanzahl pro Workout (Kraftübungen, ohne Cardio-Warm-up).
 * Logik spiegelt supabase/functions/generate-training-plan/index.ts —
 * bei Änderungen dort Edge Function deployen.
 */

export type AiPlanExperienceLevel = "beginner" | "intermediate" | "advanced" | null;
export type AiPlanFitnessGoal = "muscle_building" | "fat_loss" | "fitness" | "strength" | null;

export interface AiPlanVolumeAnamnesis {
  sleepHours?: number | null;
  stressLevel?: number | string | null;
}

function ageModifier(ageYears?: number | null): number {
  if (ageYears == null) return 0;
  if (ageYears >= 70) return -2;
  if (ageYears >= 50) return -1;
  return 0;
}

function isHighStress(level: unknown): boolean {
  if (typeof level === "number") return level >= 8;
  return level === "high";
}

function baseMaxForMinutes(minutes?: number | null): number {
  const m = minutes ?? 60;
  if (m <= 35) return 4;
  if (m <= 50) return 5;
  if (m <= 75) return 6;
  return 7;
}

function experienceModifier(experienceLevel?: AiPlanExperienceLevel): number {
  switch (experienceLevel) {
    case "beginner":
      return -1;
    case "advanced":
      return 2;
    default:
      return 0;
  }
}

function goalModifier(fitnessGoal?: AiPlanFitnessGoal): number {
  switch (fitnessGoal) {
    case "strength":
      return -1;
    case "muscle_building":
      return 1;
    default:
      return 0;
  }
}

function isConservativeVolume(anamnesis?: AiPlanVolumeAnamnesis | null): boolean {
  return isHighStress(anamnesis?.stressLevel) || (anamnesis?.sleepHours != null && anamnesis.sleepHours < 7);
}

export function exerciseCountBounds(params: {
  minutes?: number | null;
  experienceLevel?: AiPlanExperienceLevel;
  fitnessGoal?: AiPlanFitnessGoal;
  anamnesis?: AiPlanVolumeAnamnesis | null;
  ageYears?: number | null;
}): { min: number; max: number } {
  let max =
    baseMaxForMinutes(params.minutes) +
    experienceModifier(params.experienceLevel) +
    goalModifier(params.fitnessGoal) +
    ageModifier(params.ageYears);

  if (isConservativeVolume(params.anamnesis)) {
    max -= 1;
  }

  max = Math.min(8, Math.max(2, max));
  const min = Math.max(2, max - 1);
  return { min, max };
}

export function getExerciseCountHint(
  minutes: number,
  experienceLevel: AiPlanExperienceLevel,
  fitnessGoal: AiPlanFitnessGoal,
  anamnesis?: AiPlanVolumeAnamnesis | null,
  ageYears?: number | null,
): string {
  const { min, max } = exerciseCountBounds({
    minutes,
    experienceLevel,
    fitnessGoal,
    anamnesis,
    ageYears,
  });
  return `ca. ${min}–${max} Kraftübungen pro strength-Block (Warm-up/Skill/MetCon separat)`;
}
