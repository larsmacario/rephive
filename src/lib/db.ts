import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Tables, Json } from "./database.types";
import { type WorkoutSet } from "./engine";
import type { LibraryExercise, LibraryWorkout, HistoryEntry, LibraryPlan, PlanDay, SessionExercise } from "../data";
import { parseExerciseMetric } from "./exerciseCatalog";
import type { ExerciseMetric } from "./exerciseCatalog";
import { useAuth } from "./auth";

type DbWorkout = Tables<"workouts">;
type DbWorkoutExercise = Tables<"workout_exercises">;
type DbSession = Tables<"sessions">;
type DbPlan = Tables<"plans">;
type DbSessionExercise = Tables<"session_exercises">;
type DbBodyMeasurement = Tables<"body_measurements">;

type DbPlanDay = Tables<"plan_days">;

interface StoredSet {
  reps: number;
  kg: number;
  done?: boolean;
  durationSec?: number;
  distanceM?: number;
}

interface SetTemplate {
  reps: number;
  kg: number;
  durationSec?: number;
  distanceM?: number;
}

function parseSets(raw: unknown): SetTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is SetTemplate => typeof s === "object" && s !== null && "reps" in s && "kg" in s)
    .map((s) => ({
      reps: Number(s.reps),
      kg: Number(s.kg),
      ...(s.durationSec != null ? { durationSec: Number(s.durationSec) } : {}),
      ...(s.distanceM != null ? { distanceM: Number(s.distanceM) } : {}),
    }));
}

function parseSessionSets(raw: unknown): WorkoutSet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is StoredSet => typeof s === "object" && s !== null && "reps" in s && "kg" in s)
    .map((s) => ({
      reps: Math.max(0, Number(s.reps) || 0),
      kg: Math.max(0, Number(s.kg) || 0),
      done: Boolean(s.done),
      ...(s.durationSec != null ? { durationSec: Math.max(0, Number(s.durationSec) || 0) } : {}),
      ...(s.distanceM != null ? { distanceM: Math.max(0, Number(s.distanceM) || 0) } : {}),
    }));
}

function mapSessionExerciseRow(e: DbSessionExercise): SessionExercise {
  return {
    id: e.id,
    name: e.name,
    note: e.note ?? undefined,
    supersetId: e.superset_id ?? undefined,
    metric: parseExerciseMetric(e.metric_type),
    sets: parseSessionSets(e.sets),
  };
}

export interface SessionExerciseInput {
  name: string;
  note?: string;
  supersetId?: string;
  metric?: ExerciseMetric;
  sets: WorkoutSet[];
}

function mapWorkoutRow(w: DbWorkout, exercises: DbWorkoutExercise[]): LibraryWorkout {
  return {
    id: w.id,
    name: w.name,
    sub: w.sub,
    tags: w.tags,
    dur: w.duration_min,
    userId: w.user_id,
    exercises: exercises
      .sort((a, b) => a.position - b.position)
      .map((e) => ({
        id: e.id,
        name: e.name,
        note: e.note ?? undefined,
        supersetId: e.superset_id ?? undefined,
        metric: parseExerciseMetric(e.metric_type),
        sets: parseSets(e.sets).map((s) => ({ ...s, done: false } satisfies WorkoutSet)),
      })),
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
    workoutId: s.workout_id,
    exercises,
  };
}

async function fetchWorkoutExercises(workoutIds: string[]): Promise<Map<string, DbWorkoutExercise[]>> {
  if (workoutIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .in("workout_id", workoutIds)
    .order("position");
  if (error) throw error;
  const map = new Map<string, DbWorkoutExercise[]>();
  for (const row of data ?? []) {
    const list = map.get(row.workout_id) ?? [];
    list.push(row);
    map.set(row.workout_id, list);
  }
  return map;
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

async function loadSessionExercises(sessionId: string, workoutId: string | null): Promise<SessionExercise[]> {
  const exMap = await fetchSessionExercises([sessionId]);
  const rows = exMap.get(sessionId) ?? [];
  if (rows.length > 0) {
    return rows.sort((a, b) => a.position - b.position).map(mapSessionExerciseRow);
  }
  if (!workoutId) return [];
  const workout = await fetchWorkout(workoutId);
  if (!workout) return [];
  return workout.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    note: e.note,
    supersetId: e.supersetId,
    metric: e.metric,
    sets: e.sets.map((s) => ({ ...s, done: true })),
  }));
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
    superset_id: e.supersetId ?? null,
    metric_type: e.metric ?? "weight_reps",
    sets: e.sets as unknown as Json,
  }));
  const { error } = await supabase.from("session_exercises").insert(rows);
  if (error) throw error;
}

export async function fetchWorkouts(): Promise<LibraryWorkout[]> {
  const { data: workouts, error } = await supabase.from("workouts").select("*").order("created_at");
  if (error) throw error;
  const ids = (workouts ?? []).map((w) => w.id);
  const exMap = await fetchWorkoutExercises(ids);
  return (workouts ?? []).map((w) => mapWorkoutRow(w, exMap.get(w.id) ?? []));
}

