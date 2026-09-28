// Gatherable/random-drop bid form, with the current gold-value-to-bracket
// table shown for reference.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { spendGatherableBidAction } from "@/lib/actions/gatherables";
import { trackLabel } from "@/lib/trackLabels";

export default async function GatherablesPage() {
  await requireOfficer();

  const [activePhase, characters, items, table] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.character.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.item.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.gatherableValueBracket.findMany({ where: { isActive: true }, orderBy: { minGold: "asc" } }),
  ]);

  if (!activePhase) return <p className="text-sm text-muted">No active phase configured.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Gatherables &amp; random drops</h1>
        <p className="mt-1 text-sm text-muted">
          Spend a bid slot in the bracket matching a random drop blue/epic&apos;s value. Must be equipped immediately.
        </p>
      </div>

      <div className="text-sm text-muted">
        <table className="w-full max-w-sm border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1 pr-4">Gold value</th>
              <th className="py-1">Bracket</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-1 pr-4">
                  {row.minGold}g – {row.maxGold ? `${row.maxGold}g` : "+"}
                </td>
                <td className="py-1">Bracket {row.bracket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={spendGatherableBidAction} className="grid max-w-lg gap-3 panel">
        <input type="hidden" name="phaseId" value={activePhase.id} />
        <select name="characterId" required className="input">
          <option value="">Character...</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="track" className="input">
          <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
          <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
        </select>
        <input name="goldValue" type="number" min={1} placeholder="Item vendor value (gold)" required className="input" />
        <select name="itemId" className="input">
          <option value="">Item (optional, for record-keeping)</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <button type="submit" className="btn">
          Spend slot
        </button>
      </form>
    </div>
  );
}
