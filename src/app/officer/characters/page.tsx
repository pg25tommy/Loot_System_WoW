// Character roster list + new-character creation form for officers.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createCharacterAction } from "@/lib/actions/characters";
import { ClassSpecFields } from "@/components/officer/ClassSpecFields";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";

export default async function OfficerCharactersPage() {
  await requireOfficer();

  const [characters, rankTiers] = await Promise.all([
    prisma.character.findMany({
      include: { rankTier: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.rankTier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Characters</h1>
        <p className="mt-1 text-sm text-muted">Create characters and manage their bid lists.</p>
      </div>

      <form action={createCharacterAction} className="grid gap-3 panel sm:grid-cols-2">
        <h2 className="text-sm font-medium sm:col-span-2">New character</h2>
        <input name="name" placeholder="Name" required className="input" />
        <input name="server" placeholder="Server (optional)" className="input" />
        <ClassSpecFields />
        <select name="rankTierId" required className="input">
          <option value="">Rank tier...</option>
          {rankTiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
        <select name="mainCharacterId" className="input">
          <option value="">Not an alt</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              Alt of {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn sm:col-span-2">
          Create character
        </button>
      </form>

      <ul className="divide-y divide-list">
        {characters.map((character) => (
          <li key={character.id}>
            <Link
              href={`/officer/characters/${character.id}/edit`}
              className="flex items-center justify-between py-3 hover-row"
            >
              <div className="flex items-center gap-3">
                <ClassIcon className={character.class} size="sm" />
                <div>
                  <span
                    className={character.isActive ? "font-medium" : "font-medium text-faint line-through"}
                    style={character.isActive ? { color: classColor(character.class) } : undefined}
                  >
                    {character.name}
                  </span>
                  <span className="ml-2 text-sm text-muted">
                    {character.class} · {character.spec}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted">{character.rankTier.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
