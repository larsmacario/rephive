import { useCallback, useEffect, useState } from "react";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Tables, Json } from "./database.types";
import { type WorkoutSet } from "./engine";
import type {
  LibraryExercise,
  HistoryEntry,
  LibraryPlan,
  PlanDay,
  PlanDayExercise,
  PlanDayForTracking,
  PlanSummary,
  PlanSummaryAdvice,
  PlanSummaryNutrition,
  SessionExercise,
} from "../data";
import { planDayDisplayName } from "../data";
import type { AnamnesisData } from "./preferences";
import { hasAiConsent, mergePreferences, normalizeStressLevel } from "./preferences";
import { activityFactor, ageFromBirthDate } from "./nutrition";

/** Entfernt KI-typische Präfixe wie „Tag 1 – …“ aus Workout-Namen. */
export function sanitizeAiWorkoutName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return trimmed;
  const cleaned = trimmed
    .replace(/^Tag\s+(?:\d+|[A-Z])\s*[–—\-:.]\s*/iu, "")
    .replace(/^Workout\s+\d+\s*[–—\-:.]\s*/iu, "")
    .trim();
  return cleaned || trimmed;
}
import { parseExerciseMetric } from "./exerciseCatalog";
import type { ExerciseMetric } from "./exerciseCatalog";
import {
  assignBlockPositions,
  isTrainingBlockType,
  normalizeEnabledBlocks,
  sortPlanDayExerciseRows,
  type TrainingBlockType,
} from "./planBlocks";
import { useAuth } from "./auth";

type DbSession = Tables<"sessions">;
type DbPlan = Tables<"plans">;
type DbSessionExercise = Tables<"session_exercises">;
type DbBodyMeasurement = Tables<"body_measurements">;
type DbPlanDay = Tables<"plan_days">;
type DbPlanDayExercise = Tables<"plan_day_exercises">;

interface StoredSet {
  reps: number;
  kg: number;
  done?: boolean;
  durationSec?: number;
  distanceM?: number;
  warmUp?: boolean;
}

interface SetTemplate {
  reps: number;
  kg: number;
  durationSec?: number;
  distanceM?: number;
  warmUp?: boolean;
}

function parseWarmUpFlag(raw: unknown, index: number): boolean | undefined {
  if (index !== 0) return undefined;
  if (typeof raw !== "object" || raw === null || !("warmUp" in raw)) return undefined;
  return Boolean((raw as { warmUp?: unknown }).warmUp) || undefined;
}

function parseSets(raw: unknown): SetTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is SetTemplate => typeof s === "object" && s !== null && "reps" in s && "kg" in s)
    .map((s, index) => ({
      reps: Number(s.reps),
      kg: Number(s.kg),
      ...(s.durationSec != null ? { durationSec: Number(s.durationSec) } : {}),
      ...(s.distanceM != null ? { distanceM: Number(s.distanceM) } : {}),
      ...(parseWarmUpFlag(s, index) ? { warmUp: true } : {}),
    }));
}

function parseSessionSets(raw: unknown): WorkoutSet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is StoredSet => typeof s === "object" && s !== null && "reps" in s && "kg" in s)
    .map((s, index) => ({
      reps: Math.max(0, Number(s.reps) || 0),
      kg: Math.max(0, Number(s.kg) || 0),
      done: Boolean(s.done),
      ...(s.durationSec != null ? { durationSec: Math.max(0, Number(s.durationSec) || 0) } : {}),
      ...(s.distanceM != null ? { distanceM: Math.max(0, Number(s.distanceM) || 0) } : {}),
      ...(parseWarmUpFlag(s, index) ? { warmUp: true } : {}),
    }));
}

function mapSessionExerciseRow(e: DbSessionExercise): SessionExercise {
  return {
    id: e.id,
    name: e.name,
    note: e.note ?? undefined,
    blockType: e.block_type && isTrainingBlockType(e.block_type) ? e.block_type : undefined,
    supersetId: e.superset_id ?? undefined,
    metric: parseExerciseMetric(e.metric_type),
    sets: parseSessionSets(e.sets),
  };
}

export interface SessionExerciseInput {
  name: string;
  note?: string;
  blockType?: TrainingBlockType;
  supersetId?: string;
  metric?: ExerciseMetric;
  sets: WorkoutSet[];
}

function mapPlanDayExerciseRow(e: DbPlanDayExercise): PlanDayExercise {
  return {
    id: e.id,
    name: e.name,
    note: e.note ?? undefined,
    blockType: isTrainingBlockType(e.block_type) ? e.block_type : "strength",
    supersetId: e.superset_id ?? undefined,
    catalogExerciseId: e.catalog_exercise_id ?? undefined,
    metric: parseExerciseMetric(e.metric_type),
    sets: parseSets(e.sets).map((s) => ({ ...s, done: false } satisfies WorkoutSet)),
  };
}

function mapSessionRow(s: DbSession, exercises: SessionExercise[] = []): HistoryEntry {
  const { day, date } = formatSessionDate(s.performed_at);
  return {
    id: s.id,
    day,
    date,
    performedAt: s.performed_at,
    name: s.name,
    tags: s.tags,
    dur: s.duration_min,
    vol: Number(s.volume_kg) / 1000,
    sets: s.set_count,
    pr: s.is_pr,
    planDayId: s.plan_day_id,
    skippedBlocks: (s.skipped_blocks ?? []).filter(isTrainingBlockType),
    exercises,
  };
}
function formatSessionDate(iso: string): { day: string; date: string } {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

  let day: string;
  if (diffDays === 0) day = "Heute";
  else if (diffDays === 1) day = "Gestern";
  else {
    day = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  }

  const date = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return { day, date };
}

