@AGENTS.md

# BracketKeeper — project context

Guild loot-bid tracker for a WoW guild. Implements a specific ruleset (30 bid slots per
character, split across two tracks and five priority brackets) that used to be tracked manually.
Public pages are read-only (no member login); officers authenticate to manage everything else.

Full setup/deploy instructions live in `README.md` — this file is about *why* things are built the
way they are, so future work doesn't re-litigate settled decisions or re-break fixed bugs.

## Ruleset model

- **Tracks**: two per character, stored as the `Track` enum `LEGACY` / `NON_LEGACY`, but
  user-facing labels are **"Current Tier" / "Legacy"** respectively — the enum names are historical
  and intentionally don't match the display labels. Always go through `src/lib/trackLabels.ts`
  (`trackLabel()`) to render a track name; never hardcode "Legacy"/"Non-Legacy" strings in UI.
- **Brackets**: 1 (best) through 5, configurable slot counts per bracket/track/phase via
  `BracketConfig` (`/officer/config/brackets`). The source doc's bracket sizes don't sum to exactly
  30, so the seeded values are an editable placeholder, not gospel.
- **Tiebreak order** (`src/lib/rules/lootResolution.ts`): lowest bracket wins outright → if tied,
  fewest currently-blocked slots in that bracket wins → if still tied, Initiates auto-lose the tie
  → if still tied, manual `/roll 100` (highest wins, officer records it). A Tank officer can also
  short-circuit with an instant tank-priority claim or manually pick the tank-auto-tiebreak winner —
  both are used sparingly per the ruleset and always require an explicit officer confirm.
- Every discretionary/irreversible action (tank overrides, rank demotions, phase transitions) is a
  **compute-then-confirm** pair — nothing auto-applies without an officer clicking confirm.

## Architecture notes

- **Prisma v7** with the new `prisma-client` TS generator (not `prisma-client-js`) and
  `prisma.config.ts` (replaces the old schema-only config). Uses `@prisma/adapter-pg` — the Neon
  serverless adapter (`@prisma/adapter-neon`) was tried and reverted after measuring it made warm
  request TTFB *worse* (~300ms vs ~200ms), not better. Don't re-introduce it without re-measuring.
