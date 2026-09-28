// Rank-ladder editor (name, sort order, loot eligibility, attendance
// requirement, bonus-bid eligibility per tier).
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createRankTierAction, updateRankTierAction } from "@/lib/actions/config";

export default async function RankTiersPage() {
  await requireOfficer();
  const tiers = await prisma.rankTier.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Rank tiers</h1>
        <p className="mt-1 text-sm text-muted">Higher sort order = higher rank. Attendance requirement is a fraction (0.8 = 80%).</p>
      </div>

      <form action={createRankTierAction} className="grid max-w-lg gap-3 panel sm:grid-cols-2">
        <h2 className="text-sm font-medium sm:col-span-2">New rank tier</h2>
        <input name="name" placeholder="Name" required className="input" />
        <input name="sortOrder" type="number" placeholder="Sort order" required className="input" />
        <input name="attendanceRequirementPct" type="number" step="0.01" min="0" max="1" placeholder="Attendance requirement (e.g. 0.8)" className="input" />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" name="isLootEligible" defaultChecked /> Loot eligible</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="bonusBidEligible" /> Bonus bid eligible</label>
        </div>
        <button type="submit" className="btn sm:col-span-2">
          Create
        </button>
      </form>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const action = updateRankTierAction.bind(null, tier.id);
          return (
            <form key={tier.id} action={action} className="grid gap-2 panel panel-sm sm:grid-cols-5">
              <input name="name" defaultValue={tier.name} className="input input-sm" />
              <input name="sortOrder" type="number" defaultValue={tier.sortOrder} className="input input-sm" />
              <input name="attendanceRequirementPct" type="number" step="0.01" min="0" max="1" defaultValue={tier.attendanceRequirementPct ?? ""} className="input input-sm" />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isLootEligible" defaultChecked={tier.isLootEligible} /> Loot elig.</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="bonusBidEligible" defaultChecked={tier.bonusBidEligible} /> Bonus bid</label>
              <button type="submit" className="link text-xs sm:col-span-5 sm:justify-self-start">Save</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
