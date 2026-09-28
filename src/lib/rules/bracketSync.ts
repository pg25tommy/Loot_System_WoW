// Keeps existing characters' bid-slot counts in sync after an officer edits
// BracketConfig — new characters already get the right slot count at
// creation time (see actions/characters.ts createCharacterAction).
import { prisma } from "@/lib/db";
import { BidStatus } from "@/generated/prisma/client";

export type BracketSyncSummary = {
  slotsAdded: number;
  slotsRemoved: number;
  skipped: { characterName: string; track: string; bracket: number; reason: string }[];
};

/**
 * Reconciles every active character's bid slots against the current
 * BracketConfig for a phase — run this after changing bracket sizes so
 * existing characters (not just newly-created ones) match. Only ever adds
 * empty slots or removes empty slots; a slot with an active bid, a pending
 * change, or a block is never touched — those brackets are reported as
 * skipped instead so an officer can resolve them by hand first.
 */
export async function syncBidSlotsToConfig(phaseId: string): Promise<BracketSyncSummary> {
  const [characters, bracketConfigs] = await Promise.all([
    prisma.character.findMany({ where: { isActive: true } }),
    prisma.bracketConfig.findMany({ where: { phaseId } }),
  ]);

  const summary: BracketSyncSummary = { slotsAdded: 0, slotsRemoved: 0, skipped: [] };

  for (const character of characters) {
    for (const config of bracketConfigs) {
      const slots = await prisma.bidSlot.findMany({
        where: { characterId: character.id, phaseId, track: config.track, bracket: config.bracket },
        orderBy: { slotIndex: "asc" },
      });

      if (slots.length < config.slotCount) {
        const toCreate = config.slotCount - slots.length;
        await prisma.bidSlot.createMany({
          data: Array.from({ length: toCreate }, (_, i) => ({
            characterId: character.id,
            phaseId,
            track: config.track,
            bracket: config.bracket,
            slotIndex: slots.length + i,
            status: BidStatus.EMPTY,
          })),
        });
        summary.slotsAdded += toCreate;
      } else if (slots.length > config.slotCount) {
        const excess = slots.slice(config.slotCount).reverse(); // highest slotIndex first
        for (const slot of excess) {
          if (slot.status !== BidStatus.EMPTY) {
            summary.skipped.push({
              characterName: character.name,
              track: config.track,
              bracket: config.bracket,
              reason: `slot ${slot.slotIndex} is ${slot.status}, not empty — clear it manually first`,
            });
            continue;
          }
          await prisma.bidSlot.delete({ where: { id: slot.id } });
          summary.slotsRemoved += 1;
        }
      }
    }
  }

  return summary;
}
