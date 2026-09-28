import { describe, expect, it } from "vitest";
import { BidStatus, Track } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { applyPhaseTransition, previewPhaseTransition } from "@/lib/rules/phaseTransition";
import { makeBidSlot, makeCharacter, makeItem, makePhase, makeRankTier } from "./factories";

async function setup() {
  const rankTier = await makeRankTier();
  const fromPhase = await makePhase({ name: `From-${Math.random()}` });
  const toPhase = await makePhase({ name: `To-${Math.random()}` });
  const character = await makeCharacter({ rankTierId: rankTier.id });
  const item = await makeItem();

  // Non-legacy bracket 1: should carry to the new phase's legacy track.
  await makeBidSlot({
    characterId: character.id,
    phaseId: fromPhase.id,
    track: Track.NON_LEGACY,
    bracket: 1,
    itemId: item.id,
    status: BidStatus.BLOCKED,
  });

  // Non-legacy bracket 0 (bonus bid): excluded from automatic carry per the rules.
  await makeBidSlot({
    characterId: character.id,
    phaseId: fromPhase.id,
    track: Track.NON_LEGACY,
    bracket: 0,
    status: BidStatus.BLOCKED,
  });

  // Old legacy list: should be discarded, not carried.
  await makeBidSlot({
    characterId: character.id,
    phaseId: fromPhase.id,
    track: Track.LEGACY,
    bracket: 1,
    itemId: item.id,
  });

  await prisma.bracketConfig.create({
    data: { phaseId: toPhase.id, track: Track.NON_LEGACY, bracket: 1, slotCount: 3 },
  });

  return { rankTier, fromPhase, toPhase, character, item };
}

describe("phase transition", () => {
  it("preview reports counts without writing anything", async () => {
    const { fromPhase, toPhase } = await setup();

    const summary = await previewPhaseTransition(fromPhase.id, toPhase.id);
    expect(summary.slotsCarriedToLegacy).toBe(1); // bracket 0 excluded
    expect(summary.slotsClearedFromOldLegacy).toBe(1);
    expect(summary.freshNonLegacySlotsCreated).toBe(3);

    const toPhaseSlots = await prisma.bidSlot.count({ where: { phaseId: toPhase.id } });
    expect(toPhaseSlots).toBe(0);
  });

  it("carries non-legacy -> legacy, excludes bracket 0, and builds a fresh non-legacy list", async () => {
    const { fromPhase, toPhase, character, item } = await setup();

    const summary = await applyPhaseTransition(fromPhase.id, toPhase.id);

    expect(summary.slotsCarriedToLegacy).toBe(1);
    expect(summary.freshNonLegacySlotsCreated).toBe(3);

    const carriedLegacy = await prisma.bidSlot.findMany({
      where: { phaseId: toPhase.id, track: Track.LEGACY },
    });
    expect(carriedLegacy).toHaveLength(1);
    expect(carriedLegacy[0].bracket).toBe(1);
    expect(carriedLegacy[0].itemId).toBe(item.id);
    expect(carriedLegacy[0].status).toBe("BLOCKED");

    const freshNonLegacy = await prisma.bidSlot.findMany({
      where: { phaseId: toPhase.id, track: Track.NON_LEGACY, characterId: character.id },
    });
    expect(freshNonLegacy).toHaveLength(3);
    expect(freshNonLegacy.every((s) => s.status === "EMPTY")).toBe(true);
  });

  it("throws if the target phase has no non-legacy bracket config yet", async () => {
    const rankTier = await makeRankTier();
    const fromPhase = await makePhase({ name: `From-${Math.random()}` });
    const toPhase = await makePhase({ name: `To-${Math.random()}` });
    await makeCharacter({ rankTierId: rankTier.id });

    await expect(applyPhaseTransition(fromPhase.id, toPhase.id)).rejects.toThrow();
  });

  it("applies an identical-slot unlock across every member's new legacy list", async () => {
    const { fromPhase, toPhase, character } = await setup();
    await applyPhaseTransition(fromPhase.id, toPhase.id, {
      unlockSlots: [{ bracket: 1, slotIndex: 0 }],
    });

    const slot = await prisma.bidSlot.findFirstOrThrow({
      where: { phaseId: toPhase.id, track: Track.LEGACY, characterId: character.id, bracket: 1 },
    });
    expect(slot.status).toBe("EMPTY");
    expect(slot.itemId).toBeNull();
  });
});
