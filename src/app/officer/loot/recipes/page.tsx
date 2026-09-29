// Recipe drops split by output type: BoE-output recipes are awarded here by
// officer discretion; BoP-output recipes are just listed as a pointer to the
// normal resolve wizard, since those follow standard lootlist priority.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { awardRecipeByOfficerDiscretionAction } from "@/lib/actions/recipes";
import { createItemAction } from "@/lib/actions/items";
import { trackLabel } from "@/lib/trackLabels";

export default async function RecipesPage() {
  await requireOfficer();

  const [activePhase, recipeItems, characters] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.item.findMany({ where: { isRecipe: true }, orderBy: { name: "asc" } }),
    prisma.character.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!activePhase) return <p className="text-sm text-muted">No active phase configured.</p>;

  const officerDiscretionItems = recipeItems.filter((i) => i.recipeOutputIsBoE);
  const lootlistItems = recipeItems.filter((i) => !i.recipeOutputIsBoE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <p className="mt-1 text-sm text-muted">
          BoP recipes that create BoE items are officer discretion; BoP recipes that create BoP items go through the
          normal <Link href="/officer/loot/resolve" className="underline">loot resolution</Link> tool.
        </p>
      </div>

      <form action={createItemAction} className="grid max-w-lg gap-3 panel">
        <input type="hidden" name="isRecipe" value="on" />
        <h2 className="text-sm font-medium">Add a recipe to the pool</h2>
        <input name="name" placeholder="Recipe name" required className="input" />
        <input name="sourceBoss" placeholder="Source boss (optional)" className="input" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recipeOutputIsBoE" />
          Output is BoE — awarded here by officer discretion. Leave unchecked if the output is BoP (goes
          through the normal resolve tool instead).
        </label>
        <button type="submit" className="btn">
          Add recipe
        </button>
      </form>

      {lootlistItems.length > 0 ? (
        <div className="text-sm text-muted">
          <p className="font-medium text-muted">BoP output — use the resolve tool for:</p>
          <ul className="mt-1 list-disc pl-5">
            {lootlistItems.map((i) => <li key={i.id}>{i.name}</li>)}
          </ul>
        </div>
      ) : null}

      <form action={awardRecipeByOfficerDiscretionAction} className="grid max-w-lg gap-3 panel">
        <input type="hidden" name="phaseId" value={activePhase.id} />
        <h2 className="text-sm font-medium">Award a BoE-output recipe (officer discretion)</h2>
        <select name="itemId" required className="input">
          <option value="">Recipe...</option>
          {officerDiscretionItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select name="pickedCharacterId" required className="input">
          <option value="">Award to...</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="track" className="input">
          <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
          <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
        </select>
        <textarea name="notes" placeholder="Justification (attendance, longevity, activity, availability)" className="input" />
        <button type="submit" className="btn">
          Award
        </button>
      </form>
    </div>
  );
}
