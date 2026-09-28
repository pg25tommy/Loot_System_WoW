// Canonical class list, matching official Blizzard class colors and the
// nine classic-era classes. Character.class/spec are still free-text in
// the database, but the UI only lets officers pick from this list so
// color/icon lookups are reliable.
export type WowClass = {
  name: string;
  color: string;
  icon: string;
  specs: string[];
};

export const WOW_CLASSES: WowClass[] = [
  { name: "Warrior", color: "#C79C6E", icon: "warrior", specs: ["Arms", "Fury", "Protection"] },
  { name: "Paladin", color: "#F58CBA", icon: "paladin", specs: ["Holy", "Protection", "Retribution"] },
  { name: "Hunter", color: "#ABD473", icon: "hunter", specs: ["Beast Mastery", "Marksmanship", "Survival"] },
  { name: "Rogue", color: "#FFF569", icon: "rogue", specs: ["Assassination", "Combat", "Subtlety"] },
  { name: "Priest", color: "#FFFFFF", icon: "priest", specs: ["Discipline", "Holy", "Shadow"] },
  { name: "Shaman", color: "#0070DE", icon: "shaman", specs: ["Elemental", "Enhancement", "Restoration"] },
  { name: "Mage", color: "#69CCF0", icon: "mage", specs: ["Arcane", "Fire", "Frost"] },
  { name: "Warlock", color: "#9482C9", icon: "warlock", specs: ["Affliction", "Demonology", "Destruction"] },
  { name: "Druid", color: "#FF7D0A", icon: "druid", specs: ["Balance", "Feral Combat", "Restoration"] },
];

const BY_NAME = new Map(WOW_CLASSES.map((c) => [c.name, c]));

export function getClass(name: string | undefined | null): WowClass | undefined {
  return name ? BY_NAME.get(name) : undefined;
}

export function classColor(name: string | undefined | null): string {
  return getClass(name)?.color ?? "#9a9a9a";
}

/** Wowhead's CDN icon URL for a class; falls back to the Warrior icon for an unrecognized name. */
export function classIconUrl(name: string | undefined | null, size: "small" | "medium" | "large" = "medium") {
  const cls = getClass(name);
  const icon = cls?.icon ?? "warrior";
  return `https://wow.zamimg.com/images/wow/icons/${size}/classicon_${icon}.jpg`;
}
