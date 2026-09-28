-- CreateEnum
CREATE TYPE "Track" AS ENUM ('LEGACY', 'NON_LEGACY');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('EMPTY', 'ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DropResolutionMethod" AS ENUM ('BRACKET_OUTRIGHT', 'TANK_PRIORITY', 'TIEBREAK_BLOCKED_COUNT', 'TIEBREAK_ROLL', 'TIEBREAK_TANK_AUTOWIN', 'OPEN_ROLL_MS_OS', 'OPEN_ROLL_BOP', 'PASS_CHAIN_ROLL', 'DISENCHANT', 'SOLD', 'GATHERABLE_BID', 'RECIPE_OFFICER_AWARD', 'RECIPE_LOOTLIST', 'WORLD_BOSS_OPEN_ROLL', 'CRAFTED_BOE_QUEUE');

-- CreateEnum
CREATE TYPE "SpecPriority" AS ENUM ('MAIN_SPEC', 'OFF_SPEC', 'ALT_MAIN_SPEC', 'ALT_OFF_SPEC');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED', 'FREE_HOLIDAY');

-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('PENDING', 'RESOLVED', 'VOID');

-- CreateEnum
CREATE TYPE "PassDecision" AS ENUM ('PASSED', 'KEPT', 'TRADED');

-- CreateEnum
CREATE TYPE "RollType" AS ENUM ('OPEN_BOP', 'MS_OS_PUG', 'PASS_CHAIN');

-- CreateEnum
CREATE TYPE "WorldBossIntent" AS ENUM ('NEED', 'GREED', 'PASS');

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isTankOfficer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isLootEligible" BOOLEAN NOT NULL DEFAULT true,
    "attendanceRequirementPct" DOUBLE PRECISION,
    "bonusBidEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isFirstPhase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketConfig" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "bracket" INTEGER NOT NULL,
    "slotCount" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "BracketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatherableValueBracket" (
    "id" TEXT NOT NULL,
    "minGold" INTEGER NOT NULL,
    "maxGold" INTEGER,
    "bracket" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GatherableValueBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT,
    "class" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "isAlt" BOOLEAN NOT NULL DEFAULT false,
    "mainCharacterId" TEXT,
    "rankTierId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialWeekEndsAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wowheadId" INTEGER,
    "slot" TEXT,
    "itemLevel" INTEGER,
    "isCraftedBoE" BOOLEAN NOT NULL DEFAULT false,
    "isRecipe" BOOLEAN NOT NULL DEFAULT false,
    "recipeOutputIsBoE" BOOLEAN,
    "isBoP" BOOLEAN NOT NULL DEFAULT true,
    "sourceRaid" TEXT,
    "sourceBoss" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidSlot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "bracket" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "itemId" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'EMPTY',
    "pendingItemId" TEXT,
    "becomesActiveAt" TIMESTAMP(3),
    "specPriority" "SpecPriority",
    "blockedAt" TIMESTAMP(3),
    "blockedByDropId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootDrop" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "raidDate" TIMESTAMP(3) NOT NULL,
    "droppedFrom" TEXT,
    "winnerCharacterId" TEXT,
    "resolutionMethod" "DropResolutionMethod",
    "winningBracket" INTEGER,
    "resolvedBidSlotId" TEXT,
    "resolvedByOfficerId" TEXT,
    "tankPriorityUsed" BOOLEAN NOT NULL DEFAULT false,
    "tankAutoTiebreakUsed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "DropStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "LootDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassRecord" (
    "id" TEXT NOT NULL,
    "dropId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "decision" "PassDecision" NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenRollLog" (
    "id" TEXT NOT NULL,
    "dropId" TEXT,
    "rollType" "RollType" NOT NULL,
    "winnerRoll" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenRollLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenRollParticipant" (
    "id" TEXT NOT NULL,
    "openRollId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "rollValue" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpenRollParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldBossRollLog" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "raidDate" TIMESTAMP(3) NOT NULL,
    "winnerCharacterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldBossRollLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldBossRollParticipant" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "intent" "WorldBossIntent" NOT NULL,
    "rollValue" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorldBossRollParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "raidDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "postedInAdvance" BOOLEAN NOT NULL DEFAULT false,
    "missedFullWeek" BOOLEAN NOT NULL DEFAULT false,
    "recordedByOfficerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Officer_username_key" ON "Officer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "RankTier_name_key" ON "RankTier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RankTier_sortOrder_key" ON "RankTier"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_name_key" ON "Phase"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BracketConfig_phaseId_track_bracket_key" ON "BracketConfig"("phaseId", "track", "bracket");

-- CreateIndex
CREATE UNIQUE INDEX "GatherableValueBracket_minGold_maxGold_key" ON "GatherableValueBracket"("minGold", "maxGold");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_server_key" ON "Character"("name", "server");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BidSlot_blockedByDropId_key" ON "BidSlot"("blockedByDropId");

-- CreateIndex
CREATE INDEX "BidSlot_itemId_idx" ON "BidSlot"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "BidSlot_characterId_phaseId_track_bracket_slotIndex_key" ON "BidSlot"("characterId", "phaseId", "track", "bracket", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LootDrop_resolvedBidSlotId_key" ON "LootDrop"("resolvedBidSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "PassRecord_dropId_sequence_key" ON "PassRecord"("dropId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "OpenRollLog_dropId_key" ON "OpenRollLog"("dropId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenRollParticipant_openRollId_characterId_key" ON "OpenRollParticipant"("openRollId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldBossRollParticipant_logId_characterId_key" ON "WorldBossRollParticipant"("logId", "characterId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_characterId_phaseId_idx" ON "AttendanceRecord"("characterId", "phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_characterId_raidDate_key" ON "AttendanceRecord"("characterId", "raidDate");

-- AddForeignKey
ALTER TABLE "BracketConfig" ADD CONSTRAINT "BracketConfig_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_mainCharacterId_fkey" FOREIGN KEY ("mainCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_rankTierId_fkey" FOREIGN KEY ("rankTierId") REFERENCES "RankTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSlot" ADD CONSTRAINT "BidSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSlot" ADD CONSTRAINT "BidSlot_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSlot" ADD CONSTRAINT "BidSlot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootDrop" ADD CONSTRAINT "LootDrop_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootDrop" ADD CONSTRAINT "LootDrop_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootDrop" ADD CONSTRAINT "LootDrop_winnerCharacterId_fkey" FOREIGN KEY ("winnerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootDrop" ADD CONSTRAINT "LootDrop_resolvedBidSlotId_fkey" FOREIGN KEY ("resolvedBidSlotId") REFERENCES "BidSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LootDrop" ADD CONSTRAINT "LootDrop_resolvedByOfficerId_fkey" FOREIGN KEY ("resolvedByOfficerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassRecord" ADD CONSTRAINT "PassRecord_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "LootDrop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassRecord" ADD CONSTRAINT "PassRecord_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenRollLog" ADD CONSTRAINT "OpenRollLog_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "LootDrop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenRollParticipant" ADD CONSTRAINT "OpenRollParticipant_openRollId_fkey" FOREIGN KEY ("openRollId") REFERENCES "OpenRollLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenRollParticipant" ADD CONSTRAINT "OpenRollParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBossRollLog" ADD CONSTRAINT "WorldBossRollLog_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBossRollParticipant" ADD CONSTRAINT "WorldBossRollParticipant_logId_fkey" FOREIGN KEY ("logId") REFERENCES "WorldBossRollLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBossRollParticipant" ADD CONSTRAINT "WorldBossRollParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedByOfficerId_fkey" FOREIGN KEY ("recordedByOfficerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
