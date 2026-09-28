// Display-only labels for the two bid tracks. The underlying Track enum
// (LEGACY / NON_LEGACY) and all rule logic keep their original names from
// the ruleset — only what's shown in the UI changes here, so renaming
// again later never requires touching the data model or rules.
export type TrackValue = "LEGACY" | "NON_LEGACY";

const TRACK_LABELS: Record<TrackValue, string> = {
  LEGACY: "Current Tier",
  NON_LEGACY: "Misc / PvP",
};

export function trackLabel(track: TrackValue): string {
  return TRACK_LABELS[track];
}
