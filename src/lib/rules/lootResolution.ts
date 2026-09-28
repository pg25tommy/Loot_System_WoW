// The core loot-resolution engine: bracket ranking, the full tiebreak chain
// (blocked-slot count -> Initiate auto-lose -> manual roll), tank overrides,
// and persisting the final result. Backs the guided wizard at
// /officer/loot/resolve. Every plan-producing function here returns a
// LootResolutionPlan rather than mutating anything — nothing is written to
// the database until applyResolutionPlan() is called with an explicit
// officer confirm.
import { prisma } from "@/lib/db";
import { BidStatus, DropResolutionMethod, DropStatus, Track } from "@/generated/prisma/client";
import type { LootDropModel as LootDrop } from "@/generated/prisma/models";
import {
  type BidderCandidate,
  bestBracket,
  getEligibleBidders,
  groupByBracket,
} from "./bidding";

export type TiebreakResult = {
  resolved: boolean;
  winnerCharacterId?: string;
  winnerCharacterName?: string;
  winnerCharacterClass?: string;
  winnerSlotId?: string;
  needsRoll: boolean;
  tiedCandidates: BidderCandidate[];
  autoLoseCharacterIds: string[];
  /** Which filtering step actually broke the tie, for the human-readable description. */
  resolvedBy?: "BLOCKED_COUNT" | "INITIATE_FILTER";
  /** The blocked-slot count shared by the winner (and anyone else at that count) at resolution time. */
  winnerBlockedCount?: number;
  /** How many candidates were tied on bracket before any tiebreak filtering was applied. */
  initialTiedCount?: number;
  /** Carried through to the follow-up plan (roll finalize / tank auto-win) so the
   * full competing-bidders breakdown stays visible after a roll is entered. */
  allBracketCandidates?: BracketCandidateSummary[];
};

/** One bracket's worth of eligible bidders for the item being resolved, for display. */
export type BracketCandidateSummary = {
  bracket: number;
  candidates: { characterId: string; characterName: string; characterClass: string }[];
};

export type LootResolutionPlan = {
  method: DropResolutionMethod | null;
  winnerCharacterId: string | null;
  /** Always populated alongside winnerCharacterId — the UI shouldn't have to
   * dig through tiebreak.tiedCandidates (which is empty for outright wins
   * and blocked-count resolutions) just to show a name. */
  winnerCharacterName: string | null;
  winnerCharacterClass: string | null;
  candidateSlotId: string | null;
  bracket: number | null;
  tankPriorityUsed: boolean;
  tankAutoTiebreakUsed: boolean;
  tiebreak?: TiebreakResult;
  /** Every bracket with at least one eligible bidder for this item, for the
   * "who was competing" breakdown on the resolve screen. Empty when this
   * plan bypassed normal bracket ranking (tank priority, recipe award). */
  allBracketCandidates: BracketCandidateSummary[];
  /** Plain-English explanation of how the winner was decided, for display. */
  resolutionSummary: string | null;
  /** True whenever this plan requires an explicit officer confirm click before persisting. */
  requiresOfficerConfirm: true;
};

function summarizeBrackets(grouped: Map<number, BidderCandidate[]>): BracketCandidateSummary[] {
  return [...grouped.entries()]
    .filter(([, list]) => list.length > 0)
    .sort(([a], [b]) => a - b)
    .map(([bracket, list]) => ({
      bracket,
      candidates: list.map((c) => ({
        characterId: c.characterId,
        characterName: c.character.name,
        characterClass: c.character.class,
      })),
    }));
}

const INITIATE_TIER_NAME = "Initiate";

/** "total blocked slots within the bracket" for one candidate's track/bracket. */
async function countBlockedInBracket(
  characterId: string,
  phaseId: string,
  track: Track,
  bracket: number,
): Promise<number> {
  return prisma.bidSlot.count({
    where: { characterId, phaseId, track, bracket, status: BidStatus.BLOCKED },
  });
}

