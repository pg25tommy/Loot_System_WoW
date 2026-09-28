// Building blocks shared by every resolution flow: who's allowed to bid,
// grouping their bids by bracket, and applying queued mid-week bid changes.
import { prisma } from "@/lib/db";
import { BidStatus, Track } from "@/generated/prisma/client";
import type {
  BidSlotModel as BidSlot,
  CharacterModel as Character,
  RankTierModel as RankTier,
} from "@/generated/prisma/models";

const INITIATE_TIER_NAME = "Initiate";
const FIRST_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// A bid slot joined with its character (and that character's rank tier),
// i.e. one "competitor" for a given item resolution.
export type CharacterWithRank = Character & { rankTier: RankTier };
export type BidderCandidate = BidSlot & { character: CharacterWithRank };

/**
 * "All new members (Initiates) are ineligible for loot via bids in their
 * first week. Social members have no loot list and are eligible for
 * 'Open' items only."
 */
export function isLootEligible(character: CharacterWithRank, now: Date = new Date()): boolean {
  if (!character.rankTier.isLootEligible) return false;

  if (character.rankTier.name === INITIATE_TIER_NAME) {
    const since = now.getTime() - character.joinedAt.getTime();
    if (since < FIRST_WEEK_MS) return false;
  }

  return true;
}

/**
 * Promotes a mid-raid-week bid change once it becomes active. "Bids may be
 * changed at any time, but changes made during the active raid week ...
 * don't take effect until the following week."
 */
export async function applyPendingBidTransitions(
  characterId: string,
  phaseId: string,
  now: Date = new Date(),
): Promise<void> {
  const pendingSlots = await prisma.bidSlot.findMany({
    where: {
      characterId,
      phaseId,
      status: BidStatus.PENDING,
      becomesActiveAt: { lte: now },
    },
  });

  for (const slot of pendingSlots) {
    await prisma.bidSlot.update({
      where: { id: slot.id },
      data: {
        itemId: slot.pendingItemId,
        pendingItemId: null,
        becomesActiveAt: null,
        status: slot.pendingItemId ? BidStatus.ACTIVE : BidStatus.EMPTY,
      },
    });
  }
}

/**
 * All active bidders for an item, filtered to loot-eligible characters,
 * for a given phase/track.
 */
export async function getEligibleBidders(
  itemId: string,
  phaseId: string,
  track: Track,
  now: Date = new Date(),
): Promise<BidderCandidate[]> {
  const slots = await prisma.bidSlot.findMany({
    where: {
      itemId,
      phaseId,
      track,
      status: BidStatus.ACTIVE,
    },
    include: { character: { include: { rankTier: true } } },
  });

  return slots.filter((slot) => isLootEligible(slot.character, now));
}

/** Bracket 1 = best. */
export function groupByBracket(candidates: BidderCandidate[]): Map<number, BidderCandidate[]> {
  const map = new Map<number, BidderCandidate[]>();
  for (const candidate of candidates) {
    const list = map.get(candidate.bracket) ?? [];
    list.push(candidate);
    map.set(candidate.bracket, list);
  }
  return map;
}

/** Lowest-numbered non-empty bracket among the candidates, or null if none. */
export function bestBracket(grouped: Map<number, BidderCandidate[]>): number | null {
  const brackets = [...grouped.keys()].filter((b) => grouped.get(b)!.length > 0);
  if (brackets.length === 0) return null;
  return Math.min(...brackets);
}
