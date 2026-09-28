import { describe, expect, it } from "vitest";
import { Track, BidStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  applyResolutionPlan,
  applyTankAutoTiebreak,
  planTankPriority,
  recordRollAndFinalize,
  resolveLootDrop,
} from "@/lib/rules/lootResolution";
import { makeBidSlot, makeCharacter, makeItem, makeOfficer, makePhase, makeRankTier } from "./factories";

async function setupRaider() {
  const rankTier = await makeRankTier({ name: `Raider-${Math.random()}` });
  return rankTier;
}

describe("resolveLootDrop", () => {
  it("picks the lowest bracket number outright when there's no tie", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const item = await makeItem();
    const winner = await makeCharacter({ rankTierId: raider.id, name: "Winner" });
    const loser = await makeCharacter({ rankTierId: raider.id, name: "Loser" });

    await makeBidSlot({ characterId: winner.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });
    await makeBidSlot({ characterId: loser.id, phaseId: phase.id, track: Track.LEGACY, bracket: 3, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });

    expect(plan.method).toBe("BRACKET_OUTRIGHT");
    expect(plan.winnerCharacterId).toBe(winner.id);
    expect(plan.bracket).toBe(1);
  });

  it("breaks a bracket tie by lowest blocked-slot count", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const item = await makeItem();
    const cleanCharacter = await makeCharacter({ rankTierId: raider.id, name: "Clean" });
    const blockedCharacter = await makeCharacter({ rankTierId: raider.id, name: "Blocked" });

    // blockedCharacter already has a blocked slot in bracket 2.
    await makeBidSlot({
      characterId: blockedCharacter.id,
      phaseId: phase.id,
      track: Track.LEGACY,
      bracket: 2,
      slotIndex: 0,
      status: BidStatus.BLOCKED,
    });

    await makeBidSlot({ characterId: cleanCharacter.id, phaseId: phase.id, track: Track.LEGACY, bracket: 2, slotIndex: 1, itemId: item.id });
    await makeBidSlot({ characterId: blockedCharacter.id, phaseId: phase.id, track: Track.LEGACY, bracket: 2, slotIndex: 1, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });

    expect(plan.method).toBe("TIEBREAK_BLOCKED_COUNT");
    expect(plan.winnerCharacterId).toBe(cleanCharacter.id);
  });

  it("flags a roll when blocked counts are equal, and the highest roll wins", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const item = await makeItem();
    const a = await makeCharacter({ rankTierId: raider.id, name: "A" });
    const b = await makeCharacter({ rankTierId: raider.id, name: "B" });

    await makeBidSlot({ characterId: a.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });
    await makeBidSlot({ characterId: b.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });

    expect(plan.winnerCharacterId).toBeNull();
    expect(plan.tiebreak?.needsRoll).toBe(true);
    expect(plan.tiebreak?.tiedCandidates).toHaveLength(2);

    const finalPlan = recordRollAndFinalize(plan.tiebreak!, plan.bracket!, [
      { characterId: a.id, roll: 42 },
      { characterId: b.id, roll: 87 },
    ]);

    expect(finalPlan.method).toBe("TIEBREAK_ROLL");
    expect(finalPlan.winnerCharacterId).toBe(b.id);
  });

  it("an Initiate automatically loses a tie against a non-Initiate", async () => {
    const raiderTier = await makeRankTier({ name: `Raider-${Math.random()}` });
    const initiateTier = await makeRankTier({ name: "Initiate", isLootEligible: true });
    const phase = await makePhase();
    const item = await makeItem();
    const raider = await makeCharacter({ rankTierId: raiderTier.id, name: "Raider" });
    const initiate = await makeCharacter({
      rankTierId: initiateTier.id,
      name: "New Guy",
      joinedAt: new Date("2000-01-01"), // long past first week
    });

    await makeBidSlot({ characterId: raider.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });
    await makeBidSlot({ characterId: initiate.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });

    expect(plan.method).toBe("TIEBREAK_BLOCKED_COUNT");
    expect(plan.winnerCharacterId).toBe(raider.id);
  });

  it("applyResolutionPlan persists the drop and blocks the winning slot", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const item = await makeItem();
    const winner = await makeCharacter({ rankTierId: raider.id, name: "Winner" });
    const officer = await makeOfficer();
    const slot = await makeBidSlot({ characterId: winner.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });
    const drop = await applyResolutionPlan(plan, {
      itemId: item.id,
      phaseId: phase.id,
      track: Track.LEGACY,
      raidDate: new Date(),
      resolvedByOfficerId: officer.id,
    });

    expect(drop.winnerCharacterId).toBe(winner.id);
    expect(drop.resolvedBidSlotId).toBe(slot.id);

    const updatedSlot = await prisma.bidSlot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(updatedSlot.status).toBe("BLOCKED");
    expect(updatedSlot.blockedByDropId).toBe(drop.id);
  });
});

describe("tank overrides", () => {
  it("planTankPriority throws for a non-tank officer", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: raider.id });
    const slot = await makeBidSlot({ characterId: character.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1 });

    await expect(planTankPriority(slot.id, { isTankOfficer: false })).rejects.toThrow();
  });

  it("planTankPriority succeeds for a tank officer and spends the given slot instantly", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: raider.id });
    const slot = await makeBidSlot({ characterId: character.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1 });

    const plan = await planTankPriority(slot.id, { isTankOfficer: true });

    expect(plan.method).toBe("TANK_PRIORITY");
    expect(plan.winnerCharacterId).toBe(character.id);
    expect(plan.tankPriorityUsed).toBe(true);
  });

  it("applyTankAutoTiebreak throws for a non-tank officer", async () => {
    const raider = await setupRaider();
    const phase = await makePhase();
    const item = await makeItem();
    const a = await makeCharacter({ rankTierId: raider.id, name: "A" });
    const b = await makeCharacter({ rankTierId: raider.id, name: "B" });
    await makeBidSlot({ characterId: a.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });
    await makeBidSlot({ characterId: b.id, phaseId: phase.id, track: Track.LEGACY, bracket: 1, itemId: item.id });

    const plan = await resolveLootDrop({ itemId: item.id, phaseId: phase.id, track: Track.LEGACY });

    expect(() => applyTankAutoTiebreak(plan.tiebreak!, a.id, plan.bracket!, { isTankOfficer: false })).toThrow();
  });
});