- **`src/lib/db.ts`** resolves `DATABASE_URL` from either a plain env var or a project-prefixed
  Vercel/Neon marketplace var (e.g. `wadaloot_POSTGRES_PRISMA_URL`) — `prisma.config.ts` does the
  same scan for `prisma migrate`/`generate`, deliberately avoiding Prisma's strict `env()` helper
  (which throws if the literal key isn't present, breaking `postinstall` on Vercel).
- **`scripts/vercel-build.mjs`** (the Vercel build command) runs `prisma migrate deploy` on every
  deploy but **deliberately does not run `prisma/seed.ts`** — seeding upserts hardcoded
  BracketConfig/RankTier/GatherableValueBracket defaults, which was silently reverting officers'
  in-UI config edits on every deploy. Seeding is manual/one-time now (`npm run db:seed`).
- **Client components importing Prisma enums** must import from `@/generated/prisma/enums`, not
  `@/generated/prisma/client` — the latter pulls in the full Prisma runtime + Node builtins and
  breaks Turbopack's client bundling (`the chunking context does not support external modules`).
- **Tailwind v4 cascade layers**: unlayered CSS always beats layered CSS regardless of source order.
  All base element selectors (`*`, `body`, `a`, headings) in `globals.css` must live inside
  `@layer base { ... }` or they'll silently override `@layer components` classes like `.btn`
  (this caused an invisible orange-on-orange button text bug once — don't add unlayered base rules).
  Component classes (`.panel`, `.btn`, `.input`, `.badge-*`, `.bracket-row*`, etc.) live in
  `@layer components`; prefer adding to that layer over ad hoc Tailwind utility classes for anything
  reused more than once, since arbitrary-value utilities referencing the custom CSS vars
  (e.g. `bg-panel-alt`) aren't defined in the `@theme` block and silently no-op.
- **No GitHub remote** — this project deploys straight from the local working tree via
  `vercel --prod --yes` (no `gh` CLI available when this was set up). There is currently **no git
  history at all** (the repo has never been committed) — treat `git status`'s giant diff as the
  entire project, not a partial change.
- **Officer permissions**: only the single admin account can add, remove,
  or change roles on other officer accounts (`requireAdmin()`-gated actions in
  `src/lib/actions/config.ts`), and it's blocked from demoting/deleting itself.
- **Rule logic lives in `src/lib/rules/*.ts`** — pure(ish), DB-backed but UI-independent, one file
  per ruleset area (`bidding`, `lootResolution`, `passing`, `openRoll`, `worldBoss`, `attendance`,
  `newMembers`, `gatherables`, `recipes`, `phaseTransition`, `bracketSync`). Server Actions in
  `src/lib/actions/*.ts` are thin wrappers that add `requireOfficer()`/`requireAdmin()` auth and
  `revalidatePath()` calls around these.
- **Class/spec metadata** (`src/lib/wowClasses.ts`): 9 classic WoW classes, official Blizzard hex
  colors, Wowhead CDN icons. `<ClassIcon className={character.class} />` (confusingly, the prop is
  named `className` but holds the WoW class string, not a CSS class) + `classColor()` is the
  established pattern for showing a character name color-coded with its class icon — used on the
  roster, loot log, officer dashboard, and the resolve wizard.

## Verification pattern used for every change

1. `npx tsc --noEmit` (type-check)
2. `npx vitest run` (rule-logic tests against a local `prisma dev` throwaway Postgres — these
   **truncate all tables**, never point `DATABASE_URL` at real data when running them)
3. `npm run build`
4. `vercel --prod --yes` to deploy
5. A throwaway Playwright script (scratchpad dir) logs in as the admin officer via a
   fetch-then-cookie-injection pattern against `/api/auth/callback/credentials` (UI-driven login is
   flaky in local dev only, due to an unrelated Turbopack dev-mode bug — production login is fine)
   and screenshots the changed screen to confirm it actually works live, not just that it built.

---

# Changelog

## Recent loot list: class-colored names
Character names throughout the resolve-drop wizard (tied-candidate roll list, tank pickers, the
winner line, and the competing-bidders-by-bracket breakdown) now render with their class icon and
class color via `<ClassIcon>` + `classColor()`, matching the convention used elsewhere in the app.

## Recent loot list: readable resolution methods
Added `src/lib/dropResolutionLabels.ts` mapping the 15 `DropResolutionMethod` enum values to plain
labels ("Bracket win" instead of `BRACKET_OUTRIGHT`, etc.) and a color grouping — green for a
straightforward bracket win, blue/purple for the two tiebreak paths, orange for tank/officer
overrides, gray for open rolls/disenchants/sells. New `ResolutionMethodBadge` component replaces
raw-enum `StatusBadge` usage on the home page loot feed, item pages, character pages, the officer
dashboard, and the drop detail page.

## Resolve wizard: full competing-bidders breakdown
`resolveLootDrop()` and friends (`lootResolution.ts`) now return `allBracketCandidates` (every
bracket with an eligible bidder for the item, not just the winning one) and a `resolutionSummary`
plain-English description of how the winner was decided (e.g. "X won bracket 1 with the fewest
blocked slots (0) among 2 tied bidders"). The resolve wizard shows this breakdown with the winning
bracket highlighted and the winner's name bolded everywhere they appear, both on final results and
while a roll is still pending.

## Bulk attendance marking
Added `markAllPresentAction` — marks every active character PRESENT for a raid date in one
transaction. The attendance page now shows "1. Mark everyone present" (bulk) above the original
per-character exception form, so officers log the whole raid in one click and only handle the few
absentees individually afterward.

## Visual redesign to a modern dark theme
Full theme pass matching wowforevertalent.com's look: dark palette with CSS custom properties,
class icons (Wowhead CDN) and Blizzard class colors throughout, a redesigned officer sidebar/header
with icon nav, and a lettermark logo swap (the original solid-orange "B" badge read too much like
a certain adult site's logo). Renamed the app "BracketKeeper" and the public "Characters" nav tab to
"Roster". Renamed the Legacy/Non-Legacy track labels to "Current Tier"/"Legacy" in display only
(`trackLabels.ts`) — the underlying `Track` enum values are unchanged.

## Officer permissions
Only the admin account can add, remove, or change other officers' roles; self-demotion and
self-deletion are blocked in the server action.

## Performance pass
Parallelized independent Prisma queries with `Promise.all` across the home page, character/item
detail pages, and attendance pages. Investigated perceived slowness — root-caused to normal
serverless cold starts, mitigated with Vercel Fluid Compute (`fluid: true` in `vercel.json`) rather
than a Pro plan upgrade (which wouldn't have fixed the actual cause).

## Deployment: Vercel + Neon marketplace Postgres
Moved off the initial Vercel Postgres provisioning onto the Neon marketplace integration. Wrote a
custom env-var resolver (`resolveDatabaseUrl()` in `src/lib/db.ts` and `prisma.config.ts`) since
Neon's marketplace vars are project-prefixed and Prisma's `env()` helper requires an exact literal
key. Fixed a production login bug caused by a trailing newline baked into env vars set via
`echo | vercel env add` (switched to `printf '%s' | vercel env add`).

## Core build
Initial implementation of the full ruleset: data model (`prisma/schema.prisma`), officer auth
(NextAuth Credentials + JWT sessions, middleware-gated `/officer/**`), the guided loot-resolution
wizard with the full tiebreak chain, passing chains, open rolls, world boss rolls, gatherables,
recipes, attendance/rank tracking, and end-of-phase transitions. Seeded with realistic multi-scenario
test data (10 characters × 2 tracks × all bracket slots filled, including deliberate item overlaps)
to exercise every tiebreak path.
