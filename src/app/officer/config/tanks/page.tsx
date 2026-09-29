// Which characters count as tanks. Drives the tank pickers on the resolve
// wizard (tank-priority claim and tank tiebreak), which only list tanks.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveTanksAction } from "@/lib/actions/config";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";

export default async function TanksConfigPage() {
  await requireOfficer();
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    orderBy: [{ isTank: "desc" }, { name: "asc" }],
    select: { id: true, name: true, class: true, spec: true, isTank: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tanks</h1>
        <p className="mt-1 text-sm text-muted">
          Tick the characters who tank. Only these show up in the tank-priority pickers when resolving loot.
        </p>
      </div>

      <form action={saveTanksAction} className="max-w-lg space-y-4 panel">
        <ul className="divide-y divide-list text-sm">
          {characters.map((c) => (
            <li key={c.id} className="py-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" name="tankIds" value={c.id} defaultChecked={c.isTank} />
                <span className="inline-flex items-center gap-1.5">
                  <ClassIcon className={c.class} size="sm" />
                  <span style={{ color: classColor(c.class) }}>{c.name}</span>
                </span>
                <span className="text-xs text-muted">{c.spec} {c.class}</span>
              </label>
            </li>
          ))}
        </ul>
        <button type="submit" className="btn">
          Save tanks
        </button>
      </form>
    </div>
  );
}
