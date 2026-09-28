// Attendance-rate math and the rank-demotion suggestion it feeds. Suggests
// only — applyRankChange() always requires an explicit officer click, never
// runs automatically off this calculation.
import { prisma } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/client";

export type AttendanceRate = {
  rate: number;
  present: number;
  missed: number;
  total: number;
};

/**
 * "No more than 3 missed days per 2 months (80%)." FREE_HOLIDAY weeks don't
 * count toward or against attendance at all.
 */
export async function computeAttendanceRate(
  characterId: string,
  phaseId: string,
  windowDays = 60,
  now: Date = new Date(),
): Promise<AttendanceRate> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const records = await prisma.attendanceRecord.findMany({
    where: { characterId, phaseId, raidDate: { gte: since, lte: now } },
  });

  const countable = records.filter((r) => r.status !== AttendanceStatus.FREE_HOLIDAY);
  const present = countable.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const total = countable.length;
  const missed = total - present;

  return { rate: total === 0 ? 1 : present / total, present, missed, total };
}

export type RankSuggestion = {
  direction: "DEMOTE";
  byLevels: number;
  reason: string;
};

/**
 * Pure calculation, no DB access — lets callers that already have both
 * pieces of data (e.g. a page that also renders the raw attendance rate)
 * avoid a redundant re-fetch of the character and re-computation of the
 * rate. "Falling below the requirement drops your rank by 1 level per
 * missed day below it." Officers apply the change explicitly via
 * applyRankChange after reviewing this suggestion.
 */
export function computeRankSuggestion(
  attendance: AttendanceRate,
  requirementPct: number | null,
): RankSuggestion | null {
  if (requirementPct == null) return null;
  if (attendance.total === 0) return null;
  if (attendance.rate >= requirementPct) return null;

  const allowedMisses = Math.floor((1 - requirementPct) * attendance.total);
  const byLevels = Math.max(1, attendance.missed - allowedMisses);

  return {
    direction: "DEMOTE",
    byLevels,
    reason: `Attendance ${(attendance.rate * 100).toFixed(0)}% over the last ${attendance.total} raids, below the ${(requirementPct * 100).toFixed(0)}% requirement.`,
  };
}

/** DB-backed convenience wrapper around computeRankSuggestion. */
export async function suggestRankChange(
  characterId: string,
  phaseId: string,
): Promise<RankSuggestion | null> {
  const [character, attendance] = await Promise.all([
    prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { rankTier: true } }),
    computeAttendanceRate(characterId, phaseId),
  ]);

  return computeRankSuggestion(attendance, character.rankTier.attendanceRequirementPct);
}

export async function applyRankChange(
  characterId: string,
  newRankTierId: string,
  _officerId: string,
) {
  return prisma.character.update({
    where: { id: characterId },
    data: { rankTierId: newRankTierId },
  });
}

/**
 * "Members missing any part of a raid week get lower priority on other
 * raids that same week, to prevent 'raid dodging'." Informational only —
 * surfaced as a warning in the resolution UI, not enforced automatically.
 */
export async function flagRaidDodging(
  characterId: string,
  phaseId: string,
  raidDate: Date,
): Promise<boolean> {
  const weekStart = new Date(raidDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const missedThisWeek = await prisma.attendanceRecord.findFirst({
    where: {
      characterId,
      phaseId,
      raidDate: { gte: weekStart, lt: weekEnd },
      status: { in: [AttendanceStatus.ABSENT_EXCUSED, AttendanceStatus.ABSENT_UNEXCUSED] },
    },
  });

  return missedThisWeek !== null;
}
