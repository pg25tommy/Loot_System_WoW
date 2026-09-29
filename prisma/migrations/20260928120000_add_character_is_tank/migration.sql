-- AlterTable
ALTER TABLE "Character" ADD COLUMN "isTank" BOOLEAN NOT NULL DEFAULT false;

-- Start existing tank-spec characters as tanks; officers adjust from /officer/config/tanks.
UPDATE "Character" SET "isTank" = true
WHERE ("class" IN ('Warrior', 'Paladin') AND "spec" = 'Protection')
   OR ("class" = 'Druid' AND "spec" = 'Feral Combat');