async function fetchPlanDayExercises(planDayIds: string[]): Promise<Map<string, DbPlanDayExercise[]>> {
  if (planDayIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("plan_day_exercises")
    .select("*")
    .in("plan_day_id", planDayIds)
    .order("position");
  if (error) throw error;
  const map = new Map<string, DbPlanDayExercise[]>();
  for (const row of data ?? []) {
    const list = map.get(row.plan_day_id) ?? [];
    list.push(row);
    map.set(row.plan_day_id, list);
  }
  return map;
}

export async function fetchPlanDayForTracking(planDayId: string): Promise<PlanDayForTracking | null> {
  const { data: day, error: dayError } = await supabase
    .from("plan_days")
    .select("id, name, position, plan_id, enabled_blocks")
    .eq("id", planDayId)
    .maybeSingle();
  if (dayError) throw dayError;
  if (!day) return null;
  const exMap = await fetchPlanDayExercises([planDayId]);
  const rows = exMap.get(planDayId) ?? [];
  return {
    id: day.id,
    name: planDayDisplayName({ name: day.name ?? "", position: day.position }),
    planId: day.plan_id,
    enabledBlocks: normalizeEnabledBlocks(day.enabled_blocks),
    exercises: sortPlanDayExerciseRows(rows).map(mapPlanDayExerciseRow),
  };
}

export async function fetchSessionExercises(sessionIds: string[]): Promise<Map<string, DbSessionExercise[]>> {
  if (sessionIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("session_exercises")
    .select("*")
    .in("session_id", sessionIds)
    .order("position");
  if (error) throw error;
  const map = new Map<string, DbSessionExercise[]>();
  for (const row of data ?? []) {
    const list = map.get(row.session_id) ?? [];
    list.push(row);
    map.set(row.session_id, list);
  }
  return map;
}

export async function fetchSessionExercisesBatch(
  sessionIds: string[],
): Promise<Map<string, SessionExercise[]>> {
  const exMap = await fetchSessionExercises(sessionIds);
  const out = new Map<string, SessionExercise[]>();
  for (const [sessionId, rows] of exMap) {
    out.set(
      sessionId,
      rows.sort((a, b) => a.position - b.position).map(mapSessionExerciseRow),
    );
  }
  return out;
}

async function loadSessionExercises(sessionId: string): Promise<SessionExercise[]> {
  const exMap = await fetchSessionExercises([sessionId]);
  const rows = exMap.get(sessionId) ?? [];
  return rows.sort((a, b) => a.position - b.position).map(mapSessionExerciseRow);
}

async function replaceSessionExercises(sessionId: string, exercises: SessionExerciseInput[]): Promise<void> {
  const { error: deleteError } = await supabase.from("session_exercises").delete().eq("session_id", sessionId);
  if (deleteError) throw deleteError;
  if (exercises.length === 0) return;
  const rows = exercises.map((e, i) => ({
    session_id: sessionId,
    position: i,
    name: e.name,
    note: e.note ?? null,
    block_type: e.blockType ?? null,
    superset_id: e.supersetId ?? null,
    metric_type: e.metric ?? "weight_reps",
    sets: e.sets as unknown as Json,
  }));
  const { error } = await supabase.from("session_exercises").insert(rows);
  if (error) throw error;
}


function mapExerciseRow(e: Tables<"exercises">): LibraryExercise {
  return {
    id: e.id,
    name: e.name,
    nameEn: e.name_en ?? null,
    category: e.category === "cardio" || e.category === "mobility" ? e.category : "strength",
    group: e.muscle_group,
    equip: e.equipment,
    userId: e.user_id,
    metric: parseExerciseMetric(e.metric_type),
    youtubeUrl: e.youtube_url ?? null,
    descriptionDe: e.description_de ?? null,
    descriptionEn: e.description_en ?? null,
    primaryMusclesDe: Array.isArray(e.primary_muscles_de) ? e.primary_muscles_de.filter((m): m is string => typeof m === "string") : [],
    primaryMusclesRaw: Array.isArray(e.primary_muscles_raw) ? e.primary_muscles_raw.filter((m): m is string => typeof m === "string") : [],
    secondaryMusclesDe: Array.isArray(e.secondary_muscles_de)
      ? e.secondary_muscles_de.filter((m): m is string => typeof m === "string")
      : [],
    secondaryMusclesRaw: Array.isArray(e.secondary_muscles_raw)
      ? e.secondary_muscles_raw.filter((m): m is string => typeof m === "string")
      : [],
    executionStepsDe: Array.isArray(e.execution_steps_de)
      ? e.execution_steps_de.filter((step): step is string => typeof step === "string")
      : [],
    executionStepsEn: Array.isArray(e.execution_steps_en)
      ? e.execution_steps_en.filter((step): step is string => typeof step === "string")
      : [],
  };
}

export async function fetchExercises(): Promise<LibraryExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .neq("category", "mobility")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapExerciseRow);
}

export interface ExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
  metric: ExerciseMetric;
  youtubeUrl?: string | null;
  descriptionDe?: string | null;
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<string> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      category: "strength",
      muscle_group: input.muscleGroup,
      equipment: input.equipment,
      metric_type: input.metric,
      youtube_url: input.youtubeUrl ?? null,
      description_de: input.descriptionDe?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateExercise(exerciseId: string, input: ExerciseInput): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .update({
      name: input.name.trim(),
      muscle_group: input.muscleGroup,
      equipment: input.equipment,
      metric_type: input.metric,
      youtube_url: input.youtubeUrl ?? null,
      description_de: input.descriptionDe?.trim() || null,
    })
    .eq("id", exerciseId);
  if (error) throw error;
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) throw error;
}

