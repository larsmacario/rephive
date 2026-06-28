import { useMemo } from "react";
import type { LibraryPlan } from "../data";
import type { BodyMeasurement } from "./db";
import { useActivePlan, useBodyMeasurements } from "./db";
import { buildNutrition, calcWaterMl } from "./nutrition";
import { clampWaterTargetMl } from "./hydration";
import type { UserPreferences } from "./preferences";
import { usePreferences } from "./preferences";
import { useAuth } from "./auth";

export interface RecoveryTargetResult {
  proteinTargetG: number;
  source: "plan" | "profile" | "fallback";
  needsWeightHint: boolean;
}

export type WaterTargetSource = "preference" | "plan" | "profile" | "fallback";

export interface WaterTargetResult {
  waterTargetMl: number;
  waterSource: WaterTargetSource;
  waterNeedsWeightHint: boolean;
}

export interface RecoveryTargetsResult extends RecoveryTargetResult, WaterTargetResult {}

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

export function resolveWaterTargetMl(params: {
  activePlan: LibraryPlan | null | undefined;
  preferences: UserPreferences;
  latestMeasurement: BodyMeasurement | null | undefined;
}): WaterTargetResult {
  const preferredTarget = params.preferences.waterTargetMl;
  if (typeof preferredTarget === "number") {
    return {
      waterTargetMl: clampWaterTargetMl(preferredTarget),
      waterSource: "preference",
      waterNeedsWeightHint: false,
    };
  }

  const planWater = params.activePlan?.summary?.nutrition?.water_ml;
  if (typeof planWater === "number" && planWater > 0) {
    return {
      waterTargetMl: clampWaterTargetMl(planWater),
      waterSource: "plan",
      waterNeedsWeightHint: false,
    };
  }

  const weightKg = params.latestMeasurement?.weightKg;
  if (weightKg && weightKg > 0) {
    return {
      waterTargetMl: clampWaterTargetMl(
        calcWaterMl({
          weightKg,
          weeklyDays: params.preferences.weeklyDays ?? 3,
          minutesPerSession: params.preferences.anamnesis?.minutesPerSession ?? 60,
          experienceLevel: params.preferences.experienceLevel,
          occupation: params.preferences.anamnesis?.occupation ?? null,
        }),
      ),
      waterSource: "profile",
      waterNeedsWeightHint: false,
    };
  }

  return {
    waterTargetMl: 2500,
    waterSource: "fallback",
    waterNeedsWeightHint: true,
  };
}

export function resolveRecoveryTargets(params: {
  activePlan: LibraryPlan | null | undefined;
  preferences: UserPreferences;
  latestMeasurement: BodyMeasurement | null | undefined;
  birthDate?: string | null;
}): RecoveryTargetsResult {
  return {
    ...resolveProteinTargetG(params),
    ...resolveWaterTargetMl(params),
  };
}

export function useRecoveryTargets(): RecoveryTargetsResult & { loading: boolean } {
  const { profile } = useAuth();
  const { data: activePlan, loading: planLoading } = useActivePlan();
  const { data: measurements, loading: measurementsLoading } = useBodyMeasurements();
  const { preferences } = usePreferences();

  const latestMeasurement = measurements?.[0] ?? null;

  const result = useMemo(
    () =>
      resolveRecoveryTargets({
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

/** Rückwärtskompatibler Alias für bestehende Protein-Verbraucher. */
export const useRecoveryTarget = useRecoveryTargets;
