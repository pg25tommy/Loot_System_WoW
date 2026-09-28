"use client";

// Three-step open-roll flow: pick the item/track/roll-type (or short-circuit
// straight to disenchant/sell for a no-bids item) -> enter each
// participant's roll -> see the recorded winner.
import { useState, useTransition } from "react";
import { RollType, Track } from "@/generated/prisma/enums";
import { trackLabel } from "@/lib/trackLabels";
import { startOpenRollAction, finalizeOpenRollAction, disenchantUnbidItemAction, markSoldAction } from "@/lib/actions/openRolls";

type Item = { id: string; name: string };
type CharacterOption = { id: string; name: string };

export function OpenRollForm({
  phaseId,
  items,
  characters,
}: {
  phaseId: string;
  items: Item[];
  characters: CharacterOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [itemId, setItemId] = useState("");
  const [track, setTrack] = useState<Track>(Track.LEGACY);
  const [rollType, setRollType] = useState<RollType>(RollType.OPEN_BOP);
  const [raidDate, setRaidDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [openRollId, setOpenRollId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<{ characterId: string; roll: string }[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Pre-fills participants from MS-list bidders for a pug roll; an Open BoP
  // roll has no known bidder list, so it starts with one blank row instead.
  function handleStart() {
    if (!itemId) {
      setError("Pick an item first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startOpenRollAction({ itemId, phaseId, track, rollType, raidDate });
      setOpenRollId(result.openRollId);
      setParticipants(
        result.eligible.length > 0
          ? result.eligible.map((c) => ({ characterId: c.id, roll: "" }))
          : [{ characterId: "", roll: "" }],
      );
    });
  }

  function handleFinalize() {
    if (!openRollId) return;
    const entries = participants
      .filter((p) => p.characterId && p.roll)
      .map((p) => ({ characterId: p.characterId, rollValue: Number(p.roll) }));
    if (entries.length === 0) {
      setError("Enter at least one participant roll.");
      return;
    }
    startTransition(async () => {
      const result = await finalizeOpenRollAction(openRollId, entries);
      const winnerParticipant = result.participants.find((p) => p.isWinner);
      setWinner(winnerParticipant?.characterId ?? null);
    });
  }

  function handleDisenchant() {
    if (!itemId) return;
    startTransition(async () => {
      await disenchantUnbidItemAction({ itemId, phaseId, track, raidDate });
      setWinner("disenchanted");
    });
  }

  function handleSold() {
    if (!itemId) return;
    startTransition(async () => {
      await markSoldAction({ itemId, phaseId, track, raidDate });
      setWinner("sold");
    });
  }

  if (winner) {
    return (
      <div className="banner-success">
        <p className="font-medium">Recorded.</p>
        <button
          onClick={() => {
            setWinner(null);
            setOpenRollId(null);
            setItemId("");
            setParticipants([]);
          }}
          className="link mt-2"
        >
          Start another
        </button>
      </div>
    );
  }

  if (!openRollId) {
    return (
      <div className="space-y-4 panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Item
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="mt-1 w-full input">
              <option value="">Select...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value as Track)} className="mt-1 w-full input">
              <option value={Track.LEGACY}>{trackLabel("LEGACY")}</option>
              <option value={Track.NON_LEGACY}>{trackLabel("NON_LEGACY")}</option>
            </select>
          </label>
          <label className="block text-sm">
            Roll type
            <select value={rollType} onChange={(e) => setRollType(e.target.value as RollType)} className="mt-1 w-full input">
              <option value={RollType.OPEN_BOP}>Open BoP (no bids existed)</option>
              <option value={RollType.MS_OS_PUG}>Pug MS&gt;OS raid</option>
            </select>
          </label>
          <label className="block text-sm">
            Raid date
            <input type="date" value={raidDate} onChange={(e) => setRaidDate(e.target.value)} className="mt-1 w-full input" />
          </label>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleStart} disabled={pending} className="btn">
            Start roll
          </button>
          <button onClick={handleDisenchant} disabled={pending || !itemId} className="btn-outline">
            No takers — disenchant
          </button>
          <button onClick={handleSold} disabled={pending || !itemId} className="btn-outline">
            No bids — sell to non-members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 panel">
      <p className="text-sm font-medium">Enter /roll 100 results</p>
      <div className="space-y-2">
        {participants.map((p, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={p.characterId}
              onChange={(e) => {
                const next = [...participants];
                next[idx] = { ...next[idx], characterId: e.target.value };
                setParticipants(next);
              }}
              className="flex-1 input input-sm"
            >
              <option value="">Select character...</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={p.roll}
              onChange={(e) => {
                const next = [...participants];
                next[idx] = { ...next[idx], roll: e.target.value };
                setParticipants(next);
              }}
              className="w-20 input input-sm"
            />
          </div>
        ))}
        <button
          onClick={() => setParticipants([...participants, { characterId: "", roll: "" }])}
          className="link text-sm"
        >
          + Add participant
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button onClick={handleFinalize} disabled={pending} className="btn">
        Finalize
      </button>
    </div>
  );
}