export async function fetchSessions(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase.from("sessions").select("*").order("performed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => mapSessionRow(s));
}

export async function fetchSession(id: string): Promise<HistoryEntry | null> {
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const exercises = await loadSessionExercises(data.id);
  return mapSessionRow(data, exercises);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export interface UpdateSessionInput {
  name: string;
  tags: string[];
  durationMin: number;
  volumeKg: number;
  setCount: number;
  isPr?: boolean;
  performedAt?: string;
  exercises?: SessionExerciseInput[];
}

export async function updateSession(sessionId: string, input: UpdateSessionInput): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      name: input.name,
      tags: input.tags,
      duration_min: input.durationMin,
      volume_kg: input.volumeKg,
      set_count: input.setCount,
      is_pr: input.isPr ?? false,
      ...(input.performedAt ? { performed_at: input.performedAt } : {}),
    })
    .eq("id", sessionId);
  if (error) throw error;
  if (input.exercises) {
    await replaceSessionExercises(sessionId, input.exercises);
  }
}

export async function fetchWeeklyVolume(): Promise<{ d: string; v: number }[]> {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);

  const { data, error } = await supabase
    .from("sessions")
    .select("performed_at, volume_kg")
    .gte("performed_at", monday.toISOString());
  if (error) throw error;

  const labels = ["M", "D", "M", "D", "F", "S", "S"];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const row of data ?? []) {
    const d = new Date(row.performed_at);
    let idx = d.getDay() - 1;
    if (idx < 0) idx = 6;
    totals[idx] += Number(row.volume_kg) / 1000;
  }
  return labels.map((label, i) => ({ d: label, v: Math.round(totals[i] * 10) / 10 }));
}

export interface HomeStats {
  streakWeeks: number;
  sessionsThisWeek: number;
  volumeThisWeekT: number;
}

export async function fetchHomeStats(): Promise<HomeStats> {
  const { data, error } = await supabase.from("sessions").select("performed_at, volume_kg").order("performed_at");
  if (error) throw error;
  const sessions = data ?? [];

  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() + mondayOffset);

  let sessionsThisWeek = 0;
  let volumeThisWeek = 0;
  const weekKeys = new Set<string>();

  for (const s of sessions) {
    const d = new Date(s.performed_at);
    if (d >= weekStart) {
      sessionsThisWeek++;
      volumeThisWeek += Number(s.volume_kg);
    }
    const wk = getWeekKey(d);
    weekKeys.add(wk);
  }

  let streakWeeks = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 52; i++) {
    const key = getWeekKey(cursor);
    if (weekKeys.has(key)) {
      streakWeeks++;
      cursor.setDate(cursor.getDate() - 7);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }

  return {
    streakWeeks,
    sessionsThisWeek,
    volumeThisWeekT: Math.round(volumeThisWeek / 100) / 10,
  };
}

