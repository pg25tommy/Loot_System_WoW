"use client";

// Signs the officer out and returns to the public home page.
import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
      className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:text-[var(--accent)]"
      style={{ background: "var(--bg-elevated)" }}
    >
      <Icon name="logout" size={16} />
    </button>
  );
}
