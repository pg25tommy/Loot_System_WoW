"use server";

// Server Action backing the gatherable/random-drop bid form on
// /officer/loot/gatherables.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import type { Track } from "@/generated/prisma/client";
import { spendGatherableBid } from "@/lib/rules/gatherables";

export async function spendGatherableBidAction(formData: FormData) {
  await requireOfficer();

  const characterId = String(formData.get("characterId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "");
  const track = String(formData.get("track") ?? "") as Track;
  const goldValue = Number(formData.get("goldValue") ?? "0");
  const itemId = String(formData.get("itemId") ?? "") || undefined;

  await spendGatherableBid({ characterId, phaseId, track, goldValue, itemId });

  revalidatePath(`/officer/characters/${characterId}/edit`);
  revalidatePath(`/characters/${characterId}`);
  redirect(`/officer/characters/${characterId}/edit`);
}
