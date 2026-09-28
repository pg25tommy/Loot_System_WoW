// The pass chain: when a drop's winner doesn't want it, it's offered down
// the bracket-ordered list of eligible bidders until someone keeps it or
// everyone's passed.
import { prisma } from "@/lib/db";
import { BidStatus, PassDecision } from "@/generated/prisma/client";
import { type BidderCandidate, getEligibleBidders } from "./bidding";

export type PassChainState = {
  dropId: string;
  nextCandidate: BidderCandidate | null;
  offeredCharacterIds: string[];
  exhausted: boolean;
};

/**
 * Walks the ordered list of eligible bidders for the drop's item and returns
 * whoever should be offered it next (i.e. hasn't already passed/kept/traded
 * for this drop). "The item then goes to the next member in order, who may
 * take it or pass, continuing until someone keeps it or all have passed."
 */
export async function startPassChain(dropId: string): Promise<PassChainState> {
  const drop = await prisma.lootDrop.findUniqueOrThrow({ where: { id: dropId } });
  const alreadyOffered = await prisma.passRecord.findMany({ where: { dropId } });
  const offeredIds = new Set(alreadyOffered.map((r) => r.characterId));
  if (drop.winnerCharacterId) offeredIds.add(drop.winnerCharacterId);

  const eligible = await getEligibleBidders(drop.itemId, drop.phaseId, drop.track);
  const remaining = eligible
    .filter((c) => !offeredIds.has(c.characterId))
    .sort((a, b) => a.bracket - b.bracket);

  return {
    dropId,
    nextCandidate: remaining[0] ?? null,
    offeredCharacterIds: [...offeredIds],
    exhausted: remaining.length === 0,
  };
}

/**
 * Records a pass-chain decision. On KEPT/TRADED, transfers the block from
 * the previous holder's slot to the new holder's matching bid slot.
 */
export async function recordPassDecision(
  dropId: string,
  characterId: string,
  decision: "PASSED" | "KEPT" | "TRADED",
  reason?: string,
): Promise<PassChainState> {
  const drop = await prisma.lootDrop.findUniqueOrThrow({ where: { id: dropId } });
  const sequence = (await prisma.passRecord.count({ where: { dropId } })) + 1;

  await prisma.passRecord.create({
    data: {
      dropId,
      characterId,
      sequence,
      decision: PassDecision[decision],
      reason,
    },
  });

  if (decision === "PASSED" && drop.winnerCharacterId === characterId && drop.resolvedBidSlotId) {
    // The current holder is releasing the item — free their slot; nobody
    // holds it again until the next candidate in the chain keeps it.
    await prisma.$transaction([
      prisma.bidSlot.update({
        where: { id: drop.resolvedBidSlotId },
        data: { status: BidStatus.ACTIVE, blockedAt: null, blockedByDropId: null },
      }),
      prisma.lootDrop.update({
        where: { id: dropId },
        data: { winnerCharacterId: null, resolvedBidSlotId: null },
      }),
    ]);
  }

  if (decision === "KEPT" || decision === "TRADED") {
    const newSlot = await prisma.bidSlot.findFirstOrThrow({
      where: {
        characterId,
        phaseId: drop.phaseId,
        track: drop.track,
        itemId: drop.itemId,
      },
    });

    await prisma.$transaction([
      ...(drop.resolvedBidSlotId
        ? [
            prisma.bidSlot.update({
              where: { id: drop.resolvedBidSlotId },
              data: { status: BidStatus.ACTIVE, blockedAt: null, blockedByDropId: null },
            }),
          ]
        : []),
      prisma.bidSlot.update({
        where: { id: newSlot.id },
        data: { status: BidStatus.BLOCKED, blockedAt: new Date(), blockedByDropId: dropId },
      }),
      prisma.lootDrop.update({
        where: { id: dropId },
        data: { winnerCharacterId: characterId, resolvedBidSlotId: newSlot.id },
      }),
    ]);
  }

  return startPassChain(dropId);
}

/**
 * "If the original winner has won a raid item of identical slot/value that
 * same raid week, they may pass entirely, fully withdrawing their bid —
 * none of the rules below apply in that case." Eligibility check only; the
 * officer still records the resulting decision via recordPassDecision.
 */
export async function passAsIdenticalItemAlreadyWon(
  dropId: string,
  characterId: string,
): Promise<boolean> {
  const drop = await prisma.lootDrop.findUniqueOrThrow({
    where: { id: dropId },
    include: { item: true },
  });
  if (!drop.item.slot) return false;

  const weekStart = new Date(drop.raidDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const otherWin = await prisma.lootDrop.findFirst({
    where: {
      id: { not: dropId },
      winnerCharacterId: characterId,
      raidDate: { gte: weekStart, lt: weekEnd },
      item: { slot: drop.item.slot },
    },
  });

  return otherWin !== null;
}

/** Officer-driven cleanup for repeatedly-passed items. */
export async function removeItemFromLootList(
  bidSlotId: string,
  _officerId: string,
  _reason?: string,
): Promise<void> {
  await prisma.bidSlot.update({
    where: { id: bidSlotId },
    data: { itemId: null, status: BidStatus.EMPTY },
  });
}
