"use server";

// Server Actions backing the officer-facing Attendance page and per-character
// rank-change confirmation.
import { revalidatePath } from "next/cache";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma/client";
import { applyRankChange } from "@/lib/rules/attendance";

export type AttendanceChecklistEntry = {
  characterId: string;
  present: boolean;
  absenceType: "ABSENT_UNEXCUSED" | "ABSENT_EXCUSED" | "FREE_HOLIDAY";
  postedInAdvance: boolean;
  missedFullWeek: boolean;
};

/**
 * One raid night, one submit: every active character defaults to present
 * (ticked) in the UI, and the officer unticks whoever actually missed it —
 * replacing the old two-step "mark everyone, then log exceptions" flow.
 */
export async function submitAttendanceChecklistAction(input: {
  phaseId: string;
  raidDate: string;
  entries: AttendanceChecklistEntry[];
}) {
  const session = await requireOfficer();
  const raidDate = new Date(input.raidDate);

  await prisma.$transaction(
    input.entries.map((e) => {
      const status = e.present ? AttendanceStatus.PRESENT : AttendanceStatus[e.absenceType];
      const postedInAdvance = e.present ? false : e.postedInAdvance;
      const missedFullWeek = e.present ? false : e.missedFullWeek;

      return prisma.attendanceRecord.upsert({
        where: { characterId_raidDate: { characterId: e.characterId, raidDate } },
        update: {
          status,
          postedInAdvance,
          missedFullWeek,
          recordedByOfficerId: session.user.officerId,
        },
        create: {
          characterId: e.characterId,
          phaseId: input.phaseId,
          raidDate,
          status,
          postedInAdvance,
          missedFullWeek,
          recordedByOfficerId: session.user.officerId,
        },
      });
    }),
  );

  revalidatePath("/officer/attendance");
  for (const e of input.entries) revalidatePath(`/officer/attendance/${e.characterId}`);
}

/** Officer-confirmed application of the rank suggestion from computeRankSuggestion(). */
export async function applyRankChangeAction(formData: FormData) {
  const session = await requireOfficer();

  const characterId = String(formData.get("characterId") ?? "");
  const newRankTierId = String(formData.get("newRankTierId") ?? "");

  await applyRankChange(characterId, newRankTierId, session.user.officerId);

  revalidatePath(`/officer/attendance/${characterId}`);
  revalidatePath("/officer/characters");
  revalidatePath(`/characters/${characterId}`);
}
