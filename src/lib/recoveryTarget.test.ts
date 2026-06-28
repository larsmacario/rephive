import { describe, expect, it } from "vitest";
import type { LibraryPlan } from "../data";
import { DEFAULT_PREFERENCES } from "./preferences";
import { resolveWaterTargetMl } from "./recoveryTarget";

function planWithWater(waterMl: number): LibraryPlan {
  return {
    summary: { nutrition: { water_ml: waterMl } },
  } as LibraryPlan;
}

describe("resolveWaterTargetMl", () => {
  it("priorisiert persönliche Einstellung vor Plan und Profil", () => {
    const result = resolveWaterTargetMl({
      activePlan: planWithWater(3200),
      preferences: { ...DEFAULT_PREFERENCES, waterTargetMl: 2750 },
      latestMeasurement: { weightKg: 90 } as never,
    });
    expect(result).toMatchObject({ waterTargetMl: 2750, waterSource: "preference" });
  });

  it("verwendet anschließend das Planziel", () => {
    const result = resolveWaterTargetMl({
      activePlan: planWithWater(3200),
      preferences: DEFAULT_PREFERENCES,
      latestMeasurement: { weightKg: 90 } as never,
    });
    expect(result).toMatchObject({ waterTargetMl: 3200, waterSource: "plan" });
  });

  it("berechnet ohne Plan aus Gewicht und Aktivität", () => {
    const result = resolveWaterTargetMl({
      activePlan: null,
      preferences: { ...DEFAULT_PREFERENCES, weeklyDays: 4, experienceLevel: "intermediate" },
      latestMeasurement: { weightKg: 80 } as never,
    });
    expect(result.waterSource).toBe("profile");
    expect(result.waterTargetMl).toBeGreaterThanOrEqual(2500);
  });

  it("fällt ohne verwertbare Daten auf 2500 ml zurück", () => {
    expect(
      resolveWaterTargetMl({
        activePlan: null,
        preferences: DEFAULT_PREFERENCES,
        latestMeasurement: null,
      }),
    ).toEqual({ waterTargetMl: 2500, waterSource: "fallback", waterNeedsWeightHint: true });
  });
});
