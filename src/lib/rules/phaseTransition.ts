// End-of-phase rollover: each character's NON_LEGACY ("Misc / PvP") list
// carries forward into the new phase's LEGACY ("Current Tier") track, the
// old LEGACY list is dropped, and a fresh NON_LEGACY list is generated.
// Always preview before applying — see /officer/phase/[id]/transition.
import { prisma } from "@/lib/db";
import { BidStatus, Track } from "@/generated/prisma/client";

export type PhaseTransitionSummary = {
  charactersAffected: number;
  slotsCarriedToLegacy: number;
  slotsClearedFromOldLegacy: number;
  freshNonLegacySlotsCreated: number;
  unlockedSlotsCleared: number;
};

type PhaseTransitionOptions = {
  /** Specific identical bid slots to clear across every member's new legacy list. */
  unlockSlots?: { bracket: number; slotIndex: number }[];
};

/**
 * "Your legacy lootlist is cleared. Your non-legacy lootlist moves to
 * legacy, retaining all blocks and items listed ... You receive a new
 * non-legacy lootlist to fill out as needed."
 *
 * Bracket 0 (the non-legacy bonus bid) is intentionally excluded from the
 * automatic carry-over — the rules say it's "marked in Discord directly"
 * rather than handled through the normal list, so officers manage it
 * out-of-band. This function only moves brackets 1-5.
 */
async function computePlan(fromPhaseId: string, toPhaseId: string) {
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const oldNonLegacySlots = await prisma.bidSlot.findMany({
    where: { phaseId: fromPhaseId, track: Track.NON_LEGACY, bracket: { gt: 0 } },
  });

  const oldLegacySlots = await prisma.bidSlot.findMany({
    where: { phaseId: fromPhaseId, track: Track.LEGACY },
  });

  const nonLegacyBracketConfig = await prisma.bracketConfig.findMany({
    where: { phaseId: toPhaseId, track: Track.NON_LEGACY },
  });

  return { characters, oldNonLegacySlots, oldLegacySlots, nonLegacyBracketConfig };
}

export async function previewPhaseTransition(
  fromPhaseId: string,
  toPhaseId: string,
): Promise<PhaseTransitionSummary> {
  const { characters, oldNonLegacySlots, oldLegacySlots, nonLegacyBracketConfig } =
    await computePlan(fromPhaseId, toPhaseId);

  const freshSlotsPerCharacter = nonLegacyBracketConfig.reduce((sum, bc) => sum + bc.slotCount, 0);

  return {
    charactersAffected: characters.length,
    slotsCarriedToLegacy: oldNonLegacySlots.length,
    slotsClearedFromOldLegacy: oldLegacySlots.length,
    freshNonLegacySlotsCreated: freshSlotsPerCharacter * characters.length,
    unlockedSlotsCleared: 0,
  };
}

export async function applyPhaseTransition(
  fromPhaseId: string,
  toPhaseId: string,
  options: PhaseTransitionOptions = {},
): Promise<PhaseTransitionSummary> {
  const { characters, oldNonLegacySlots, oldLegacySlots, nonLegacyBracketConfig } =
    await computePlan(fromPhaseId, toPhaseId);

  if (nonLegacyBracketConfig.length === 0) {
    throw new Error(
      "The target phase has no non-legacy BracketConfig yet — set it up under " +
        "/officer/config/brackets before running the transition.",
    );
  }

  let carriedCount = 0;
  let freshCount = 0;
  let unlockedCount = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Carry non-legacy -> legacy for the new phase.
    for (const slot of oldNonLegacySlots) {
      await tx.bidSlot.create({
        data: {
          characterId: slot.characterId,
          phaseId: toPhaseId,
          track: Track.LEGACY,
          bracket: slot.bracket,
          slotIndex: slot.slotIndex,
          itemId: slot.itemId,
          status: slot.status,
          blockedAt: slot.blockedAt,
          // blockedByDropId is intentionally not copied: it's unique per
          // LootDrop and the original historical BidSlot keeps that link.
        },
      });
      carriedCount += 1;
    }

    // 2. Fresh non-legacy list for the new phase, per configured bracket sizes.
    for (const character of characters) {
      for (const bc of nonLegacyBracketConfig) {
        for (let slotIndex = 0; slotIndex < bc.slotCount; slotIndex += 1) {
          await tx.bidSlot.create({
            data: {
              characterId: character.id,
              phaseId: toPhaseId,
              track: Track.NON_LEGACY,
              bracket: bc.bracket,
              slotIndex,
              status: BidStatus.EMPTY,
            },
          });
          freshCount += 1;
        }
      }
    }

    // 3. Officer-specified identical-slot unlock on the new legacy list.
    if (options.unlockSlots && options.unlockSlots.length > 0) {
      for (const { bracket, slotIndex } of options.unlockSlots) {
        const result = await tx.bidSlot.updateMany({
          where: { phaseId: toPhaseId, track: Track.LEGACY, bracket, slotIndex },
          data: { status: BidStatus.EMPTY, itemId: null, blockedAt: null },
        });
        unlockedCount += result.count;
      }
    }
  });

  return {
    charactersAffected: characters.length,
    slotsCarriedToLegacy: carriedCount,
    slotsClearedFromOldLegacy: oldLegacySlots.length,
    freshNonLegacySlotsCreated: freshCount,
    unlockedSlotsCleared: unlockedCount,
  };
}
