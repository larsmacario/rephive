import { describe, expect, it } from "vitest";
import type { Exercise } from "./engine";
import { findNextExpressExercise, findNextExpressTarget, isWorkoutExpressEligible } from "./expressTrackingFlow";

function makeExercise(overrides: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    metric: "weight_reps",
    sets: [{ kg: 80, reps: 8, done: false }],
    ...overrides,
  };
}

describe("isWorkoutExpressEligible", () => {
  it("accepts linear weight_reps exercises", () => {
    const list = [makeExercise({ id: "1", name: "Bankdrücken" })];
    expect(isWorkoutExpressEligible(list)).toBe(true);
  });

  it("rejects supersets", () => {
    const list = [
      makeExercise({ id: "1", name: "A", supersetId: "s1" }),
      makeExercise({ id: "2", name: "B", supersetId: "s1" }),
    ];
    expect(isWorkoutExpressEligible(list)).toBe(false);
  });

  it("rejects non weight_reps metrics", () => {
    const list = [makeExercise({ id: "1", name: "Lauf", metric: "distance_time" })];
    expect(isWorkoutExpressEligible(list)).toBe(false);
  });
});

describe("findNextExpressExercise", () => {
  it("returns the next exercise in list order", () => {
    const list = [
      makeExercise({ id: "1", name: "Bankdrücken" }),
      makeExercise({ id: "2", name: "Rudern" }),
      makeExercise({ id: "3", name: "Schulterdrücken" }),
    ];
    expect(findNextExpressExercise(list, "1")).toEqual({
      exerciseId: "2",
      exerciseName: "Rudern",
    });
    expect(findNextExpressExercise(list, "2")).toEqual({
      exerciseId: "3",
      exerciseName: "Schulterdrücken",
    });
  });

  it("returns null for the last exercise", () => {
    const list = [
      makeExercise({ id: "1", name: "A" }),
      makeExercise({ id: "2", name: "B" }),
    ];
    expect(findNextExpressExercise(list, "2")).toBeNull();
  });

  it("returns null for unknown exercise id", () => {
    const list = [makeExercise({ id: "1", name: "A" })];
    expect(findNextExpressExercise(list, "missing")).toBeNull();
  });
});

describe("findNextExpressTarget", () => {
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
    const t = findNextExpressTarget(list);
    expect(t?.exerciseId).toBe("1");
    expect(t?.setIndex).toBe(1);
  });
});
