"use client";

// Grouped officer sidebar nav with active-route highlighting. A client
// component because usePathname() (for the highlight) only works client-side.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const SECTIONS: { label: string; links: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] }[] = [
  {
    label: "Overview",
    links: [{ href: "/officer", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Roster",
    links: [
      { href: "/officer/characters", label: "Characters", icon: "characters" },
      { href: "/officer/master-list", label: "Master List", icon: "masterList" },
      { href: "/officer/items", label: "Items", icon: "items" },
      { href: "/officer/loot/recipes", label: "Recipes", icon: "recipes" },
      { href: "/officer/attendance", label: "Attendance", icon: "attendance" },
    ],
  },
  {
    label: "Loot",
    links: [
      { href: "/officer/loot/resolve", label: "Resolve drop", icon: "resolve" },
      { href: "/officer/loot/drops", label: "Drop log", icon: "drops" },
      { href: "/officer/loot/open-rolls", label: "Open rolls", icon: "openRolls" },
      { href: "/officer/loot/world-boss", label: "World boss", icon: "worldBoss" },
      { href: "/officer/loot/gatherables", label: "Gatherables", icon: "gatherables" },
    ],
  },
  {
    label: "Guild",
    links: [{ href: "/officer/phase", label: "Phases", icon: "phases" }],
  },
  {
    label: "Config",
    links: [
      { href: "/officer/config/brackets", label: "Bracket config", icon: "bracketConfig" },
      { href: "/officer/config/rank-tiers", label: "Rank tiers", icon: "rankTiers" },
      { href: "/officer/config/gatherables", label: "Gatherable values", icon: "gatherableValues" },
      { href: "/officer/config/tanks", label: "Tanks", icon: "tanks" },
      { href: "/officer/config/officers", label: "Officers", icon: "officers" },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 text-sm">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-faint">{section.label}</div>
          <div className="flex flex-col gap-0.5">
            {section.links.map((link) => {
              const active = link.href === "/officer" ? pathname === "/officer" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                  style={
                    active
                      ? { background: "rgba(226,147,58,0.12)", color: "var(--accent-bright)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  <Icon name={link.icon} size={16} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
