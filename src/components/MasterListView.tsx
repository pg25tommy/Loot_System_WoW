// The full-guild bid-sheet table (bracket/slot rows x raider columns), used
// by both the officer and public Master List pages so they can never drift
// out of sync — see src/app/master-list/page.tsx and
// src/app/officer/master-list/page.tsx.
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { trackLabel } from "@/lib/trackLabels";
import { classColor } from "@/lib/wowClasses";

type SlotInfo = { status: string; itemName: string | null };
type Column = { bracket: number; slotIndex: number };

/** Groups the flat slot-column list back into per-bracket sections, in order, for the row grouping. */
function groupColumnsByBracket(columns: Column[]): [number, Column[]][] {
  const map = new Map<number, Column[]>();
  for (const col of columns) {
    if (!map.has(col.bracket)) map.set(col.bracket, []);
    map.get(col.bracket)!.push(col);
  }
  return [...map.entries()].sort(([a], [b]) => a - b);
}

function slotCellClass(status: string | undefined) {
  switch (status) {
    case "BLOCKED":
      return "slot-cell-blocked";
    case "PENDING":
      return "slot-cell-pending";
    case "ACTIVE":
      return "slot-cell-active";
    default:
      return "slot-cell-empty";
  }
}

function MasterTable({
  track,
  columns,
  characters,
  slotsByKey,
}: {
  track: Track;
  columns: Column[];
  characters: { id: string; name: string; class: string }[];
  slotsByKey: Map<string, SlotInfo>;
}) {
  if (columns.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-medium">{trackLabel(track)}</h2>
        <p className="mt-2 text-sm text-muted">No brackets configured for this track yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-medium">{trackLabel(track)}</h2>
      <div className="panel overflow-auto p-0" style={{ maxHeight: "70vh" }}>
        <table className="master-table">
          <thead>
            <tr>
              <th className="master-table-sticky-col">Bracket</th>
              {characters.map((c) => (
                <th key={c.id}>
                  <span style={{ color: classColor(c.class) }}>{c.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupColumnsByBracket(columns).map(([bracket, slots]) => (
              <Fragment key={bracket}>
                <tr>
                  <td colSpan={characters.length + 1} className="master-table-group-header">
                    {bracket === 0 ? "Bonus Bid" : `Bracket ${bracket}`}
                  </td>
                </tr>
                {slots.map((col) => (
                  <tr key={`${col.bracket}-${col.slotIndex}`}>
                    <td className="master-table-sticky-col font-medium">Slot {col.slotIndex + 1}</td>
                    {characters.map((c) => {
                      const slot = slotsByKey.get(`${c.id}|${track}|${col.bracket}|${col.slotIndex}`);
                      return (
                        <td
                          key={c.id}
                          className={slotCellClass(slot?.status)}
                          title={slot?.itemName ?? undefined}
                        >
                          {slot?.itemName ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Shared by the officer and public Master List pages — same data, same table. */
export async function MasterListView() {
  const activePhase = await prisma.phase.findFirst({ where: { isActive: true } });
  if (!activePhase) return <p className="text-sm text-muted">No active phase configured.</p>;

  const [bracketConfigs, characters, bidSlots] = await Promise.all([
    prisma.bracketConfig.findMany({
      where: { phaseId: activePhase.id },
      orderBy: [{ track: "asc" }, { bracket: "asc" }],
    }),
    prisma.character.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, class: true },
    }),
    prisma.bidSlot.findMany({
      where: { phaseId: activePhase.id },
      include: { item: { select: { name: true } } },
    }),
  ]);

  const slotsByKey = new Map<string, SlotInfo>();
  for (const slot of bidSlots) {
    slotsByKey.set(`${slot.characterId}|${slot.track}|${slot.bracket}|${slot.slotIndex}`, {
      status: slot.status,
      itemName: slot.item?.name ?? null,
    });
  }

  function columnsFor(track: Track): Column[] {
    return bracketConfigs
      .filter((bc) => bc.track === track)
      .sort((a, b) => a.bracket - b.bracket)
      .flatMap((bc) => Array.from({ length: bc.slotCount }, (_, i) => ({ bracket: bc.bracket, slotIndex: i })));
  }

  if (characters.length === 0) {
    return <p className="text-sm text-muted">No active characters yet.</p>;
  }

  return (
    <div className="space-y-10">
      <MasterTable
        track={Track.LEGACY}
        columns={columnsFor(Track.LEGACY)}
        characters={characters}
        slotsByKey={slotsByKey}
      />
      <MasterTable
        track={Track.NON_LEGACY}
        columns={columnsFor(Track.NON_LEGACY)}
        characters={characters}
        slotsByKey={slotsByKey}
      />
    </div>
  );
}
