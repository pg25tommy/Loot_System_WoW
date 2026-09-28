import { describe, expect, it } from "vitest";
import { gatherableGoldToBracketPure } from "@/lib/rules/gatherables";

const TABLE = [
  { minGold: 1, maxGold: 249, bracket: 5 },
  { minGold: 250, maxGold: 499, bracket: 4 },
  { minGold: 500, maxGold: 999, bracket: 3 },
  { minGold: 1000, maxGold: 1999, bracket: 2 },
  { minGold: 2000, maxGold: null, bracket: 1 },
];

describe("gatherableGoldToBracketPure", () => {
  it.each([
    [1, 5],
    [249, 5],
    [250, 4],
    [499, 4],
    [500, 3],
    [999, 3],
    [1000, 2],
    [1999, 2],
    [2000, 1],
    [50000, 1],
  ])("maps %ig to bracket %i", (gold, expected) => {
    expect(gatherableGoldToBracketPure(gold, TABLE)).toBe(expected);
  });

  it("throws for a value with no configured range", () => {
    expect(() => gatherableGoldToBracketPure(0, TABLE)).toThrow();
  });
});
