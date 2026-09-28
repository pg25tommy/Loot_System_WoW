"use client";

// Roster-wide attendance for one raid date: everyone defaults to present
// (ticked); unticking a row reveals its absence-type/flags controls, pre-filled
// from any existing record for that date so revisiting a date to fix a
// mistake is just re-ticking and re-confirming.
import { useState, useTransition } from "react";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";
import { submitAttendanceChecklistAction, type AttendanceChecklistEntry } from "@/lib/actions/attendance";

type CharacterOption = { id: string; name: string; class: string };
type ExistingRecord = {
  characterId: string;
  status: string;
  postedInAdvance: boolean;
  missedFullWeek: boolean;
};

type RowState = Omit<AttendanceChecklistEntry, "characterId">;

const DEFAULT_ROW: RowState = {
  present: true,
  absenceType: "ABSENT_UNEXCUSED",
  postedInAdvance: false,
  missedFullWeek: false,
};

function initialRowState(existing: ExistingRecord | undefined): RowState {
  if (!existing || existing.status === "PRESENT") return { ...DEFAULT_ROW };
  return {
    present: false,
    absenceType: existing.status as RowState["absenceType"],
    postedInAdvance: existing.postedInAdvance,
    missedFullWeek: existing.missedFullWeek,
  };
}

export function AttendanceChecklist({
  phaseId,
  raidDate,
  characters,
  existing,
}: {
  phaseId: string;
  raidDate: string;
  characters: CharacterOption[];
  existing: ExistingRecord[];
}) {
  const existingByCharacterId = new Map(existing.map((e) => [e.characterId, e]));
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(characters.map((c) => [c.id, initialRowState(existingByCharacterId.get(c.id))])),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
    setSaved(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      await submitAttendanceChecklistAction({
        phaseId,
        raidDate,
        entries: Object.entries(rows).map(([characterId, r]) => ({ characterId, ...r })),
      });
      setSaved(true);
    });
  }

  const presentCount = Object.values(rows).filter((r) => r.present).length;

  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Who was at raid on {raidDate}?</h2>
        <span className="text-xs text-muted">
          {presentCount}/{characters.length} present
        </span>
      </div>

      <ul className="divide-y divide-list">
        {characters.map((c) => {
          const row = rows[c.id];
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
              <label className="flex min-w-[11rem] flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.present}
                  onChange={(e) => updateRow(c.id, { present: e.target.checked })}
                />
                <ClassIcon className={c.class} size="sm" />
                <span style={{ color: classColor(c.class) }}>{c.name}</span>
              </label>
              {!row.present ? (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <select
                    value={row.absenceType}
                    onChange={(e) => updateRow(c.id, { absenceType: e.target.value as RowState["absenceType"] })}
                    className="input input-sm"
                  >
                    <option value="ABSENT_UNEXCUSED">Absent (unexcused)</option>
                    <option value="ABSENT_EXCUSED">Absent (excused)</option>
                    <option value="FREE_HOLIDAY">Free holiday week</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.postedInAdvance}
                      onChange={(e) => updateRow(c.id, { postedInAdvance: e.target.checked })}
                    />
                    Posted 24h+ ahead
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.missedFullWeek}
                      onChange={(e) => updateRow(c.id, { missedFullWeek: e.target.checked })}
                    />
                    Missed full week
                  </label>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} disabled={pending} className="btn">
          {pending ? "Saving..." : "Confirm attendance"}
        </button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
      </div>
    </div>
  );
}
