import type { Json } from "./database.types";
import { TIMER_DEFAULTS, type TimerCfg, type TimerMode } from "./engine";
import { supabase } from "./supabase";

export interface UserPreferences {
  restSeconds: number;
  autoRest: boolean;
  timerSounds: boolean;
  defaultSets: number;
  defaultReps: number;
  timerDefaults: Record<TimerMode, TimerCfg>;
  gender: "male" | "female" | "other" | null;
  onboarded: boolean;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | null;
  heightCm: number | null;
  weeklyDays: number | null;
}

export type UserPreferencesUpdate = Omit<Partial<UserPreferences>, "timerDefaults"> & {
  timerDefaults?: Partial<Record<TimerMode, TimerCfg>>;
};

function cloneTimerDefaults(): Record<TimerMode, TimerCfg> {
  return JSON.parse(JSON.stringify(TIMER_DEFAULTS));
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  restSeconds: 90,
  autoRest: true,
  timerSounds: true,
  defaultSets: 3,
  defaultReps: 10,
  timerDefaults: cloneTimerDefaults(),
  gender: null,
  onboarded: false,
  fitnessGoal: null,
  experienceLevel: null,
  heightCm: null,
  weeklyDays: null,
};

function mergeTimerDefaults(raw: unknown): Record<TimerMode, TimerCfg> {
  const base = cloneTimerDefaults();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const obj = raw as Record<string, Partial<TimerCfg>>;
  for (const mode of Object.keys(TIMER_DEFAULTS) as TimerMode[]) {
    if (obj[mode] && typeof obj[mode] === "object") {
      base[mode] = { ...base[mode], ...obj[mode] };
    }
  }
  return base;
}

export function mergePreferences(raw: Json | null | undefined): UserPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...DEFAULT_PREFERENCES,
      timerDefaults: cloneTimerDefaults(),
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    restSeconds:
      typeof obj.restSeconds === "number" ? obj.restSeconds : DEFAULT_PREFERENCES.restSeconds,
    autoRest: typeof obj.autoRest === "boolean" ? obj.autoRest : DEFAULT_PREFERENCES.autoRest,
    timerSounds:
      typeof obj.timerSounds === "boolean" ? obj.timerSounds : DEFAULT_PREFERENCES.timerSounds,
    defaultSets:
      typeof obj.defaultSets === "number" ? obj.defaultSets : DEFAULT_PREFERENCES.defaultSets,
    defaultReps:
      typeof obj.defaultReps === "number" ? obj.defaultReps : DEFAULT_PREFERENCES.defaultReps,
    timerDefaults: mergeTimerDefaults(obj.timerDefaults),
    gender:
      obj.gender === "male" || obj.gender === "female" || obj.gender === "other"
        ? obj.gender
        : obj.gender === null
        ? null
        : DEFAULT_PREFERENCES.gender,
    onboarded: typeof obj.onboarded === "boolean" ? obj.onboarded : DEFAULT_PREFERENCES.onboarded,
    fitnessGoal:
      obj.fitnessGoal === "muscle_building" ||
      obj.fitnessGoal === "fat_loss" ||
      obj.fitnessGoal === "fitness" ||
      obj.fitnessGoal === "strength"
        ? obj.fitnessGoal
        : DEFAULT_PREFERENCES.fitnessGoal,
    experienceLevel:
      obj.experienceLevel === "beginner" ||
      obj.experienceLevel === "intermediate" ||
      obj.experienceLevel === "advanced"
        ? obj.experienceLevel
        : DEFAULT_PREFERENCES.experienceLevel,
    heightCm: typeof obj.heightCm === "number" ? obj.heightCm : DEFAULT_PREFERENCES.heightCm,
    weeklyDays: typeof obj.weeklyDays === "number" ? obj.weeklyDays : DEFAULT_PREFERENCES.weeklyDays,
  };
}

export function preferencesToJson(prefs: UserPreferences): Json {
  return {
    restSeconds: prefs.restSeconds,
    autoRest: prefs.autoRest,
    timerSounds: prefs.timerSounds,
    defaultSets: prefs.defaultSets,
    defaultReps: prefs.defaultReps,
    timerDefaults: JSON.parse(JSON.stringify(prefs.timerDefaults)),
    gender: prefs.gender,
    onboarded: prefs.onboarded,
    fitnessGoal: prefs.fitnessGoal,
    experienceLevel: prefs.experienceLevel,
    heightCm: prefs.heightCm,
    weeklyDays: prefs.weeklyDays,
  };
}

export function mergePartialPreferences(
  current: UserPreferences,
  partial: UserPreferencesUpdate,
): UserPreferences {
  const { timerDefaults: timerPartial, ...rest } = partial;
  const next: UserPreferences = { ...current, ...rest };
  if (timerPartial) {
    const merged = { ...current.timerDefaults };
    for (const mode of Object.keys(timerPartial) as TimerMode[]) {
      merged[mode] = { ...current.timerDefaults[mode], ...timerPartial[mode] };
    }
    next.timerDefaults = merged;
  }
  return next;
}

export async function saveUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: preferencesToJson(prefs) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export { PreferencesProvider, usePreferences } from "./preferences.tsx";
