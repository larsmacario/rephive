import { describe, expect, it } from "vitest";
import {
  detectMetconFormatFromText,
  emomActiveStationIndex,
  formatAmrapResult,
  formatMetconBlockBadge,
  metconConfigToBlockInput,
  normalizeMetconConfig,
  normalizeMetconExercise,
  parseDurationSecFromText,
  parseExerciseNamesFromMetconNote,
  stripOneRmFromNote,
} from "./metcon";
import { buildCircuitSegments } from "./metconTimer";

describe("metcon helpers", () => {
  it("parses exercise names from legacy note", () => {
    expect(
      parseExerciseNamesFromMetconNote(
        "10 Min AMRAP: Burpees, Liegestütze, Ausfallschritte — moderates Tempo",
      ),
    ).toEqual(["Burpees", "Liegestütze", "Ausfallschritte"]);
  });

  it("detects format from text", () => {
    expect(detectMetconFormatFromText("12 Min EMOM")).toBe("emom");
    expect(detectMetconFormatFromText("Circuit 3 Runden")).toBe("circuit");
    expect(detectMetconFormatFromText("AMRAP 10")).toBe("amrap");
  });

  it("parses duration from text", () => {
    expect(parseDurationSecFromText("10 Min AMRAP")).toBe(600);
  });

  it("formats AMRAP result", () => {
    expect(formatAmrapResult(5, 600)).toBe("5 Runden in 10:00");
  });

  it("formats block badge", () => {
    expect(formatMetconBlockBadge(normalizeMetconConfig("amrap", { durationSec: 720 }))).toBe(
      "AMRAP · 12 Min",
    );
  });

  it("computes EMOM station index", () => {
    expect(emomActiveStationIndex(1, 3)).toBe(0);
    expect(emomActiveStationIndex(4, 3)).toBe(0);
    expect(emomActiveStationIndex(2, 3)).toBe(1);
  });

  it("strips 1RM from metcon notes", () => {
    expect(stripOneRmFromNote("3x8 @ 75% 1RM")).toBe("");
    expect(stripOneRmFromNote("10 Wdh. pro Runde")).toBe("10 Wdh. pro Runde");
  });

  it("normalizes bodyweight metcon without 1RM", () => {
    const ex = {
      name: "Liegestütze",
      metric: "weight_reps",
      equipment: "Körpergewicht",
      note: "3x8 @ 75% 1RM",
      sets: [{ reps: 8, kg: 0 }],
    };
    normalizeMetconExercise(ex);
    expect(ex.metric).toBe("reps");
    expect(ex.note).toBe("8 Wdh. pro Runde");
    expect(ex.sets).toEqual([{ reps: 8, kg: 0 }]);
  });

  it("maps metcon config to block persist input", () => {
    const input = metconConfigToBlockInput(normalizeMetconConfig("emom", { rounds: 10, intervalSec: 90 }));
    expect(input.blockType).toBe("metcon");
    expect(input.format).toBe("emom");
    expect(input.rounds).toBe(10);
    expect(input.intervalSeconds).toBe(90);
  });
});

describe("buildCircuitSegments", () => {
  it("creates work and rest segments per station", () => {
    const segs = buildCircuitSegments(
      normalizeMetconConfig("circuit", { rounds: 2, workSec: 30, restSec: 10, restBetweenRoundsSec: 20 }),
      2,
    );
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.some((s) => s.kind === "work")).toBe(true);
    expect(segs.some((s) => s.label === "REST")).toBe(true);
  });
});
