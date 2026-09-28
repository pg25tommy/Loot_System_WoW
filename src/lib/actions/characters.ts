"use server";

// Server Actions for creating/editing characters and their individual bid
// slots — backs /officer/characters and its per-character edit page.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOfficer } from "@/lib/auth/session";
import { BidStatus, SpecPriority } from "@/generated/prisma/client";
import { seedNewMemberBlocks } from "@/lib/rules/newMembers";
import type { Track } from "@/generated/prisma/client";

/** Creates a character and gives it one EMPTY bid slot per configured bracket/track. */
export async function createCharacterAction(formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const server = String(formData.get("server") ?? "").trim() || null;
  const characterClass = String(formData.get("class") ?? "").trim();
  const spec = String(formData.get("spec") ?? "").trim();
  const rankTierId = String(formData.get("rankTierId") ?? "");
  const mainCharacterId = String(formData.get("mainCharacterId") ?? "") || null;

  if (!name || !characterClass || !spec || !rankTierId) {
    throw new Error("Name, class, spec, and rank tier are required.");
  }

  const character = await prisma.character.create({
    data: {
      name,
      server,
      class: characterClass,
      spec,
      rankTierId,
      isAlt: Boolean(mainCharacterId),
      mainCharacterId,
    },
  });

  const activePhase = await prisma.phase.findFirst({ where: { isActive: true } });
  if (activePhase) {
    const bracketConfigs = await prisma.bracketConfig.findMany({ where: { phaseId: activePhase.id } });
    await prisma.bidSlot.createMany({
      data: bracketConfigs.flatMap((bc) =>
        Array.from({ length: bc.slotCount }, (_, slotIndex) => ({
          characterId: character.id,
          phaseId: activePhase.id,
          track: bc.track,
          bracket: bc.bracket,
          slotIndex,
          status: BidStatus.EMPTY,
        })),
      ),
    });
  }

  revalidatePath("/officer/characters");
}

/** Updates a character's profile fields (name, class/spec, rank, active flag, notes). */
export async function updateCharacterAction(characterId: string, formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const server = String(formData.get("server") ?? "").trim() || null;
  const characterClass = String(formData.get("class") ?? "").trim();
  const spec = String(formData.get("spec") ?? "").trim();
  const rankTierId = String(formData.get("rankTierId") ?? "");
  const isActive = formData.get("isActive") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.character.update({
    where: { id: characterId },
    data: { name, server, class: characterClass, spec, rankTierId, isActive, notes },
  });

  revalidatePath("/officer/characters");
  revalidatePath(`/officer/characters/${characterId}/edit`);
  revalidatePath(`/characters/${characterId}`);
}

/**
 * Returns { error } instead of throwing: a thrown Error inside a Server
 * Action has its message redacted by Next.js in production (only a
 * `digest` survives, even when the caller catches it) — a plain return
 * value is the only way an expected validation message reaches the client.
 */
export async function setBidSlotAction(
  bidSlotId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireOfficer();

  const itemId = String(formData.get("itemId") ?? "") || null;
  const specPriorityRaw = String(formData.get("specPriority") ?? "");
  const specPriority = specPriorityRaw ? SpecPriority[specPriorityRaw as keyof typeof SpecPriority] : null;
  const scheduleForNextWeek = formData.get("scheduleForNextWeek") === "on";
  const becomesActiveAtRaw = String(formData.get("becomesActiveAt") ?? "");

  const slot = await prisma.bidSlot.findUniqueOrThrow({ where: { id: bidSlotId } });

  if (itemId) {
    const duplicate = await prisma.bidSlot.findFirst({
      where: {
        characterId: slot.characterId,
        phaseId: slot.phaseId,
        track: slot.track,
        id: { not: bidSlotId },
        status: { not: BidStatus.EMPTY },
        OR: [{ itemId }, { pendingItemId: itemId }],
      },
      include: { item: true },
    });
    if (duplicate) {
      return {
        error: `${duplicate.item?.name ?? "That item"} is already bid in bracket ${duplicate.bracket} of this track — a character can't bid the same item twice.`,
      };
    }
  }

  if (scheduleForNextWeek) {
    if (!becomesActiveAtRaw) return { error: "Pick a date for the change to take effect." };
    await prisma.bidSlot.update({
      where: { id: bidSlotId },
      data: {
        pendingItemId: itemId,
        becomesActiveAt: new Date(becomesActiveAtRaw),
        status: BidStatus.PENDING,
        specPriority,
      },
    });
  } else {
    await prisma.bidSlot.update({
      where: { id: bidSlotId },
      data: {
        itemId,
        status: itemId ? BidStatus.ACTIVE : BidStatus.EMPTY,
        pendingItemId: null,
        becomesActiveAt: null,
        specPriority,
      },
    });
  }

  revalidatePath(`/officer/characters/${slot.characterId}/edit`);
  revalidatePath(`/characters/${slot.characterId}`);
  return {};
}

/** Officer-confirmed application of seedNewMemberBlocks()'s starting-handicap calculation. */
export async function seedNewMemberBlocksAction(formData: FormData) {
  await requireOfficer();

  const characterId = String(formData.get("characterId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "");
  const track = String(formData.get("track") ?? "") as Track;
  const pctOfAverage = Number(formData.get("pctOfAverage") ?? "0");

  await seedNewMemberBlocks(characterId, phaseId, track, pctOfAverage);

  revalidatePath(`/officer/characters/${characterId}/edit`);
  revalidatePath(`/characters/${characterId}`);
}
