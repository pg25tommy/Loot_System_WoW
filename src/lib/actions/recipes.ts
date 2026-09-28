"use server";

// Server Action for the officer-discretion recipe award form on
// /officer/loot/recipes (BoP recipes that create BoE items).
import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import type { Track } from "@/generated/prisma/client";
import { resolveRecipeAward } from "@/lib/rules/recipes";
import { applyResolutionPlan } from "@/lib/rules/lootResolution";

export async function awardRecipeByOfficerDiscretionAction(formData: FormData) {
  const session = await requireOfficer();

  const itemId = String(formData.get("itemId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "");
  const track = String(formData.get("track") ?? "") as Track;
  const pickedCharacterId = String(formData.get("pickedCharacterId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const plan = await resolveRecipeAward({
    itemId,
    phaseId,
    track,
    method: "OFFICER_DISCRETION",
    pickedCharacterId,
  });

  await applyResolutionPlan(plan, {
    itemId,
    phaseId,
    track,
    raidDate: new Date(),
    resolvedByOfficerId: session.user.officerId,
    notes,
  });

  revalidatePath("/officer/loot/drops");
  revalidatePath(`/characters/${pickedCharacterId}`);
}
