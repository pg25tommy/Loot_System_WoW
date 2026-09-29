"use server";

// CRUD Server Actions for the item catalog (/officer/items).
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOfficer } from "@/lib/auth/session";

export async function createItemAction(formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const slot = String(formData.get("slot") ?? "").trim() || null;
  const sourceRaid = String(formData.get("sourceRaid") ?? "").trim() || null;
  const sourceBoss = String(formData.get("sourceBoss") ?? "").trim() || null;
  const isBoP = formData.get("isBoP") === "on";
  const isCraftedBoE = formData.get("isCraftedBoE") === "on";
  const isRecipe = formData.get("isRecipe") === "on";
  const recipeOutputIsBoE = formData.get("recipeOutputIsBoE") === "on";

  if (!name) throw new Error("Item name is required.");

  await prisma.item.create({
    data: {
      name,
      slot,
      sourceRaid,
      sourceBoss,
      isBoP,
      isCraftedBoE,
      isRecipe,
      recipeOutputIsBoE: isRecipe ? recipeOutputIsBoE : null,
    },
  });

  revalidatePath("/officer/items");
  revalidatePath("/officer/loot/recipes");
}

export async function updateItemAction(itemId: string, formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const slot = String(formData.get("slot") ?? "").trim() || null;
  const sourceRaid = String(formData.get("sourceRaid") ?? "").trim() || null;
  const sourceBoss = String(formData.get("sourceBoss") ?? "").trim() || null;
  const isBoP = formData.get("isBoP") === "on";
  const isCraftedBoE = formData.get("isCraftedBoE") === "on";
  const isRecipe = formData.get("isRecipe") === "on";
  const recipeOutputIsBoE = formData.get("recipeOutputIsBoE") === "on";

  await prisma.item.update({
    where: { id: itemId },
    data: {
      name,
      slot,
      sourceRaid,
      sourceBoss,
      isBoP,
      isCraftedBoE,
      isRecipe,
      recipeOutputIsBoE: isRecipe ? recipeOutputIsBoE : null,
    },
  });

  revalidatePath("/officer/items");
  revalidatePath(`/items/${itemId}`);
}
