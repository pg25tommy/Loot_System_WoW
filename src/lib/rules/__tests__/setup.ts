import "dotenv/config";
import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

// Wipes all app tables between tests so each test starts from a clean slate.
// Runs against the local Prisma dev database (see DATABASE_URL in .env) —
// never point this at a production database.
beforeEach(async () => {
  await prisma.$transaction([
    prisma.passRecord.deleteMany(),
    prisma.openRollParticipant.deleteMany(),
    prisma.openRollLog.deleteMany(),
    prisma.worldBossRollParticipant.deleteMany(),
    prisma.worldBossRollLog.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.lootDrop.deleteMany(),
    prisma.bidSlot.deleteMany(),
    prisma.item.deleteMany(),
    prisma.character.deleteMany(),
    prisma.bracketConfig.deleteMany(),
    prisma.phase.deleteMany(),
    prisma.gatherableValueBracket.deleteMany(),
    prisma.rankTier.deleteMany(),
    prisma.officer.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
