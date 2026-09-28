import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const RANK_TIERS = [
  { name: "Social", sortOrder: 0, isLootEligible: false, attendanceRequirementPct: null, bonusBidEligible: false },
  { name: "Initiate", sortOrder: 1, isLootEligible: true, attendanceRequirementPct: null, bonusBidEligible: false },
  { name: "Raider", sortOrder: 2, isLootEligible: true, attendanceRequirementPct: 0.8, bonusBidEligible: false },
  { name: "Veteran", sortOrder: 3, isLootEligible: true, attendanceRequirementPct: 0.8, bonusBidEligible: true },
  { name: "Officer", sortOrder: 4, isLootEligible: true, attendanceRequirementPct: 0.8, bonusBidEligible: true },
];

// Bracket sizes are ambiguous in the source ruleset (5 odd-valued brackets of
// 3/5/7 can never sum to exactly 30). This taper is a placeholder default —
// edit it for real via /officer/config/brackets before relying on it.
const BRACKET_TAPER = [
  { bracket: 1, slotCount: 3 },
  { bracket: 2, slotCount: 3 },
  { bracket: 3, slotCount: 5 },
  { bracket: 4, slotCount: 5 },
  { bracket: 5, slotCount: 7 },
];

const GATHERABLE_TABLE = [
  { minGold: 1, maxGold: 249, bracket: 5 },
  { minGold: 250, maxGold: 499, bracket: 4 },
  { minGold: 500, maxGold: 999, bracket: 3 },
  { minGold: 1000, maxGold: 1999, bracket: 2 },
  { minGold: 2000, maxGold: null, bracket: 1 },
];

async function main() {
  console.log("Seeding rank tiers...");
  const rankTiers = new Map<string, string>();
  for (const tier of RANK_TIERS) {
    const created = await prisma.rankTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
    rankTiers.set(tier.name, created.id);
  }

  console.log("Seeding initial phase...");
  const phase = await prisma.phase.upsert({
    where: { name: "Phase 1" },
    update: {},
    create: { name: "Phase 1", isActive: true, isFirstPhase: true },
  });

  console.log("Seeding bracket config...");
  for (const track of ["LEGACY", "NON_LEGACY"] as const) {
    for (const { bracket, slotCount } of BRACKET_TAPER) {
      await prisma.bracketConfig.upsert({
        where: { phaseId_track_bracket: { phaseId: phase.id, track, bracket } },
        update: { slotCount },
        create: { phaseId: phase.id, track, bracket, slotCount },
      });
    }
    if (track === "NON_LEGACY") {
      await prisma.bracketConfig.upsert({
        where: { phaseId_track_bracket: { phaseId: phase.id, track, bracket: 0 } },
        update: { slotCount: 1, label: "Bonus bid" },
        create: { phaseId: phase.id, track, bracket: 0, slotCount: 1, label: "Bonus bid" },
      });
    }
  }

  console.log("Seeding gatherable value table...");
  for (const row of GATHERABLE_TABLE) {
    const existing = await prisma.gatherableValueBracket.findFirst({
      where: { minGold: row.minGold, maxGold: row.maxGold },
    });
    if (existing) {
      await prisma.gatherableValueBracket.update({
        where: { id: existing.id },
        data: { bracket: row.bracket },
      });
    } else {
      await prisma.gatherableValueBracket.create({ data: row });
    }
  }

  console.log("Seeding initial officer account...");
  const officerUsername = process.env.SEED_OFFICER_USERNAME;
  const officerPassword = process.env.SEED_OFFICER_PASSWORD;
  if (!officerUsername || !officerPassword) {
    console.warn(
      "SEED_OFFICER_USERNAME / SEED_OFFICER_PASSWORD not set — skipping initial officer account. " +
        "Set them in .env and re-run `npm run db:seed` to create the first login.",
    );
  } else {
    const passwordHash = await bcrypt.hash(officerPassword, 12);
    await prisma.officer.upsert({
      where: { username: officerUsername },
      update: { passwordHash },
      create: {
        username: officerUsername,
        passwordHash,
        displayName: officerUsername,
        isAdmin: true,
        isTankOfficer: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
