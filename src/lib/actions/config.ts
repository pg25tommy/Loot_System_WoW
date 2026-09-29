"use server";

// CRUD Server Actions for the four officer-editable config areas: bracket
// sizes, rank tiers, gatherable gold-value brackets, and officer accounts.
// Officer-account actions require requireAdmin() (only the admin manages
// other officers); everything else just requires requireOfficer().
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin, requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { Track } from "@/generated/prisma/client";
import { syncBidSlotsToConfig, type BracketSyncSummary } from "@/lib/rules/bracketSync";

// --- Bracket config -------------------------------------------------------

/** Creates or updates one (phase, track, bracket) row's slot count/label. */
export async function upsertBracketConfigAction(formData: FormData) {
  await requireOfficer();

  const phaseId = String(formData.get("phaseId") ?? "");
  const track = String(formData.get("track") ?? "") as Track;
  const bracket = Number(formData.get("bracket") ?? "0");
  const slotCount = Number(formData.get("slotCount") ?? "0");
  const label = String(formData.get("label") ?? "").trim() || null;

  await prisma.bracketConfig.upsert({
    where: { phaseId_track_bracket: { phaseId, track, bracket } },
    update: { slotCount, label },
    create: { phaseId, track, bracket, slotCount, label },
  });

  revalidatePath("/officer/config/brackets");
}

/** Reconciles every character's bid slots to match the current bracket config. */
export async function syncBidSlotsAction(phaseId: string): Promise<BracketSyncSummary> {
  await requireOfficer();
  const summary = await syncBidSlotsToConfig(phaseId);
  revalidatePath("/officer/config/brackets");
  revalidatePath("/officer/characters");
  return summary;
}

// --- Rank tiers ------------------------------------------------------------

export async function createRankTierAction(formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  const isLootEligible = formData.get("isLootEligible") === "on";
  const attendanceRequirementPctRaw = String(formData.get("attendanceRequirementPct") ?? "");
  const bonusBidEligible = formData.get("bonusBidEligible") === "on";

  if (!name) throw new Error("Rank tier name is required.");

  await prisma.rankTier.create({
    data: {
      name,
      sortOrder,
      isLootEligible,
      attendanceRequirementPct: attendanceRequirementPctRaw ? Number(attendanceRequirementPctRaw) : null,
      bonusBidEligible,
    },
  });

  revalidatePath("/officer/config/rank-tiers");
}

export async function updateRankTierAction(tierId: string, formData: FormData) {
  await requireOfficer();

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  const isLootEligible = formData.get("isLootEligible") === "on";
  const attendanceRequirementPctRaw = String(formData.get("attendanceRequirementPct") ?? "");
  const bonusBidEligible = formData.get("bonusBidEligible") === "on";

  await prisma.rankTier.update({
    where: { id: tierId },
    data: {
      name,
      sortOrder,
      isLootEligible,
      attendanceRequirementPct: attendanceRequirementPctRaw ? Number(attendanceRequirementPctRaw) : null,
      bonusBidEligible,
    },
  });

  revalidatePath("/officer/config/rank-tiers");
}

// --- Gatherable value brackets ---------------------------------------------

export async function createGatherableRowAction(formData: FormData) {
  await requireOfficer();

  const minGold = Number(formData.get("minGold") ?? "0");
  const maxGoldRaw = String(formData.get("maxGold") ?? "");
  const bracket = Number(formData.get("bracket") ?? "0");

  await prisma.gatherableValueBracket.create({
    data: { minGold, maxGold: maxGoldRaw ? Number(maxGoldRaw) : null, bracket },
  });

  revalidatePath("/officer/config/gatherables");
}

export async function deleteGatherableRowAction(rowId: string) {
  await requireOfficer();
  await prisma.gatherableValueBracket.delete({ where: { id: rowId } });
  revalidatePath("/officer/config/gatherables");
}

// --- Officer accounts (admin-only) -----------------------------------------

export async function createOfficerAction(formData: FormData) {
  await requireAdmin();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || username;
  const isAdmin = formData.get("isAdmin") === "on";
  const isTankOfficer = formData.get("isTankOfficer") === "on";

  if (!username || !password) throw new Error("Username and password are required.");

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.officer.create({
    data: { username, passwordHash, displayName, isAdmin, isTankOfficer },
  });

  revalidatePath("/officer/config/officers");
}

/**
 * Keeps the acting admin's own admin flag forced on, to prevent an accidental
 * self-lockout. The "Admin" checkbox is disabled on your own row in the UI —
 * disabled checkboxes aren't included in form submissions at all, so this
 * can't just read `isAdmin` from the form for your own row (it would always
 * come back false, even when you're only touching the Tank checkbox).
 */
export async function updateOfficerRoleAction(officerId: string, formData: FormData) {
  const session = await requireAdmin();

  const isTankOfficer = formData.get("isTankOfficer") === "on";
  const isAdmin = officerId === session.user.officerId ? true : formData.get("isAdmin") === "on";

  await prisma.officer.update({
    where: { id: officerId },
    data: { isAdmin, isTankOfficer },
  });

  revalidatePath("/officer/config/officers");
}

/** Blocks the acting admin from deleting their own account (same self-lockout guard). */
export async function deleteOfficerAction(officerId: string) {
  const session = await requireAdmin();

  if (officerId === session.user.officerId) {
    throw new Error("You can't delete your own account.");
  }

  await prisma.officer.delete({ where: { id: officerId } });

  revalidatePath("/officer/config/officers");
}
