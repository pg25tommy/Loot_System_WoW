"use client";

// Two-step world-boss loot log: name the boss/item and start the log, then
// enter every participant's Need/Greed/Pass intent + roll and finalize.
import { useState, useTransition } from "react";
import { createWorldBossLogAction, finalizeWorldBossLogAction } from "@/lib/actions/worldBoss";

type CharacterOption = { id: string; name: string };
type Row = { characterId: string; intent: "NEED" | "GREED" | "PASS"; roll: string };

export function WorldBossForm({ phaseId, characters }: { phaseId: string; characters: CharacterOption[] }) {
  const [pending, startTransition] = useTransition();
  const [item, setItem] = useState("");
  const [bossName, setBossName] = useState("");
  const [raidDate, setRaidDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logId, setLogId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([{ characterId: "", intent: "NEED", roll: "" }]);
  const [winnerName, setWinnerName] = useState<string | null>(null);

  function handleStart() {
    startTransition(async () => {
      const id = await createWorldBossLogAction({ phaseId, item, bossName, raidDate });
      setLogId(id);
    });
  }

  function handleFinalize() {
    if (!logId) return;
    startTransition(async () => {
      const result = await finalizeWorldBossLogAction(
        logId,
        rows
          .filter((r) => r.characterId)
          .map((r) => ({ characterId: r.characterId, intent: r.intent, roll: r.roll ? Number(r.roll) : undefined })),
      );
      const winner = result.participants.find((p) => p.isWinner);
      setWinnerName(winner?.character.name ?? "no winner");
    });
  }

  if (winnerName) {
    return (
      <div className="banner-success">
        <p className="font-medium">Winner: {winnerName}</p>
        <button onClick={() => { setLogId(null); setWinnerName(null); setRows([{ characterId: "", intent: "NEED", roll: "" }]); }} className="link mt-2">
          Log another
        </button>
      </div>
    );
  }

  if (!logId) {
    return (
      <div className="space-y-4 panel">
        <div className="grid gap-4 sm:grid-cols-3">
          <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Item name" className="input" />
          <input value={bossName} onChange={(e) => setBossName(e.target.value)} placeholder="World boss name" className="input" />
          <input type="date" value={raidDate} onChange={(e) => setRaidDate(e.target.value)} className="input" />
        </div>
        <button onClick={handleStart} disabled={pending || !item || !bossName} className="btn">
          Start
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 panel">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select value={row.characterId} onChange={(e) => { const next = [...rows]; next[idx] = { ...next[idx], characterId: e.target.value }; setRows(next); }} className="flex-1 input input-sm">
            <option value="">Select character...</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={row.intent} onChange={(e) => { const next = [...rows]; next[idx] = { ...next[idx], intent: e.target.value as Row["intent"] }; setRows(next); }} className="input input-sm">
            <option value="NEED">Need (MS)</option>
            <option value="GREED">Greed (OS)</option>
            <option value="PASS">Pass</option>
          </select>
          <input type="number" min={1} max={100} value={row.roll} onChange={(e) => { const next = [...rows]; next[idx] = { ...next[idx], roll: e.target.value }; setRows(next); }} className="w-20 input input-sm" />
        </div>
      ))}
      <button onClick={() => setRows([...rows, { characterId: "", intent: "NEED", roll: "" }])} className="link text-sm">
        + Add participant
      </button>
      <div>
        <button onClick={handleFinalize} disabled={pending} className="btn">
          Finalize
        </button>
      </div>
    </div>
  );
}
