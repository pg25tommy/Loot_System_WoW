// Main attendance page: pick a raid date (defaults to today), then check
// off who was there via AttendanceChecklist.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AttendanceChecklist } from "@/components/officer/AttendanceChecklist";
import { RaidDatePicker } from "@/components/officer/RaidDatePicker";

// Server-side fallback only — this is UTC, not the officer's local date;
// RaidDatePicker corrects it client-side on first load (see that file).
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireOfficer();
  const { date: rawDate } = await searchParams;
  const raidDate = rawDate || todayStr();

  const [activePhase, characters] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.character.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, class: true },
    }),
  ]);

  if (!activePhase) return <p className="text-sm text-muted">No active phase configured.</p>;

  const existing = await prisma.attendanceRecord.findMany({
    where: { phaseId: activePhase.id, raidDate: new Date(raidDate) },
    select: { characterId: true, status: true, postedInAdvance: true, missedFullWeek: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-muted">Free holiday weeks don&apos;t count for or against anyone.</p>
      </div>

      <RaidDatePicker raidDate={raidDate} hadDateParam={Boolean(rawDate)} />

      <AttendanceChecklist
        phaseId={activePhase.id}
        raidDate={raidDate}
        characters={characters}
        existing={existing}
      />

      <div>
        <h2 className="text-lg font-medium">Individual history</h2>
        <ul className="mt-2 divide-y divide-list">
          {characters.map((c) => (
            <li key={c.id}>
              <Link href={`/officer/attendance/${c.id}`} className="flex items-center justify-between py-2 text-sm hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
