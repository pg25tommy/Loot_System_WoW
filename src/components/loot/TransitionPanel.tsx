"use client";

// End-of-phase rollover UI: preview the carry-over counts before committing,
// with an optional one-slot "unlock" applied across every member's new list.
import { useState, useTransition } from "react";
import { applyTransitionAction, previewTransitionAction } from "@/lib/actions/phase";
import { trackLabel } from "@/lib/trackLabels";
import type { PhaseTransitionSummary } from "@/lib/rules/phaseTransition";

export function TransitionPanel({
  fromPhaseId,
  otherPhases,
}: {
  fromPhaseId: string;
  otherPhases: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [toPhaseId, setToPhaseId] = useState("");
  const [summary, setSummary] = useState<PhaseTransitionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [unlockBracket, setUnlockBracket] = useState("");
  const [unlockSlotIndex, setUnlockSlotIndex] = useState("");

  function handlePreview() {
    if (!toPhaseId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewTransitionAction(fromPhaseId, toPhaseId);
        setSummary(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleApply() {
    if (!toPhaseId) return;
    startTransition(async () => {
      try {
        const unlockSlots =
          unlockBracket && unlockSlotIndex
            ? [{ bracket: Number(unlockBracket), slotIndex: Number(unlockSlotIndex) }]
            : [];
        const result = await applyTransitionAction(fromPhaseId, toPhaseId, unlockSlots);
        setSummary(result);
        setApplied(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (applied) {
    return (
      <div className="banner-success">
        <p className="font-medium">Transition applied and the target phase is now active.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 panel">
      <label className="block text-sm">
        Target phase (must already have {trackLabel("NON_LEGACY")} bracket config set)
        <select
          value={toPhaseId}
          onChange={(e) => {
            setToPhaseId(e.target.value);
            setSummary(null);
          }}
          className="mt-1 w-full max-w-sm input"
        >
          <option value="">Select...</option>
          {otherPhases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <button onClick={handlePreview} disabled={pending || !toPhaseId} className="btn-outline">
        Preview
      </button>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {summary ? (
        <div className="space-y-2 text-sm">
          <p>Characters affected: {summary.charactersAffected}</p>
          <p>
            Slots carried {trackLabel("NON_LEGACY")} → {trackLabel("LEGACY")}: {summary.slotsCarriedToLegacy}
          </p>
          <p>Old {trackLabel("LEGACY")} slots discarded: {summary.slotsClearedFromOldLegacy}</p>
          <p>Fresh {trackLabel("NON_LEGACY")} slots created: {summary.freshNonLegacySlotsCreated}</p>

          <div className="panel panel-sm">
            <p className="text-xs font-medium">Optional: unlock one identical slot across every member&apos;s new {trackLabel("LEGACY")} list</p>
            <div className="mt-2 flex items-center gap-2">
              <input value={unlockBracket} onChange={(e) => setUnlockBracket(e.target.value)} placeholder="Bracket" type="number" className="w-20 input input-sm" />
              <input value={unlockSlotIndex} onChange={(e) => setUnlockSlotIndex(e.target.value)} placeholder="Slot #" type="number" className="w-20 input input-sm" />
            </div>
          </div>

          <button onClick={handleApply} disabled={pending} className="btn">
            Apply transition
          </button>
        </div>
      ) : null}
    </div>
  );
}
