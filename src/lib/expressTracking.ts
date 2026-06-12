import type { HistoryEntry, LibraryExercise, SessionExercise } from "../data";
import { EXPRESS_TRACKING_SESSION_NAME } from "../data";
import { DEFAULT_EXERCISE_METRIC, MUSCLE_GROUPS, normalizeMuscleGroup } from "./exerciseCatalog";
import type { Exercise, Workout, WorkoutSet } from "./engine";
import { buildUniformTrackedSets } from "./exerciseSets";
import { inferExerciseBlockFormat } from "./progressionEngine";
import type { TrainingBlockType } from "./planBlocks";
import type { ExerciseMetric } from "./exerciseCatalog";
import { isTimerSession } from "./timerSession";

/** Re-enable voice PTT in ExpressTrackingView when STT is stable on device. */
export const EXPRESS_VOICE_ENABLED = false;

export const EXPRESS_TRACKING_TAG = "ExpressTracking";
export const LEGACY_EXPRESS_TRACKING_TAG_TURBO = "TurboTracking";
export const LEGACY_EXPRESS_TRACKING_TAG_INDIVIDUELL = "Individuell";

export function isExpressTrackingSessionTag(tags: string[]): boolean {
  return (
    tags.includes(EXPRESS_TRACKING_TAG) ||
    tags.includes(LEGACY_EXPRESS_TRACKING_TAG_TURBO) ||
    tags.includes(LEGACY_EXPRESS_TRACKING_TAG_INDIVIDUELL)
  );
}

export interface ExpressTrackingExerciseTemplate {
  name: string;
  catalogExerciseId?: string;
  group?: string;
  note?: string;
  templateKg?: number;
  templateReps?: number;
}

export interface ExpressTrackingImportResult {
  templates: ExpressTrackingExerciseTemplate[];
  skippedMetcon: number;
  skippedFormat: number;
  skippedSuperset: number;
  skippedMetric: number;
}

function templateFromWorkingSet(sets: WorkoutSet[]): { kg: number; reps: number } {
  const working = sets.find((s) => !s.warmUp) ?? sets[0];
  if (!working) return { kg: 0, reps: 10 };
  return { kg: working.kg ?? 0, reps: Math.max(1, working.reps ?? 10) };
}

export function isExpressTrackingExercise(ex: {
  metric?: ExerciseMetric;
  blockType?: TrainingBlockType;
  blockFormat?: SessionExercise["blockFormat"];
  supersetId?: string;
}): boolean {
  if (ex.blockType === "metcon") return false;
  if (ex.supersetId) return false;
  const metric = ex.metric ?? DEFAULT_EXERCISE_METRIC;
  if (metric !== "weight_reps") return false;
  const format = inferExerciseBlockFormat(ex);
  return format === "straight_sets";
}

export function isExpressTrackingLibraryExercise(ex: LibraryExercise): boolean {
  return ex.metric === "weight_reps";
}

export function sessionExercisesToExpressTemplates(
  exercises: SessionExercise[],
): ExpressTrackingImportResult {
  const templates: ExpressTrackingExerciseTemplate[] = [];
  let skippedMetcon = 0;
  let skippedFormat = 0;
  let skippedSuperset = 0;
  let skippedMetric = 0;

  for (const ex of exercises) {
    if (ex.blockType === "metcon") {
      skippedMetcon += 1;
      continue;
    }
    if (ex.supersetId) {
      skippedSuperset += 1;
      continue;
    }
    const metric = ex.metric ?? DEFAULT_EXERCISE_METRIC;
    if (metric !== "weight_reps") {
      skippedMetric += 1;
      continue;
    }
    const format = inferExerciseBlockFormat(ex);
    if (format !== "straight_sets") {
      skippedFormat += 1;
      continue;
    }
    const { kg, reps } = templateFromWorkingSet(ex.sets);
    templates.push({
      name: ex.name,
      catalogExerciseId: ex.catalogExerciseId,
      note: ex.note,
      templateKg: kg,
      templateReps: reps,
    });
  }

  return { templates, skippedMetcon, skippedFormat, skippedSuperset, skippedMetric };
}

export function extractExpressTemplatesFromSession(session: HistoryEntry): ExpressTrackingImportResult {
  if (isTimerSession(session.tags)) {
    return {
      templates: [],
      skippedMetcon: 0,
      skippedFormat: 0,
      skippedSuperset: 0,
      skippedMetric: 0,
    };
  }
  return sessionExercisesToExpressTemplates(session.exercises);
}

