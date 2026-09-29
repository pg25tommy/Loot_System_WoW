"use server";

// Server Actions backing the ResolveWizard (/officer/loot/resolve) and the
// pass-chain panel on a drop's detail page.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { Track } from "@/generated/prisma/client";
import {
  applyResolutionPlan,
  applyTankAutoTiebreak,
  planTankPriority,
  recordRollAndFinalize,
  resolveLootDrop,
  type LootResolutionPlan,
  type TiebreakResult,
} from "@/lib/rules/lootResolution";
import { postLootResultToDiscord } from "@/lib/discord";
import { startPassChain, recordPassDecision, passAsIdenticalItemAlreadyWon } from "@/lib/rules/passing";

/**
 * A thrown Error inside a Server Action has its message redacted by Next.js
 * in production — even when the caller catches it, only a `digest` survives.
 * Actions that can fail for reasons the officer needs to see (not a tank
 * officer, slot already blocked, stale tiebreak state, etc.) return this
 * instead of throwing, so the real message actually reaches the client.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  return fn().then(
    (data) => ({ ok: true, data }) as const,
    (e) => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." }) as const,
  );
}

/** Computes (without persisting) the bracket-ranking + tiebreak plan for an item. Never throws. */
export async function getResolutionPlanAction(input: {
  itemId: string;
  phaseId: string;
  track: Track;
}): Promise<LootResolutionPlan> {
  await requireOfficer();
  return resolveLootDrop(input);
}

/** Tank officer spends a bracket slot instantly, bypassing normal ranking. */
export async function tankPriorityPlanAction(bidSlotId: string): Promise<ActionResult<LootResolutionPlan>> {
  const session = await requireOfficer();
  return toActionResult(() => planTankPriority(bidSlotId, { isTankOfficer: session.user.isTankOfficer }));
}

/** Tank officer manually picks the winner of an otherwise-unresolved tiebreak. */
export async function tankAutoTiebreakAction(
  tiebreak: TiebreakResult,
  tankCharacterId: string,
  bracket: number,
): Promise<ActionResult<LootResolutionPlan>> {
  const session = await requireOfficer();
  return toActionResult(() =>
    Promise.resolve(
      applyTankAutoTiebreak(tiebreak, tankCharacterId, bracket, { isTankOfficer: session.user.isTankOfficer }),
    ),
  );
}

/** Records a manually-entered /roll 100 result and finalizes the tiebreak's winner. */
export async function rollFinalizeAction(
  tiebreak: TiebreakResult,
  bracket: number,
  rolls: { characterId: string; roll: number }[],
): Promise<ActionResult<LootResolutionPlan>> {
  await requireOfficer();
  return toActionResult(() => Promise.resolve(recordRollAndFinalize(tiebreak, bracket, rolls)));
}

/** Persists a resolved plan as a LootDrop and blocks the winning bid slot. */
export async function confirmResolutionAction(
  plan: LootResolutionPlan,
  context: {
    itemId: string;
    phaseId: string;
    track: Track;
    raidDate: string;
    droppedFrom?: string;
    notes?: string;
  },
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOfficer();

  return toActionResult(async () => {
    const drop = await applyResolutionPlan(plan, {
      itemId: context.itemId,
      phaseId: context.phaseId,
      track: context.track,
      raidDate: new Date(context.raidDate),
      droppedFrom: context.droppedFrom,
      notes: context.notes,
      resolvedByOfficerId: session.user.officerId,
    });

    revalidatePath("/officer/loot/drops");
    revalidatePath("/officer");
    if (plan.winnerCharacterId) revalidatePath(`/characters/${plan.winnerCharacterId}`);

    // Announce in Discord once the officer has their response.
    after(() => postLootResultToDiscord(plan, context));

    return drop;
  });
}

/** Finds who the item should be offered to first (or confirms the chain is exhausted). */
export async function startPassChainAction(dropId: string) {
  await requireOfficer();
  return startPassChain(dropId);
}

/** Records one officer's PASSED/KEPT/TRADED decision and advances the chain. */
export async function recordPassDecisionAction(
  dropId: string,
  characterId: string,
  decision: "PASSED" | "KEPT" | "TRADED",
  reason?: string,
) {
  await requireOfficer();
  const state = await recordPassDecision(dropId, characterId, decision, reason);
  revalidatePath(`/officer/loot/drops/${dropId}`);
  revalidatePath("/officer/loot/drops");
  return state;
}

/** Checks whether a character already won an identical-slot item this raid week (no-penalty full pass). */
export async function checkIdenticalItemAlreadyWonAction(dropId: string, characterId: string) {
  await requireOfficer();
  return passAsIdenticalItemAlreadyWon(dropId, characterId);
}

/** A tank officer's own (non-blocked) slots, for the "slot to spend" tank-priority picker. */
export async function getCharacterSlotsAction(characterId: string, phaseId: string, track: Track) {
  await requireOfficer();
  return prisma.bidSlot.findMany({
    where: { characterId, phaseId, track, status: { not: "BLOCKED" } },
    include: { item: true },
    orderBy: [{ bracket: "asc" }, { slotIndex: "asc" }],
  });
}

/** Items with at least one active bidder, for the resolve wizard's item dropdown. */
export async function listEligibleItemsForResolveAction(phaseId: string, track: Track) {
  await requireOfficer();
  const slots = await prisma.bidSlot.findMany({
    where: { phaseId, track, status: "ACTIVE", itemId: { not: null } },
    select: { itemId: true, item: { select: { id: true, name: true } } },
    distinct: ["itemId"],
  });
  return slots
    .filter((s) => s.item)
    .map((s) => s.item!)
    .sort((a, b) => a.name.localeCompare(b.name));
}
