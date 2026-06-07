import { describe, expect, it } from "vitest";
import { carrySetValuesToNext } from "./exerciseSets";

type TestSet = {
  reps: number;
  kg: number;
  done: boolean;
  warmUp?: boolean;
  suggested?: boolean;
  durationSec?: number;
  distanceM?: number;
};

describe("carrySetValuesToNext", () => {
  it("copies kg/reps from set 1 to set 2 and clears suggested", () => {
    const sets: TestSet[] = [
      { kg: 80, reps: 8, done: true },
      { kg: 60, reps: 10, done: false, suggested: true },
    ];
    const result = carrySetValuesToNext(sets, 0, "weight_reps");
    expect(result).not.toBeNull();
    expect(result![1]).toEqual({ kg: 80, reps: 8, done: false });
    expect(result![1].suggested).toBeUndefined();
  });

  it("skips carry when source set is warm-up", () => {
    const sets: TestSet[] = [
      { kg: 40, reps: 10, done: true, warmUp: true },
      { kg: 80, reps: 8, done: false, suggested: true },
    ];
    expect(carrySetValuesToNext(sets, 0, "weight_reps")).toBeNull();
  });

  it("copies from set 2 to set 3", () => {
    const sets: TestSet[] = [
      { kg: 80, reps: 8, done: true },
      { kg: 82.5, reps: 8, done: true },
      { kg: 60, reps: 10, done: false },
    ];
    const result = carrySetValuesToNext(sets, 1, "weight_reps");
    expect(result![2]).toEqual({ kg: 82.5, reps: 8, done: false });
  });

  it("returns null for last set", () => {
    const sets: TestSet[] = [{ kg: 80, reps: 8, done: true }];
    expect(carrySetValuesToNext(sets, 0, "weight_reps")).toBeNull();
  });

  it("returns null when target set is already done", () => {
    const sets: TestSet[] = [
      { kg: 80, reps: 8, done: true },
      { kg: 80, reps: 8, done: true },
    ];
    expect(carrySetValuesToNext(sets, 0, "weight_reps")).toBeNull();
  });

  it("copies duration and distance for cardio metrics", () => {
    const sets: TestSet[] = [
      { kg: 0, reps: 0, done: true, durationSec: 600, distanceM: 2000 },
      { kg: 0, reps: 0, done: false, durationSec: 300, distanceM: 1000 },
    ];
    const result = carrySetValuesToNext(sets, 0, "distance_time");
    expect(result![1].durationSec).toBe(600);
    expect(result![1].distanceM).toBe(2000);
  });
});
