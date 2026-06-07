import type { Json } from "./database.types";
import { TIMER_DEFAULTS, type TimerCfg, type TimerMode } from "./engine";
import { supabase } from "./supabase";

export type TrainingStructure = "full_body" | "split";
export type TrainingSplitDays = 2 | 3 | 4 | 5 | 6;

export interface AnamnesisData {
  painZones: string[];
  trainingLocation: "gym" | "home_equipment" | "bodyweight";
  homeEquipment?: string[];
  otherSports: { sport: string; frequency: number }[];
  kfa?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  htv?: number | null;
  minutesPerSession?: number | null;
  trainingStructure?: TrainingStructure | null;
  trainingSplitDays?: TrainingSplitDays | null;
  occupation?: "sedentary" | "standing" | "physical" | null;
  shiftWork?: boolean | null;
  sleepHours?: number | null;
  stressLevel?: number | null;
  dietPreference?: "omnivore" | "vegetarian" | "vegan" | "pescetarian" | null;
  dietAllergies?: string[];
  musclePriorities?: Record<string, number>;
}

export function normalizeTrainingStructure(raw: unknown): TrainingStructure | null {
  if (raw === "full_body" || raw === "split") return raw;
  return null;
}

export function normalizeTrainingSplitDays(raw: unknown): TrainingSplitDays | null {
  if (raw === 2 || raw === 3 || raw === 4 || raw === 5 || raw === 6) return raw;
  return null;
}

/** Maps legacy string stress levels and validates 1–10 scale. */
export function normalizeStressLevel(raw: unknown): number | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    const n = Math.round(raw);
    if (n >= 1 && n <= 10) return n;
    return null;
  }
  if (raw === "low") return 3;
  if (raw === "medium") return 5;
  if (raw === "high") return 8;
  return null;
}

export function normalizeSleepHours(raw: unknown): number {
  const v = typeof raw === "number" && !Number.isNaN(raw) ? raw : 7;
  const clamped = Math.min(12, Math.max(4, v));
  return Math.round(clamped * 2) / 2;
}

export const AI_CONSENT_VERSION = 1;

export interface AiConsent {
  grantedAt: string;
  provider: "anthropic";
  version: number;
}

export function normalizeAiConsent(raw: unknown): AiConsent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.provider !== "anthropic") return null;
  if (typeof obj.grantedAt !== "string" || !obj.grantedAt) return null;
  const version = typeof obj.version === "number" ? obj.version : 0;
  if (version < AI_CONSENT_VERSION) return null;
  return {
    grantedAt: obj.grantedAt,
    provider: "anthropic",
    version,
  };
}

export function hasAiConsent(prefs: Pick<UserPreferences, "aiConsent">): boolean {
  return normalizeAiConsent(prefs.aiConsent) !== null;
}

export function createAiConsentGrant(): AiConsent {
  return {
    grantedAt: new Date().toISOString(),
    provider: "anthropic",
    version: AI_CONSENT_VERSION,
  };
}

export interface UserPreferences {
  restSeconds: number;
  autoRest: boolean;
  timerSounds: boolean;
  defaultSets: number;
  defaultReps: number;
  weightIncrementUpperKg: number;
  weightIncrementLowerKg: number;
  timerDefaults: Record<TimerMode, TimerCfg>;
  gender: "male" | "female" | "other" | null;
  onboarded: boolean;
  fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | null;
  heightCm: number | null;
  weeklyDays: number | null;
  anamnesis: AnamnesisData | null;
  exerciseFeedback: Record<string, { rating: "like" | "dislike" | "pain"; note?: string }> | null;
  aiConsent: AiConsent | null;
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
  weightIncrementUpperKg: 2.5,
  weightIncrementLowerKg: 5,
  timerDefaults: cloneTimerDefaults(),
  gender: null,
  onboarded: false,
  fitnessGoal: null,
  experienceLevel: null,
  heightCm: null,
  weeklyDays: null,
  anamnesis: null,
  exerciseFeedback: null,
  aiConsent: null,
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
    weightIncrementUpperKg:
      typeof obj.weightIncrementUpperKg === "number"
        ? obj.weightIncrementUpperKg
        : DEFAULT_PREFERENCES.weightIncrementUpperKg,
    weightIncrementLowerKg:
      typeof obj.weightIncrementLowerKg === "number"
        ? obj.weightIncrementLowerKg
        : DEFAULT_PREFERENCES.weightIncrementLowerKg,
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
    anamnesis:
      obj.anamnesis && typeof obj.anamnesis === "object"
        ? (obj.anamnesis as AnamnesisData)
        : DEFAULT_PREFERENCES.anamnesis,
    exerciseFeedback:
      obj.exerciseFeedback && typeof obj.exerciseFeedback === "object"
        ? (obj.exerciseFeedback as Record<string, { rating: "like" | "dislike" | "pain"; note?: string }>)
        : DEFAULT_PREFERENCES.exerciseFeedback,
    aiConsent: normalizeAiConsent(obj.aiConsent),
  };
}

export function preferencesToJson(prefs: UserPreferences): Json {
  return {
    restSeconds: prefs.restSeconds,
    autoRest: prefs.autoRest,
    timerSounds: prefs.timerSounds,
    defaultSets: prefs.defaultSets,
    defaultReps: prefs.defaultReps,
    weightIncrementUpperKg: prefs.weightIncrementUpperKg,
    weightIncrementLowerKg: prefs.weightIncrementLowerKg,
    timerDefaults: JSON.parse(JSON.stringify(prefs.timerDefaults)),
    gender: prefs.gender,
    onboarded: prefs.onboarded,
    fitnessGoal: prefs.fitnessGoal,
    experienceLevel: prefs.experienceLevel,
    heightCm: prefs.heightCm,
    weeklyDays: prefs.weeklyDays,
    anamnesis: prefs.anamnesis ? (prefs.anamnesis as unknown as Json) : null,
    exerciseFeedback: prefs.exerciseFeedback ? (prefs.exerciseFeedback as unknown as Json) : null,
    aiConsent: prefs.aiConsent ? (prefs.aiConsent as unknown as Json) : null,
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
