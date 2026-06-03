/**
 * Nutrition estimates for KI plan summaries (Mifflin-St-Jeor + activity factor).
 * Pure functions — deterministic, no API calls.
 */

import type { PlanSummaryNutrition } from "../data";

const DEFAULT_AGE = 30;

export function ageFromBirthDate(birthDate: string | null | undefined): number {
  if (!birthDate?.trim()) return DEFAULT_AGE;
  const parsed = new Date(birthDate.trim());
  if (Number.isNaN(parsed.getTime())) return DEFAULT_AGE;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return Math.max(14, Math.min(99, age));
}

export function calcBmr(params: {
  gender: "male" | "female" | "other" | null;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { gender, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") return Math.round(base + 5);
  if (gender === "female") return Math.round(base - 161);
  return Math.round(base - 78);
}

export function activityFactor(params: {
  weeklyDays: number;
  minutesPerSession?: number | null;
  occupation?: "sedentary" | "standing" | "physical" | null;
  otherSports?: { sport: string; frequency: number }[];
}): number {
  const { weeklyDays, minutesPerSession, occupation, otherSports } = params;
  let factor = 1.2;
  if (weeklyDays >= 5) factor = 1.725;
  else if (weeklyDays >= 4) factor = 1.55;
  else if (weeklyDays >= 3) factor = 1.375;
  else if (weeklyDays >= 2) factor = 1.25;

  const mins = minutesPerSession ?? 60;
  if (mins >= 75) factor += 0.05;
  else if (mins <= 35) factor -= 0.03;

  if (occupation === "standing") factor += 0.05;
  else if (occupation === "physical") factor += 0.1;

  const extraSportDays = (otherSports ?? []).reduce((sum, s) => sum + (s.frequency ?? 0), 0);
  if (extraSportDays >= 4) factor += 0.1;
  else if (extraSportDays >= 2) factor += 0.05;

  return Math.round(Math.min(1.9, Math.max(1.2, factor)) * 100) / 100;
}

export function targetKcal(params: {
  tdee: number;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
}): number {
  const { tdee, fitnessGoal } = params;
  switch (fitnessGoal) {
    case "fat_loss":
      return Math.round(tdee * 0.8);
    case "muscle_building":
      return Math.round(tdee * 1.1);
    case "strength":
      return Math.round(tdee * 1.05);
    case "fitness":
    default:
      return Math.round(tdee);
  }
}

export function calcMacros(params: {
  targetKcal: number;
  weightKg: number;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
}): { protein_g: number; carbs_g: number; fat_g: number } {
  const { targetKcal, weightKg, fitnessGoal } = params;
  let proteinPerKg = 1.8;
  switch (fitnessGoal) {
    case "fat_loss":
      proteinPerKg = 2.0;
      break;
    case "muscle_building":
      proteinPerKg = 2.2;
      break;
    case "strength":
      proteinPerKg = 2.0;
      break;
    case "fitness":
    default:
      proteinPerKg = 1.6;
      break;
  }
  const protein_g = Math.round(weightKg * proteinPerKg);
  const fat_g = Math.round(weightKg * 0.8);
  const carbsKcal = Math.max(0, targetKcal - protein_g * 4 - fat_g * 9);
  const carbs_g = Math.round(carbsKcal / 4);
  return { protein_g, carbs_g, fat_g };
}

/** ml pro Trainingsminute — Anfänger schwitzen/verlieren typisch weniger Flüssigkeit. */
function mlPerTrainingMinute(experienceLevel?: "beginner" | "intermediate" | "advanced" | null): number {
  if (experienceLevel === "advanced") return 12;
  if (experienceLevel === "intermediate") return 10;
  return 8;
}

function maxDailyWaterMl(experienceLevel?: "beginner" | "intermediate" | "advanced" | null): number {
  if (experienceLevel === "advanced") return 5000;
  if (experienceLevel === "intermediate") return 4500;
  return 4000;
}

/**
 * Tages-Trinkmenge (ml): Grundbedarf + anteiliges Training über die Woche.
 * Früher wurde das volle Wochen-Training jeden Tag addiert → unrealistisch hohe Liter (z. B. 5,6 l).
 */
export function calcWaterMl(params: {
  weightKg: number;
  weeklyDays: number;
  minutesPerSession?: number | null;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | null;
  occupation?: "sedentary" | "standing" | "physical" | null;
}): number {
  const { weightKg, weeklyDays, minutesPerSession, experienceLevel, occupation } = params;

  const base = weightKg * 33;
  const sessionMins = Math.min(120, Math.max(20, minutesPerSession ?? 60));
  const sessionsPerWeek = Math.min(7, Math.max(0, weeklyDays));
  const weeklyTrainingMl = sessionsPerWeek * sessionMins * mlPerTrainingMinute(experienceLevel);
  const dailyTrainingAvg = Math.round(weeklyTrainingMl / 7);

  let occupationBonus = 0;
  if (occupation === "standing") occupationBonus = 150;
  else if (occupation === "physical") occupationBonus = 300;

  const raw = Math.round(base + dailyTrainingAvg + occupationBonus);
  const minMl = Math.round(Math.max(2000, weightKg * 30));
  const maxMl = maxDailyWaterMl(experienceLevel);

  return Math.min(maxMl, Math.max(minMl, raw));
}

export interface BuildNutritionInput {
  gender: "male" | "female" | "other" | null;
  birthDate?: string | null;
  heightCm: number;
  weightKg: number;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | null;
  weeklyDays: number;
  minutesPerSession?: number | null;
  occupation?: "sedentary" | "standing" | "physical" | null;
  otherSports?: { sport: string; frequency: number }[];
}

export function buildNutrition(input: BuildNutritionInput): PlanSummaryNutrition {
  const age = ageFromBirthDate(input.birthDate);
  const bmr = calcBmr({
    gender: input.gender,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
  });
  const actFactor = activityFactor({
    weeklyDays: input.weeklyDays,
    minutesPerSession: input.minutesPerSession,
    occupation: input.occupation,
    otherSports: input.otherSports,
  });
  const tdee = Math.round(bmr * actFactor);
  const kcalTarget = targetKcal({ tdee, fitnessGoal: input.fitnessGoal });
  const macros = calcMacros({
    targetKcal: kcalTarget,
    weightKg: input.weightKg,
    fitnessGoal: input.fitnessGoal,
  });
  const water_ml = calcWaterMl({
    weightKg: input.weightKg,
    weeklyDays: input.weeklyDays,
    minutesPerSession: input.minutesPerSession,
    experienceLevel: input.experienceLevel,
    occupation: input.occupation,
  });
  return {
    bmr,
    tdee,
    targetKcal: kcalTarget,
    ...macros,
    water_ml,
  };
}
