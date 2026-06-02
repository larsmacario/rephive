import { useCallback, useEffect, useState } from "react";
import type { SessionExercise } from "../data";
import { useAuth } from "./auth";
import { fetchSessionExercisesBatch } from "./db";
import { supabase } from "./supabase";
import { isTimerSession } from "./timerSession";
import { setVolumeKg } from "./exerciseCatalog";

export type StatsPeriod = "d7" | "d30" | "d90" | "all";

const PERIOD_DAYS: Record<Exclude<StatsPeriod, "all">, number> = {
  d7: 7,
  d30: 30,
  d90: 90,
};

export interface StatsChartPoint {
  d: string;
  v: number;
}

export interface TopExerciseStat {
  name: string;
  volumeT: number;
  sessionCount: number;
}

export interface StatsSummary {
  sessions: number;
  volumeT: number;
  durationH: number;
  prCount: number;
  streakWeeks: number;
  strengthSessions: number;
  timerSessions: number;
}

export interface StatsOverview {
  summary: StatsSummary;
  chart: StatsChartPoint[];
  chartTitle: string;
  topExercises: TopExerciseStat[];
}

interface SessionRow {
  id: string;
  performed_at: string;
  volume_kg: number;
  duration_min: number;
  is_pr: boolean;
  tags: string[];
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

export function getPeriodStart(period: StatsPeriod, ref: Date = new Date()): Date | null {
  if (period === "all") return null;
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (PERIOD_DAYS[period] - 1));
  return start;
}

function computeStreakWeeks(sessions: SessionRow[]): number {
  const weekKeys = new Set<string>();
  for (const s of sessions) {
    weekKeys.add(getWeekKey(new Date(s.performed_at)));
  }
  const now = new Date();
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
  return streakWeeks;
}

function roundT(kg: number): number {
  return Math.round(kg / 100) / 10;
}

function exerciseVolumeKg(ex: SessionExercise): number {
  return ex.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, ex.metric), 0);
}

function buildRollingDailyChart(filtered: SessionRow[], days: number): StatsChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: StatsChartPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    let vol = 0;
    for (const row of filtered) {
      const rd = new Date(row.performed_at);
      if (rd >= dayStart && rd < dayEnd) {
        vol += Number(row.volume_kg) / 1000;
      }
    }

    const label =
      days <= 7
        ? dayStart.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")
        : dayStart.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });

    points.push({ d: label, v: Math.round(vol * 10) / 10 });
  }

  return points;
}

function buildRollingWeeklyChart(filtered: SessionRow[], days: number): StatsChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const periodStart = new Date(today);
  periodStart.setDate(today.getDate() - (days - 1));
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);

  const bucketCount = Math.ceil(days / 7);
  const points: StatsChartPoint[] = [];

  for (let w = 0; w < bucketCount; w++) {
    const bucketStart = new Date(periodStart);
    bucketStart.setDate(periodStart.getDate() + w * 7);
    if (bucketStart > periodEnd) break;

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + 7);
    const effectiveEnd = bucketEnd > periodEnd ? periodEnd : bucketEnd;

    let vol = 0;
    for (const row of filtered) {
      const rd = new Date(row.performed_at);
      if (rd >= bucketStart && rd < effectiveEnd) {
        vol += Number(row.volume_kg) / 1000;
      }
    }

    const label = bucketStart.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
    points.push({ d: label, v: Math.round(vol * 10) / 10 });
  }

  return points;
}

function buildAllChart(filtered: SessionRow[]): StatsChartPoint[] {
  const now = new Date();
  const points: StatsChartPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("de-DE", { month: "short" }).replace(".", "");
    let vol = 0;
    for (const row of filtered) {
      const rd = new Date(row.performed_at);
      if (rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth()) {
        vol += Number(row.volume_kg) / 1000;
      }
    }
    points.push({ d: label, v: Math.round(vol * 10) / 10 });
  }
  return points;
}

async function buildTopExercises(filtered: SessionRow[]): Promise<TopExerciseStat[]> {
  const strength = filtered.filter((s) => !isTimerSession(s.tags) && Number(s.volume_kg) > 0);
  if (strength.length === 0) return [];

  const exMap = await fetchSessionExercisesBatch(strength.map((s) => s.id));
  const volumeByName = new Map<string, number>();
  const sessionsByName = new Map<string, Set<string>>();

  for (const session of strength) {
    const exercises = exMap.get(session.id) ?? [];
    const seenInSession = new Set<string>();
    for (const ex of exercises) {
      const vol = exerciseVolumeKg(ex);
      if (vol <= 0) continue;
      volumeByName.set(ex.name, (volumeByName.get(ex.name) ?? 0) + vol);
      if (!seenInSession.has(ex.name)) {
        seenInSession.add(ex.name);
        const set = sessionsByName.get(ex.name) ?? new Set<string>();
        set.add(session.id);
        sessionsByName.set(ex.name, set);
      }
    }
  }

  return [...volumeByName.entries()]
    .map(([name, volKg]) => ({
      name,
      volumeT: roundT(volKg),
      sessionCount: sessionsByName.get(name)?.size ?? 0,
    }))
    .sort((a, b) => b.volumeT - a.volumeT)
    .slice(0, 8);
}

export async function fetchStatsOverview(period: StatsPeriod): Promise<StatsOverview> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, performed_at, volume_kg, duration_min, is_pr, tags")
    .order("performed_at", { ascending: false });
  if (error) throw error;

  const all = (data ?? []) as SessionRow[];
  const start = getPeriodStart(period);
  const filtered = start ? all.filter((s) => new Date(s.performed_at) >= start) : all;

  let volumeKg = 0;
  let durationMin = 0;
  let prCount = 0;
  let strengthSessions = 0;
  let timerSessions = 0;

  for (const s of filtered) {
    volumeKg += Number(s.volume_kg);
    durationMin += Number(s.duration_min);
    if (s.is_pr) prCount++;
    if (isTimerSession(s.tags)) timerSessions++;
    else strengthSessions++;
  }

  const chartTitle =
    period === "d7"
      ? "VOLUMEN / 7 TAGE"
      : period === "d30"
        ? "VOLUMEN / 30 TAGE"
        : period === "d90"
          ? "VOLUMEN / 90 TAGE"
          : "VOLUMEN / GESAMT";

  const chart =
    period === "d7"
      ? buildRollingDailyChart(filtered, 7)
      : period === "d30"
        ? buildRollingWeeklyChart(filtered, 30)
        : period === "d90"
          ? buildRollingWeeklyChart(filtered, 90)
          : buildAllChart(filtered);

  const topExercises = await buildTopExercises(filtered);

  return {
    summary: {
      sessions: filtered.length,
      volumeT: roundT(volumeKg),
      durationH: Math.round((durationMin / 60) * 10) / 10,
      prCount,
      streakWeeks: computeStreakWeeks(all),
      strengthSessions,
      timerSessions,
    },
    chart,
    chartTitle,
    topExercises,
  };
}

function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
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

export function useStatsOverview(period: StatsPeriod, refreshKey = 0) {
  const { user } = useAuth();
  return useAsync(() => fetchStatsOverview(period), [user?.id, period, refreshKey]);
}