export function libraryExercisesToExpressTemplates(
  exercises: LibraryExercise[],
): ExpressTrackingExerciseTemplate[] {
  return exercises.filter(isExpressTrackingLibraryExercise).map((ex) => ({
    name: ex.name,
    catalogExerciseId: ex.id,
    group: ex.group,
    note: `${ex.group} · ${ex.equip}`,
  }));
}

export function resolveExpressTemplateMuscleGroup(
  template: ExpressTrackingExerciseTemplate,
  libraryById: ReadonlyMap<string, LibraryExercise>,
): string {
  if (template.group) return normalizeMuscleGroup(template.group);
  if (template.catalogExerciseId) {
    const lib = libraryById.get(template.catalogExerciseId);
    if (lib) return normalizeMuscleGroup(lib.group);
  }
  const noteGroup = template.note?.split(" · ")[0]?.trim();
  if (noteGroup) return normalizeMuscleGroup(noteGroup);
  return "Sonstige";
}

export function groupExpressTemplatesByMuscleGroup(
  templates: ExpressTrackingExerciseTemplate[],
  libraryById: ReadonlyMap<string, LibraryExercise>,
): { group: string; templates: ExpressTrackingExerciseTemplate[] }[] {
  const buckets = new Map<string, ExpressTrackingExerciseTemplate[]>();
  for (const template of templates) {
    const group = resolveExpressTemplateMuscleGroup(template, libraryById);
    const list = buckets.get(group) ?? [];
    list.push(template);
    buckets.set(group, list);
  }

  const ordered: { group: string; templates: ExpressTrackingExerciseTemplate[] }[] = [];
  for (const group of MUSCLE_GROUPS) {
    const groupTemplates = buckets.get(group);
    if (groupTemplates?.length) ordered.push({ group, templates: groupTemplates });
  }

  const sonstige = buckets.get("Sonstige");
  if (sonstige?.length) ordered.push({ group: "Sonstige", templates: sonstige });

  for (const [group, groupTemplates] of buckets) {
    if (
      groupTemplates.length > 0 &&
      !MUSCLE_GROUPS.includes(group as (typeof MUSCLE_GROUPS)[number]) &&
      group !== "Sonstige"
    ) {
      ordered.push({ group, templates: groupTemplates });
    }
  }

  return ordered;
}

export function buildExpressTrackingWorkout(input: {
  templates: ExpressTrackingExerciseTemplate[];
  setCount: number;
  defaultReps?: number;
}): Workout {
  const defaultReps = input.defaultReps ?? 10;
  const setCount = Math.max(1, input.setCount);

  const exercises: Exercise[] = input.templates.map((t) => {
    const reps = t.templateReps ?? defaultReps;
    const kg = t.templateKg ?? 0;
    return {
      id: crypto.randomUUID(),
      name: t.name,
      note: t.note,
      catalogExerciseId: t.catalogExerciseId,
      metric: "weight_reps",
      blockFormat: "straight_sets",
      sets: buildUniformTrackedSets(setCount, reps, kg, false, "weight_reps"),
    };
  });

  return {
    name: EXPRESS_TRACKING_SESSION_NAME,
    sub: "",
    exercises,
  };
}

export function countSkippedExpressImport(result: ExpressTrackingImportResult): number {
  return result.skippedMetcon + result.skippedFormat + result.skippedSuperset + result.skippedMetric;
}

export function expressImportSkipMessage(result: ExpressTrackingImportResult): string | null {
  const parts: string[] = [];
  if (result.skippedSuperset > 0) {
    parts.push(`${result.skippedSuperset} Supersatz-Übung${result.skippedSuperset === 1 ? "" : "en"}`);
  }
  if (result.skippedMetcon > 0 || result.skippedFormat > 0) {
    const n = result.skippedMetcon + result.skippedFormat;
    parts.push(`${n} MetCon/AMRAP/Circuit-Übung${n === 1 ? "" : "en"}`);
  }
  if (result.skippedMetric > 0) {
    parts.push(`${result.skippedMetric} andere Metrik`);
  }
  if (parts.length === 0) return null;
  return `${parts.join(", ")} nicht übernommen.`;
}
