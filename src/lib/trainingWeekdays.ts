import type { LibraryPlan, PlanSummary } from "../data";

/** ISO: 0 = Montag … 6 = Sonntag */
export const TRAINING_WEEKDAY_LABELS = ["Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa.", "So."] as const;

export function trainingWeekdayLabel(index: number): string {
  return TRAINING_WEEKDAY_LABELS[index] ?? "";
}

export function defaultTrainingWeekdays(count: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(count)));
  return Array.from({ length: n }, (_, i) => i);
}

export function normalizeTrainingWeekdays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days = raw
    .filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6 && Number.isInteger(d))
    .sort((a, b) => a - b);
  const unique = [...new Set(days)];
  return unique.length > 0 ? unique : undefined;
}

/** Wochentage pro Plan-Tag (Index = Plan-Tag) — Reihenfolge bleibt erhalten. */
export function normalizePlanDayWeekdays(raw: unknown, dayCount?: number): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days = raw.filter(
    (d): d is number => typeof d === "number" && d >= 0 && d <= 6 && Number.isInteger(d),
  );
  if (days.length === 0) return undefined;
  if (dayCount != null && dayCount >= 0) return days.slice(0, dayCount);
  return days;
}

export function defaultWeekdayForPlanDayIndex(planDayIndex: number, usedWeekdays: number[] = []): number {
  const used = new Set(usedWeekdays);
  for (const candidate of defaultTrainingWeekdays(Math.max(planDayIndex + 1, usedWeekdays.length + 1))) {
    if (!used.has(candidate)) return candidate;
  }
  for (let i = 0; i < 7; i++) {
    if (!used.has(i)) return i;
  }
  return planDayIndex % 7;
}

export function trainingWeekdaysFromPlanDayWeekdays(
  dayWeekdays: Array<number | undefined | null>,
): number[] {
  return resolveUniquePlanDayWeekdays(dayWeekdays);
}

/** Stellt sicher, dass jeder Plan-Tag einen eindeutigen Wochentag hat. */
export function resolveUniquePlanDayWeekdays(
  dayWeekdays: Array<number | undefined | null>,
): number[] {
  const used = new Set<number>();
  return dayWeekdays.map((wd, index) => {
    if (typeof wd === "number" && wd >= 0 && wd <= 6 && !used.has(wd)) {
      used.add(wd);
      return wd;
    }
    const next = defaultWeekdayForPlanDayIndex(index, [...used]);
    used.add(next);
    return next;
  });
}

export function toggleTrainingWeekday(selected: number[], day: number): number[] {
  if (day < 0 || day > 6) return selected;
  if (selected.includes(day)) {
    const next = selected.filter((d) => d !== day);
    return next.length > 0 ? next : selected;
  }
  return [...selected, day].sort((a, b) => a - b);
}

export function formatTrainingWeekdays(days: number[]): string {
  return days.map(trainingWeekdayLabel).join(", ");
}

export function weekdayLabelsFromTrainingWeekdays(days: number[] | undefined | null): string[] | undefined {
  if (!days || days.length === 0) return undefined;
  return days.map(trainingWeekdayLabel);
}

export function weekdayLabelsFromSummary(summary: PlanSummary | null | undefined): string[] | undefined {
  if (!summary?.inputs) return undefined;
  return weekdayLabelsFromTrainingWeekdays(summary.inputs.trainingWeekdays);
}

/** Liest trainingWeekdays direkt aus dem JSONB, auch ohne vollständige KI-Summary. */
export function extractTrainingWeekdaysFromSummaryJson(raw: unknown): number[] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const inputs = (raw as Record<string, unknown>).inputs;
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return undefined;
  return normalizePlanDayWeekdays((inputs as Record<string, unknown>).trainingWeekdays);
}

export function getPlanTrainingWeekdays(
  plan: Pick<LibraryPlan, "trainingWeekdays" | "summary"> | null | undefined,
): number[] | undefined {
  if (!plan) return undefined;
  return plan.trainingWeekdays ?? plan.summary?.inputs?.trainingWeekdays;
}

/** Merged trainingWeekdays in eine bestehende PlanSummary (Offline-Cache). */
export function mergePlanSummaryWithTrainingWeekdays(
  existing: PlanSummary | null | undefined,
  trainingWeekdays: number[] | undefined,
): PlanSummary | null {
  if (!trainingWeekdays?.length) return existing ?? null;
  if (existing) {
    return {
      ...existing,
      inputs: { ...existing.inputs, trainingWeekdays },
    };
  }
  return null;
}

/** Erzeugt Summary-JSON für DB-Persistenz (bestehende KI-Summary bleibt erhalten). */
export function patchPlanSummaryJsonWithTrainingWeekdays(
  existingRaw: unknown,
  trainingWeekdays: number[],
): Record<string, unknown> {
  const base =
    existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw)
      ? { ...(existingRaw as Record<string, unknown>) }
      : {};
  const inputs =
    base.inputs && typeof base.inputs === "object" && !Array.isArray(base.inputs)
      ? { ...(base.inputs as Record<string, unknown>) }
      : {};
  return {
    ...base,
    inputs: { ...inputs, trainingWeekdays },
    createdAt: typeof base.createdAt === "string" ? base.createdAt : new Date().toISOString(),
  };
}

export interface CalendarWeekDay {
  weekdayLabel: string;
  dateNumber: number;
  date: Date;
  isToday: boolean;
  isTrainingDay: boolean;
  isoWeekday: number;
}

/** ISO-Wochentag für ein Datum: 0 = Montag … 6 = Sonntag */
export function getTodayIsoWeekday(referenceDate: Date = new Date()): number {
  const jsDay = referenceDate.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Montag-Datum der aktuellen Kalenderwoche als Schlüssel (yyyy-mm-dd, lokale Zeit). */
export function getCurrentWeekKey(referenceDate: Date = new Date()): string {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const jsDay = ref.getDay();
  const isoOffset = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - isoOffset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Plan-Tag-Index (0-basiert) für einen ISO-Wochentag, oder null bei Ruhetag. */
export function getPlanDayIndexForIsoWeekday(
  isoWeekday: number,
  trainingWeekdays: number[] | null | undefined,
  planDayCount: number,
): number | null {
  const weekdays =
    trainingWeekdays && trainingWeekdays.length > 0
      ? trainingWeekdays
      : defaultTrainingWeekdays(planDayCount);
  const index = weekdays.findIndex((wd) => wd === isoWeekday);
  if (index < 0 || index >= planDayCount) return null;
  return index;
}

/** Aktuelle Kalenderwoche Mo–So (lokale Zeit). Trainingstage nur wenn `trainingWeekdays` gesetzt. */
export function getCurrentCalendarWeek(
  trainingWeekdays?: number[] | null,
  referenceDate: Date = new Date(),
): CalendarWeekDay[] {
  const trainingSet =
    trainingWeekdays && trainingWeekdays.length > 0 ? new Set(trainingWeekdays) : null;

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const jsDay = ref.getDay();
  const isoOffset = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - isoOffset);

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      weekdayLabel: TRAINING_WEEKDAY_LABELS[i].replace(".", ""),
      dateNumber: d.getDate(),
      date: d,
      isToday: d.getTime() === today.getTime(),
      isTrainingDay: trainingSet ? trainingSet.has(i) : false,
      isoWeekday: i,
    };
  });
}