/**
 * Tiebreak order: 1) lowest total blocked slots within the bracket wins;
 * 2) if still tied, flag for a manual /roll 100 (highest wins).
 * "New members automatically lose all tiebreakers."
 */
export async function computeTiebreak(
  candidates: BidderCandidate[],
  phaseId: string,
  track: Track,
): Promise<TiebreakResult> {
  const withCounts = await Promise.all(
    candidates.map(async (c) => ({
      candidate: c,
      blockedCount: await countBlockedInBracket(c.characterId, phaseId, track, c.bracket),
    })),
  );

  const initialTiedCount = candidates.length;
  const minCount = Math.min(...withCounts.map((c) => c.blockedCount));
  let tied = withCounts.filter((c) => c.blockedCount === minCount).map((c) => c.candidate);

  if (tied.length === 1) {
    return {
      resolved: true,
      winnerCharacterId: tied[0].characterId,
      winnerCharacterName: tied[0].character.name,
      winnerCharacterClass: tied[0].character.class,
      winnerSlotId: tied[0].id,
      needsRoll: false,
      tiedCandidates: [],
      autoLoseCharacterIds: [],
      resolvedBy: "BLOCKED_COUNT",
      winnerBlockedCount: minCount,
      initialTiedCount,
    };
  }

  const initiateIds = tied
    .filter((c) => c.character.rankTier.name === INITIATE_TIER_NAME)
    .map((c) => c.characterId);
  const nonInitiates = tied.filter((c) => c.character.rankTier.name !== INITIATE_TIER_NAME);

  if (initiateIds.length > 0 && nonInitiates.length > 0) {
    tied = nonInitiates;
  }

  if (tied.length === 1) {
    return {
      resolved: true,
      winnerCharacterId: tied[0].characterId,
      winnerCharacterName: tied[0].character.name,
      winnerCharacterClass: tied[0].character.class,
      winnerSlotId: tied[0].id,
      needsRoll: false,
      tiedCandidates: [],
      autoLoseCharacterIds: initiateIds,
      resolvedBy: "INITIATE_FILTER",
      winnerBlockedCount: minCount,
      initialTiedCount,
    };
  }

  return {
    resolved: false,
    needsRoll: true,
    tiedCandidates: tied,
    autoLoseCharacterIds: initiateIds,
    initialTiedCount,
  };
}

/** Main entry point for the guided "resolve this drop" wizard. */
export async function resolveLootDrop(input: {
  itemId: string;
  phaseId: string;
  track: Track;
}): Promise<LootResolutionPlan> {
  const eligible = await getEligibleBidders(input.itemId, input.phaseId, input.track);
  const grouped = groupByBracket(eligible);
  const bracket = bestBracket(grouped);
  const allBracketCandidates = summarizeBrackets(grouped);

  if (bracket === null) {
    return {
      method: null,
      winnerCharacterId: null,
      winnerCharacterName: null,
      winnerCharacterClass: null,
      candidateSlotId: null,
      bracket: null,
      tankPriorityUsed: false,
      tankAutoTiebreakUsed: false,
      allBracketCandidates,
      resolutionSummary: null,
      requiresOfficerConfirm: true,
    };
  }

  const candidates = grouped.get(bracket)!;

  if (candidates.length === 1) {
    return {
      method: DropResolutionMethod.BRACKET_OUTRIGHT,
      winnerCharacterId: candidates[0].characterId,
      winnerCharacterName: candidates[0].character.name,
      winnerCharacterClass: candidates[0].character.class,
      candidateSlotId: candidates[0].id,
      bracket,
      tankPriorityUsed: false,
      tankAutoTiebreakUsed: false,
      allBracketCandidates,
      resolutionSummary: `${candidates[0].character.name} was the only eligible bidder in bracket ${bracket}.`,
      requiresOfficerConfirm: true,
    };
  }

  const tiebreak = await computeTiebreak(candidates, input.phaseId, input.track);
  tiebreak.allBracketCandidates = allBracketCandidates;

  if (tiebreak.resolved) {
    return {
      method: DropResolutionMethod.TIEBREAK_BLOCKED_COUNT,
      winnerCharacterId: tiebreak.winnerCharacterId!,
      winnerCharacterName: tiebreak.winnerCharacterName ?? null,
      winnerCharacterClass: tiebreak.winnerCharacterClass ?? null,
      candidateSlotId: tiebreak.winnerSlotId!,
      bracket,
      tankPriorityUsed: false,
      tankAutoTiebreakUsed: false,
      tiebreak,
      allBracketCandidates,
      resolutionSummary: describeBlockedCountTiebreak(tiebreak, bracket),
      requiresOfficerConfirm: true,
    };
  }

  return {
    method: null,
    winnerCharacterId: null,
    winnerCharacterName: null,
    winnerCharacterClass: null,
    candidateSlotId: null,
    bracket,
    tankPriorityUsed: false,
    tankAutoTiebreakUsed: false,
    tiebreak,
    allBracketCandidates,
    resolutionSummary: null,
    requiresOfficerConfirm: true,
  };
}

