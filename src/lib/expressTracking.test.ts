import { describe, expect, it } from "vitest";
import type { SessionExercise } from "../data";
import {
  buildExpressTrackingWorkout,
  extractExpressTemplatesFromSession,
  groupExpressTemplatesByMuscleGroup,
  isExpressTrackingExercise,
  isExpressTrackingSessionTag,
  sessionExercisesToExpressTemplates,
} from "./expressTracking";

function sessionExercise(overrides: Partial<SessionExercise> & Pick<SessionExercise, "name">): SessionExercise {
  return {
    id: crypto.randomUUID(),
    metric: "weight_reps",
    sets: [{ kg: 80, reps: 8, done: true }],
    ...overrides,
  };
}

describe("isExpressTrackingSessionTag", () => {
  it("accepts current and legacy tags", () => {
    expect(isExpressTrackingSessionTag(["ExpressTracking"])).toBe(true);
    expect(isExpressTrackingSessionTag(["TurboTracking"])).toBe(true);
    expect(isExpressTrackingSessionTag(["Individuell"])).toBe(true);
    expect(isExpressTrackingSessionTag(["Plan"])).toBe(false);
  });
});

describe("isExpressTrackingExercise", () => {
  it("accepts straight_sets weight_reps", () => {
    expect(isExpressTrackingExercise({ metric: "weight_reps", blockFormat: "straight_sets" })).toBe(true);
  });

  it("rejects metcon and supersets", () => {
    expect(isExpressTrackingExercise({ blockType: "metcon", metric: "weight_reps" })).toBe(false);
    expect(isExpressTrackingExercise({ supersetId: "s1", metric: "weight_reps" })).toBe(false);
  });

  it("rejects amrap format", () => {
    expect(isExpressTrackingExercise({ metric: "weight_reps", blockFormat: "amrap" })).toBe(false);
  });
});

describe("sessionExercisesToExpressTemplates", () => {
  it("maps eligible exercises and skips others", () => {
    const result = sessionExercisesToExpressTemplates([
      sessionExercise({ name: "Bankdrücken", catalogExerciseId: "c1" }),
      sessionExercise({ name: "MetCon", blockType: "metcon" }),
      sessionExercise({ name: "A", supersetId: "s1" }),
      sessionExercise({ name: "Lauf", metric: "distance_time" }),
      sessionExercise({ name: "Circuit", blockFormat: "circuit" }),
    ]);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]?.name).toBe("Bankdrücken");
    expect(result.skippedMetcon).toBe(1);
    expect(result.skippedSuperset).toBe(1);
    expect(result.skippedMetric).toBe(1);
    expect(result.skippedFormat).toBe(1);
  });
});

describe("buildExpressTrackingWorkout", () => {
  it("builds uniform sets for all templates", () => {
    const wo = buildExpressTrackingWorkout({
      templates: [{ name: "Kniebeuge", templateKg: 100, templateReps: 5 }],
      setCount: 4,
    });
    expect(wo.name).toBe("ExpressTracking");
    expect(wo.exercises).toHaveLength(1);
    expect(wo.exercises[0]?.sets).toHaveLength(4);
    expect(wo.exercises[0]?.sets[0]?.kg).toBe(100);
    expect(wo.exercises[0]?.sets[0]?.reps).toBe(5);
    expect(wo.exercises[0]?.sets.every((s) => !s.done)).toBe(true);
  });
});

describe("groupExpressTemplatesByMuscleGroup", () => {
  it("groups templates by muscle group in catalog order", () => {
    const libraryById = new Map([
      [
        "c1",
        {
          id: "c1",
          name: "Bankdrücken",
          category: "strength" as const,
          group: "Brust",
          equip: "Langhantel",
          userId: null,
          metric: "weight_reps" as const,
        },
      ],
    ]);

    const grouped = groupExpressTemplatesByMuscleGroup(
      [
        { name: "Trizepsdrücken", group: "Trizeps" },
        { name: "Bankdrücken", catalogExerciseId: "c1" },
      ],
      libraryById,
    );

    expect(grouped.map((g) => g.group)).toEqual(["Brust", "Trizeps"]);
    expect(grouped[0]?.templates[0]?.name).toBe("Bankdrücken");
    expect(grouped[1]?.templates[0]?.name).toBe("Trizepsdrücken");
  });
});

describe("extractExpressTemplatesFromSession", () => {
  it("ignores timer sessions", () => {
    const result = extractExpressTemplatesFromSession({
      id: "1",
      day: "Mo",
      date: "1.1.",
      performedAt: new Date().toISOString(),
      name: "Timer",
      tags: ["Timer", "AMRAP"],
      dur: 10,
      vol: 0,
      sets: 0,
      pr: false,
      planDayId: null,
      skippedBlocks: [],
      exercises: [],
    });
    expect(result.templates).toHaveLength(0);
  });
});
