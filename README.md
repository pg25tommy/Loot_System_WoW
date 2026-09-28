# BracketKeeper

A guild loot-bid list tracker for World of Warcraft raiding guilds, built around a bracket-based
priority system: every raider gets a fixed number of bid slots split across two tracks and five
priority brackets, and the app handles ranking, tiebreaks, blocking, and every edge case in a
guild's loot ruleset.

**Live demo:** https://wada-guild-loot.vercel.app

## Overview

- **Anyone can browse, read-only, with no account.** Pick a character to see their current bid
  list, blocked slots, and recent wins; browse the item catalog to see who's bidding on what; or
  view the "All Bids" master list — every raider's full sheet in one scrollable table.
- **Officers log in** to build bid lists on members' behalf, resolve loot drops through a guided
  wizard, track attendance, and manage guild configuration.
- The ruleset itself — bracket sizes, rank tiers, gatherable value tables, tank overrides — is
  fully officer-editable, not hardcoded, so the app adapts to a guild's actual rules rather than
  the other way around.

## Features

- **Bracket-based bid resolution.** Ranks eligible bidders by bracket, then walks a strict tiebreak
  chain: fewest currently-blocked slots wins, then new members automatically lose ties, then a
  manual `/roll 100` as a last resort. Every step is shown to the officer before anything is
  confirmed — nothing resolves silently.
- **Tank priority overrides.** A designated tank officer can spend a bracket slot instantly or
  manually decide an otherwise-unresolved tiebreak, both gated behind an explicit confirmation.
- **Passing chains.** When a drop's winner doesn't want it, offer it down the bracket-ordered list
  of remaining bidders until someone keeps it.
- **Open rolls** for un-bid BoP items and pug MS>OS raids, plus dedicated **world boss** Need >
  Greed > Pass rolls.
- **Attendance tracking** with a one-click "mark everyone present" checklist (exceptions handled
  individually), attendance-rate math, and a computed — never automatic — rank-demotion suggestion.
- **Gatherables & recipes**: spend a bid slot on a random drop's gold-value bracket, or award a
  BoE-output recipe by officer discretion.
- **End-of-phase transitions** with a dry-run preview before anything carries over or resets.
- **Full audit trail**: every resolved drop stores a plain-English explanation of how the winner
  was decided, shown publicly on the loot log.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Server Actions)
- [Prisma ORM 7](https://www.prisma.io/) with `@prisma/adapter-pg`
- PostgreSQL
- [NextAuth](https://next-auth.js.org/) (Credentials provider, JWT sessions) for officer login
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) for rule-logic tests

## Getting started

```bash
git clone <this-repo>
cd bracketkeeper
npm install
```

1. **Database.** For local dev, Prisma can run a throwaway local Postgres for you:
   ```bash
   npx prisma dev --name bracketkeeper --detach
   ```
   It prints a `DATABASE_URL` — put it in `.env` (see `.env.example`). Any other Postgres
   connection string (Vercel Postgres, Neon, Supabase, self-hosted) works just as well.

2. **Env vars.** Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — from step 1
   - `NEXTAUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `NEXTAUTH_URL` — `http://localhost:3000` locally
   - `SEED_OFFICER_USERNAME` / `SEED_OFFICER_PASSWORD` — credentials for the first officer login

3. **Migrate and seed:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   Seeding creates a rank tier ladder, one active phase, a placeholder bracket-size config, the
   gatherable gold-value table, and the first officer account.

4. **Run it:**
   ```bash
   npm run dev
   ```
   Sign in at `/officer/login`.

## Configuring a new guild's rules

Before handing this to real officers, set up:

- **Bracket sizes** (`/officer/config/brackets`) — the seeded default is a placeholder; set the
  real slot count per bracket per track.
- **Rank tiers** (`/officer/config/rank-tiers`) — rename/reorder to match the guild's actual ranks
  and attendance requirements.
- **Officers** (`/officer/config/officers`, admin only) — add real officer accounts. Only the
  original admin account can manage other officers' roles.

## Testing

```bash
npm test
```

Runs Vitest against the rule-logic layer (`src/lib/rules/**`): bracket ranking, the full tiebreak
chain, tank overrides, attendance math, gatherable value boundaries, and phase-transition
carry/clear correctness.

> **Warning:** these tests truncate every table in whatever database `DATABASE_URL` points at
> before each run. Always point it at a throwaway/local database. If you run them against your
> local dev database, re-run `npm run db:seed` afterward to restore the config data.

## Deploying

This app is stateless aside from Postgres, so it deploys cleanly to Vercel (or any Node host):

1. Connect the repo to a Vercel project.
2. Add a Postgres integration and set `DATABASE_URL` (or let a marketplace integration's prefixed
   env vars resolve automatically — see `src/lib/db.ts`), plus `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.
3. `prisma generate` runs automatically via `postinstall`. Migrations run automatically on every
   deploy via the configured build command (`scripts/vercel-build.mjs`).
4. Run `npm run db:seed` once against the production database to create the initial config and
   first officer login.

**Note:** the build command deliberately runs `prisma migrate deploy` on every deploy but
**never** re-runs the seed script automatically — the seed script upserts default config values,
which would silently overwrite anything officers have since customized through the UI.

## Project structure

```
src/
  app/                  Routes (App Router) — public pages + /officer/** (auth-gated)
  components/           React components, split into ui/, loot/, officer/
  lib/
    rules/              Pure(ish) rule logic — one file per ruleset area, fully unit-tested
    actions/            Server Actions — thin auth + validation wrappers around rules/
    auth/               NextAuth config and session helpers
  generated/prisma/     Generated Prisma Client (not hand-edited)
prisma/
  schema.prisma         Data model
  migrations/           SQL migrations
  seed.ts               One-time config + first-officer seed script
```

## Out of scope (for now)

Discord bot integration, Wowhead/Battle.net API lookups, a member-facing bid submission portal,
multi-guild support, and cron-driven weekly auto-resets (mid-week bid changes apply lazily on the
next read/write instead of on a schedule).
