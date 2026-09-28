// Edit form for one item catalog entry.
import { notFound } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateItemAction } from "@/lib/actions/items";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  await requireOfficer();
  const { itemId } = await params;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) notFound();

  const action = updateItemAction.bind(null, itemId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{item.name}</h1>
      <form action={action} className="grid gap-3 panel sm:grid-cols-2">
        <input name="name" defaultValue={item.name} className="input" />
        <input name="slot" defaultValue={item.slot ?? ""} placeholder="Slot" className="input" />
        <input name="sourceRaid" defaultValue={item.sourceRaid ?? ""} placeholder="Source raid" className="input" />
        <input name="sourceBoss" defaultValue={item.sourceBoss ?? ""} placeholder="Source boss" className="input" />
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-1"><input type="checkbox" name="isBoP" defaultChecked={item.isBoP} /> BoP</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isCraftedBoE" defaultChecked={item.isCraftedBoE} /> Crafted BoE</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isRecipe" defaultChecked={item.isRecipe} /> Recipe</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="recipeOutputIsBoE" defaultChecked={item.recipeOutputIsBoE ?? false} /> Recipe output is BoE</label>
        </div>
        <button type="submit" className="btn sm:col-span-2">
          Save
        </button>
      </form>
    </div>
  );
}
