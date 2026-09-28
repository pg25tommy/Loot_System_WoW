"use client";

// Lets an officer walk a drop's winner (or subsequent candidates) through
// keep/pass decisions on the drop detail page. Reloads the page after every
// decision since a KEPT/TRADED changes which BidSlot is blocked.
import { useState, useTransition } from "react";
import {
  checkIdenticalItemAlreadyWonAction,
  recordPassDecisionAction,
  startPassChainAction,
} from "@/lib/actions/loot";

export function PassChainPanel({
  dropId,
  currentHolderId,
  currentHolderName,
}: {
  dropId: string;
  currentHolderId: string | null;
  currentHolderName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState<{ characterId: string; name: string } | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [reason, setReason] = useState("");
  const [identicalAlready, setIdenticalAlready] = useState<boolean | null>(null);

  function loadNext() {
    startTransition(async () => {
      const state = await startPassChainAction(dropId);
      setNext(state.nextCandidate ? { characterId: state.nextCandidate.characterId, name: state.nextCandidate.character.name } : null);
      setExhausted(state.exhausted);
    });
  }

  function checkHolderIdentical() {
    if (!currentHolderId) return;
    startTransition(async () => {
      const result = await checkIdenticalItemAlreadyWonAction(dropId, currentHolderId);
      setIdenticalAlready(result);
    });
  }

  function decide(characterId: string, decision: "PASSED" | "KEPT" | "TRADED") {
    startTransition(async () => {
      await recordPassDecisionAction(dropId, characterId, decision, reason || undefined);
      setReason("");
      loadNext();
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4 panel">
      <h2 className="text-lg font-medium">Passing</h2>

      {currentHolderId ? (
        <div className="space-y-2 text-sm">
          <p>
            Current holder <span className="font-medium">{currentHolderName}</span> can keep it or pass.
          </p>
          <button onClick={checkHolderIdentical} className="link text-xs">
            Check: already won an identical-slot item this raid week?
          </button>
          {identicalAlready !== null ? (
            <p className="text-xs text-muted">
              {identicalAlready
                ? "Yes — they may pass entirely with no further obligations."
                : "No matching win found this raid week."}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="input input-sm"
            />
            <button disabled={pending} onClick={() => decide(currentHolderId, "PASSED")} className="btn-outline btn-sm">
              They pass
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <button disabled={pending} onClick={loadNext} className="btn btn-sm">
            Find next candidate
          </button>
          {exhausted ? (
            <p className="text-muted">
              Everyone has passed — send it to open roll from the Open Rolls page.
            </p>
          ) : null}
          {next ? (
            <div className="flex items-center gap-2">
              <span>
                Next: <span className="font-medium">{next.name}</span>
              </span>
              <button disabled={pending} onClick={() => decide(next.characterId, "KEPT")} className="btn btn-sm">
                They keep it
              </button>
              <button disabled={pending} onClick={() => decide(next.characterId, "PASSED")} className="btn-outline btn-sm">
                They pass too
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
