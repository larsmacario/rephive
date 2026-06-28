import { describe, expect, it } from "vitest";
import {
  aggregateWaterLastSevenDays,
  clampWaterTargetMl,
  getLocalDayBounds,
  shouldShowHydrationHint,
  sumWaterLogs,
  toLocalDateKey,
  normalizeWaterQuickAmounts,
} from "./hydration";

describe("hydration", () => {
  it("begrenzt und rundet persönliche Ziele", () => {
    expect(clampWaterTargetMl(899)).toBe(1000);
    expect(clampWaterTargetMl(2631)).toBe(2650);
    expect(clampWaterTargetMl(7000)).toBe(6000);
  });

  it("summiert Wassereinträge", () => {
    expect(sumWaterLogs([{ amountMl: 250 }, { amountMl: 500 }])).toBe(750);
  });

  it("normalisiert individuelle Schnellmengen", () => {
    expect(normalizeWaterQuickAmounts([180, 525, 4000])).toEqual([200, 550, 3000]);
    expect(normalizeWaterQuickAmounts([250, "500", 750])).toEqual([250, 500, 750]);
  });

  it("bildet lokale Tagesgrenzen ab", () => {
    const reference = new Date(2026, 5, 28, 18, 30);
    const { start, end } = getLocalDayBounds(reference);
    expect(toLocalDateKey(new Date(start))).toBe("2026-06-28");
    expect(toLocalDateKey(new Date(new Date(end).getTime() - 1))).toBe("2026-06-28");
    expect(toLocalDateKey(new Date(end))).toBe("2026-06-29");
  });

  it("aggregiert sieben Tage über Monatsgrenzen", () => {
    const result = aggregateWaterLastSevenDays(
      [
        { amountMl: 250, loggedAt: new Date(2026, 4, 29, 9).toISOString() },
        { amountMl: 500, loggedAt: new Date(2026, 5, 1, 10).toISOString() },
        { amountMl: 250, loggedAt: new Date(2026, 5, 1, 15).toISOString() },
      ],
      new Date(2026, 5, 4, 12),
    );

    expect(result.map((day) => day.dateKey)).toEqual([
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
    ]);
    expect(result[0].amountMl).toBe(250);
    expect(result[3].amountMl).toBe(750);
  });

  it("zeigt den In-App-Hinweis erst ab 14 Uhr unter 50 Prozent", () => {
    const base = {
      targetMl: 2500,
      dismissedDate: null,
      isOnline: true,
    };
    expect(shouldShowHydrationHint({ ...base, now: new Date(2026, 5, 28, 13, 59), loggedMl: 0 })).toBe(false);
    expect(shouldShowHydrationHint({ ...base, now: new Date(2026, 5, 28, 14), loggedMl: 1000 })).toBe(true);
    expect(shouldShowHydrationHint({ ...base, now: new Date(2026, 5, 28, 14), loggedMl: 1250 })).toBe(false);
    expect(
      shouldShowHydrationHint({
        ...base,
        now: new Date(2026, 5, 28, 14),
        loggedMl: 0,
        dismissedDate: "2026-06-28",
      }),
    ).toBe(false);
  });
});
