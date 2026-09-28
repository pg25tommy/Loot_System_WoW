// Human-readable labels + badge color grouping for DropResolutionMethod
// (the raw enum reads as e.g. "BRACKET_OUTRIGHT" — not fit for the public
// loot log). See src/components/ui/ResolutionMethodBadge.tsx.
const LABELS: Record<string, string> = {
  BRACKET_OUTRIGHT: "Bracket win",
  TANK_PRIORITY: "Tank priority",
  TIEBREAK_BLOCKED_COUNT: "Tiebreak (blocked count)",
  TIEBREAK_ROLL: "Tiebreak (roll)",
  TIEBREAK_TANK_AUTOWIN: "Tank auto-win",
  OPEN_ROLL_MS_OS: "Open roll (MS/OS)",
  OPEN_ROLL_BOP: "Open roll (BoP)",
  PASS_CHAIN_ROLL: "Pass chain roll",
  DISENCHANT: "Disenchanted",
  SOLD: "Sold",
  GATHERABLE_BID: "Gatherable bid",
  RECIPE_OFFICER_AWARD: "Officer discretion",
  RECIPE_LOOTLIST: "Recipe (lootlist)",
  WORLD_BOSS_OPEN_ROLL: "World boss roll",
  CRAFTED_BOE_QUEUE: "Crafted BoE queue",
};

/** Badge color grouping: green = normal bracket win, blue/purple = tiebreak
 * paths, orange = tank/officer overrides, gray/white = non-bracket mechanisms. */
const BADGE_QUALITY: Record<string, string> = {
  BRACKET_OUTRIGHT: "badge-uncommon",
  GATHERABLE_BID: "badge-uncommon",
  RECIPE_LOOTLIST: "badge-uncommon",
  TIEBREAK_BLOCKED_COUNT: "badge-rare",
  TIEBREAK_ROLL: "badge-epic",
  TANK_PRIORITY: "badge-legendary",
  TIEBREAK_TANK_AUTOWIN: "badge-legendary",
  RECIPE_OFFICER_AWARD: "badge-legendary",
  OPEN_ROLL_MS_OS: "badge-common",
  OPEN_ROLL_BOP: "badge-common",
  PASS_CHAIN_ROLL: "badge-common",
  WORLD_BOSS_OPEN_ROLL: "badge-common",
  DISENCHANT: "badge-poor",
  SOLD: "badge-poor",
  CRAFTED_BOE_QUEUE: "badge-poor",
};

export function dropResolutionLabel(method: string): string {
  return LABELS[method] ?? method;
}

export function dropResolutionBadgeQuality(method: string): string {
  return BADGE_QUALITY[method] ?? "badge-rare";
}
