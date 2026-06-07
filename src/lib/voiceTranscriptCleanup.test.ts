import { describe, expect, it } from "vitest";
import { cleanVoiceTranscript } from "./voiceTranscriptCleanup";
import { parseVoiceSetUtterance } from "./voiceSetParser";

describe("cleanVoiceTranscript", () => {
  it("fixes Kino → Kilo", () => {
    expect(cleanVoiceTranscript("Zehn Kino 20 Wiederholung")).toBe("Zehn Kilo 20 Wiederholung");
  });

  it("fixes € between words → Kilo", () => {
    expect(cleanVoiceTranscript("Zehn € 20 Wiederholung")).toBe("Zehn Kilo 20 Wiederholung");
  });

  it("fixes widerholung typo", () => {
    expect(cleanVoiceTranscript("80 kino 8 widerholungen")).toBe("80 Kilo 8 Wiederholungen");
  });
});

describe("parseVoiceSetUtterance with cleanup", () => {
  it("parses after Kino/€ cleanup", () => {
    const r = parseVoiceSetUtterance("Zehn € 20 Wiederholung", []);
    expect(r.cleaned).toBe("Zehn Kilo 20 Wiederholung");
    expect(r.kg).toBe(10);
    expect(r.reps).toBe(20);
  });
});
