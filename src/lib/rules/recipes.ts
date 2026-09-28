// Recipe drops fork into two award paths depending on the recipe's output —
// see the branch below.
import { DropResolutionMethod, Track } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { type LootResolutionPlan, resolveLootDrop } from "./lootResolution";

/**
 * "BoP recipes that create BoE items are decided by guild officers, based
 * on attendance, longevity, activity, and general availability ... BoP
 * recipes that create BoP items are handled by lootlist priority."
 */
export async function resolveRecipeAward(input: {
  itemId: string;
  phaseId: string;
  track: Track;
  method: "OFFICER_DISCRETION" | "LOOTLIST_PRIORITY";
  pickedCharacterId?: string;
}): Promise<LootResolutionPlan> {
  if (input.method === "OFFICER_DISCRETION") {
    if (!input.pickedCharacterId) {
      throw new Error("pickedCharacterId is required for an officer-discretion recipe award.");
    }
    const character = await prisma.character.findUniqueOrThrow({ where: { id: input.pickedCharacterId } });
    return {
      method: DropResolutionMethod.RECIPE_OFFICER_AWARD,
      winnerCharacterId: input.pickedCharacterId,
      winnerCharacterName: character.name,
      winnerCharacterClass: character.class,
      candidateSlotId: null,
      bracket: null,
      tankPriorityUsed: false,
      tankAutoTiebreakUsed: false,
      allBracketCandidates: [],
      resolutionSummary: `${character.name} was awarded this recipe by officer discretion.`,
      requiresOfficerConfirm: true,
    };
  }

  const plan = await resolveLootDrop({
    itemId: input.itemId,
    phaseId: input.phaseId,
    track: input.track,
  });

  return {
    ...plan,
    method: plan.method ? DropResolutionMethod.RECIPE_LOOTLIST : plan.method,
  };
}
