// Open /roll 100 flows: items nobody has bid on ("Open BoP") and MS>OS
// priority rolls for pug/cross-raid groups. Separate from the bracket
// tiebreak chain in lootResolution.ts, which only applies to lootlist bids.
import { prisma } from "@/lib/db";
import {
  BidStatus,
  DropResolutionMethod,
  DropStatus,
  RollType,
  SpecPriority,
  Track,
} from "@/generated/prisma/client";
import type { OpenRollLogModel as OpenRollLog } from "@/generated/prisma/models";

/** Guild members with the item on their Main Spec list, for a pug MS>OS raid. */
export async function createOpenRollForPugRaid(itemId: string, phaseId: string, track: Track) {
  return prisma.bidSlot.findMany({
    where: {
      itemId,
      phaseId,
      track,
      status: BidStatus.ACTIVE,
      specPriority: SpecPriority.MAIN_SPEC,
    },
    include: { character: true },
  });
}

/** Starts a fresh roll log, optionally tied to a specific LootDrop to resolve. */
export async function createOpenRoll(input: {
  dropId?: string;
  rollType: RollType;
}): Promise<OpenRollLog> {
  return prisma.openRollLog.create({
    data: { dropId: input.dropId, rollType: input.rollType },
  });
}

/**
 * Records roll results and determines the winner (highest roll). For an
 * MS>OS pug roll where the winner has the item on their loot list, "the
 * item is distributed via the lootlist instead" — the matching bid slot is
 * blocked just like a normal resolution. A plain "Open" BoP item (no bids
 * existed) has nothing to block; the physical item just changes hands.
 */
export async function finalizeOpenRoll(
  openRollId: string,
  entries: { characterId: string; rollValue: number }[],
) {
  if (entries.length === 0) throw new Error("No roll entries supplied.");

  const openRoll = await prisma.openRollLog.findUniqueOrThrow({ where: { id: openRollId } });
  const winnerEntry = entries.reduce((max, e) => (e.rollValue > max.rollValue ? e : max));

  await prisma.$transaction(
    entries.map((e) =>
      prisma.openRollParticipant.upsert({
        where: { openRollId_characterId: { openRollId, characterId: e.characterId } },
        update: { rollValue: e.rollValue, isWinner: e.characterId === winnerEntry.characterId },
        create: {
          openRollId,
          characterId: e.characterId,
          rollValue: e.rollValue,
          isWinner: e.characterId === winnerEntry.characterId,
        },
      }),
    ),
  );

  await prisma.openRollLog.update({
    where: { id: openRollId },
    data: { winnerRoll: winnerEntry.rollValue },
  });

  if (openRoll.dropId) {
    const drop = await prisma.lootDrop.findUniqueOrThrow({ where: { id: openRoll.dropId } });

    if (openRoll.rollType === RollType.MS_OS_PUG) {
      const winningSlot = await prisma.bidSlot.findFirst({
        where: {
          characterId: winnerEntry.characterId,
          phaseId: drop.phaseId,
          track: drop.track,
          itemId: drop.itemId,
        },
      });

      await prisma.$transaction([
        ...(winningSlot
          ? [
              prisma.bidSlot.update({
                where: { id: winningSlot.id },
                data: { status: BidStatus.BLOCKED, blockedAt: new Date(), blockedByDropId: drop.id },
              }),
            ]
          : []),
        prisma.lootDrop.update({
          where: { id: drop.id },
          data: {
            winnerCharacterId: winnerEntry.characterId,
            resolutionMethod: DropResolutionMethod.OPEN_ROLL_MS_OS,
            resolvedBidSlotId: winningSlot?.id,
            status: DropStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        }),
      ]);
    } else if (openRoll.rollType === RollType.OPEN_BOP) {
      await prisma.lootDrop.update({
        where: { id: drop.id },
        data: {
          winnerCharacterId: winnerEntry.characterId,
          resolutionMethod: DropResolutionMethod.OPEN_ROLL_BOP,
          status: DropStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });
    }
  }

  return prisma.openRollLog.findUniqueOrThrow({
    where: { id: openRollId },
    include: { participants: true },
  });
}

/** "Any 'Open' BoP item with no takers goes to guild officers to be disenchanted." */
export async function markDisenchanted(dropId: string): Promise<void> {
  await prisma.lootDrop.update({
    where: { id: dropId },
    data: {
      resolutionMethod: DropResolutionMethod.DISENCHANT,
      status: DropStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
}

/** One-shot version for an item that never had a LootDrop row created (no bids at all). */
export async function disenchantUnbidItem(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  raidDate: Date;
}): Promise<void> {
  await prisma.lootDrop.create({
    data: {
      itemId: input.itemId,
      phaseId: input.phaseId,
      track: input.track,
      raidDate: input.raidDate,
      resolutionMethod: DropResolutionMethod.DISENCHANT,
      status: DropStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
}

/** "Items with no bids are available for sale to members outside the guild." */
export async function markSold(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  raidDate: Date;
}): Promise<void> {
  await prisma.lootDrop.create({
    data: {
      itemId: input.itemId,
      phaseId: input.phaseId,
      track: input.track,
      raidDate: input.raidDate,
      resolutionMethod: DropResolutionMethod.SOLD,
      status: DropStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });
}
