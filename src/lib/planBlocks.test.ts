import { describe, expect, it } from "vitest";
import { BUILDER_DEFAULT_ENABLED_BLOCKS, inferBlockFormatForExercises } from "./planBlocks";

describe("builder defaults", () => {
  it("excludes metcon from builder default blocks", () => {
    expect(BUILDER_DEFAULT_ENABLED_BLOCKS).not.toContain("metcon");
    expect(BUILDER_DEFAULT_ENABLED_BLOCKS).toEqual(["warmup", "skill", "strength"]);
  });
});

describe("inferBlockFormatForExercises", () => {
  it("uses superset when exercises are linked", () => {
    expect(
      inferBlockFormatForExercises("strength", [{ supersetId: "a" }, { supersetId: "a" }]),
    ).toBe("superset");
  });

  it("defaults metcon to amrap", () => {
    expect(inferBlockFormatForExercises("metcon", [{}])).toBe("amrap");
  });

  it("defaults strength to straight_sets", () => {
    expect(inferBlockFormatForExercises("strength", [])).toBe("straight_sets");
  });
});