function getWeekKey(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dayNum = copy.getDay() || 7;
  copy.setDate(copy.getDate() + 4 - dayNum);
  const yearStart = new Date(copy.getFullYear(), 0, 1);
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getFullYear()}-W${week}`;
}

export interface SaveSessionInput {
  planDayId?: string;
  name: string;
  tags: string[];
  durationMin: number;
  volumeKg: number;
  setCount: number;
  isPr?: boolean;
  skippedBlocks?: TrainingBlockType[];
  exercises?: SessionExerciseInput[];
}

export async function saveSession(userId: string, input: SaveSessionInput): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      plan_day_id: input.planDayId ?? null,
      name: input.name,
      tags: input.tags,
      duration_min: input.durationMin,
      volume_kg: input.volumeKg,
      set_count: input.setCount,
      is_pr: input.isPr ?? false,
      skipped_blocks: input.skippedBlocks ?? [],
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.exercises?.length) {
    await replaceSessionExercises(data.id, input.exercises);
  }
}

async function insertPlanDayExercises(planDayId: string, exercises: PlanDayExerciseInput[]): Promise<void> {
  if (exercises.length === 0) return;
  const positioned = assignBlockPositions(
    exercises.map((e) => ({ ...e, blockType: e.blockType ?? "strength" })),
  );
  const rows = positioned.map((e) => ({
    plan_day_id: planDayId,
    block_type: e.blockType,
    position: e.position,
    name: e.name,
    note: e.note ?? null,
    superset_id: e.supersetId ?? null,
    catalog_exercise_id: e.catalogExerciseId ?? null,
    metric_type: e.metric,
    sets: e.sets as unknown as Json,
  }));
  const { error } = await supabase.from("plan_day_exercises").insert(rows);
  if (error) throw error;
}

async function fetchPlanDays(planIds: string[]): Promise<Map<string, DbPlanDay[]>> {
  if (planIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("plan_days")
    .select("*")
    .in("plan_id", planIds)
    .order("position");
  if (error) throw error;
  const map = new Map<string, DbPlanDay[]>();
  for (const row of data ?? []) {
    const list = map.get(row.plan_id) ?? [];
    list.push(row);
    map.set(row.plan_id, list);
  }
  return map;
}

function defaultPlanDurationAdvice(
  experienceLevel?: "beginner" | "intermediate" | "advanced" | null
): PlanSummaryAdvice["planDuration"] {
  switch (experienceLevel) {
    case "beginner":
      return {
        weeksMin: 10,
        weeksMax: 14,
        note: "Als Anfänger brauchst du Zeit für Technik und Gewöhnung. Wechsle den Plan nach 10–14 Wochen oder bei deutlichem Plateau.",
      };
    case "advanced":
      return {
        weeksMin: 4,
        weeksMax: 8,
        note: "Als erfahrener Athlet lohnt sich ein Planwechsel oder Deload alle 4–8 Wochen, um Progression zu halten.",
      };
    case "intermediate":
    default:
      return {
        weeksMin: 8,
        weeksMax: 12,
        note: "Nutze diesen Plan etwa 8–12 Wochen. Danach Deload, Ziel-Check oder einen angepassten Plan.",
      };
  }
}

function normalizePlanAdvice(
  raw: unknown,
  experienceLevel?: "beginner" | "intermediate" | "advanced" | null
): PlanSummaryAdvice {
  const fallbackDuration = defaultPlanDurationAdvice(experienceLevel);
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const durationRaw =
    obj.planDuration && typeof obj.planDuration === "object" && !Array.isArray(obj.planDuration)
      ? (obj.planDuration as Record<string, unknown>)
      : null;
  const weeksMin =
    typeof durationRaw?.weeksMin === "number" && durationRaw.weeksMin > 0
      ? Math.round(durationRaw.weeksMin)
      : fallbackDuration.weeksMin;
  const weeksMax =
    typeof durationRaw?.weeksMax === "number" && durationRaw.weeksMax >= weeksMin
      ? Math.round(durationRaw.weeksMax)
      : fallbackDuration.weeksMax;

  return {
    trainingFocus: typeof obj.trainingFocus === "string" ? obj.trainingFocus : "Fokus auf saubere Technik und progressive Steigerung.",
    nutritionTips: typeof obj.nutritionTips === "string" ? obj.nutritionTips : "Ernähre dich proteinreich und ausgewogen zu deinem Ziel.",
    recoveryTips: typeof obj.recoveryTips === "string" ? obj.recoveryTips : "Achte auf ausreichend Schlaf und Ruhetage im Plan.",
    hydrationTips: typeof obj.hydrationTips === "string" ? obj.hydrationTips : "Trinke über den Tag verteilt ausreichend Wasser, besonders rund ums Training.",
    planDuration: {
      weeksMin,
      weeksMax,
      note: typeof durationRaw?.note === "string" ? durationRaw.note : fallbackDuration.note,
    },
  };
}

function parsePlanSummary(raw: Json | null | undefined): PlanSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const nutrition = obj.nutrition;
  const inputs = obj.inputs;
  const advice = obj.advice;
  if (!nutrition || typeof nutrition !== "object" || Array.isArray(nutrition)) return null;
  const n = nutrition as Record<string, unknown>;
  if (
    typeof n.bmr !== "number" ||
    typeof n.tdee !== "number" ||
    typeof n.targetKcal !== "number" ||
    typeof n.protein_g !== "number" ||
    typeof n.carbs_g !== "number" ||
    typeof n.fat_g !== "number" ||
    typeof n.water_ml !== "number"
  ) {
    return null;
  }
  const nutritionParsed: PlanSummaryNutrition = {
    bmr: n.bmr,
    tdee: n.tdee,
    targetKcal: n.targetKcal,
    protein_g: n.protein_g,
    carbs_g: n.carbs_g,
    fat_g: n.fat_g,
    water_ml: n.water_ml,
  };
  const inputsObj = inputs && typeof inputs === "object" && !Array.isArray(inputs) ? (inputs as Record<string, unknown>) : {};
  const expLevel =
    inputsObj.experienceLevel === "beginner" ||
    inputsObj.experienceLevel === "intermediate" ||
    inputsObj.experienceLevel === "advanced"
      ? inputsObj.experienceLevel
      : undefined;
  return {
    nutrition: nutritionParsed,
    inputs: {
      gender:
        inputsObj.gender === "male" || inputsObj.gender === "female" || inputsObj.gender === "other"
          ? inputsObj.gender
          : null,
      age: typeof inputsObj.age === "number" ? inputsObj.age : 30,
      heightCm: typeof inputsObj.heightCm === "number" ? inputsObj.heightCm : null,
      weightKg: typeof inputsObj.weightKg === "number" ? inputsObj.weightKg : null,
      fitnessGoal:
        inputsObj.fitnessGoal === "muscle_building" ||
        inputsObj.fitnessGoal === "fat_loss" ||
        inputsObj.fitnessGoal === "fitness" ||
        inputsObj.fitnessGoal === "strength"
          ? inputsObj.fitnessGoal
          : null,
      activityLevel: typeof inputsObj.activityLevel === "number" ? inputsObj.activityLevel : 1.375,
      minutesPerSession: typeof inputsObj.minutesPerSession === "number" ? inputsObj.minutesPerSession : null,
      occupation:
        inputsObj.occupation === "sedentary" ||
        inputsObj.occupation === "standing" ||
        inputsObj.occupation === "physical"
          ? inputsObj.occupation
          : null,
      sleepHours: typeof inputsObj.sleepHours === "number" ? inputsObj.sleepHours : null,
      stressLevel: normalizeStressLevel(inputsObj.stressLevel),
      dietPreference:
        inputsObj.dietPreference === "omnivore" ||
        inputsObj.dietPreference === "vegetarian" ||
        inputsObj.dietPreference === "vegan" ||
        inputsObj.dietPreference === "pescetarian"
          ? inputsObj.dietPreference
          : null,
    },
    advice: normalizePlanAdvice(advice, expLevel),
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
  };
}

function mapPlanRow(
  plan: DbPlan,
  days: DbPlanDay[],
  exercisesMap: Map<string, DbPlanDayExercise[]>,
): LibraryPlan {
  return {
    id: plan.id,
    name: plan.name,
    sub: plan.sub,
    isActive: plan.is_active,
    currentDay: plan.current_day,
    summary: parsePlanSummary(plan.summary),
    days: days
      .sort((a, b) => a.position - b.position)
      .map((d): PlanDay => ({
        id: d.id,
        position: d.position,
        name: d.name ?? "",
        note: d.note ?? undefined,
        enabledBlocks: normalizeEnabledBlocks(d.enabled_blocks),
        exercises: sortPlanDayExerciseRows(exercisesMap.get(d.id) ?? []).map(mapPlanDayExerciseRow),
      })),
  };
}

async function loadPlansWithDays(planRows: DbPlan[]): Promise<LibraryPlan[]> {
  const ids = planRows.map((p) => p.id);
  const daysMap = await fetchPlanDays(ids);
  const dayIds = Array.from(daysMap.values())
    .flat()
    .map((d) => d.id);
  const exercisesMap = await fetchPlanDayExercises(dayIds);
  return planRows.map((p) => mapPlanRow(p, daysMap.get(p.id) ?? [], exercisesMap));
}

export async function fetchPlans(): Promise<LibraryPlan[]> {
  const { data: plans, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return loadPlansWithDays(plans ?? []);
}

export async function fetchActivePlan(userId: string): Promise<LibraryPlan | null> {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const loaded = await loadPlansWithDays([plan]);
  return loaded[0] ?? null;
}

export interface PlanDayExerciseInput {
  name: string;
  note?: string;
  blockType?: TrainingBlockType;
  supersetId?: string;
  catalogExerciseId?: string | null;
  metric: ExerciseMetric;
  sets: SetTemplate[];
}

export interface CreatePlanDayInput {
  name?: string;
  note?: string;
  enabledBlocks?: TrainingBlockType[];
  exercises: PlanDayExerciseInput[];
}

export interface CreatePlanInput {
  name: string;
  sub?: string;
  days: CreatePlanDayInput[];
  activate?: boolean;
  summary?: PlanSummary | null;
}

async function deactivateAllPlans(userId: string): Promise<void> {
  const { error } = await supabase.from("plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  if (error) throw error;
}

function validatePlanDays(days: CreatePlanDayInput[]): void {
  if (days.length === 0) throw new Error("Ein Plan braucht mindestens einen Tag.");
  for (let i = 0; i < days.length; i++) {
    if (days[i].exercises.length === 0) {
      throw new Error(`Tag ${i + 1} braucht mindestens eine Übung.`);
    }
  }
}

export async function createPlan(userId: string, input: CreatePlanInput): Promise<string> {
  validatePlanDays(input.days);

  if (input.activate) {
    await deactivateAllPlans(userId);
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      name: input.name,
      sub: input.sub ?? "",
      is_active: input.activate ?? false,
      current_day: 0,
      summary: input.summary ? (input.summary as unknown as Json) : null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const dayRows = input.days.map((d, i) => ({
    plan_id: plan.id,
    position: i,
    name: d.name?.trim() || `Tag ${i + 1}`,
    note: d.note ?? null,
    enabled_blocks: d.enabledBlocks ?? normalizeEnabledBlocks(undefined),
  }));

  const { data: insertedDays, error: daysError } = await supabase
    .from("plan_days")
    .insert(dayRows)
    .select("id, position");
  if (daysError) throw daysError;

  for (const inserted of insertedDays ?? []) {
    const dayInput = input.days[inserted.position];
    if (!dayInput) continue;
    await insertPlanDayExercises(inserted.id, dayInput.exercises);
  }

  return plan.id;
}

export interface UpdatePlanInput {
  name: string;
  sub?: string;
  days: CreatePlanDayInput[];
}

export async function fetchPlan(planId: string): Promise<LibraryPlan | null> {
  const { data: plan, error } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const loaded = await loadPlansWithDays([plan]);
  return loaded[0] ?? null;
}

export async function updatePlan(planId: string, input: UpdatePlanInput): Promise<void> {
  validatePlanDays(input.days);

  const { data: plan, error: fetchError } = await supabase.from("plans").select("current_day").eq("id", planId).single();
  if (fetchError) throw fetchError;

  const currentDay = plan.current_day >= input.days.length ? 0 : plan.current_day;

  const { error } = await supabase
    .from("plans")
    .update({
      name: input.name,
      sub: input.sub ?? "",
      current_day: currentDay,
    })
    .eq("id", planId);
  if (error) throw error;

  const { error: deleteError } = await supabase.from("plan_days").delete().eq("plan_id", planId);
  if (deleteError) throw deleteError;

  const dayRows = input.days.map((d, i) => ({
    plan_id: planId,
    position: i,
    name: d.name?.trim() || `Tag ${i + 1}`,
    note: d.note ?? null,
    enabled_blocks: d.enabledBlocks ?? normalizeEnabledBlocks(undefined),
  }));

  const { data: insertedDays, error: daysError } = await supabase
    .from("plan_days")
    .insert(dayRows)
    .select("id, position");
  if (daysError) throw daysError;

  for (const inserted of insertedDays ?? []) {
    const dayInput = input.days[inserted.position];
    if (!dayInput) continue;
    await insertPlanDayExercises(inserted.id, dayInput.exercises);
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function setActivePlan(userId: string, planId: string): Promise<void> {
  await deactivateAllPlans(userId);

  const { error } = await supabase.from("plans").update({ is_active: true }).eq("id", planId).eq("user_id", userId);
  if (error) throw error;
}

export async function advancePlan(planId: string): Promise<void> {
  const { data: plan, error: fetchError } = await supabase.from("plans").select("current_day").eq("id", planId).single();
  if (fetchError) throw fetchError;

  const { count, error: countError } = await supabase
    .from("plan_days")
    .select("*", { count: "exact", head: true })
    .eq("plan_id", planId);
  if (countError) throw countError;
  if (!count || count === 0) return;

  const nextDay = (plan.current_day + 1) % count;
  const { error } = await supabase.from("plans").update({ current_day: nextDay }).eq("id", planId);
  if (error) throw error;
}

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload };
}


export function useExercises() {
  const { user } = useAuth();
  return useAsync(fetchExercises, [user?.id]);
}

export function useSessions() {
  const { user } = useAuth();
  return useAsync(fetchSessions, [user?.id]);
}

export function useSession(id: string | null) {
  const { user } = useAuth();
  return useAsync(async () => (id ? fetchSession(id) : null), [user?.id, id]);
}

export function useWeeklyVolume() {
  const { user } = useAuth();
  return useAsync(fetchWeeklyVolume, [user?.id]);
}

export function useHomeStats() {
  const { user } = useAuth();
  return useAsync(fetchHomeStats, [user?.id]);
}

export function usePlans() {
  const { user } = useAuth();
  return useAsync(fetchPlans, [user?.id]);
}

export function useActivePlan() {
  const { user } = useAuth();
  return useAsync(async () => (user ? fetchActivePlan(user.id) : null), [user?.id]);
}

export function usePlan(planId: string | null) {
  const { user } = useAuth();
  return useAsync(async () => (planId ? fetchPlan(planId) : null), [user?.id, planId]);
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
  muscleMassKg?: number;
  waterPct?: number;
  chestCm?: number;
  shouldersCm?: number;
  upperArmLCm?: number;
  upperArmRCm?: number;
  lowerArmLCm?: number;
  lowerArmRCm?: number;
  thighLCm?: number;
  thighRCm?: number;
  calfLCm?: number;
  calfRCm?: number;
  hipsCm?: number;
  performedAt: string;
  createdAt: string;
}

function mapBodyMeasurementRow(row: DbBodyMeasurement): BodyMeasurement {
  return {
    id: row.id,
    userId: row.user_id,
    weightKg: Number(row.weight_kg),
    bodyFatPct: row.body_fat_pct !== null ? Number(row.body_fat_pct) : undefined,
    waistCm: row.waist_cm !== null ? Number(row.waist_cm) : undefined,
    muscleMassKg: row.muscle_mass_kg !== null ? Number(row.muscle_mass_kg) : undefined,
    waterPct: row.water_pct !== null ? Number(row.water_pct) : undefined,
    chestCm: row.chest_cm !== null ? Number(row.chest_cm) : undefined,
    shouldersCm: row.shoulders_cm !== null ? Number(row.shoulders_cm) : undefined,
    upperArmLCm: row.upper_arm_l_cm !== null ? Number(row.upper_arm_l_cm) : undefined,
    upperArmRCm: row.upper_arm_r_cm !== null ? Number(row.upper_arm_r_cm) : undefined,
    lowerArmLCm: row.lower_arm_l_cm !== null ? Number(row.lower_arm_l_cm) : undefined,
    lowerArmRCm: row.lower_arm_r_cm !== null ? Number(row.lower_arm_r_cm) : undefined,
    thighLCm: row.thigh_l_cm !== null ? Number(row.thigh_l_cm) : undefined,
    thighRCm: row.thigh_r_cm !== null ? Number(row.thigh_r_cm) : undefined,
    calfLCm: row.calf_l_cm !== null ? Number(row.calf_l_cm) : undefined,
    calfRCm: row.calf_r_cm !== null ? Number(row.calf_r_cm) : undefined,
    hipsCm: row.hips_cm !== null ? Number(row.hips_cm) : undefined,
    performedAt: row.performed_at,
    createdAt: row.created_at,
  };
}

export async function fetchBodyMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBodyMeasurementRow);
}

export async function fetchLatestBodyMeasurement(userId: string): Promise<BodyMeasurement | null> {
  const measurements = await fetchBodyMeasurements(userId);
  return measurements[0] ?? null;
}

export interface BodyMeasurementInput {
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
  muscleMassKg?: number;
  waterPct?: number;
  chestCm?: number;
  shouldersCm?: number;
  upperArmLCm?: number;
  upperArmRCm?: number;
  lowerArmLCm?: number;
  lowerArmRCm?: number;
  thighLCm?: number;
  thighRCm?: number;
  calfLCm?: number;
  calfRCm?: number;
  hipsCm?: number;
  performedAt?: string;
}

export async function createBodyMeasurement(userId: string, input: BodyMeasurementInput): Promise<string> {
  const { data, error } = await supabase
    .from("body_measurements")
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      body_fat_pct: input.bodyFatPct ?? null,
      waist_cm: input.waistCm ?? null,
      muscle_mass_kg: input.muscleMassKg ?? null,
      water_pct: input.waterPct ?? null,
      chest_cm: input.chestCm ?? null,
      shoulders_cm: input.shouldersCm ?? null,
      upper_arm_l_cm: input.upperArmLCm ?? null,
      upper_arm_r_cm: input.upperArmRCm ?? null,
      lower_arm_l_cm: input.lowerArmLCm ?? null,
      lower_arm_r_cm: input.lowerArmRCm ?? null,
      thigh_l_cm: input.thighLCm ?? null,
      thigh_r_cm: input.thighRCm ?? null,
      calf_l_cm: input.calfLCm ?? null,
      calf_r_cm: input.calfRCm ?? null,
      hips_cm: input.hipsCm ?? null,
      ...(input.performedAt ? { performed_at: input.performedAt } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateBodyMeasurement(id: string, input: BodyMeasurementInput): Promise<void> {
  const { error } = await supabase
    .from("body_measurements")
    .update({
      weight_kg: input.weightKg,
      body_fat_pct: input.bodyFatPct ?? null,
      waist_cm: input.waistCm ?? null,
      muscle_mass_kg: input.muscleMassKg ?? null,
      water_pct: input.waterPct ?? null,
      chest_cm: input.chestCm ?? null,
      shoulders_cm: input.shouldersCm ?? null,
      upper_arm_l_cm: input.upperArmLCm ?? null,
      upper_arm_r_cm: input.upperArmRCm ?? null,
      lower_arm_l_cm: input.lowerArmLCm ?? null,
      lower_arm_r_cm: input.lowerArmRCm ?? null,
      thigh_l_cm: input.thighLCm ?? null,
      thigh_r_cm: input.thighRCm ?? null,
      calf_l_cm: input.calfLCm ?? null,
      calf_r_cm: input.calfRCm ?? null,
      hips_cm: input.hipsCm ?? null,
      ...(input.performedAt ? { performed_at: input.performedAt } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function useBodyMeasurements(refreshKey = 0) {
  const { user } = useAuth();
  return useAsync(async () => {
    if (!user) return [];
    return fetchBodyMeasurements(user.id);
  }, [user?.id, refreshKey]);
}

export interface BodyPhoto {
  id: string;
  userId: string;
  photoPath: string;
  orientation: "front" | "back" | "side";
  weightKg?: number;
  performedAt: string;
  createdAt: string;
}

function mapBodyPhotoRow(row: Tables<"body_photos">): BodyPhoto {
  return {
    id: row.id,
    userId: row.user_id,
    photoPath: row.photo_path,
    orientation: row.orientation as "front" | "back" | "side",
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : undefined,
    performedAt: row.performed_at,
    createdAt: row.created_at,
  };
}

export async function fetchBodyPhotos(userId: string): Promise<BodyPhoto[]> {
  const { data, error } = await supabase
    .from("body_photos")
    .select("*")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBodyPhotoRow);
}

export async function uploadBodyPhoto(
  userId: string,
  file: File,
  orientation: "front" | "back" | "side",
  weightKg?: number,
  performedAt?: string
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const path = `${userId}/${fileName}`;

  // 1. Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("body-photos")
    .upload(path, file);

  if (uploadError) throw uploadError;

  try {
    // 2. Insert record in body_photos table
    const { data, error: dbError } = await supabase
      .from("body_photos")
      .insert({
        user_id: userId,
        photo_path: path,
        orientation,
        weight_kg: weightKg ?? null,
        performed_at: performedAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (dbError) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from("body-photos").remove([path]);
      throw dbError;
    }

    return data.id;
  } catch (err) {
    // Clean up uploaded file if anything fails
    await supabase.storage.from("body-photos").remove([path]);
    throw err;
  }
}

export async function deleteBodyPhoto(id: string, photoPath: string): Promise<void> {
  // 1. Delete DB entry
  const { error: dbError } = await supabase
    .from("body_photos")
    .delete()
    .eq("id", id);
  if (dbError) throw dbError;

  // 2. Delete file from Storage
  try {
    await supabase.storage.from("body-photos").remove([photoPath]);
  } catch (err) {
    console.error("Failed to delete file from storage:", err);
  }
}

export function useBodyPhotos(refreshKey = 0) {
  const { user } = useAuth();
  return useAsync(async () => {
    if (!user) return [];
    return fetchBodyPhotos(user.id);
  }, [user?.id, refreshKey]);
}

export function getBodyPhotoPublicUrl(photoPath: string): string {
  const { data } = supabase.storage.from("body-photos").getPublicUrl(photoPath);
  return data.publicUrl;
}


export interface ExerciseHistoryEntry {
  sessionId: string;
  sessionName: string;
  performedAt: string;
  sets: WorkoutSet[];
  metric: ExerciseMetric;
  note?: string;
}

export async function fetchExerciseHistory(userId: string, exerciseName: string): Promise<ExerciseHistoryEntry[]> {
  const { data, error } = await supabase
    .from("session_exercises")
    .select(`
      id,
      note,
      metric_type,
      sets,
      sessions (
        id,
        name,
        performed_at,
        user_id
      )
    `)
    .eq("name", exerciseName);

  if (error) throw error;
  if (!data) return [];

  const mapped: ExerciseHistoryEntry[] = data
    .map((row: any): ExerciseHistoryEntry | null => {
      const sess = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
      if (!sess || sess.user_id !== userId) return null;
      return {
        sessionId: sess.id,
        sessionName: sess.name,
        performedAt: sess.performed_at,
        sets: parseSessionSets(row.sets),
        metric: parseExerciseMetric(row.metric_type),
        note: row.note ?? undefined,
      };
    })
    .filter((e): e is ExerciseHistoryEntry => e !== null);

  mapped.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  return mapped.slice(0, 10);
}

export function useExerciseHistory(exerciseName: string | null) {
  const { user } = useAuth();
  return useAsync(async () => {
    if (!user || !exerciseName) return [];
    return fetchExerciseHistory(user.id, exerciseName);
  }, [user?.id, exerciseName]);
}

export async function assertAiTrainingPlanConsent(userId: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
  if (error) throw new Error(error.message);
  const prefs = mergePreferences(data?.preferences ?? null);
  if (!hasAiConsent(prefs)) {
    throw new Error(
      "Für die KI-Planerstellung ist deine Einwilligung zur Datenübermittlung an Anthropic erforderlich.",
    );
  }
}

export async function generateAndSaveAITrainingPlan(
  userId: string,
  input: {
    gender: "male" | "female" | "other" | null;
    birthDate?: string | null;
    heightCm: number | null;
    weightKg: number | null;
    fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
    experienceLevel: "beginner" | "intermediate" | "advanced" | null;
    weeklyDays: number;
    anamnesis: AnamnesisData;
    nutrition: PlanSummaryNutrition;
    recentSessions?: any[];
    exerciseFeedback?: any;
  }
): Promise<string> {
  await assertAiTrainingPlanConsent(userId);

  const { nutrition, ...edgeInput } = input;
  const { data, error } = await supabase.functions.invoke("generate-training-plan", {
    body: edgeInput,
    // KI-Generierung dauert oft 60–90 s; ohne explizites Timeout bricht der Client ggf. zu früh ab.
    timeout: 150_000,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload === "object") {
          if (payload.error === "consent_required") {
            throw new Error(
              typeof payload.message === "string"
                ? payload.message
                : "Für die KI-Planerstellung ist deine Einwilligung zur Datenübermittlung an Anthropic erforderlich.",
            );
          }
          if (typeof payload.error === "string") {
            throw new Error(payload.error);
          }
          if (typeof payload.message === "string") {
            throw new Error(payload.message);
          }
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== error.message) {
          throw parseErr;
        }
      }
    }
    if (error instanceof FunctionsFetchError) {
      const cause = error.context as Error | undefined;
      const causeName = cause?.name ?? "";
      if (causeName === "AbortError" || causeName === "TimeoutError") {
        throw new Error(
          "Die KI-Planerstellung hat zu lange gedauert. Bitte erneut versuchen und die App geöffnet lassen.",
        );
      }
      throw new Error(
        cause?.message
          ? `Verbindung zur KI-Planerstellung fehlgeschlagen: ${cause.message}`
          : "Verbindung zur KI-Planerstellung fehlgeschlagen. Bitte Internet prüfen und erneut versuchen.",
      );
    }
    throw new Error(error.message || "Fehler beim Aufruf der Edge Function");
  }
  if (data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string") {
    throw new Error((data as { error: string }).error);
  }
  if (!data) {
    throw new Error("Keine Daten von der Edge Function zurückgegeben");
  }

  const planDays: CreatePlanDayInput[] = [];

  const mapAiExercise = (e: {
    name: string;
    metric?: ExerciseMetric;
    note?: string;
    sets?: unknown;
  }) => ({
    name: e.name,
    metric: parseExerciseMetric(e.metric ?? "weight_reps"),
    note: e.note || "",
    sets: (() => {
      const parsed = parseSets(e.sets);
      const sets = parsed.length > 0 ? parsed : [{ reps: 10, kg: 0 }];
      return sets.map((s) => ({
        reps: s.reps ?? 0,
        kg: s.kg ?? 0,
        ...(s.durationSec != null ? { durationSec: Number(s.durationSec) } : {}),
        ...(s.distanceM != null ? { distanceM: Number(s.distanceM) } : {}),
      }));
    })(),
  });

  for (let i = 0; i < data.days.length; i++) {
    const day = data.days[i];
    if (day.isRestDay) continue;

    const exercises: PlanDayExerciseInput[] = [];
    let enabledBlocks = normalizeEnabledBlocks(day.enabledBlocks);

    if (Array.isArray(day.blocks) && day.blocks.length > 0) {
      const blockTypesWithExercises: TrainingBlockType[] = [];
      for (const block of day.blocks) {
        if (!isTrainingBlockType(block.type) || !Array.isArray(block.exercises)) continue;
        if (block.exercises.length > 0) blockTypesWithExercises.push(block.type);
        for (const e of block.exercises) {
          exercises.push({ ...mapAiExercise(e), blockType: block.type });
        }
      }
      if (enabledBlocks.length === 0 && blockTypesWithExercises.length > 0) {
        enabledBlocks = normalizeEnabledBlocks(blockTypesWithExercises);
      }
    } else {
      const flat = day.exercises ?? day.workout?.exercises ?? [];
      for (const e of flat) {
        exercises.push({ ...mapAiExercise(e), blockType: "strength" });
      }
    }

    if (exercises.length === 0) continue;
    const dayName =
      typeof day.name === "string" && day.name.trim()
        ? day.name.trim()
        : day.workout?.name
          ? sanitizeAiWorkoutName(day.workout.name)
          : `Tag ${planDays.length + 1}`;
    planDays.push({
      name: dayName,
      note: day.note || "",
      enabledBlocks,
      exercises: assignBlockPositions(exercises),
    });
  }

  if (planDays.length === 0) {
    throw new Error("Der KI-Plan enthält keine Trainingstage mit Übungen.");
  }

  const actLevel = activityFactor({
    weeklyDays: input.weeklyDays,
    minutesPerSession: input.anamnesis.minutesPerSession,
    occupation: input.anamnesis.occupation,
    otherSports: input.anamnesis.otherSports,
  });

  const summary: PlanSummary = {
    nutrition,
    inputs: {
      gender: input.gender,
      age: ageFromBirthDate(input.birthDate),
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      fitnessGoal: input.fitnessGoal,
      activityLevel: actLevel,
      minutesPerSession: input.anamnesis.minutesPerSession,
      occupation: input.anamnesis.occupation,
      sleepHours: input.anamnesis.sleepHours,
      stressLevel: input.anamnesis.stressLevel,
      dietPreference: input.anamnesis.dietPreference,
    },
    advice: normalizePlanAdvice(data.advice, input.experienceLevel),
    createdAt: new Date().toISOString(),
  };

  const planId = await createPlan(userId, {
    name: data.name || "KI Trainingsplan",
    sub: data.sub || "",
    days: planDays,
    activate: true,
    summary,
  });

  return planId;
}

export async function fetchRecentSessionsWithExercises(limit = 10): Promise<HistoryEntry[]> {
  const { data: sessionRows, error } = await supabase
    .from("sessions")
    .select("id")
    .order("performed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!sessionRows || sessionRows.length === 0) return [];
  
  const sessions = await Promise.all(
    sessionRows.map(async (row) => {
      try {
        return await fetchSession(row.id);
      } catch (e) {
        console.error(`Fehler beim Laden der Session ${row.id}:`, e);
        return null;
      }
    })
  );
  return sessions.filter((s): s is HistoryEntry => s !== null);
}

