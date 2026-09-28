// A single character's full editor: profile fields, every bid slot for the
// active phase (grouped by track/bracket), and the new-member block-seeding tool.
import { notFound } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { trackLabel } from "@/lib/trackLabels";
import { seedNewMemberBlocksAction, updateCharacterAction } from "@/lib/actions/characters";
import { ClassSpecFields } from "@/components/officer/ClassSpecFields";
import { BidSlotRow } from "@/components/officer/BidSlotRow";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  await requireOfficer();
  const { characterId } = await params;

  const [character, rankTiers, items, activePhase] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: { rankTier: true },
    }),
    prisma.rankTier.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.phase.findFirst({ where: { isActive: true } }),
  ]);
  if (!character) notFound();

  const bidSlots = activePhase
    ? await prisma.bidSlot.findMany({
        where: { characterId, phaseId: activePhase.id },
        include: { item: true },
        orderBy: [{ track: "asc" }, { bracket: "asc" }, { slotIndex: "asc" }],
      })
    : [];

  const updateAction = updateCharacterAction.bind(null, characterId);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ClassIcon className={character.class} size="lg" />
        <h1 className="text-2xl font-semibold" style={{ color: classColor(character.class) }}>
          {character.name}
        </h1>
      </div>

      <form action={updateAction} className="grid gap-3 panel sm:grid-cols-2">
        <input name="name" defaultValue={character.name} className="input" />
        <input name="server" defaultValue={character.server ?? ""} placeholder="Server" className="input" />
        <ClassSpecFields defaultClass={character.class} defaultSpec={character.spec} />
        <select name="rankTierId" defaultValue={character.rankTierId} className="input">
          {rankTiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={character.isActive} />
          Active
        </label>
        <textarea name="notes" defaultValue={character.notes ?? ""} placeholder="Notes" className="input sm:col-span-2" />
        <button type="submit" className="btn sm:col-span-2">
          Save
        </button>
      </form>

      {!activePhase ? (
        <p className="text-sm text-muted">No active phase — set one up under Phases to build a bid list.</p>
      ) : (
        <>
          <div className="grid gap-8 sm:grid-cols-2">
            <BidSlotEditor
              title={trackLabel("LEGACY")}
              slots={bidSlots.filter((s) => s.track === Track.LEGACY)}
              items={items}
            />
            <BidSlotEditor
              title={trackLabel("NON_LEGACY")}
              slots={bidSlots.filter((s) => s.track === Track.NON_LEGACY)}
              items={items}
            />
          </div>

          <div className="panel">
            <h2 className="text-sm font-medium">Seed new-member blocked slots</h2>
            <p className="mt-1 text-xs text-muted">
              50%-120% of the current guild average blocked-slot count, at officer discretion.
            </p>
            <form action={seedNewMemberBlocksAction} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="characterId" value={characterId} />
              <input type="hidden" name="phaseId" value={activePhase.id} />
              <label className="text-sm">
                Track
                <select name="track" className="mt-1 block input">
                  <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
                  <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
                </select>
              </label>
              <label className="text-sm">
                % of average
                <input
                  type="number"
                  name="pctOfAverage"
                  step="0.05"
                  min="0.5"
                  max="1.2"
                  defaultValue="0.8"
                  className="mt-1 block w-24 input"
                />
              </label>
              <button type="submit" className="btn btn-sm">
                Seed blocks
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function BidSlotEditor({
  title,
  slots,
  items,
}: {
  title: string;
  slots: {
    id: string;
    bracket: number;
    slotIndex: number;
    itemId: string | null;
    status: string;
    specPriority: string | null;
    item: { name: string } | null;
  }[];
  items: { id: string; name: string }[];
}) {
  const byBracket = new Map<number, typeof slots>();
  for (const slot of slots) {
    if (!byBracket.has(slot.bracket)) byBracket.set(slot.bracket, []);
    byBracket.get(slot.bracket)!.push(slot);
  }
  const brackets = [...byBracket.keys()].sort((a, b) => a - b);

  return (
    <div>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-3 space-y-4">
        {brackets.map((bracket) => (
          <div key={bracket}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {bracket === 0 ? "Bonus bid (bracket 0)" : `Bracket ${bracket}`}
            </div>
            <div className="mt-1 space-y-2">
              {byBracket.get(bracket)!.map((slot) => (
                <BidSlotRow key={slot.id} slot={slot} items={items} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
