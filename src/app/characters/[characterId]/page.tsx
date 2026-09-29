// Public character page: full loot list by track/bracket (blocked slots
// shaded), recent wins, and a side-by-side comparison against any other
// active raider's sheet. No login required.
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ResolutionMethodBadge } from "@/components/ui/ResolutionMethodBadge";
import { trackLabel } from "@/lib/trackLabels";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";

type SlotForDisplay = { id: string; itemId: string | null; bracket: number; status: string; item: { name: string } | null };

function groupSlots<T extends { track: string; bracket: number; slotIndex: number }>(
  slots: T[],
) {
  const byTrack = new Map<string, Map<number, T[]>>();
  for (const slot of slots) {
    if (!byTrack.has(slot.track)) byTrack.set(slot.track, new Map());
    const byBracket = byTrack.get(slot.track)!;
    if (!byBracket.has(slot.bracket)) byBracket.set(slot.bracket, []);
    byBracket.get(slot.bracket)!.push(slot);
  }
  for (const byBracket of byTrack.values()) {
    for (const list of byBracket.values()) list.sort((a, b) => a.slotIndex - b.slotIndex);
  }
  return byTrack;
}

function TrackSection({
  title,
  brackets,
}: {
  title: string;
  brackets: Map<number, SlotForDisplay[]> | undefined;
}) {
  if (!brackets || brackets.size === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-2 text-sm text-muted">No slots for the active phase yet.</p>
      </div>
    );
  }

  const bracketNumbers = [...brackets.keys()].sort((a, b) => a - b);

  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-3 space-y-4">
        {bracketNumbers.map((bracket) => (
          <div key={bracket}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {bracket === 0 ? "Bonus bid (bracket 0)" : `Bracket ${bracket}`}
            </div>
            <ul className="mt-1 space-y-1">
              {brackets.get(bracket)!.map((slot) => {
                const isBlocked = slot.status === "BLOCKED";
                return (
                  <li
                    key={slot.id}
                    className={isBlocked ? "flex items-center justify-between panel-row panel-row-blocked" : "flex items-center justify-between panel-row"}
                  >
                    <span className={slot.item ? (isBlocked ? "font-medium" : "") : "text-faint"}>
                      {slot.item?.name ?? "empty"}
                    </span>
                    <StatusBadge status={slot.status} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

type ComparisonRow = {
  itemName: string;
  mine?: { bracket: number; status: string };
  theirs?: { bracket: number; status: string };
};

function buildComparisonRows(mySlots: SlotForDisplay[], theirSlots: SlotForDisplay[]): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const s of mySlots) {
    if (!s.item) continue;
    rows.set(s.item.name, { ...(rows.get(s.item.name) ?? { itemName: s.item.name }), mine: { bracket: s.bracket, status: s.status } });
  }
  for (const s of theirSlots) {
    if (!s.item) continue;
    const existing = rows.get(s.item.name) ?? { itemName: s.item.name };
    rows.set(s.item.name, { ...existing, theirs: { bracket: s.bracket, status: s.status } });
  }
  return [...rows.values()].sort((a, b) => {
    const overlapA = a.mine && a.theirs ? 0 : 1;
    const overlapB = b.mine && b.theirs ? 0 : 1;
    if (overlapA !== overlapB) return overlapA - overlapB;
    return a.itemName.localeCompare(b.itemName);
  });
}

function ComparePersonHeader({ name, wowClass }: { name: string; wowClass: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
      <ClassIcon className={wowClass} size="sm" />
      <span className="font-semibold" style={{ color: classColor(wowClass) }}>
        {name}
      </span>
    </span>
  );
}

function CompareSlotCell({ slot }: { slot?: { bracket: number; status: string } }) {
  if (!slot) return <span className="text-faint">— not bid</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-muted">{slot.bracket === 0 ? "Bonus" : `Bracket ${slot.bracket}`}</span>
      <StatusBadge status={slot.status} />
    </span>
  );
}

function CompareTrackSection({
  title,
  myName,
  myClass,
  theirName,
  theirClass,
  rows,
}: {
  title: string;
  myName: string;
  myClass: string;
  theirName: string;
  theirClass: string;
  rows: ComparisonRow[];
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-2 text-sm text-muted">Neither of you has any bids on this track yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-3 grid grid-cols-[1.5fr_1fr_1fr] gap-x-4 gap-y-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <span>Item</span>
        <ComparePersonHeader name={myName} wowClass={myClass} />
        <ComparePersonHeader name={theirName} wowClass={theirClass} />
      </div>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => {
          const overlap = Boolean(row.mine && row.theirs);
          return (
            <li
              key={row.itemName}
              className={
                overlap
                  ? "grid grid-cols-[1.5fr_1fr_1fr] items-center gap-x-4 panel-row panel-row-overlap"
                  : "grid grid-cols-[1.5fr_1fr_1fr] items-center gap-x-4 panel-row"
              }
            >
              <span className={overlap ? "font-medium" : ""}>{row.itemName}</span>
              <CompareSlotCell slot={row.mine} />
              <CompareSlotCell slot={row.theirs} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function CharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ characterId: string }>;
  searchParams: Promise<{ compare?: string }>;
}) {
  const { characterId } = await params;
  const { compare: rawCompareId } = await searchParams;
  const compareId = rawCompareId && rawCompareId !== characterId ? rawCompareId : undefined;

  const [character, activePhase, otherCharacters] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: { rankTier: true, mainCharacter: true, alts: true },
    }),
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.character.findMany({
      where: { isActive: true, id: { not: characterId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!character) notFound();

  const [bidSlots, recentWins, compareCharacter, compareBidSlots] = await Promise.all([
    activePhase
      ? prisma.bidSlot.findMany({
          where: { characterId: character.id, phaseId: activePhase.id },
          include: { item: true },
          orderBy: [{ track: "asc" }, { bracket: "asc" }, { slotIndex: "asc" }],
        })
      : Promise.resolve([]),
    prisma.lootDrop.findMany({
      where: { winnerCharacterId: character.id, status: "RESOLVED" },
      include: { item: true },
      orderBy: { raidDate: "desc" },
      take: 10,
    }),
    compareId ? prisma.character.findUnique({ where: { id: compareId } }) : Promise.resolve(null),
    compareId && activePhase
      ? prisma.bidSlot.findMany({
          where: { characterId: compareId, phaseId: activePhase.id },
          include: { item: true },
          orderBy: [{ track: "asc" }, { bracket: "asc" }, { slotIndex: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const grouped = groupSlots(bidSlots);
  const compareGrouped = groupSlots(compareBidSlots);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ClassIcon className={character.class} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: classColor(character.class) }}>
            {character.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
          {character.class} · {character.spec} · {character.rankTier.name}
          {character.mainCharacter ? (
            <>
              {" "}
              · Alt of{" "}
              <Link href={`/characters/${character.mainCharacter.id}`} className="underline">
                {character.mainCharacter.name}
              </Link>
            </>
          ) : null}
          </p>
        </div>
      </div>

      {!activePhase ? (
        <p className="text-sm text-muted">No active phase configured yet.</p>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-3 panel panel-sm">
            <label className="text-sm">
              Compare loot lists with
              <select name="compare" defaultValue={compareId ?? ""} className="mt-1 input">
                <option value="">Select a raider...</option>
                {otherCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-outline">
              Compare
            </button>
            {compareId ? (
              <Link href={`/characters/${characterId}`} className="link text-sm">
                Clear
              </Link>
            ) : null}
          </form>

          {compareCharacter ? (
            <div className="space-y-8">
              <CompareTrackSection
                title={trackLabel("LEGACY")}
                myName={character.name}
                myClass={character.class}
                theirName={compareCharacter.name}
                theirClass={compareCharacter.class}
                rows={buildComparisonRows(
                  [...(grouped.get(Track.LEGACY)?.values() ?? [])].flat(),
                  [...(compareGrouped.get(Track.LEGACY)?.values() ?? [])].flat(),
                )}
              />
              <CompareTrackSection
                title={trackLabel("NON_LEGACY")}
                myName={character.name}
                myClass={character.class}
                theirName={compareCharacter.name}
                theirClass={compareCharacter.class}
                rows={buildComparisonRows(
                  [...(grouped.get(Track.NON_LEGACY)?.values() ?? [])].flat(),
                  [...(compareGrouped.get(Track.NON_LEGACY)?.values() ?? [])].flat(),
                )}
              />
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2">
              <TrackSection title={trackLabel("LEGACY")} brackets={grouped.get(Track.LEGACY)} />
              <TrackSection title={trackLabel("NON_LEGACY")} brackets={grouped.get(Track.NON_LEGACY)} />
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="text-lg font-medium">Recent wins</h2>
        {recentWins.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No recorded wins yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-list">
            {recentWins.map((drop) => (
              <li key={drop.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{drop.item.name}</span>
                  <span className="flex items-center gap-2 text-muted">
                    {drop.raidDate.toLocaleDateString()}
                    {drop.resolutionMethod ? <ResolutionMethodBadge method={drop.resolutionMethod} /> : null}
                  </span>
                </div>
                {drop.resolutionSummary ? (
                  <div className="mt-0.5 text-xs text-faint">{drop.resolutionSummary}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
