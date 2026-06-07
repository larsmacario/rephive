import { describe, expect, it } from "vitest";
import type { SessionExercise } from "../data";
import {
  buildTurboTrackingWorkout,
  extractTurboTemplatesFromSession,
  groupTurboTemplatesByMuscleGroup,
  isTurboTrackingExercise,
  sessionExercisesToTurboTemplates,
} from "./turboTracking";

function sessionExercise(overrides: Partial<SessionExercise> & Pick<SessionExercise, "name">): SessionExercise {
  return {
    id: crypto.randomUUID(),
    metric: "weight_reps",
    sets: [{ kg: 80, reps: 8, done: true }],
    ...overrides,
  };
}

describe("isTurboTrackingExercise", () => {
  it("accepts straight_sets weight_reps", () => {
    expect(isTurboTrackingExercise({ metric: "weight_reps", blockFormat: "straight_sets" })).toBe(true);
  });

  it("rejects metcon and supersets", () => {
    expect(isTurboTrackingExercise({ blockType: "metcon", metric: "weight_reps" })).toBe(false);
    expect(isTurboTrackingExercise({ supersetId: "s1", metric: "weight_reps" })).toBe(false);
  });

  it("rejects amrap format", () => {
    expect(isTurboTrackingExercise({ metric: "weight_reps", blockFormat: "amrap" })).toBe(false);
  });
});

describe("sessionExercisesToTurboTemplates", () => {
  it("maps eligible exercises and skips others", () => {
    const result = sessionExercisesToTurboTemplates([
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

describe("buildTurboTrackingWorkout", () => {
  it("builds uniform sets for all templates", () => {
    const wo = buildTurboTrackingWorkout({
      templates: [{ name: "Kniebeuge", templateKg: 100, templateReps: 5 }],
      setCount: 4,
    });
    expect(wo.name).toBe("TurboTracking");
    expect(wo.exercises).toHaveLength(1);
    expect(wo.exercises[0]?.sets).toHaveLength(4);
    expect(wo.exercises[0]?.sets[0]?.kg).toBe(100);
    expect(wo.exercises[0]?.sets[0]?.reps).toBe(5);
    expect(wo.exercises[0]?.sets.every((s) => !s.done)).toBe(true);
  });
});

describe("groupTurboTemplatesByMuscleGroup", () => {
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

    const grouped = groupTurboTemplatesByMuscleGroup(
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

describe("extractTurboTemplatesFromSession", () => {
  it("ignores timer sessions", () => {
    const result = extractTurboTemplatesFromSession({
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
