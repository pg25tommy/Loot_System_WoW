"use client";

// Button on the bracket-config page that reconciles existing characters'
// slot counts after an officer edits the bracket sizes.
import { useState, useTransition } from "react";
import { syncBidSlotsAction } from "@/lib/actions/config";
import type { BracketSyncSummary } from "@/lib/rules/bracketSync";

export function SyncBidSlotsButton({ phases }: { phases: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? "");
  const [summary, setSummary] = useState<BracketSyncSummary | null>(null);

  function handleSync() {
    if (!phaseId) return;
    setSummary(null);
    startTransition(async () => {
      const result = await syncBidSlotsAction(phaseId);
      setSummary(result);
    });
  }

  return (
    <div className="panel max-w-lg space-y-3">
      <div>
        <h2 className="text-sm font-medium">Sync existing characters to this config</h2>
        <p className="mt-1 text-xs text-muted">
          Adds or removes empty bid slots so every active character matches the counts above. Never touches a slot
          with an active bid, pending change, or block — those are reported below so you can clear them by hand.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className="input">
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={handleSync} disabled={pending || !phaseId} className="btn-outline shrink-0">
          {pending ? "Syncing..." : "Sync now"}
        </button>
      </div>
      {summary ? (
        <div className="text-sm">
          <p>
            Added {summary.slotsAdded} slot{summary.slotsAdded === 1 ? "" : "s"}, removed {summary.slotsRemoved}.
          </p>
          {summary.skipped.length > 0 ? (
            <div className="banner-warning mt-2">
              <p className="font-medium">{summary.skipped.length} skipped (not empty):</p>
              <ul className="mt-1 list-disc pl-5">
                {summary.skipped.map((s, i) => (
                  <li key={i}>
                    {s.characterName} — {s.track} bracket {s.bracket}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
