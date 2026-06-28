import { useMemo } from "react";
import type { LibraryPlan } from "../data";
import type { BodyMeasurement } from "./db";
import { useActivePlan, useBodyMeasurements } from "./db";
import { buildNutrition } from "./nutrition";
import type { UserPreferences } from "./preferences";
import { usePreferences } from "./preferences";
import { useAuth } from "./auth";

export interface RecoveryTargetResult {
  proteinTargetG: number;
  source: "plan" | "profile" | "fallback";
  needsWeightHint: boolean;
}

export function resolveProteinTargetG(params: {
  activePlan: LibraryPlan | null | undefined;
  preferences: UserPreferences;
  latestMeasurement: BodyMeasurement | null | undefined;
  birthDate?: string | null;
}): RecoveryTargetResult {
  const planProtein = params.activePlan?.summary?.nutrition?.protein_g;
  if (typeof planProtein === "number" && planProtein > 0) {
    return { proteinTargetG: planProtein, source: "plan", needsWeightHint: false };
  }

  const weightKg = params.latestMeasurement?.weightKg;
  const heightCm = params.preferences.heightCm;
  const fitnessGoal = params.preferences.fitnessGoal;

  if (weightKg && weightKg > 0 && heightCm && heightCm > 0 && fitnessGoal) {
    const nutrition = buildNutrition({
      gender: params.preferences.gender,
      birthDate: params.birthDate ?? null,
      heightCm,
      weightKg,
      fitnessGoal,
      experienceLevel: params.preferences.experienceLevel,
      weeklyDays: params.preferences.weeklyDays ?? 3,
      minutesPerSession: params.preferences.anamnesis?.minutesPerSession ?? 60,
      occupation: params.preferences.anamnesis?.occupation ?? null,
      otherSports: params.preferences.anamnesis?.otherSports ?? [],
    });
    return { proteinTargetG: nutrition.protein_g, source: "profile", needsWeightHint: false };
  }

  if (weightKg && weightKg > 0) {
    return {
      proteinTargetG: Math.round(weightKg * 1.6),
      source: "fallback",
      needsWeightHint: false,
    };
  }

  return { proteinTargetG: 100, source: "fallback", needsWeightHint: true };
}

export function useRecoveryTarget(): RecoveryTargetResult & { loading: boolean } {
  const { profile } = useAuth();
  const { data: activePlan, loading: planLoading } = useActivePlan();
  const { data: measurements, loading: measurementsLoading } = useBodyMeasurements();
  const { preferences } = usePreferences();

  const latestMeasurement = measurements?.[0] ?? null;

  const result = useMemo(
    () =>
      resolveProteinTargetG({
        activePlan,
        preferences,
        latestMeasurement,
        birthDate: profile?.birth_date ?? null,
      }),
    [activePlan, preferences, latestMeasurement, profile?.birth_date],
  );

  return {
    ...result,
    loading: planLoading || measurementsLoading,
  };
}
