import type { PlanDayBlock } from "../data";
import { fmt, fmtUp } from "./engine";
import type { BlockFormat } from "./planBlocks";
import { FORMAT_LABELS } from "./planBlocks";

export type MetconFormat = Extract<BlockFormat, "amrap" | "emom" | "circuit">;

export interface MetconConfig {
  format: MetconFormat;
  /** AMRAP total duration; Circuit optional cap */
  durationSec?: number;
  /** EMOM minutes / Circuit fixed rounds */
  rounds?: number;
  /** EMOM interval (default 60) */
  intervalSec?: number;
  /** Circuit: work per station */
  workSec?: number;
  /** Circuit: rest between stations */
  restSec?: number;
  /** Circuit: rest between full rounds */
  restBetweenRoundsSec?: number;
  prepSec?: number;
}

export interface MetconSessionResult {
  format: MetconFormat;
  roundsCompleted: number;
  durationSec: number;
  label: string;
}

export const METCON_DEFAULTS: Record<MetconFormat, MetconConfig> = {
  amrap: { format: "amrap", durationSec: 600, prepSec: 5 },
  emom: { format: "emom", rounds: 12, intervalSec: 60, prepSec: 5 },
  circuit: {
    format: "circuit",
    rounds: 3,
    workSec: 45,
    restSec: 15,
    restBetweenRoundsSec: 60,
    prepSec: 5,
  },
};

export function isMetconFormat(format: BlockFormat | undefined): format is MetconFormat {
  return format === "amrap" || format === "emom" || format === "circuit";
}

export function configFromPlanDayBlock(block: PlanDayBlock): MetconConfig | null {
  if (!isMetconFormat(block.format)) return null;
  return {
    format: block.format,
    durationSec: block.timeCapSeconds ?? undefined,
    rounds: block.rounds ?? undefined,
    intervalSec: block.intervalSeconds ?? undefined,
    workSec: block.workSeconds ?? undefined,
    restSec: block.restSeconds ?? undefined,
    restBetweenRoundsSec: block.restBetweenRoundsSeconds ?? undefined,
    prepSec: block.prepSeconds ?? 5,
  };
}

export function normalizeMetconConfig(
  format: MetconFormat,
  partial?: Partial<MetconConfig> | null,
): MetconConfig {
  const base = { ...METCON_DEFAULTS[format] };
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    format,
  };
}

export function formatAmrapResult(rounds: number, durationSec: number): string {
  const m = Math.floor(durationSec / 60);
  const s = durationSec % 60;
  const time = `${m}:${String(s).padStart(2, "0")}`;
  return `${rounds} Runde${rounds === 1 ? "" : "n"} in ${time}`;
}

export function formatMetconSessionResult(result: MetconSessionResult): string {
  if (result.format === "amrap") {
    return `AMRAP · ${result.label}`;
  }
  if (result.format === "emom") {
    return `EMOM · ${result.roundsCompleted} Runden`;
  }
  return `Circuit · ${result.roundsCompleted} Runde${result.roundsCompleted === 1 ? "" : "n"}`;
}

export function formatMetconBlockBadge(config: MetconConfig): string {
  const name = FORMAT_LABELS[config.format];
  if (config.format === "amrap") {
    const sec = config.durationSec ?? METCON_DEFAULTS.amrap.durationSec!;
    const min = Math.round(sec / 60);
    return `${name} · ${min} Min`;
  }
  if (config.format === "emom") {
    const rounds = config.rounds ?? METCON_DEFAULTS.emom.rounds!;
    return `${name} · ${rounds} Runden`;
  }
  const rounds = config.rounds ?? METCON_DEFAULTS.circuit.rounds!;
  const work = config.workSec ?? METCON_DEFAULTS.circuit.workSec!;
  return `${name} · ${rounds} Runden · ${work} s/Station`;
}

/** Parse legacy single-exercise MetCon note into exercise names. */
export function parseExerciseNamesFromMetconNote(note: string): string[] {
  const cleaned = note
    .replace(/^\d+\s*min\s*/i, "")
    .replace(/^(amrap|emom|circuit)\s*[:\-]?\s*/i, "")
    .trim();
  if (!cleaned) return [];
  return cleaned
    .split(/[,;·]|\s+und\s+|\s+\+\s+/i)
    .map((s) => s.trim())
    .map((s) => s.replace(/\s*[—–-]\s+.*$/, "").trim())
    .filter((s) => s.length > 1 && !/^(moderat|leicht|schnell|tempo|rpe)/i.test(s));
}

export function detectMetconFormatFromText(text: string): MetconFormat {
  const lower = text.toLowerCase();
  if (/\bemom\b/.test(lower)) return "emom";
  if (/\bcircuit\b|\bzirkel\b/.test(lower)) return "circuit";
  return "amrap";
}

