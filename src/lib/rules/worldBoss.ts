// World boss loot: pure Need > Greed > Pass rolling, tracked separately from
// the bracket bid system since world bosses don't use lootlist priority.
import { prisma } from "@/lib/db";
import { WorldBossIntent } from "@/generated/prisma/client";

export type WorldBossParticipantInput = {
  characterId: string;
  intent: "NEED" | "GREED" | "PASS";
  roll?: number;
};

/**
 * "All world boss drops are set to open roll: Main spec = need, off spec =
 * greed, all others = pass." Pure function, no DB access, for easy testing.
 */
export function resolveWorldBossRoll(
  participants: WorldBossParticipantInput[],
): { winnerCharacterId: string | null } {
  const needers = participants.filter((p) => p.intent === "NEED" && p.roll != null);
  const greeders = participants.filter((p) => p.intent === "GREED" && p.roll != null);

  const pool = needers.length > 0 ? needers : greeders;
  if (pool.length === 0) return { winnerCharacterId: null };

  const winner = pool.reduce((max, p) => (p.roll! > max.roll! ? p : max));
  return { winnerCharacterId: winner.characterId };
}

/** Persists each participant's roll and marks the winner from resolveWorldBossRoll. */
export async function finalizeWorldBossRoll(
  logId: string,
  participants: WorldBossParticipantInput[],
): Promise<void> {
  const { winnerCharacterId } = resolveWorldBossRoll(participants);

  await prisma.$transaction([
    ...participants.map((p) =>
      prisma.worldBossRollParticipant.upsert({
        where: { logId_characterId: { logId, characterId: p.characterId } },
        update: {
          intent: WorldBossIntent[p.intent],
          rollValue: p.roll,
          isWinner: p.characterId === winnerCharacterId,
        },
        create: {
          logId,
          characterId: p.characterId,
          intent: WorldBossIntent[p.intent],
          rollValue: p.roll,
          isWinner: p.characterId === winnerCharacterId,
        },
      }),
    ),
    prisma.worldBossRollLog.update({
      where: { id: logId },
      data: { winnerCharacterId },
    }),
  ]);
}
