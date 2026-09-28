"use client";

// Cascading class -> spec <select> pair for character create/edit forms —
// a client component because the spec options depend on the currently
// chosen class.
import { useState } from "react";
import { WOW_CLASSES } from "@/lib/wowClasses";

export function ClassSpecFields({
  defaultClass,
  defaultSpec,
}: {
  defaultClass?: string;
  defaultSpec?: string;
}) {
  const [selectedClass, setSelectedClass] = useState(defaultClass ?? "");
  const specs = WOW_CLASSES.find((c) => c.name === selectedClass)?.specs ?? [];

  return (
    <>
      <select
        name="class"
        required
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        className="input"
      >
        <option value="">Class...</option>
        {WOW_CLASSES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="spec" required defaultValue={defaultSpec ?? ""} className="input" disabled={specs.length === 0}>
        <option value="">Spec...</option>
        {specs.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </>
  );
}
