"use server";

// Server Actions for /officer/loot/world-boss: log a boss kill, then record
// each participant's Need/Greed/Pass roll.
import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { finalizeWorldBossRoll, type WorldBossParticipantInput } from "@/lib/rules/worldBoss";

export async function createWorldBossLogAction(input: {
  phaseId: string;
  item: string;
  bossName: string;
  raidDate: string;
}) {
  await requireOfficer();
  const log = await prisma.worldBossRollLog.create({
    data: {
      phaseId: input.phaseId,
      item: input.item,
      bossName: input.bossName,
      raidDate: new Date(input.raidDate),
    },
  });
  return log.id;
}

/** Resolves the Need > Greed > Pass winner and returns the log with participants populated. */
export async function finalizeWorldBossLogAction(
  logId: string,
  participants: WorldBossParticipantInput[],
) {
  await requireOfficer();
  await finalizeWorldBossRoll(logId, participants);
  revalidatePath("/officer/loot/world-boss");
  return prisma.worldBossRollLog.findUniqueOrThrow({
    where: { id: logId },
    include: { participants: { include: { character: true } } },
  });
}
