import { describe, expect, it } from "vitest";
import type { Exercise } from "./engine";
import { findNextTurboExercise, findNextTurboTarget, isWorkoutTurboEligible } from "./frictionTurbo";

function makeExercise(overrides: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    metric: "weight_reps",
    sets: [{ kg: 80, reps: 8, done: false }],
    ...overrides,
  };
}

describe("isWorkoutTurboEligible", () => {
  it("accepts linear weight_reps exercises", () => {
    const list = [makeExercise({ id: "1", name: "Bankdrücken" })];
    expect(isWorkoutTurboEligible(list)).toBe(true);
  });

  it("rejects supersets", () => {
    const list = [
      makeExercise({ id: "1", name: "A", supersetId: "s1" }),
      makeExercise({ id: "2", name: "B", supersetId: "s1" }),
    ];
    expect(isWorkoutTurboEligible(list)).toBe(false);
  });

  it("rejects non weight_reps metrics", () => {
    const list = [makeExercise({ id: "1", name: "Lauf", metric: "distance_time" })];
    expect(isWorkoutTurboEligible(list)).toBe(false);
  });
});

describe("findNextTurboExercise", () => {
  it("returns the next exercise in list order", () => {
    const list = [
      makeExercise({ id: "1", name: "Bankdrücken" }),
      makeExercise({ id: "2", name: "Rudern" }),
      makeExercise({ id: "3", name: "Schulterdrücken" }),
    ];
    expect(findNextTurboExercise(list, "1")).toEqual({
      exerciseId: "2",
      exerciseName: "Rudern",
    });
    expect(findNextTurboExercise(list, "2")).toEqual({
      exerciseId: "3",
      exerciseName: "Schulterdrücken",
    });
  });

  it("returns null for the last exercise", () => {
    const list = [
      makeExercise({ id: "1", name: "A" }),
      makeExercise({ id: "2", name: "B" }),
    ];
    expect(findNextTurboExercise(list, "2")).toBeNull();
  });

  it("returns null for unknown exercise id", () => {
    const list = [makeExercise({ id: "1", name: "A" })];
    expect(findNextTurboExercise(list, "missing")).toBeNull();
  });
});

describe("findNextTurboTarget", () => {
  it("returns first undone set across exercises", () => {
    const list = [
      makeExercise({
        id: "1",
        name: "A",
        sets: [
          { kg: 80, reps: 8, done: true },
          { kg: 80, reps: 8, done: false },
        ],
      }),
      makeExercise({ id: "2", name: "B" }),
    ];
    const t = findNextTurboTarget(list);
    expect(t?.exerciseId).toBe("1");
    expect(t?.setIndex).toBe(1);
  });
});
