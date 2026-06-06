export type TrainingBlockType = "warmup" | "skill" | "strength" | "metcon";

export const BLOCK_ORDER: TrainingBlockType[] = ["warmup", "skill", "strength", "metcon"];

export const DEFAULT_ENABLED_BLOCKS: TrainingBlockType[] = [...BLOCK_ORDER];

export const BLOCK_LABELS: Record<TrainingBlockType, string> = {
  warmup: "Warm-up & Mobilität",
  skill: "Skill / Technik",
  strength: "Kraft",
  metcon: "MetCon",
};

/** Kurze Anleitung pro Baustein (ohne Zeitvorgaben). */
export const BLOCK_GUIDE_HINTS: Record<TrainingBlockType, string> = {
  warmup: "Eintruhen, Gelenke mobilisieren, Puls langsam steigern",
  skill: "Technik üben — leichte Last, saubere Wiederholungen",
  strength: "Hauptübungen und Assistance, progressive Last",
  metcon: "Kondition abschließen — AMRAP, EMOM oder Circuit",
};

/** Accent colors per block (subtle differentiation). */
export const BLOCK_ACCENT: Record<TrainingBlockType, string> = {
  warmup: "#f59e0b",
  skill: "#38bdf8",
  strength: "#c8ff00",
  metcon: "#f97316",
};

const BLOCK_SET = new Set<string>(BLOCK_ORDER);

export function isTrainingBlockType(value: string): value is TrainingBlockType {
  return BLOCK_SET.has(value);
}

export function normalizeEnabledBlocks(blocks: string[] | null | undefined): TrainingBlockType[] {
  if (!blocks?.length) return [...DEFAULT_ENABLED_BLOCKS];
  const seen = new Set<TrainingBlockType>();
  const result: TrainingBlockType[] = [];
  for (const block of blocks) {
    if (isTrainingBlockType(block) && !seen.has(block)) {
      seen.add(block);
      result.push(block);
    }
  }
  return result.length > 0 ? result : [...DEFAULT_ENABLED_BLOCKS];
}

export function visibleBlocksForDay(enabledBlocks: TrainingBlockType[]): TrainingBlockType[] {
  const enabled = new Set(enabledBlocks);
  return BLOCK_ORDER.filter((b) => enabled.has(b));
}

/** Bausteine, die am Tag deaktiviert sind (für „Baustein hinzufügen“). */
export function disabledBlocks(
  allBlocks: TrainingBlockType[] = DEFAULT_ENABLED_BLOCKS,
  enabled: TrainingBlockType[],
): TrainingBlockType[] {
  const enabledSet = new Set(enabled);
  return allBlocks.filter((b) => !enabledSet.has(b));
}

export function filterExercisesForSession<T extends { blockType?: TrainingBlockType }>(
  exercises: T[],
  enabledBlocks: TrainingBlockType[],
  skippedBlocks: TrainingBlockType[] = [],
): T[] {
  const enabled = new Set(enabledBlocks);
  const skipped = new Set(skippedBlocks);
  return exercises.filter((ex) => {
    const block = ex.blockType ?? "strength";
    return enabled.has(block) && !skipped.has(block);
  });
}

export interface WithBlockType {
  blockType?: TrainingBlockType;
}

export function groupExercisesByBlock<T extends WithBlockType>(
  exercises: T[],
  enabledBlocks: TrainingBlockType[] = DEFAULT_ENABLED_BLOCKS,
): { block: TrainingBlockType; exercises: T[] }[] {
  const visible = visibleBlocksForDay(enabledBlocks);
  const buckets = new Map<TrainingBlockType, T[]>();
  for (const block of visible) buckets.set(block, []);
  for (const ex of exercises) {
    const block = ex.blockType ?? "strength";
    if (!buckets.has(block)) continue;
    buckets.get(block)!.push(ex);
  }
  return visible.map((block) => ({ block, exercises: buckets.get(block) ?? [] }));
}

export function blockTypeLabel(block: TrainingBlockType): string {
  return BLOCK_LABELS[block];
}

export function skippedBlocksLabel(skipped: TrainingBlockType[]): string {
  if (skipped.length === 0) return "";
  return skipped.map((b) => BLOCK_LABELS[b]).join(", ");
}

/** Sort exercises by block order then position within block. */
export function sortExercisesByBlock<T extends WithBlockType & { position?: number }>(
  exercises: T[],
): T[] {
  return [...exercises].sort((a, b) => {
    const blockA = BLOCK_ORDER.indexOf(a.blockType ?? "strength");
    const blockB = BLOCK_ORDER.indexOf(b.blockType ?? "strength");
    if (blockA !== blockB) return blockA - blockB;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

export function assignBlockPositions<T extends WithBlockType>(
  exercises: T[],
): (T & { position: number })[] {
  const counters: Record<TrainingBlockType, number> = {
    warmup: 0,
    skill: 0,
    strength: 0,
    metcon: 0,
  };
  return exercises.map((ex) => {
    const block = ex.blockType ?? "strength";
    const position = counters[block];
    counters[block] += 1;
    return { ...ex, blockType: block, position };
  });
}

/** Sort DB rows by block order then position within block. */
export function sortPlanDayExerciseRows<
  T extends { block_type?: string | null; position: number },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const blockA = BLOCK_ORDER.indexOf(isTrainingBlockType(a.block_type ?? "") ? (a.block_type as TrainingBlockType) : "strength");
    const blockB = BLOCK_ORDER.indexOf(isTrainingBlockType(b.block_type ?? "") ? (b.block_type as TrainingBlockType) : "strength");
    if (blockA !== blockB) return blockA - blockB;
    return a.position - b.position;
  });
}
