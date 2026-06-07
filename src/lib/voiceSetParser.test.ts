import { describe, expect, it } from "vitest";
import type { Exercise } from "./engine";
import { parseVoiceSetUtterance } from "./voiceSetParser";

const exercises: Exercise[] = [
  {
    id: "1",
    name: "Bankdrücken",
    metric: "weight_reps",
    sets: [{ kg: 0, reps: 0, done: false }],
  },
];

describe("parseVoiceSetUtterance", () => {
  it("parses exercise name with kg and reps in German", () => {
    const r = parseVoiceSetUtterance("Bankdrücken 80 Kilo 8", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
    expect(r.exerciseName).toBe("Bankdrücken");
  });

  it("parses kg and reps without exercise name", () => {
    const r = parseVoiceSetUtterance("80 kg 8", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("parses reps before kg", () => {
    const r = parseVoiceSetUtterance("8 Wiederholungen 80", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("parses two bare numbers as kg and reps", () => {
    const r = parseVoiceSetUtterance("80 8", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("parses kilo before number and strips filler words", () => {
    const r = parseVoiceSetUtterance("In Kilo 20 Wiederholung", exercises);
    expect(r.kg).toBe(20);
    expect(r.reps).toBeNull();
  });

  it("parses kg before number with reps", () => {
    const r = parseVoiceSetUtterance("Kilo 80 8 Wiederholungen", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("parses 20x10 notation", () => {
    const r = parseVoiceSetUtterance("20x10", exercises);
    expect(r.kg).toBe(20);
    expect(r.reps).toBe(10);
  });

  it("parses mal notation", () => {
    const r = parseVoiceSetUtterance("80 mal 8", exercises);
    expect(r.kg).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("does not invent reps when only weight is spoken", () => {
    const r = parseVoiceSetUtterance("In Kilo 20 Wiederholung", exercises);
    expect(r.kg).toBe(20);
    expect(r.reps).toBeNull();
  });

  it("parses German number words with digits mixed", () => {
    const r = parseVoiceSetUtterance("Zehn Kilo 20 Wiederholung", exercises);
    expect(r.kg).toBe(10);
    expect(r.reps).toBe(20);
  });

  it("parses fully spoken German numbers", () => {
    const r = parseVoiceSetUtterance("zehn kilo zwanzig wiederholungen", exercises);
    expect(r.kg).toBe(10);
    expect(r.reps).toBe(20);
  });

  it("parses compound German numbers", () => {
    const r = parseVoiceSetUtterance("zweiundzwanzig kilo 8", exercises);
    expect(r.kg).toBe(22);
    expect(r.reps).toBe(8);
  });
});
