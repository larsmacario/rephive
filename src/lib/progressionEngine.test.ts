import { describe, expect, it } from "vitest";
import {
  computeNextTarget,
  computeProgressTrend,
  detectPlateau,
  formatLastPerformanceHint,
  inferExerciseBlockFormat,
  inferTargetRepRange,
  isAutopilotEligible,
  isWorkingSetPr,
  resolveWeightIncrement,
  roundToKgStep,
  suggestDeload,
  type LastPerformance,
} from "./progressionEngine";
import type { WorkoutSet } from "./engine";

const planSets: WorkoutSet[] = [
  { reps: 10, kg: 0, done: false },
  { reps: 10, kg: 0, done: false },
  { reps: 10, kg: 0, done: false },
];

const lastAtMax: LastPerformance = {
  sessionId: "s1",
  performedAt: "2026-06-01T10:00:00Z",
  metric: "weight_reps",
  blockFormat: "straight_sets",
  sets: [
    { reps: 10, kg: 80, done: true },
    { reps: 10, kg: 80, done: true },
    { reps: 10, kg: 80, done: true },
  ],
};

describe("isAutopilotEligible", () => {
  it("allows strength formats", () => {
    expect(isAutopilotEligible("straight_sets", "weight_reps")).toBe(true);
    expect(isAutopilotEligible("superset", "weight_reps")).toBe(true);
    expect(isAutopilotEligible("circuit", "reps")).toBe(true);
    expect(isAutopilotEligible("for_time", "time")).toBe(true);
  });

  it("rejects unsupported metric on circuit", () => {
    expect(isAutopilotEligible("circuit", "weight_time")).toBe(false);
  });
});

describe("double progression", () => {
  it("adds weight when all working sets hit rep max", () => {
    const result = computeNextTarget({
      lastPerformance: lastAtMax,
      planSets,
      format: "straight_sets",
      metric: "weight_reps",
      targetRepsMin: 8,
      targetRepsMax: 10,
      weightIncrementKg: 2.5,
    });
    expect(result[0].kg).toBe(82.5);
    expect(result[0].reps).toBe(8);
    expect(result[0].source).toBe("progression");
    expect(result[0].progressionNote).toBe("+2.5 kg");
  });

  it("adds one rep when below rep max", () => {
    const result = computeNextTarget({
      lastPerformance: {
        ...lastAtMax,
        sets: [
          { reps: 8, kg: 80, done: true },
          { reps: 8, kg: 80, done: true },
        ],
      },
      planSets: planSets.slice(0, 2),
      format: "straight_sets",
      metric: "weight_reps",
      targetRepsMax: 10,
      weightIncrementKg: 2.5,
    });
    expect(result[0].kg).toBe(80);
    expect(result[0].reps).toBe(9);
    expect(result[0].progressionNote).toBe("Reps +1");
  });

  it("preserves warm-up without progression load bump", () => {
    const result = computeNextTarget({
      lastPerformance: {
        ...lastAtMax,
        sets: [
          { reps: 8, kg: 40, done: true, warmUp: true },
          { reps: 10, kg: 80, done: true },
        ],
      },
      planSets: planSets.slice(0, 2),
      format: "straight_sets",
      metric: "weight_reps",
      targetRepsMax: 10,
      weightIncrementKg: 2.5,
    });
    expect(result[0].warmUp).toBe(true);
    expect(result[0].kg).toBe(40);
    expect(result[1].kg).toBe(82.5);
  });

  it("applies deload multiplier", () => {
    const result = computeNextTarget({
      lastPerformance: lastAtMax,
      planSets: planSets.slice(0, 1),
      format: "straight_sets",
      metric: "weight_reps",
      applyDeload: true,
    });
    expect(result[0].kg).toBe(72.5);
    expect(result[0].source).toBe("deload");
  });
});

describe("resolveWeightIncrement", () => {
  it("uses lower increment for leg muscles", () => {
    expect(resolveWeightIncrement("Beine", { weightIncrementUpperKg: 2.5, weightIncrementLowerKg: 5 })).toBe(5);
    expect(resolveWeightIncrement("Brust")).toBe(2.5);
  });
});

describe("plateau and trend", () => {
  it("detects plateau over 3 sessions", () => {
    const history: LastPerformance[] = [1, 2, 3].map((n) => ({
      ...lastAtMax,
      sessionId: `s${n}`,
      sets: [{ reps: 8, kg: 80, done: true }],
    }));
    expect(detectPlateau(history, 3).plateaued).toBe(true);
  });

  it("computes progress trend", () => {
    const history: LastPerformance[] = [
      { ...lastAtMax, performedAt: "2026-06-07T10:00:00Z", sets: [{ reps: 10, kg: 90, done: true }] },
      { ...lastAtMax, performedAt: "2026-05-01T10:00:00Z", sets: [{ reps: 10, kg: 80, done: true }] },
    ];
    expect(computeProgressTrend(history)?.label).toMatch(/\+10 kg/);
  });

  it("suggests deload", () => {
    expect(suggestDeload(lastAtMax).kgMultiplier).toBe(0.9);
  });
});

describe("mirror and hints", () => {
  it("returns plan defaults without history", () => {
    const result = computeNextTarget({
      lastPerformance: null,
      planSets,
      format: "straight_sets",
      metric: "weight_reps",
    });
    expect(result.every((s) => s.source === "plan_default")).toBe(true);
  });

  it("formats last performance hint", () => {
    expect(formatLastPerformanceHint(lastAtMax.sets, "weight_reps")).toBe("Letzte Session: 3×80 kg × 10");
  });

  it("detects working set PR", () => {
    const pr = isWorkingSetPr(
      [{ reps: 10, kg: 85, done: true }],
      [lastAtMax],
      "weight_reps",
    );
    expect(pr).toBe(true);
  });
});

describe("helpers", () => {
  it("rounds to kg step", () => {
    expect(roundToKgStep(82.6)).toBe(82.5);
  });

  it("infers rep range from plan", () => {
    expect(inferTargetRepRange([{ reps: 12, kg: 0, done: false }])).toEqual({ min: 10, max: 12 });
  });

  it("prefers blockFormat from plan_day_blocks over heuristics", () => {
    expect(inferExerciseBlockFormat({ blockFormat: "emom", blockType: "metcon", supersetId: "x" })).toBe("emom");
    expect(inferExerciseBlockFormat({ blockType: "metcon" })).toBe("amrap");
  });
});
