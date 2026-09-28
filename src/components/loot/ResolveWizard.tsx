"use client";

// The guided loot-resolution wizard at /officer/loot/resolve: pick an item ->
// see the ranked plan (with the full competing-bidders breakdown) -> resolve
// any tiebreak -> confirm. Every step before "Confirm" is a pure preview —
// nothing is written to the database until confirmResolutionAction runs.
import { useState, useTransition } from "react";
import { Track } from "@/generated/prisma/enums";
import { trackLabel } from "@/lib/trackLabels";
import { classColor } from "@/lib/wowClasses";
import { ClassIcon } from "@/components/ui/ClassIcon";
import type { LootResolutionPlan, TiebreakResult } from "@/lib/rules/lootResolution";
import {
  confirmResolutionAction,
  getCharacterSlotsAction,
  getResolutionPlanAction,
  rollFinalizeAction,
  tankAutoTiebreakAction,
  tankPriorityPlanAction,
} from "@/lib/actions/loot";

type Item = { id: string; name: string };
type CharacterOption = { id: string; name: string; class: string };

function CharacterTag({ name, wowClass }: { name: string; wowClass: string | null }) {
  if (!wowClass) return <span>{name}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <ClassIcon className={wowClass} size="sm" />
      <span style={{ color: classColor(wowClass) }}>{name}</span>
    </span>
  );
}
type SlotOption = {
  id: string;
  bracket: number;
  slotIndex: number;
  item: { name: string } | null;
};

