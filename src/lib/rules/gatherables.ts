// Gatherable/random-drop bids: spend an otherwise-empty slot in the bracket
// matching an ungoverned item's gold value, sourced from the officer-edited
// GatherableValueBracket table.
import { prisma } from "@/lib/db";
import { BidStatus, DropResolutionMethod, DropStatus, Track } from "@/generated/prisma/client";

export type GatherableRow = { minGold: number; maxGold: number | null; bracket: number };

/**
 * Pure lookup — table-driven so it's easy to test against boundary values
 * without touching the database.
 */
export function gatherableGoldToBracketPure(goldValue: number, table: GatherableRow[]): number {
  const row = table.find(
    (r) => goldValue >= r.minGold && (r.maxGold === null || goldValue <= r.maxGold),
  );
  if (!row) {
    throw new Error(`No gatherable value bracket configured for ${goldValue}g.`);
  }
  return row.bracket;
}

/** DB-backed wrapper around gatherableGoldToBracketPure, using the live config table. */
export async function gatherableGoldToBracket(goldValue: number): Promise<number> {
  const table = await prisma.gatherableValueBracket.findMany({ where: { isActive: true } });
  return gatherableGoldToBracketPure(goldValue, table);
}

/**
 * "Players who need a random drop blue or epic not on the loot list may
 * spend a bid slot in the bracket equivalent to its value ... Any item won
 * this way must be equipped immediately."
 */
export async function spendGatherableBid(input: {
  characterId: string;
  phaseId: string;
  track: Track;
  goldValue: number;
  itemId?: string;
  raidDate?: Date;
}): Promise<{ bracket: number; slotId: string; mustEquipImmediately: true }> {
  const bracket = await gatherableGoldToBracket(input.goldValue);

  const slot = await prisma.bidSlot.findFirst({
    where: {
      characterId: input.characterId,
      phaseId: input.phaseId,
      track: input.track,
      bracket,
      status: BidStatus.EMPTY,
    },
    orderBy: { slotIndex: "asc" },
  });
  if (!slot) {
    throw new Error(`No open bracket ${bracket} slot available to spend.`);
  }

  if (input.itemId) {
    await prisma.$transaction(async (tx) => {
      const drop = await tx.lootDrop.create({
        data: {
          itemId: input.itemId!,
          phaseId: input.phaseId,
          track: input.track,
          raidDate: input.raidDate ?? new Date(),
          winnerCharacterId: input.characterId,
          resolutionMethod: DropResolutionMethod.GATHERABLE_BID,
          winningBracket: bracket,
          status: DropStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });
      await tx.bidSlot.update({
        where: { id: slot.id },
        data: { status: BidStatus.BLOCKED, blockedAt: new Date(), blockedByDropId: drop.id },
      });
      await tx.lootDrop.update({ where: { id: drop.id }, data: { resolvedBidSlotId: slot.id } });
    });
  } else {
    await prisma.bidSlot.update({
      where: { id: slot.id },
      data: { status: BidStatus.BLOCKED, blockedAt: new Date() },
    });
  }

  return { bracket, slotId: slot.id, mustEquipImmediately: true };
}
