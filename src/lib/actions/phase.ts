"use server";

// Server Actions for /officer/phase: creating phases, switching the active
// one, and previewing/applying the end-of-phase rollover.
import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { applyPhaseTransition, previewPhaseTransition } from "@/lib/rules/phaseTransition";

export async function createPhaseAction(formData: FormData) {
  await requireOfficer();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Phase name is required.");

  await prisma.phase.create({ data: { name } });
  revalidatePath("/officer/phase");
}

/** Exactly one phase is ever active — deactivates every other phase first. */
export async function activatePhaseAction(phaseId: string) {
  await requireOfficer();
  await prisma.$transaction([
    prisma.phase.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.phase.update({ where: { id: phaseId }, data: { isActive: true } }),
  ]);
  revalidatePath("/officer/phase");
}

/** Read-only counts of what a transition would carry/clear/create — no writes. */
export async function previewTransitionAction(fromPhaseId: string, toPhaseId: string) {
  await requireOfficer();
  return previewPhaseTransition(fromPhaseId, toPhaseId);
}

/** Applies the transition and activates the target phase in one confirmed step. */
export async function applyTransitionAction(
  fromPhaseId: string,
  toPhaseId: string,
  unlockSlots: { bracket: number; slotIndex: number }[],
) {
  await requireOfficer();
  const summary = await applyPhaseTransition(fromPhaseId, toPhaseId, { unlockSlots });
  await activatePhaseAction(toPhaseId);
  revalidatePath("/officer/phase");
  return summary;
}
