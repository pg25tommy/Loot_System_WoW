"use client";

// Top nav for every public (non-officer) page — Roster, Items, and the
// public All Bids master list.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const LINKS = [
  { href: "/", label: "Roster", icon: "characters" as const },
  { href: "/items", label: "Items", icon: "items" as const },
  { href: "/master-list", label: "All Bids", icon: "masterList" as const },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={active ? { background: "var(--bg-elevated)", color: "var(--text)" } : { color: "var(--text-muted)" }}
          >
            <Icon name={link.icon} size={16} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
