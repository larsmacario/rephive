export const WATER_TARGET_MIN_ML = 1000;
export const WATER_TARGET_MAX_ML = 6000;
export const WATER_TARGET_STEP_ML = 50;
export const WATER_QUICK_AMOUNT_MIN_ML = 50;
export const WATER_QUICK_AMOUNT_MAX_ML = 3000;
export type WaterQuickAmounts = [number, number, number];
export const DEFAULT_WATER_QUICK_AMOUNTS_ML: WaterQuickAmounts = [250, 500, 750];

export function clampWaterQuickAmountMl(value: number): number {
  const rounded = Math.round(value / WATER_TARGET_STEP_ML) * WATER_TARGET_STEP_ML;
  return Math.min(WATER_QUICK_AMOUNT_MAX_ML, Math.max(WATER_QUICK_AMOUNT_MIN_ML, rounded));
}

export function normalizeWaterQuickAmounts(raw: unknown): WaterQuickAmounts {
  if (!Array.isArray(raw) || raw.length !== 3 || raw.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return [...DEFAULT_WATER_QUICK_AMOUNTS_ML];
  }
  return raw.map(clampWaterQuickAmountMl) as WaterQuickAmounts;
}

export function clampWaterTargetMl(value: number): number {
  const rounded = Math.round(value / WATER_TARGET_STEP_ML) * WATER_TARGET_STEP_ML;
  return Math.min(WATER_TARGET_MAX_ML, Math.max(WATER_TARGET_MIN_ML, rounded));
}

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRollingSevenDayStart(referenceDate: Date = new Date()): Date {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return start;
}

export function getLocalDayBounds(date: Date = new Date()): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export interface WaterLogLike {
  amountMl: number;
  loggedAt: string;
}

export interface HydrationDay {
  dateKey: string;
  label: string;
  amountMl: number;
}

export function sumWaterLogs(logs: Pick<WaterLogLike, "amountMl">[]): number {
  return logs.reduce((sum, log) => sum + log.amountMl, 0);
}

export function aggregateWaterLastSevenDays(
  logs: WaterLogLike[],
  referenceDate: Date = new Date(),
): HydrationDay[] {
  const start = getRollingSevenDayStart(referenceDate);
  const totals = new Map<string, number>();

  for (const log of logs) {
    const date = new Date(log.loggedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toLocalDateKey(date);
    totals.set(key, (totals.get(key) ?? 0) + log.amountMl);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = toLocalDateKey(date);
    return {
      dateKey,
      label: date.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 1),
      amountMl: totals.get(dateKey) ?? 0,
    };
  });
}

export function shouldShowHydrationHint(params: {
  now?: Date;
  loggedMl: number;
  targetMl: number;
  dismissedDate: string | null;
  isOnline: boolean;
}): boolean {
  const now = params.now ?? new Date();
  if (!params.isOnline || now.getHours() < 14 || params.targetMl <= 0) return false;
  if (params.dismissedDate === toLocalDateKey(now)) return false;
  return params.loggedMl < params.targetMl * 0.5;
}

export function formatWaterAmount(amountMl: number): string {
  if (amountMl >= 1000) {
    return `${(amountMl / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} l`;
  }
  return `${amountMl} ml`;
}