function describeBlockedCountTiebreak(tiebreak: TiebreakResult, bracket: number): string {
  const name = tiebreak.winnerCharacterName ?? "The winner";
  const others = (tiebreak.initialTiedCount ?? 1) - 1;

  if (tiebreak.resolvedBy === "INITIATE_FILTER") {
    return `${name} won bracket ${bracket} — tied with ${others} other bidder${others === 1 ? "" : "s"} on blocked-slot count, but the other${others === 1 ? "" : "s"} auto-lose ties as an Initiate.`;
  }

  return `${name} won bracket ${bracket} with the fewest blocked slots (${tiebreak.winnerBlockedCount}) among ${tiebreak.initialTiedCount} tied bidders.`;
}

/**
 * "The Main-Tank/Tank officer may claim an item as tank priority, spending a
 * bracket instantly instead of the normal process. Used sparingly."
 */
export async function planTankPriority(
  bidSlotId: string,
  officer: { isTankOfficer: boolean },
): Promise<LootResolutionPlan> {
  if (!officer.isTankOfficer) {
    throw new Error("Only a tank officer may claim tank priority.");
  }

  const slot = await prisma.bidSlot.findUniqueOrThrow({
    where: { id: bidSlotId },
    include: { character: true },
  });
  if (slot.status === BidStatus.BLOCKED) {
    throw new Error("That slot is already blocked.");
  }

  return {
    method: DropResolutionMethod.TANK_PRIORITY,
    winnerCharacterId: slot.characterId,
    winnerCharacterName: slot.character.name,
    winnerCharacterClass: slot.character.class,
    candidateSlotId: slot.id,
    bracket: slot.bracket,
    tankPriorityUsed: true,
    tankAutoTiebreakUsed: false,
    allBracketCandidates: [],
    resolutionSummary: `${slot.character.name} spent a tank-priority claim on bracket ${slot.bracket}, bypassing normal bracket ranking.`,
    requiresOfficerConfirm: true,
  };
}

/**
 * "On any tie, the main-tank officer may automatically win the tiebreak for
 * a tank as necessary — used sparingly, only if necessary for progression."
 */
export function applyTankAutoTiebreak(
  tiebreak: TiebreakResult,
  tankCharacterId: string,
  bracket: number,
  officer: { isTankOfficer: boolean },
): LootResolutionPlan {
  if (!officer.isTankOfficer) {
    throw new Error("Only a tank officer may auto-win a tiebreak.");
  }

  const candidate = tiebreak.tiedCandidates.find((c) => c.characterId === tankCharacterId);
  if (!candidate) {
    throw new Error("That character is not among the tied candidates.");
  }

  return {
    method: DropResolutionMethod.TIEBREAK_TANK_AUTOWIN,
    winnerCharacterId: candidate.characterId,
    winnerCharacterName: candidate.character.name,
    winnerCharacterClass: candidate.character.class,
    candidateSlotId: candidate.id,
    bracket,
    tankPriorityUsed: false,
    tankAutoTiebreakUsed: true,
    tiebreak,
    allBracketCandidates: tiebreak.allBracketCandidates ?? [],
    resolutionSummary: `${candidate.character.name} was manually chosen by the tank officer to win the bracket ${bracket} tiebreak.`,
    requiresOfficerConfirm: true,
  };
}

