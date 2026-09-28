import { describe, expect, it } from "vitest";
import { resolveWorldBossRoll } from "@/lib/rules/worldBoss";

describe("resolveWorldBossRoll", () => {
  it("need beats greed regardless of roll value", () => {
    const result = resolveWorldBossRoll([
      { characterId: "a", intent: "GREED", roll: 99 },
      { characterId: "b", intent: "NEED", roll: 1 },
    ]);
    expect(result.winnerCharacterId).toBe("b");
  });

  it("highest roll wins within the need tier", () => {
    const result = resolveWorldBossRoll([
      { characterId: "a", intent: "NEED", roll: 50 },
      { characterId: "b", intent: "NEED", roll: 80 },
      { characterId: "c", intent: "NEED", roll: 20 },
    ]);
    expect(result.winnerCharacterId).toBe("b");
  });

  it("falls back to greed when nobody needs", () => {
    const result = resolveWorldBossRoll([
      { characterId: "a", intent: "GREED", roll: 40 },
      { characterId: "b", intent: "GREED", roll: 60 },
      { characterId: "c", intent: "PASS" },
    ]);
    expect(result.winnerCharacterId).toBe("b");
  });

  it("returns null when everyone passes", () => {
    const result = resolveWorldBossRoll([
      { characterId: "a", intent: "PASS" },
      { characterId: "b", intent: "PASS" },
    ]);
    expect(result.winnerCharacterId).toBeNull();
  });
});
