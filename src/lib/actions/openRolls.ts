"use server";

// Server Actions for the /officer/loot/open-rolls page: starting/finalizing
// an open /roll 100, and the two no-bidders dispositions (disenchant/sell).
import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RollType, Track, DropStatus } from "@/generated/prisma/client";
import {
  createOpenRoll,
  createOpenRollForPugRaid,
  disenchantUnbidItem,
  finalizeOpenRoll,
  markSold,
} from "@/lib/rules/openRoll";

/** Creates the pending LootDrop + roll log, and (for an MS>OS pug roll) the eligible bidder list. */
export async function startOpenRollAction(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  rollType: RollType;
  raidDate: string;
}) {
  await requireOfficer();

  const drop = await prisma.lootDrop.create({
    data: {
      itemId: input.itemId,
      phaseId: input.phaseId,
      track: input.track,
      raidDate: new Date(input.raidDate),
      status: DropStatus.PENDING,
    },
  });

  const openRoll = await createOpenRoll({ dropId: drop.id, rollType: input.rollType });

  const eligible =
    input.rollType === RollType.MS_OS_PUG
      ? await createOpenRollForPugRaid(input.itemId, input.phaseId, input.track)
      : [];

  return { openRollId: openRoll.id, dropId: drop.id, eligible: eligible.map((s) => s.character) };
}

/** Records the entered rolls and, for an MS>OS pug win, blocks the matching bid slot. */
export async function finalizeOpenRollAction(
  openRollId: string,
  entries: { characterId: string; rollValue: number }[],
) {
  await requireOfficer();
  const result = await finalizeOpenRoll(openRollId, entries);
  revalidatePath("/officer/loot/drops");
  revalidatePath("/officer");
  return result;
}

export async function disenchantUnbidItemAction(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  raidDate: string;
}) {
  await requireOfficer();
  await disenchantUnbidItem({ ...input, raidDate: new Date(input.raidDate) });
  revalidatePath("/officer/loot/drops");
}

export async function markSoldAction(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  raidDate: string;
}) {
  await requireOfficer();
  await markSold({ ...input, raidDate: new Date(input.raidDate) });
  revalidatePath("/officer/loot/drops");
}