/** Officer manually records a /roll 100 result for the tied candidates. */
export function recordRollAndFinalize(
  tiebreak: TiebreakResult,
  bracket: number,
  rolls: { characterId: string; roll: number }[],
): LootResolutionPlan {
  const eligibleRolls = rolls.filter((r) =>
    tiebreak.tiedCandidates.some((c) => c.characterId === r.characterId),
  );
  if (eligibleRolls.length === 0) {
    throw new Error("No rolls supplied for the tied candidates.");
  }

  const winningRoll = eligibleRolls.reduce((max, r) => (r.roll > max.roll ? r : max));
  const candidate = tiebreak.tiedCandidates.find(
    (c) => c.characterId === winningRoll.characterId,
  )!;

  const otherRolls = eligibleRolls
    .filter((r) => r.characterId !== winningRoll.characterId)
    .map((r) => {
      const name = tiebreak.tiedCandidates.find((c) => c.characterId === r.characterId)?.character.name ?? "?";
      return `${name} rolled ${r.roll}`;
    })
    .join(", ");

  return {
    method: DropResolutionMethod.TIEBREAK_ROLL,
    winnerCharacterId: candidate.characterId,
    winnerCharacterName: candidate.character.name,
    winnerCharacterClass: candidate.character.class,
    candidateSlotId: candidate.id,
    bracket,
    tankPriorityUsed: false,
    tankAutoTiebreakUsed: false,
    tiebreak,
    allBracketCandidates: tiebreak.allBracketCandidates ?? [],
    resolutionSummary: `${candidate.character.name} won a /roll 100 tiebreak in bracket ${bracket} with a roll of ${winningRoll.roll}${otherRolls ? ` (${otherRolls})` : ""}.`,
    requiresOfficerConfirm: true,
  };
}

/** Persists a resolution plan: creates the LootDrop and blocks the winning slot. */
export async function applyResolutionPlan(
  plan: LootResolutionPlan,
  context: {
    itemId: string;
    phaseId: string;
    track: Track;
    raidDate: Date;
    droppedFrom?: string;
    resolvedByOfficerId: string;
    notes?: string;
  },
): Promise<LootDrop> {
  if (!plan.winnerCharacterId || !plan.method) {
    throw new Error("Plan is not resolved — cannot apply.");
  }

  return prisma.$transaction(async (tx) => {
    const drop = await tx.lootDrop.create({
      data: {
        itemId: context.itemId,
        phaseId: context.phaseId,
        track: context.track,
        raidDate: context.raidDate,
        droppedFrom: context.droppedFrom,
        winnerCharacterId: plan.winnerCharacterId,
        resolutionMethod: plan.method!,
        winningBracket: plan.bracket,
        resolvedByOfficerId: context.resolvedByOfficerId,
        tankPriorityUsed: plan.tankPriorityUsed,
        tankAutoTiebreakUsed: plan.tankAutoTiebreakUsed,
        resolutionSummary: plan.resolutionSummary,
        notes: context.notes,
        status: DropStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    if (!plan.candidateSlotId) return drop;

    await tx.bidSlot.update({
      where: { id: plan.candidateSlotId },
      data: {
        status: BidStatus.BLOCKED,
        blockedAt: new Date(),
        blockedByDropId: drop.id,
      },
    });

    return tx.lootDrop.update({
      where: { id: drop.id },
      data: { resolvedBidSlotId: plan.candidateSlotId },
    });
  });
}
