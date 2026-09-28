// Item catalog list + new-item creation form for officers.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createItemAction } from "@/lib/actions/items";

export default async function OfficerItemsPage() {
  await requireOfficer();
  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Items</h1>
        <p className="mt-1 text-sm text-muted">Item catalog used across bid lists and resolutions.</p>
      </div>

      <form action={createItemAction} className="grid gap-3 panel sm:grid-cols-2">
        <h2 className="text-sm font-medium sm:col-span-2">New item</h2>
        <input name="name" placeholder="Name" required className="input" />
        <input name="slot" placeholder="Slot (e.g. Chest)" className="input" />
        <input name="sourceRaid" placeholder="Source raid" className="input" />
        <input name="sourceBoss" placeholder="Source boss" className="input" />
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-1"><input type="checkbox" name="isBoP" defaultChecked /> BoP</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isCraftedBoE" /> Crafted BoE</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isRecipe" /> Recipe</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="recipeOutputIsBoE" /> Recipe output is BoE</label>
        </div>
        <button type="submit" className="btn sm:col-span-2">
          Create item
        </button>
      </form>

      <ul className="divide-y divide-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/officer/items/${item.id}/edit`} className="flex items-center justify-between py-3 hover-row">
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted">{item.slot ?? "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
