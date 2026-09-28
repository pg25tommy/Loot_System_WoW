import { describe, expect, it } from "vitest";
import { AttendanceStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { computeAttendanceRate, suggestRankChange } from "@/lib/rules/attendance";
import { makeCharacter, makePhase, makeRankTier } from "./factories";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe("computeAttendanceRate", () => {
  it("excludes FREE_HOLIDAY records from the denominator", async () => {
    const rankTier = await makeRankTier();
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: rankTier.id });

    await prisma.attendanceRecord.createMany({
      data: [
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(1), status: AttendanceStatus.PRESENT },
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(2), status: AttendanceStatus.PRESENT },
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(3), status: AttendanceStatus.FREE_HOLIDAY },
      ],
    });

    const rate = await computeAttendanceRate(character.id, phase.id);
    expect(rate.total).toBe(2);
    expect(rate.present).toBe(2);
    expect(rate.rate).toBe(1);
  });

  it("counts excused and unexcused absences as misses", async () => {
    const rankTier = await makeRankTier();
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: rankTier.id });

    await prisma.attendanceRecord.createMany({
      data: [
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(1), status: AttendanceStatus.PRESENT },
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(2), status: AttendanceStatus.ABSENT_EXCUSED },
        { characterId: character.id, phaseId: phase.id, raidDate: daysAgo(3), status: AttendanceStatus.ABSENT_UNEXCUSED },
      ],
    });

    const rate = await computeAttendanceRate(character.id, phase.id);
    expect(rate.total).toBe(3);
    expect(rate.missed).toBe(2);
    expect(rate.rate).toBeCloseTo(1 / 3);
  });
});

describe("suggestRankChange", () => {
  it("suggests no change when attendance is exactly at the requirement", async () => {
    const rankTier = await makeRankTier({ attendanceRequirementPct: 0.8 });
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: rankTier.id });

    // 8 present / 10 total = 80%
    await prisma.attendanceRecord.createMany({
      data: [
        ...Array.from({ length: 8 }, (_, i) => ({
          characterId: character.id,
          phaseId: phase.id,
          raidDate: daysAgo(i + 1),
          status: AttendanceStatus.PRESENT,
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          characterId: character.id,
          phaseId: phase.id,
          raidDate: daysAgo(i + 9),
          status: AttendanceStatus.ABSENT_UNEXCUSED,
        })),
      ],
    });

    const suggestion = await suggestRankChange(character.id, phase.id);
    expect(suggestion).toBeNull();
  });

  it("suggests a demotion when attendance falls below the requirement", async () => {
    const rankTier = await makeRankTier({ attendanceRequirementPct: 0.8 });
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: rankTier.id });

    // 6 present / 10 total = 60%, well below 80%.
    await prisma.attendanceRecord.createMany({
      data: [
        ...Array.from({ length: 6 }, (_, i) => ({
          characterId: character.id,
          phaseId: phase.id,
          raidDate: daysAgo(i + 1),
          status: AttendanceStatus.PRESENT,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          characterId: character.id,
          phaseId: phase.id,
          raidDate: daysAgo(i + 7),
          status: AttendanceStatus.ABSENT_UNEXCUSED,
        })),
      ],
    });

    const suggestion = await suggestRankChange(character.id, phase.id);
    expect(suggestion?.direction).toBe("DEMOTE");
    expect(suggestion?.byLevels).toBeGreaterThanOrEqual(1);
  });

  it("returns null when the rank tier has no attendance requirement", async () => {
    const rankTier = await makeRankTier({ attendanceRequirementPct: null });
    const phase = await makePhase();
    const character = await makeCharacter({ rankTierId: rankTier.id });

    await prisma.attendanceRecord.create({
      data: {
        characterId: character.id,
        phaseId: phase.id,
        raidDate: daysAgo(1),
        status: AttendanceStatus.ABSENT_UNEXCUSED,
      },
    });

    const suggestion = await suggestRankChange(character.id, phase.id);
    expect(suggestion).toBeNull();
  });
});
