import { prisma } from "@/lib/db";
import { BidStatus, Track } from "@/generated/prisma/client";

export async function makeRankTier(overrides: Partial<Parameters<typeof prisma.rankTier.create>[0]["data"]> = {}) {
  return prisma.rankTier.create({
    data: {
      name: overrides.name ?? `Raider-${Math.random()}`,
      sortOrder: overrides.sortOrder ?? Math.floor(Math.random() * 100000),
      isLootEligible: true,
      attendanceRequirementPct: 0.8,
      ...overrides,
    },
  });
}

export async function makePhase(overrides: Partial<Parameters<typeof prisma.phase.create>[0]["data"]> = {}) {
  return prisma.phase.create({
    data: {
      name: overrides.name ?? `Phase-${Math.random()}`,
      isActive: true,
      ...overrides,
    },
  });
}

export async function makeCharacter(input: {
  rankTierId: string;
  name?: string;
  joinedAt?: Date;
}) {
  return prisma.character.create({
    data: {
      name: input.name ?? `Char-${Math.random()}`,
      class: "Warrior",
      spec: "Protection",
      rankTierId: input.rankTierId,
      joinedAt: input.joinedAt ?? new Date("2020-01-01"),
    },
  });
}

export async function makeOfficer(overrides: Partial<Parameters<typeof prisma.officer.create>[0]["data"]> = {}) {
  return prisma.officer.create({
    data: {
      username: overrides.username ?? `officer-${Math.random()}`,
      passwordHash: overrides.passwordHash ?? "test-hash",
      displayName: overrides.displayName ?? "Test Officer",
      ...overrides,
    },
  });
}

export async function makeItem(overrides: Partial<Parameters<typeof prisma.item.create>[0]["data"]> = {}) {
  return prisma.item.create({
    data: {
      name: overrides.name ?? `Item-${Math.random()}`,
      slot: "Chest",
      ...overrides,
    },
  });
}

export async function makeBidSlot(input: {
  characterId: string;
  phaseId: string;
  track: Track;
  bracket: number;
  slotIndex?: number;
  itemId?: string;
  status?: BidStatus;
}) {
  return prisma.bidSlot.create({
    data: {
      characterId: input.characterId,
      phaseId: input.phaseId,
      track: input.track,
      bracket: input.bracket,
      slotIndex: input.slotIndex ?? 0,
      itemId: input.itemId,
      status: input.status ?? (input.itemId ? BidStatus.ACTIVE : BidStatus.EMPTY),
    },
  });
}
