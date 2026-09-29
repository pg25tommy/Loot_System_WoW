// Posts confirmed loot results to a Discord channel via an incoming webhook
// (DISCORD_LOOT_WEBHOOK_URL). A no-op when the var isn't set, so local dev and
// tests never post. Failures are logged and swallowed — Discord being down
// must never affect recording a drop.
import { prisma } from "@/lib/db";
import { trackLabel } from "@/lib/trackLabels";
import { dropResolutionLabel } from "@/lib/dropResolutionLabels";
import type { LootResolutionPlan } from "@/lib/rules/lootResolution";
import type { Track } from "@/generated/prisma/client";

// Same grouping as the ResolutionMethodBadge colors (see dropResolutionLabels.ts).
const METHOD_COLORS: Record<string, number> = {
  BRACKET_OUTRIGHT: 0x6bc96f,
  TIEBREAK_BLOCKED_COUNT: 0x5aa8e8,
  TIEBREAK_ROLL: 0xb487ea,
  TANK_PRIORITY: 0xe2933a,
  TIEBREAK_TANK_AUTOWIN: 0xe2933a,
};

function siteUrl(path: string): string | undefined {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : undefined;
}

export async function postLootResultToDiscord(
  plan: LootResolutionPlan,
  context: { itemId: string; track: Track; raidDate: string; droppedFrom?: string },
): Promise<void> {
  const webhookUrl = process.env.DISCORD_LOOT_WEBHOOK_URL?.trim();
  if (!webhookUrl || !plan.winnerCharacterId || !plan.method) return;

  try {
    const item = await prisma.item.findUnique({ where: { id: context.itemId }, select: { name: true } });
    const winnerUrl = siteUrl(`/characters/${plan.winnerCharacterId}`);
    const winner = winnerUrl ? `[${plan.winnerCharacterName}](${winnerUrl})` : plan.winnerCharacterName;

    const fields = [
      { name: "Winner", value: `**${winner}**${plan.winnerCharacterClass ? ` (${plan.winnerCharacterClass})` : ""}`, inline: true },
      { name: "Method", value: dropResolutionLabel(plan.method), inline: true },
      { name: "Bracket", value: `${plan.bracket ?? "—"} · ${trackLabel(context.track)}`, inline: true },
    ];

    if (plan.allBracketCandidates.length > 0) {
      fields.push({
        name: "Competing bidders",
        value: plan.allBracketCandidates
          .map(({ bracket, candidates }) => `B${bracket}: ${candidates.map((c) => c.characterName).join(", ")}`)
          .join("\n")
          .slice(0, 1024),
        inline: false,
      });
    }

    const footer = [context.droppedFrom ? `Dropped from ${context.droppedFrom}` : null, context.raidDate]
      .filter(Boolean)
      .join(" · ");

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: item?.name ?? "Loot drop",
            url: siteUrl(`/items/${context.itemId}`),
            description: plan.resolutionSummary ?? undefined,
            color: METHOD_COLORS[plan.method] ?? 0x9d9d9d,
            fields,
            footer: { text: footer },
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}
