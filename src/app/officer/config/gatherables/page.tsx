// Gold-value-to-bracket table editor, backing gatherableGoldToBracket()'s lookup.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createGatherableRowAction, deleteGatherableRowAction } from "@/lib/actions/config";

export default async function GatherableConfigPage() {
  await requireOfficer();
  const rows = await prisma.gatherableValueBracket.findMany({ orderBy: { minGold: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Gatherable value table</h1>
        <p className="mt-1 text-sm text-muted">Gold value ranges mapped to the bracket a random-drop blue/epic costs.</p>
      </div>

      <form action={createGatherableRowAction} className="grid max-w-md gap-3 panel sm:grid-cols-3">
        <input name="minGold" type="number" min={0} placeholder="Min gold" required className="input" />
        <input name="maxGold" type="number" min={0} placeholder="Max gold (blank = +)" className="input" />
        <input name="bracket" type="number" min={1} max={5} placeholder="Bracket" required className="input" />
        <button type="submit" className="btn sm:col-span-3">
          Add row
        </button>
      </form>

      <table className="w-full max-w-md text-left text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-1 pr-4">{row.minGold}g – {row.maxGold ? `${row.maxGold}g` : "+"}</td>
              <td className="py-1 pr-4">Bracket {row.bracket}</td>
              <td className="py-1">
                <form action={deleteGatherableRowAction.bind(null, row.id)}>
                  <button type="submit" className="text-xs text-danger underline">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
