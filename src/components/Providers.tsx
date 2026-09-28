"use client";

// Wraps the whole app in NextAuth's client SessionProvider (in root layout.tsx) —
// needed because session-dependent client components (e.g. SignOutButton)
// use the useSession hook, which requires this context.
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
