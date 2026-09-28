"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function localTodayStr() {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localMidnight.toISOString().slice(0, 10);
}

/**
 * The server only knows UTC "today", which is wrong for part of the day in
 * every timezone behind or ahead of UTC. On first load with no ?date in the
 * URL, swap in the officer's actual local-today once the browser can tell us.
 */
export function RaidDatePicker({ raidDate, hadDateParam }: { raidDate: string; hadDateParam: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hadDateParam) return;
    const today = localTodayStr();
    if (today !== raidDate) {
      router.replace(`${pathname}?date=${today}`);
    }
    // Only ever runs once, right after the initial no-param load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form className="flex items-end gap-3 panel panel-sm">
      <label className="text-sm">
        Raid date
        <input type="date" name="date" defaultValue={raidDate} required className="mt-1 input" />
      </label>
      <button type="submit" className="btn-outline">
        Switch date
      </button>
    </form>
  );
}
