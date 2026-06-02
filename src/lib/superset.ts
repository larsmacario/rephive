export interface WithSuperset {
  id: string;
  supersetId?: string;
}

/** Exercise shape for rest-round logic (needs set count). */
export interface SupersetExercise extends WithSuperset {
  sets: { done?: boolean }[];
}

export type ExerciseSegment<T extends WithSuperset = WithSuperset> =
  | { kind: "single"; exercise: T; index: number }
  | { kind: "superset"; exercises: T[]; startIndex: number };

/** Split a flat exercise list into singles and contiguous superset blocks (min 2 per block). */
export function segmentExercises<T extends WithSuperset>(exercises: T[]): ExerciseSegment<T>[] {
  const segments: ExerciseSegment<T>[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    const sid = ex.supersetId;
    if (!sid) {
      segments.push({ kind: "single", exercise: ex, index: i });
      i++;
      continue;
    }
    const block: T[] = [ex];
    let j = i + 1;
    while (j < exercises.length && exercises[j].supersetId === sid) {
      block.push(exercises[j]);
      j++;
    }
    if (block.length >= 2) {
      segments.push({ kind: "superset", exercises: block, startIndex: i });
    } else {
      segments.push({ kind: "single", exercise: ex, index: i });
    }
    i = j;
  }
  return segments;
}

/** Remove orphan superset ids (single exercise or non-contiguous runs). */
export function sanitizeSupersetIds<T extends WithSuperset>(exercises: T[]): T[] {
  const segments = segmentExercises(exercises);
  return exercises.map((ex, idx) => {
    const seg = segments.find(
      (s) =>
        (s.kind === "single" && s.index === idx) ||
        (s.kind === "superset" && s.exercises.some((e) => e.id === ex.id)),
    );
    if (seg?.kind === "single") {
      return ex.supersetId ? { ...ex, supersetId: undefined } : ex;
    }
    return ex;
  });
}

function getContiguousBlock<T extends WithSuperset>(exercises: T[], exId: string): T[] {
  const idx = exercises.findIndex((e) => e.id === exId);
  if (idx < 0) return [];
  const sid = exercises[idx].supersetId;
  if (!sid) return [];
  let start = idx;
  while (start > 0 && exercises[start - 1].supersetId === sid) start--;
  let end = idx;
  while (end < exercises.length - 1 && exercises[end + 1].supersetId === sid) end++;
  const block = exercises.slice(start, end + 1);
  return block.length >= 2 ? block : [];
}

/**
 * Rest after marking set `setIndex` done on `exId`.
 * For supersets: only when this exercise is the last in the block that still has this set index.
 */
export function shouldStartRestAfterSet<T extends SupersetExercise>(
  exercises: T[],
  exId: string,
  setIndex: number,
): boolean {
  const ex = exercises.find((e) => e.id === exId);
  if (!ex?.supersetId) return true;

  const block = getContiguousBlock(exercises, exId);
  if (block.length < 2) return true;

  const withSet = block.filter((e) => e.sets.length > setIndex);
  if (withSet.length === 0) return false;

  const lastInRound = withSet[withSet.length - 1];
  return lastInRound.id === exId;
}

export function isLinkedWithPrevious<T extends WithSuperset>(exercises: T[], exId: string): boolean {
  const idx = exercises.findIndex((e) => e.id === exId);
  if (idx <= 0) return false;
  const cur = exercises[idx];
  const prev = exercises[idx - 1];
  return Boolean(cur.supersetId && cur.supersetId === prev.supersetId);
}

/** Link exercise at index with the previous one (same superset_id). */
export function linkWithPrevious<T extends WithSuperset>(exercises: T[], exId: string): T[] {
  const idx = exercises.findIndex((e) => e.id === exId);
  if (idx <= 0) return exercises;
  const prev = exercises[idx - 1];
  const id = prev.supersetId ?? crypto.randomUUID();
  return exercises.map((e, i) => {
    if (i === idx - 1) return { ...e, supersetId: id };
    if (i === idx) return { ...e, supersetId: id };
    return e;
  });
}

/** Remove exercise from its superset; collapse single-member groups. */
export function unlinkFromSuperset<T extends WithSuperset>(exercises: T[], exId: string): T[] {
  const idx = exercises.findIndex((e) => e.id === exId);
  if (idx < 0) return exercises;
  const sid = exercises[idx].supersetId;
  if (!sid) return exercises;

  const next = exercises.map((e) => (e.id === exId ? { ...e, supersetId: undefined } : e));
  return sanitizeSupersetIds(next);
}

/** Next exercise id in the same superset block after exId, or undefined. */
export function nextInSupersetBlock<T extends WithSuperset>(
  exercises: T[],
  exId: string,
): string | undefined {
  const block = getContiguousBlock(exercises, exId);
  if (block.length < 2) return undefined;
  const pos = block.findIndex((e) => e.id === exId);
  if (pos < 0 || pos >= block.length - 1) return undefined;
  return block[pos + 1].id;
}
