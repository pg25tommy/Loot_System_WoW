"use client";

// One bid-slot row in a character's edit page. A client component (rather
// than a plain <form action>) so a duplicate-item rejection from
// setBidSlotAction can show inline instead of crashing to the error boundary.
import { useState, useTransition } from "react";
import { setBidSlotAction } from "@/lib/actions/characters";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Slot = {
  id: string;
  itemId: string | null;
  status: string;
  specPriority: string | null;
};

export function BidSlotRow({ slot, items }: { slot: Slot; items: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setBidSlotAction(slot.id, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-2 panel-row">
      <select name="itemId" defaultValue={slot.itemId ?? ""} className="min-w-[10rem] flex-1 input input-sm">
        <option value="">empty</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select name="specPriority" defaultValue={slot.specPriority ?? ""} className="input input-sm text-xs">
        <option value="">spec...</option>
        <option value="MAIN_SPEC">MS</option>
        <option value="OFF_SPEC">OS</option>
        <option value="ALT_MAIN_SPEC">Alt MS</option>
        <option value="ALT_OFF_SPEC">Alt OS</option>
      </select>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input type="checkbox" name="scheduleForNextWeek" /> next week on
        <input type="date" name="becomesActiveAt" className="input input-sm" />
      </label>
      <StatusBadge status={slot.status} />
      <button type="submit" disabled={pending} className="ml-auto link text-xs">
        {pending ? "Saving..." : "Save"}
      </button>
      {error ? <p className="w-full text-xs text-danger">{error}</p> : null}
    </form>
  );
}
