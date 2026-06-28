import type { TrainingBlockType } from "./planBlocks";
import { calcProteinG } from "./foodProduct";

export type ProteinLogSource = "quick" | "manual" | "post_workout";

export interface RecoveryFoodPreset {
  id: string;
  label: string;
  proteinPer100g: number;
  defaultAmountG: number;
  amountHint?: string;
}

export const RECOVERY_FOOD_PRESETS: RecoveryFoodPreset[] = [
  { id: "shake", label: "Shake", proteinPer100g: 75, defaultAmountG: 30, amountHint: "Pulver in g" },
  { id: "quark", label: "Quark", proteinPer100g: 12, defaultAmountG: 250, amountHint: "Menge in g" },
  { id: "skyr", label: "Skyr", proteinPer100g: 11, defaultAmountG: 150, amountHint: "Menge in g" },
  { id: "eier", label: "Eier", proteinPer100g: 13, defaultAmountG: 120, amountHint: "Menge in g (ca. 2 Eier)" },
  { id: "haehnchen", label: "Hähnchen", proteinPer100g: 23, defaultAmountG: 150, amountHint: "Menge in g" },
];

const PRESET_BY_ID = new Map(RECOVERY_FOOD_PRESETS.map((p) => [p.id, p]));

export function getRecoveryPreset(id: string): RecoveryFoodPreset | undefined {
  return PRESET_BY_ID.get(id);
}

export function calcPresetProtein(preset: RecoveryFoodPreset, amountG: number): number {
  return calcProteinG({
    amountG,
    proteinPer100g: preset.proteinPer100g,
    basis: "per_100g",
  });
}

export function formatPresetProteinPreview(preset: RecoveryFoodPreset, amountG = preset.defaultAmountG): string {
  const proteinG = calcPresetProtein(preset, amountG);
  return `~${proteinG} g Protein`;
}

export function formatPresetChipLabel(preset: RecoveryFoodPreset): string {
  return `${preset.label} · ${formatPresetProteinPreview(preset)}`;
}

export interface RecoverySuggestion {
  presetId: string;
}

export interface ComputeRecoveryInput {
  doneSets: number;
  volumeKg: number;
  blockTypes?: TrainingBlockType[];
  proteinLoggedTodayG: number;
  proteinTargetG: number;
}

export interface RecoveryContextResult {
  remainingG: number;
  postWorkoutSuggestions: RecoverySuggestion[];
  sessionSummaryLine: string;
  showPostWorkoutBlock: boolean;
}

function isCardioHeavy(blockTypes: TrainingBlockType[] | undefined): boolean {
  if (!blockTypes?.length) return false;
  const strengthSets = blockTypes.filter((b) => b === "strength" || b === "skill").length;
  const cardioSets = blockTypes.filter((b) => b === "warmup" || b === "metcon").length;
  return cardioSets > strengthSets;
}

function formatVolumeT(volumeKg: number): string {
  return `${(volumeKg / 1000).toFixed(1)} t`;
}

export function computeRecoveryContext(input: ComputeRecoveryInput): RecoveryContextResult {
  const { doneSets, volumeKg, blockTypes, proteinLoggedTodayG, proteinTargetG } = input;
  const remainingG = Math.max(0, proteinTargetG - proteinLoggedTodayG);
  const sessionSummaryLine = `${doneSets} Sätze · ${formatVolumeT(volumeKg)}`;
  const showPostWorkoutBlock = doneSets >= 6;

  if (!showPostWorkoutBlock) {
    return {
      remainingG,
      postWorkoutSuggestions: [],
      sessionSummaryLine,
      showPostWorkoutBlock: false,
    };
  }

  const highVolume = volumeKg >= 3000 || doneSets >= 14;
  const cardioHeavy = isCardioHeavy(blockTypes);

  let postWorkoutSuggestions: RecoverySuggestion[];
  if (highVolume) {
    postWorkoutSuggestions = [{ presetId: "shake" }, { presetId: "quark" }];
  } else if (cardioHeavy) {
    postWorkoutSuggestions = [{ presetId: "skyr" }, { presetId: "shake" }];
  } else {
    postWorkoutSuggestions = [{ presetId: "shake" }, { presetId: "skyr" }];
  }

  return {
    remainingG,
    postWorkoutSuggestions,
    sessionSummaryLine,
    showPostWorkoutBlock: true,
  };
}

export function sumProteinLogs(proteinG: number[]): number {
  return proteinG.reduce((sum, g) => sum + g, 0);
}

/** Local calendar date key yyyy-mm-dd */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getWeekStartMonday(referenceDate: Date = new Date()): Date {
  const day = referenceDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(referenceDate.getDate() + mondayOffset);
  return monday;
}

const WEEKDAY_CHART_LABELS = ["M", "D", "M", "D", "F", "S", "S"] as const;

export function aggregateProteinByWeekday(
  logs: { loggedAt: string; proteinG: number }[],
  referenceDate: Date = new Date(),
): { d: string; v: number }[] {
  const weekStart = getWeekStartMonday(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const log of logs) {
    const d = new Date(log.loggedAt);
    if (d < weekStart || d >= weekEnd) continue;
    let idx = d.getDay() - 1;
    if (idx < 0) idx = 6;
    totals[idx] += log.proteinG;
  }

  return WEEKDAY_CHART_LABELS.map((label, i) => ({ d: label, v: totals[i] }));
}

export interface WeeklyRecoveryStats {
  trainingDays: number;
  loggedDays: number;
}

export function computeWeeklyRecoveryStats(
  sessionPerformedAt: string[],
  proteinLoggedAt: string[],
  referenceDate: Date = new Date(),
): WeeklyRecoveryStats {
  const weekStart = getWeekStartMonday(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const trainingDayKeys = new Set<string>();
  for (const iso of sessionPerformedAt) {
    const d = new Date(iso);
    if (d >= weekStart && d < weekEnd) {
      trainingDayKeys.add(toLocalDateKey(d));
    }
  }

  const proteinDayKeys = new Set<string>();
  for (const iso of proteinLoggedAt) {
    const d = new Date(iso);
    if (d >= weekStart && d < weekEnd) {
      proteinDayKeys.add(toLocalDateKey(d));
    }
  }

  let loggedDays = 0;
  for (const day of trainingDayKeys) {
    if (proteinDayKeys.has(day)) loggedDays += 1;
  }

  return {
    trainingDays: trainingDayKeys.size,
    loggedDays,
  };
}
