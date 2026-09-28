// Per-character attendance history + rank-demotion suggestion (computed,
// never auto-applied — the officer must click "Apply" or set a rank manually).
import { notFound } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { computeAttendanceRate, computeRankSuggestion } from "@/lib/rules/attendance";
import { applyRankChangeAction } from "@/lib/actions/attendance";

export default async function CharacterAttendancePage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  await requireOfficer();
  const { characterId } = await params;

  const [character, activePhase, rankTiers] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: { rankTier: true },
    }),
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.rankTier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!character) notFound();

  const [records, rate] = await Promise.all([
    activePhase
      ? prisma.attendanceRecord.findMany({
          where: { characterId, phaseId: activePhase.id },
          orderBy: { raidDate: "desc" },
        })
      : Promise.resolve([]),
    activePhase ? computeAttendanceRate(characterId, activePhase.id) : Promise.resolve(null),
  ]);

  const suggestion = rate ? computeRankSuggestion(rate, character.rankTier.attendanceRequirementPct) : null;

  const currentIndex = rankTiers.findIndex((t) => t.id === character.rankTierId);
  const suggestedTier = suggestion && currentIndex >= 0 ? rankTiers[Math.max(0, currentIndex - suggestion.byLevels)] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{character.name}</h1>
        <p className="mt-1 text-sm text-muted">Current rank: {character.rankTier.name}</p>
      </div>

      {rate ? (
        <div className="panel text-sm">
          <p>
            {rate.present}/{rate.total} raids present ({(rate.rate * 100).toFixed(0)}%) over the last 60 days.
          </p>
        </div>
      ) : null}

      {suggestion ? (
        <div className="banner-warning">
          <p className="font-medium">Suggested: demote {suggestion.byLevels} level(s).</p>
          <p className="mt-1 text-muted">{suggestion.reason}</p>
          {suggestedTier ? (
            <form action={applyRankChangeAction} className="mt-3">
              <input type="hidden" name="characterId" value={characterId} />
              <input type="hidden" name="newRankTierId" value={suggestedTier.id} />
              <button type="submit" className="btn btn-sm">
                Apply: set rank to {suggestedTier.name}
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">No rank change suggested right now.</p>
      )}

      <form action={applyRankChangeAction} className="flex items-center gap-2">
        <input type="hidden" name="characterId" value={characterId} />
        <select name="newRankTierId" defaultValue={character.rankTierId} className="input">
          {rankTiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn-outline btn-sm">
          Set rank manually
        </button>
      </form>

      <div>
        <h2 className="text-lg font-medium">History</h2>
        <ul className="mt-2 divide-y divide-list text-sm">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>{r.raidDate.toLocaleDateString()}</span>
              <span className="text-muted">{r.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
