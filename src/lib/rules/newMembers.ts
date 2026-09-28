// New-member "starting handicap": a fresh raider's list starts partway
// blocked, roughly matching the guild's current average, so they don't leapfrog
// longer-tenured members on their very first bracket win.
import { prisma } from "@/lib/db";
import { BidStatus, Track } from "@/generated/prisma/client";

/** Average number of currently-BLOCKED slots per active character, for this track/phase. */
export async function computeGuildAverageBlockedSlots(
  phaseId: string,
  track: Track,
  excludeCharacterId?: string,
): Promise<number> {
  const characters = await prisma.character.findMany({
    where: { isActive: true, id: excludeCharacterId ? { not: excludeCharacterId } : undefined },
    select: { id: true },
  });
  if (characters.length === 0) return 0;

  const counts = await Promise.all(
    characters.map((c) =>
      prisma.bidSlot.count({
        where: { characterId: c.id, phaseId, track, status: BidStatus.BLOCKED },
      }),
    ),
  );

  return counts.reduce((sum, n) => sum + n, 0) / counts.length;
}

/**
 * "A new member's initial blocked slots are seeded based on the average
 * slots blocked in the guild at the time they finish their trial week, set
 * between 50% and 120% based on their existing gear needs and performance,
 * at officer discretion."
 */
export async function seedNewMemberBlocks(
  characterId: string,
  phaseId: string,
  track: Track,
  pctOfAverage: number,
): Promise<{ blockedSlotIds: string[]; target: number; guildAverage: number }> {
  if (pctOfAverage < 0.5 || pctOfAverage > 1.2) {
    throw new Error("pctOfAverage must be between 0.5 and 1.2 per the guild rules.");
  }

  const guildAverage = await computeGuildAverageBlockedSlots(phaseId, track, characterId);
  const target = Math.round(guildAverage * pctOfAverage);

  const openSlots = await prisma.bidSlot.findMany({
    where: { characterId, phaseId, track, status: BidStatus.EMPTY },
    orderBy: [{ bracket: "desc" }, { slotIndex: "asc" }],
    take: target,
  });

  await prisma.$transaction(
    openSlots.map((slot) =>
      prisma.bidSlot.update({
        where: { id: slot.id },
        data: { status: BidStatus.BLOCKED, blockedAt: new Date() },
      }),
    ),
  );

  return { blockedSlotIds: openSlots.map((s) => s.id), target, guildAverage };
}