export async function fetchWorkout(id: string): Promise<LibraryWorkout | null> {
  const { data: workout, error } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!workout) return null;
  const exMap = await fetchWorkoutExercises([workout.id]);
  return mapWorkoutRow(workout, exMap.get(workout.id) ?? []);
}

function mapExerciseRow(e: Tables<"exercises">): LibraryExercise {
  return {
    id: e.id,
    name: e.name,
    group: e.muscle_group,
    equip: e.equipment,
    userId: e.user_id,
    metric: parseExerciseMetric(e.metric_type),
  };
}

export async function fetchExercises(): Promise<LibraryExercise[]> {
  const { data, error } = await supabase.from("exercises").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(mapExerciseRow);
}

export interface ExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
  metric: ExerciseMetric;
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<string> {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      muscle_group: input.muscleGroup,
      equipment: input.equipment,
      metric_type: input.metric,
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
  const exercises = await loadSessionExercises(data.id, data.workout_id);
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

export interface CreateWorkoutInput {
  name: string;
  sub: string;
  tags: string[];
  durationMin: number;
  exercises: {
    name: string;
    note?: string;
    supersetId?: string;
    metric: ExerciseMetric;
    sets: SetTemplate[];
  }[];
}

export async function createWorkout(userId: string, input: CreateWorkoutInput): Promise<string> {
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      name: input.name,
      sub: input.sub,
      tags: input.tags,
      duration_min: input.durationMin,
    })
    .select("id")
    .single();
  if (error) throw error;

  const rows = input.exercises.map((e, i) => ({
    workout_id: workout.id,
    position: i,
    name: e.name,
    note: e.note ?? null,
    superset_id: e.supersetId ?? null,
    metric_type: e.metric,
    sets: e.sets as unknown as Json,
  }));

  const { error: exError } = await supabase.from("workout_exercises").insert(rows);
  if (exError) throw exError;

  return workout.id;
}

export async function updateWorkout(workoutId: string, input: CreateWorkoutInput): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({
      name: input.name,
      sub: input.sub,
      tags: input.tags,
      duration_min: input.durationMin,
    })
    .eq("id", workoutId);
  if (error) throw error;

  const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  if (deleteError) throw deleteError;

  const rows = input.exercises.map((e, i) => ({
    workout_id: workoutId,
    position: i,
    name: e.name,
    note: e.note ?? null,
    superset_id: e.supersetId ?? null,
    metric_type: e.metric,
    sets: e.sets as unknown as Json,
  }));

  const { error: exError } = await supabase.from("workout_exercises").insert(rows);
  if (exError) throw exError;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
}

export interface SaveSessionInput {
  workoutId?: string;
  name: string;
  tags: string[];
  durationMin: number;
  volumeKg: number;
  setCount: number;
  isPr?: boolean;
  exercises?: SessionExerciseInput[];
}

export async function saveSession(userId: string, input: SaveSessionInput): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      workout_id: input.workoutId ?? null,
      name: input.name,
      tags: input.tags,
      duration_min: input.durationMin,
      volume_kg: input.volumeKg,
      set_count: input.setCount,
      is_pr: input.isPr ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.exercises?.length) {
    await replaceSessionExercises(data.id, input.exercises);
  }
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

async function fetchWorkoutSummaries(workoutIds: string[]): Promise<Map<string, { name: string; tags: string[]; dur: number; exerciseCount: number }>> {
  if (workoutIds.length === 0) return new Map();
  const uniqueIds = [...new Set(workoutIds)];
  const { data: workouts, error } = await supabase.from("workouts").select("id, name, tags, duration_min").in("id", uniqueIds);
  if (error) throw error;
  const exMap = await fetchWorkoutExercises(uniqueIds);
  const map = new Map<string, { name: string; tags: string[]; dur: number; exerciseCount: number }>();
  for (const w of workouts ?? []) {
    map.set(w.id, {
      name: w.name,
      tags: w.tags,
      dur: w.duration_min,
      exerciseCount: (exMap.get(w.id) ?? []).length,
    });
  }
  return map;
}

function mapPlanRow(plan: DbPlan, days: DbPlanDay[], workoutSummaries: Map<string, { name: string; tags: string[]; dur: number; exerciseCount: number }>): LibraryPlan {
  return {
    id: plan.id,
    name: plan.name,
    sub: plan.sub,
    isActive: plan.is_active,
    currentDay: plan.current_day,
    days: days
      .sort((a, b) => a.position - b.position)
      .map((d): PlanDay => {
        const summary = d.workout_id ? workoutSummaries.get(d.workout_id) : undefined;
        return {
          id: d.id,
          position: d.position,
          isRestDay: !d.workout_id,
          note: d.note ?? undefined,
          workout: summary && d.workout_id
            ? {
                id: d.workout_id,
                name: summary.name,
                tags: summary.tags,
                dur: summary.dur,
                exerciseCount: summary.exerciseCount,
              }
            : undefined,
        };
      }),
  };
}