export function ResolveWizard({
  phaseId,
  items,
  characters,
  isTankOfficer,
}: {
  phaseId: string;
  items: Item[];
  characters: CharacterOption[];
  isTankOfficer: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [itemId, setItemId] = useState("");
  const [track, setTrack] = useState<Track>(Track.LEGACY);
  const [raidDate, setRaidDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [droppedFrom, setDroppedFrom] = useState("");

  const [tankMode, setTankMode] = useState(false);
  const [tankCharacterId, setTankCharacterId] = useState("");
  const [tankSlots, setTankSlots] = useState<SlotOption[]>([]);
  const [tankSlotId, setTankSlotId] = useState("");

  const [plan, setPlan] = useState<LootResolutionPlan | null>(null);
  const [rolls, setRolls] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ id: string } | null>(null);

  function reset() {
    setPlan(null);
    setResult(null);
    setError(null);
    setRolls({});
  }

  function loadTankSlots(characterId: string, t: Track) {
    setTankCharacterId(characterId);
    setTankSlotId("");
    if (!characterId) {
      setTankSlots([]);
      return;
    }
    startTransition(async () => {
      const slots = await getCharacterSlotsAction(characterId, phaseId, t);
      setTankSlots(slots);
    });
  }

  function handleGetPlan() {
    setError(null);
    if (!itemId) {
      setError("Pick an item first.");
      return;
    }
    startTransition(async () => {
      if (tankMode) {
        if (!tankSlotId) {
          setError("Pick which slot the tank is spending.");
          return;
        }
        const res = await tankPriorityPlanAction(tankSlotId);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setPlan(res.data);
      } else {
        const p = await getResolutionPlanAction({ itemId, phaseId, track });
        setPlan(p);
      }
    });
  }

  function handleConfirm() {
    if (!plan) return;
    startTransition(async () => {
      const res = await confirmResolutionAction(plan, {
        itemId,
        phaseId,
        track,
        raidDate,
        droppedFrom: droppedFrom || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
    });
  }

  function handleRollSubmit(tiebreak: TiebreakResult) {
    setError(null);
    const rollEntries = tiebreak.tiedCandidates.map((c) => ({
      characterId: c.characterId,
      roll: Number(rolls[c.characterId] ?? 0),
    }));
    if (rollEntries.some((r) => !r.roll)) {
      setError("Enter a roll for every tied candidate.");
      return;
    }
    startTransition(async () => {
      const res = await rollFinalizeAction(tiebreak, plan!.bracket!, rollEntries);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan(res.data);
    });
  }

  function handleTankAutoWin(tiebreak: TiebreakResult, characterId: string) {
    setError(null);
    startTransition(async () => {
      const res = await tankAutoTiebreakAction(tiebreak, characterId, plan!.bracket!);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan(res.data);
    });
  }

  if (result) {
    return (
      <div className="banner-success">
        <p className="font-medium">Resolved and recorded.</p>
        <button
          onClick={() => {
            reset();
            setItemId("");
            setDroppedFrom("");
          }}
          className="mt-2 text-success underline"
        >
          Resolve another drop
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!plan ? (
        <div className="space-y-4 panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Item
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="mt-1 w-full input"
              >
                <option value="">Select an item...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Track
              <select
                value={track}
                onChange={(e) => {
                  const t = e.target.value as Track;
                  setTrack(t);
                  if (tankMode && tankCharacterId) loadTankSlots(tankCharacterId, t);
                }}
                className="mt-1 w-full input"
              >
                <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
                <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
              </select>
            </label>

            <label className="block text-sm">
              Raid date
              <input
                type="date"
                value={raidDate}
                onChange={(e) => setRaidDate(e.target.value)}
                className="mt-1 w-full input"
              />
            </label>

            <label className="block text-sm">
              Dropped from (optional)
              <input
                type="text"
                value={droppedFrom}
                onChange={(e) => setDroppedFrom(e.target.value)}
                placeholder="Boss name"
                className="mt-1 w-full input"
              />
            </label>
          </div>

          {isTankOfficer ? (
            <div className="panel panel-sm">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={tankMode}
                  onChange={(e) => {
                    setTankMode(e.target.checked);
                    setTankSlots([]);
                    setTankSlotId("");
                  }}
                />
                Tank priority claim (spend a bracket instantly, skip normal ranking)
              </label>
              {tankMode ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    Tank character
                    <select
                      value={tankCharacterId}
                      onChange={(e) => loadTankSlots(e.target.value, track)}
                      className="mt-1 w-full input"
                    >
                      <option value="">Select...</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id} style={{ color: classColor(c.class) }}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    Slot to spend
                    <select
                      value={tankSlotId}
                      onChange={(e) => setTankSlotId(e.target.value)}
                      className="mt-1 w-full input"
                    >
                      <option value="">Select...</option>
                      {tankSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          Bracket {s.bracket} · slot {s.slotIndex + 1} {s.item ? `(${s.item.name})` : "(empty)"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            onClick={handleGetPlan}
            disabled={pending}
            className="btn"
          >
            {pending ? "Working..." : "Rank bidders"}
          </button>
        </div>
      ) : (
        <PlanReview
          plan={plan}
          pending={pending}
          error={error}
          rolls={rolls}
          setRolls={setRolls}
          onRollSubmit={handleRollSubmit}
          onTankAutoWin={handleTankAutoWin}
          onConfirm={handleConfirm}
          onBack={reset}
          isTankOfficer={isTankOfficer}
        />
      )}
    </div>
  );
}

function PlanReview({
  plan,
  pending,
  error,
  rolls,
  setRolls,
  onRollSubmit,
  onTankAutoWin,
  onConfirm,
  onBack,
  isTankOfficer,
}: {
  plan: LootResolutionPlan;
  pending: boolean;
  error: string | null;
  rolls: Record<string, string>;
  setRolls: (r: Record<string, string>) => void;
  onRollSubmit: (t: TiebreakResult) => void;
  onTankAutoWin: (t: TiebreakResult, characterId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isTankOfficer: boolean;
}) {
  if (plan.bracket === null && !plan.winnerCharacterId) {
    return (
      <div className="space-y-3 banner-warning">
        <p className="font-medium">No eligible bidders for this item.</p>
        <p className="text-muted">
          Use the Open Rolls page to run an &quot;Open&quot; BoP roll, or mark it disenchanted / sold from the drop log.
        </p>
        <button onClick={onBack} className="link text-sm">
          Back
        </button>
      </div>
    );
  }

  if (plan.tiebreak && !plan.winnerCharacterId) {
    const tiebreak = plan.tiebreak;
    return (
      <div className="space-y-4 panel">
        <p className="text-sm font-medium">
          Tied at bracket {plan.bracket} — enter a /roll 100 for each tied candidate.
        </p>
        <ul className="space-y-2">
          {tiebreak.tiedCandidates.map((c) => (
            <li key={c.characterId} className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <CharacterTag name={c.character.name} wowClass={c.character.class} />
                {tiebreak.autoLoseCharacterIds.includes(c.characterId) ? (
                  <span className="text-xs text-muted">(Initiate — auto-loses ties)</span>
                ) : null}
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={rolls[c.characterId] ?? ""}
                onChange={(e) => setRolls({ ...rolls, [c.characterId]: e.target.value })}
                className="w-20 input input-sm"
              />
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onRollSubmit(tiebreak)}
            disabled={pending}
            className="btn"
          >
            Finalize roll
          </button>
          {isTankOfficer ? (
            <TankAutoWinPicker tiebreak={tiebreak} onPick={(id) => onTankAutoWin(tiebreak, id)} />
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <CompetingBrackets allBracketCandidates={plan.allBracketCandidates} highlightBracket={plan.bracket} />
        <button onClick={onBack} className="link text-sm">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 panel">
      <p className="text-sm">
        <span className="font-medium">Method:</span> {plan.method}
      </p>
      <p className="flex items-center gap-2 text-sm">
        <span className="font-medium">Winner:</span>
        {plan.winnerCharacterName ? (
          <CharacterTag name={plan.winnerCharacterName} wowClass={plan.winnerCharacterClass} />
        ) : (
          plan.winnerCharacterId
        )}
      </p>
      {plan.bracket !== null ? (
        <p className="text-sm text-muted">Bracket {plan.bracket}</p>
      ) : null}
      {plan.resolutionSummary ? (
        <p className="text-sm text-muted">{plan.resolutionSummary}</p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <CompetingBrackets
        allBracketCandidates={plan.allBracketCandidates}
        highlightBracket={plan.bracket}
        winnerCharacterId={plan.winnerCharacterId}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={pending}
          className="btn"
        >
          {pending ? "Saving..." : "Confirm and block slot"}
        </button>
        <button onClick={onBack} className="link text-sm">
          Back
        </button>
      </div>
    </div>
  );
}

function CompetingBrackets({
  allBracketCandidates,
  highlightBracket,
  winnerCharacterId,
}: {
  allBracketCandidates: LootResolutionPlan["allBracketCandidates"];
  highlightBracket: number | null;
  winnerCharacterId?: string | null;
}) {
  if (!allBracketCandidates || allBracketCandidates.length === 0) return null;

  return (
    <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-xs font-medium text-muted">Competing bidders by bracket</p>
      <ul className="space-y-2">
        {allBracketCandidates.map(({ bracket, candidates }) => {
          const isRelevant = bracket === highlightBracket;
          return (
            <li key={bracket} className={isRelevant ? "bracket-row bracket-row-active" : "bracket-row"}>
              <span className="font-medium">Bracket {bracket}:</span>{" "}
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 align-middle">
                {candidates.map((c) => {
                  const isWinner = c.characterId === winnerCharacterId;
                  const tag = <CharacterTag name={c.characterName} wowClass={c.characterClass} />;
                  return (
                    <span key={c.characterId} className="inline-flex items-center">
                      {isWinner ? <strong>{tag}</strong> : tag}
                    </span>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TankAutoWinPicker({
  tiebreak,
  onPick,
}: {
  tiebreak: TiebreakResult;
  onPick: (characterId: string) => void;
}) {
  const [characterId, setCharacterId] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select
        value={characterId}
        onChange={(e) => setCharacterId(e.target.value)}
        className="input input-sm"
      >
        <option value="">Tank auto-win...</option>
        {tiebreak.tiedCandidates.map((c) => (
          <option key={c.characterId} value={c.characterId} style={{ color: classColor(c.character.class) }}>
            {c.character.name}
          </option>
        ))}
      </select>
      <button
        disabled={!characterId}
        onClick={() => onPick(characterId)}
        className="text-sm text-danger underline disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}