export function parseDurationSecFromText(text: string): number | undefined {
  const m = text.match(/(\d+)\s*min/i);
  if (m) return Number(m[1]) * 60;
  return undefined;
}

export function emomActiveStationIndex(round: number, exerciseCount: number): number {
  if (exerciseCount <= 0) return 0;
  return (Math.max(1, round) - 1) % exerciseCount;
}

export function formatCountdown(seconds: number): string {
  return fmt(Math.max(0, seconds));
}

export function formatCountUp(seconds: number): string {
  return fmtUp(Math.max(0, Math.floor(seconds)));
}

const BODYWEIGHT_EQUIPMENT =
  /^(keines|körpergewicht|eigengewicht|bodyweight|none|kein\s+gerät)$/i;

export function isBodyweightEquipment(equipment?: string | null): boolean {
  const value = (equipment ?? "").trim();
  if (!value) return true;
  return BODYWEIGHT_EQUIPMENT.test(value);
}

export function stripOneRmFromNote(note: string): string {
  return note
    .replace(/\d+\s*x\s*\d+\s*@\s*\d+\s*%\s*1rm/gi, "")
    .replace(/@\s*\d+\s*%\s*1rm/gi, "")
    .replace(/\d+\s*%\s*1rm/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;–—-]+|[\s,;–—-]+$/g, "")
    .trim();
}

export function defaultMetconTargetReps(sets?: { reps?: number }[]): number {
  const fromSet = sets?.[0]?.reps;
  if (typeof fromSet === "number" && fromSet > 0) return fromSet;
  return 10;
}

export function formatMetconExerciseNote(targetReps: number): string {
  return `${targetReps} Wdh. pro Runde`;
}

export interface MetconExerciseLike {
  metric?: string;
  equipment?: string;
  note?: string;
  blockType?: string;
  sets?: { reps?: number; kg?: number; durationSec?: number; distanceM?: number }[];
}

/** MetCon exercises: rep targets per round, never % 1RM; bodyweight → metric reps. */
export function normalizeMetconExercise(ex: MetconExerciseLike): void {
  ex.blockType = "metcon";
  const bodyweight = isBodyweightEquipment(ex.equipment);
  const targetReps = defaultMetconTargetReps(ex.sets);

  if (bodyweight) {
    ex.metric = "reps";
    ex.sets = [{ reps: targetReps, kg: 0 }];
  } else if (!ex.metric || ex.metric === "weight_reps") {
    ex.metric = "weight_reps";
    ex.sets = [{ reps: targetReps, kg: 0 }];
  } else if (ex.metric === "reps") {
    ex.sets = [{ reps: targetReps, kg: 0 }];
  }

  const cleaned = stripOneRmFromNote(ex.note ?? "");
  if (!cleaned || /\d+\s*%\s*1rm/i.test(ex.note ?? "")) {
    ex.note = formatMetconExerciseNote(targetReps);
  } else if (/wdh\.?\s*pro\s*runde/i.test(cleaned)) {
    ex.note = cleaned;
  } else {
    ex.note = formatMetconExerciseNote(targetReps);
  }
}

export interface MetconBlockPersistInput {
  blockType: "metcon";
  format: MetconFormat;
  rounds?: number;
  timeCapSeconds?: number;
  intervalSeconds?: number;
  workSeconds?: number;
  restSeconds?: number;
  restBetweenRoundsSeconds?: number;
  prepSeconds?: number;
}

export function metconConfigToBlockInput(config: MetconConfig): MetconBlockPersistInput {
  const normalized = normalizeMetconConfig(config.format, config);
  return {
    blockType: "metcon",
    format: normalized.format,
    timeCapSeconds:
      normalized.format === "amrap"
        ? (normalized.durationSec ?? METCON_DEFAULTS.amrap.durationSec)
        : normalized.durationSec,
    rounds: normalized.rounds,
    intervalSeconds: normalized.intervalSec,
    workSeconds: normalized.workSec,
    restSeconds: normalized.restSec,
    restBetweenRoundsSeconds: normalized.restBetweenRoundsSec,
    prepSeconds: normalized.prepSec ?? 5,
  };
}

/** Synthetic block row for builder preview before save. */
export function metconConfigToPlanDayBlock(config: MetconConfig, id = "builder-metcon"): import("../data").PlanDayBlock {
  const input = metconConfigToBlockInput(config);
  return {
    id,
    blockType: "metcon",
    format: input.format,
    position: 3,
    rounds: input.rounds,
    timeCapSeconds: input.timeCapSeconds,
    intervalSeconds: input.intervalSeconds,
    workSeconds: input.workSeconds,
    restSeconds: input.restSeconds,
    restBetweenRoundsSeconds: input.restBetweenRoundsSeconds,
    prepSeconds: input.prepSeconds,
  };
}