export async function fetchPlans(): Promise<LibraryPlan[]> {
  const { data: plans, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (plans ?? []).map((p) => p.id);
  const daysMap = await fetchPlanDays(ids);
  const workoutIds = [...new Set((Array.from(daysMap.values()).flat().map((d) => d.workout_id).filter(Boolean) as string[]))];
  const summaries = await fetchWorkoutSummaries(workoutIds);
  return (plans ?? []).map((p) => mapPlanRow(p, daysMap.get(p.id) ?? [], summaries));
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
  const daysMap = await fetchPlanDays([plan.id]);
  const days = daysMap.get(plan.id) ?? [];
  const workoutIds = days.map((d) => d.workout_id).filter(Boolean) as string[];
  const summaries = await fetchWorkoutSummaries(workoutIds);
  return mapPlanRow(plan, days, summaries);
}

export interface CreatePlanDayInput {
  workoutId?: string | null;
  note?: string;
}

export interface CreatePlanInput {
  name: string;
  sub?: string;
  days: CreatePlanDayInput[];
  activate?: boolean;
}

async function deactivateAllPlans(userId: string): Promise<void> {
  const { error } = await supabase.from("plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  if (error) throw error;
}

export async function createPlan(userId: string, input: CreatePlanInput): Promise<string> {
  if (input.days.length === 0) throw new Error("Ein Plan braucht mindestens einen Tag.");

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
    })
    .select("id")
    .single();
  if (error) throw error;

  const rows = input.days.map((d, i) => ({
    plan_id: plan.id,
    position: i,
    workout_id: d.workoutId ?? null,
    note: d.note ?? null,
  }));

  const { error: daysError } = await supabase.from("plan_days").insert(rows);
  if (daysError) throw daysError;

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
  const daysMap = await fetchPlanDays([plan.id]);
  const days = daysMap.get(plan.id) ?? [];
  const workoutIds = days.map((d) => d.workout_id).filter(Boolean) as string[];
  const summaries = await fetchWorkoutSummaries(workoutIds);
  return mapPlanRow(plan, days, summaries);
}

export async function updatePlan(planId: string, input: UpdatePlanInput): Promise<void> {
  if (input.days.length === 0) throw new Error("Ein Plan braucht mindestens einen Tag.");

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

  const rows = input.days.map((d, i) => ({
    plan_id: planId,
    position: i,
    workout_id: d.workoutId ?? null,
    note: d.note ?? null,
  }));

  const { error: daysError } = await supabase.from("plan_days").insert(rows);
  if (daysError) throw daysError;
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

export function useWorkouts() {
  const { user } = useAuth();
  return useAsync(fetchWorkouts, [user?.id]);
}

export function useWorkout(id: string | null) {
  const { user } = useAuth();
  return useAsync(async () => (id ? fetchWorkout(id) : null), [user?.id, id]);
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

export async function generateAndSaveAITrainingPlan(
  userId: string,
  input: {
    gender: "male" | "female" | "other" | null;
    heightCm: number | null;
    weightKg: number | null;
    fitnessGoal: "muscle_building" | "fat_loss" | "fitness" | "strength" | null;
    experienceLevel: "beginner" | "intermediate" | "advanced" | null;
    weeklyDays: number;
    anamnesis: {
      painZones: string[];
      trainingLocation: "gym" | "home_equipment" | "bodyweight";
      otherSports: { sport: string; frequency: number }[];
      kfa?: number | null;
    };
    recentSessions?: any[];
    exerciseFeedback?: any;
  }
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-training-plan", {
    body: input,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload.error === "string") {
          throw new Error(payload.error);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== error.message) {
          throw parseErr;
        }
      }
    }
    throw new Error(error.message || "Fehler beim Aufruf der Edge Function");
  }
  if (data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string") {
    throw new Error((data as { error: string }).error);
  }
  if (!data) {
    throw new Error("Keine Daten von der Edge Function zurückgegeben");
  }

  // Nun erstellen wir die Workouts aus den Tagen
  const planDays: CreatePlanDayInput[] = [];

  for (const day of data.days) {
    if (day.isRestDay) {
      planDays.push({
        workoutId: null,
        note: day.note || "Ruhetag",
      });
    } else {
      // Workout erstellen
      const workoutId = await createWorkout(userId, {
        name: day.workout.name,
        sub: day.workout.sub || "",
        tags: day.workout.tags || [],
        durationMin: day.workout.durationMin || 45,
        exercises: day.workout.exercises.map((e: any) => ({
          name: e.name,
          metric: e.metric || "weight_reps",
          note: e.note || "",
          sets: (e.sets || [{ reps: 10, kg: 0 }]).map((s: { reps?: number; kg?: number }) => ({
            reps: s.reps ?? 10,
            kg: 0,
          })),
        })),
      });
      planDays.push({
        workoutId,
        note: day.note || "",
      });
    }
  }

  // Jetzt den Gesamtplan erstellen und aktivieren
  const planId = await createPlan(userId, {
    name: data.name || "KI Trainingsplan",
    sub: data.sub || "",
    days: planDays,
    activate: true,
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


