// Bracket slot-count editor per (phase, track, bracket), plus the sync
// button that reconciles existing characters after a change here.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Track } from "@/generated/prisma/client";
import { upsertBracketConfigAction } from "@/lib/actions/config";
import { trackLabel } from "@/lib/trackLabels";
import { SyncBidSlotsButton } from "@/components/officer/SyncBidSlotsButton";

export default async function BracketConfigPage() {
  await requireOfficer();

  const phases = await prisma.phase.findMany({ orderBy: { createdAt: "desc" } });
  const configs = await prisma.bracketConfig.findMany({ orderBy: [{ phaseId: "asc" }, { track: "asc" }, { bracket: "asc" }] });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bracket config</h1>
        <p className="mt-1 text-sm text-muted">
          Slot counts per bracket per track per phase. The source ruleset only says brackets are sized 3, 5, or 7 —
          set the exact real numbers here.
        </p>
      </div>

      <form action={upsertBracketConfigAction} className="grid max-w-lg gap-3 panel sm:grid-cols-2">
        <select name="phaseId" required className="input">
          <option value="">Phase...</option>
          {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="track" required className="input">
          <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
          <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
        </select>
        <input name="bracket" type="number" min={0} max={5} placeholder="Bracket (0-5)" required className="input" />
        <input name="slotCount" type="number" min={0} placeholder="Slot count" required className="input" />
        <input name="label" placeholder="Label (optional)" className="input sm:col-span-2" />
        <button type="submit" className="btn sm:col-span-2">
          Save
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-4">Phase</th>
            <th className="py-1 pr-4">Track</th>
            <th className="py-1 pr-4">Bracket</th>
            <th className="py-1">Slots</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-1 pr-4">{phases.find((p) => p.id === c.phaseId)?.name}</td>
              <td className="py-1 pr-4">{trackLabel(c.track)}</td>
              <td className="py-1 pr-4">{c.bracket}</td>
              <td className="py-1">{c.slotCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SyncBidSlotsButton phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
