import type { LibraryPlan, PlanDay, PlanDayBlock, PlanDayExercise, PlanSummary } from "../../data";
import { mergePlanSummaryWithTrainingWeekdays } from "../trainingWeekdays";
import type { ExerciseMetric } from "../exerciseCatalog";
import {
  assignBlockPositions,
  BLOCK_ORDER,
  inferBlockFormatForExercises,
  normalizeBlockFormat,
  normalizeEnabledBlocks,
  type BlockFormat,
  type TrainingBlockType,
} from "../planBlocks";

interface PlanDayBlockInput {
  id?: string;
  blockType: TrainingBlockType;
  format?: BlockFormat;
  rounds?: number;
  timeCapSeconds?: number;
  intervalSeconds?: number;
  workSeconds?: number;
  restSeconds?: number;
  restBetweenRoundsSeconds?: number;
  prepSeconds?: number;
  note?: string;
}

interface PlanDayExerciseInput {
  id?: string;
  name: string;
  note?: string;
  blockType?: TrainingBlockType;
  supersetId?: string;
  catalogExerciseId?: string | null;
  metric: ExerciseMetric;
  sets: { reps: number; kg: number; durationSec?: number; distanceM?: number; warmUp?: boolean }[];
}

interface CreatePlanDayInput {
  name?: string;
  note?: string;
  enabledBlocks?: TrainingBlockType[];
  blockConfigs?: PlanDayBlockInput[];
  exercises: PlanDayExerciseInput[];
}

export interface OfflineCreatePlanInput {
  name: string;
  sub?: string;
  days: CreatePlanDayInput[];
  activate?: boolean;
  summary?: PlanSummary | null;
  trainingWeekdays?: number[];
}

export interface OfflineUpdatePlanInput {
  name: string;
  sub?: string;
  days: CreatePlanDayInput[];
  trainingWeekdays?: number[];
}

function buildDayBlocks(
  exercises: PlanDayExerciseInput[],
  blockConfigs: PlanDayBlockInput[] = [],
): PlanDayBlock[] {
  const positioned = assignBlockPositions(
    exercises.map((e) => ({ ...e, blockType: e.blockType ?? "strength" })),
  );

  const byBlockType = new Map<TrainingBlockType, typeof positioned>();
  for (const exercise of positioned) {
    const list = byBlockType.get(exercise.blockType) ?? [];
    list.push(exercise);
    byBlockType.set(exercise.blockType, list);
  }

  const presentBlockTypes = BLOCK_ORDER.filter(
    (blockType) => (byBlockType.get(blockType)?.length ?? 0) > 0,
  );

  const configByType = new Map(blockConfigs.map((c) => [c.blockType, c] as const));

  return presentBlockTypes.map((blockType, position) => {
    const cfg = configByType.get(blockType);
    const inferred = inferBlockFormatForExercises(blockType, byBlockType.get(blockType) ?? []);
    return {
      id: cfg?.id ?? crypto.randomUUID(),
      blockType,
      format: normalizeBlockFormat(cfg?.format ?? inferred),
      position,
      rounds: cfg?.rounds,
      timeCapSeconds: cfg?.timeCapSeconds,
      intervalSeconds: cfg?.intervalSeconds,
      workSeconds: cfg?.workSeconds,
      restSeconds: cfg?.restSeconds,
      restBetweenRoundsSeconds: cfg?.restBetweenRoundsSeconds,
      prepSeconds: cfg?.prepSeconds ?? 5,
      note: cfg?.note,
    };
  });
}

function buildDayExercises(
  exercises: PlanDayExerciseInput[],
  blocks: PlanDayBlock[],
): PlanDayExercise[] {
  const positioned = assignBlockPositions(
    exercises.map((e) => ({ ...e, blockType: e.blockType ?? "strength" })),
  );
  const blockIdByType = new Map(blocks.map((b) => [b.blockType, b.id]));
  const blockFormatByType = new Map(blocks.map((b) => [b.blockType, b.format]));

  return positioned.map((e) => ({
    id: e.id ?? crypto.randomUUID(),
    name: e.name,
    note: e.note,
    blockId: blockIdByType.get(e.blockType),
    blockType: e.blockType,
    blockFormat: blockFormatByType.get(e.blockType),
    supersetId: e.supersetId,
    catalogExerciseId: e.catalogExerciseId ?? null,
    metric: e.metric as ExerciseMetric,
    sets: e.sets.map((s) => ({
      reps: s.reps,
      kg: s.kg,
      done: false,
      ...(s.durationSec != null ? { durationSec: s.durationSec } : {}),
      ...(s.distanceM != null ? { distanceM: s.distanceM } : {}),
      ...(s.warmUp ? { warmUp: true } : {}),
    })),
  }));
}

function buildPlanDay(
  dayId: string,
  position: number,
  dayInput: CreatePlanDayInput,
): PlanDay {
  const enabledBlocks = normalizeEnabledBlocks(dayInput.enabledBlocks);
  const blocks = buildDayBlocks(dayInput.exercises, dayInput.blockConfigs ?? []);
  return {
    id: dayId,
    position,
    name: dayInput.name?.trim() || `Tag ${position + 1}`,
    note: dayInput.note,
    enabledBlocks,
    blocks,
    exercises: buildDayExercises(dayInput.exercises, blocks),
  };
}

export function buildLibraryPlanFromCreateInput(
  planId: string,
  dayIds: string[],
  input: OfflineCreatePlanInput,
): LibraryPlan {
  const days = input.days.map((d, i) => buildPlanDay(dayIds[i] ?? crypto.randomUUID(), i, d));
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  return {
    id: planId,
    name: input.name,
    sub: input.sub ?? `${days.length} Tag${days.length === 1 ? "" : "e"} · ${totalExercises} Übung${totalExercises === 1 ? "" : "en"}`,
    isActive: input.activate ?? false,
    currentDay: 0,
    days,
    summary: mergePlanSummaryWithTrainingWeekdays(input.summary, input.trainingWeekdays),
    trainingWeekdays: input.trainingWeekdays ?? input.summary?.inputs?.trainingWeekdays,
  };
}

export function buildLibraryPlanFromUpdateInput(
  existing: LibraryPlan,
  input: OfflineUpdatePlanInput,
): LibraryPlan {
  const dayIds = input.days.map((_, i) => existing.days[i]?.id ?? crypto.randomUUID());
  const days = input.days.map((d, i) => buildPlanDay(dayIds[i]!, i, d));
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
  const currentDay = existing.currentDay >= days.length ? 0 : existing.currentDay;

  const trainingWeekdays = input.trainingWeekdays ?? existing.trainingWeekdays;

  return {
    ...existing,
    name: input.name,
    sub: input.sub ?? `${days.length} Tag${days.length === 1 ? "" : "e"} · ${totalExercises} Übung${totalExercises === 1 ? "" : "en"}`,
    currentDay,
    days,
    trainingWeekdays,
    summary: mergePlanSummaryWithTrainingWeekdays(existing.summary, trainingWeekdays),
  };
}
