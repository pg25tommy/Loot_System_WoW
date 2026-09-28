"use client";

// General safety-net error boundary for the whole /officer section. Kept
// alongside this layout so the sidebar/header stay mounted even when a page
// crashes. Note: error.message is redacted by Next.js in production for
// errors that reach this boundary uncaught — actions that can fail for
// reasons the officer needs to see should return { error } instead of
// throwing (see src/lib/actions/loot.ts's ActionResult pattern) so this
// boundary is only ever a last resort, not the primary way errors surface.
export default function OfficerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="banner-warning">
      <p className="font-medium">Couldn&apos;t save that.</p>
      <p className="mt-1">{error.message || "Something went wrong."}</p>
      <button onClick={() => reset()} className="btn-outline mt-3">
        Try again
      </button>
    </div>
  );
}
