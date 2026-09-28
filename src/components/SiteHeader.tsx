// Site-wide sticky header: logo, public nav, and a login/dashboard link that
// swaps based on whether an officer is currently signed in.
import Link from "next/link";
import { getOfficerSession } from "@/lib/auth/session";
import { HeaderNav } from "@/components/HeaderNav";

export async function SiteHeader() {
  const session = await getOfficerSession();

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ background: "rgba(23,29,22,0.85)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* Bracket-shaped lettermark — a plain "B" badge here previously
              read too close to an unrelated brand's logo. */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
            <path d="M16 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
          </svg>
          <span className="text-base font-extrabold tracking-tight">BracketKeeper</span>
        </Link>

        <div className="flex items-center gap-3">
          <HeaderNav />
          {session?.user ? (
            <Link
              href="/officer"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--accent)", color: "#1a1205" }}
            >
              Officer dashboard
            </Link>
          ) : (
            <Link
              href="/officer/login"
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-[var(--accent)]"
              style={{ borderColor: "var(--border-light)" }}
            >
              Officer login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
