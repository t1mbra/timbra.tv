import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";

type DiscordGuild = {
  id: string;
  name: string;
};

type DiscordChannel = {
  id: string;
  name?: string | null;
  type: number;
  position?: number;
  parent_id?: string | null;
};

type DiscordRole = {
  id: string;
  name: string;
  position?: number;
  managed?: boolean;
  /** Integer color from Discord (0 = default / no color) */
  color?: number;
};

type DiscordEmoji = {
  id: string | null;
  name: string | null;
  animated?: boolean;
};

const ALLOWED_CHANNEL_TYPES = new Set([0, 5, 15, 16]);

function buildEmojiMention(emoji: DiscordEmoji) {
  if (!emoji.id || !emoji.name) return emoji.name ?? "";
  return emoji.animated
    ? `<a:${emoji.name}:${emoji.id}>`
    : `<:${emoji.name}:${emoji.id}>`;
}

async function fetchGuildsForUser(accessToken: string) {
  return discordFetch("/users/@me/guilds?limit=200", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await context.params;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!botToken) {
    return NextResponse.json(
      { error: "Missing DISCORD_BOT_TOKEN" },
      { status: 500 }
    );
  }

  let guildsRes: Response;
  try {
    guildsRes = await fetchGuildsForUser(accessToken);
  } catch (err) {
    console.error("[resources] guilds list fetch failed:", err);
    return NextResponse.json(
      { error: "Discord временно недоступен. Попробуйте ещё раз." },
      { status: 503 }
    );
  }

  if (!guildsRes.ok) {
    const details = await guildsRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to validate user guild access", details },
      { status: guildsRes.status >= 500 ? 502 : 500 }
    );
  }

  const userGuilds = (await guildsRes.json()) as DiscordGuild[];
  const hasAccess = userGuilds.some((guild) => guild.id === guildId);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Guild not available for this user" },
      { status: 403 }
    );
  }

  const botHeaders = { Authorization: `Bot ${botToken}` };

  const [channelsOutcome, rolesOutcome, emojisOutcome] = await Promise.allSettled([
    discordFetch(`/guilds/${guildId}/channels`, { headers: botHeaders }),
    discordFetch(`/guilds/${guildId}/roles`, { headers: botHeaders }),
    discordFetch(`/guilds/${guildId}/emojis`, { headers: botHeaders }),
  ]);

  if (channelsOutcome.status === "rejected") {
    console.error("[resources] channels fetch failed:", channelsOutcome.reason);
    return NextResponse.json(
      {
        error:
          "Не удалось загрузить каналы (сеть или Discord). Обновите страницу.",
      },
      { status: 503 }
    );
  }

  if (rolesOutcome.status === "rejected") {
    console.error("[resources] roles fetch failed:", rolesOutcome.reason);
    return NextResponse.json(
      {
        error:
          "Не удалось загрузить роли (сеть или Discord). Обновите страницу.",
      },
      { status: 503 }
    );
  }

  const channelsResponse = channelsOutcome.value;
  const rolesResponse = rolesOutcome.value;
  const emojisResponse =
    emojisOutcome.status === "fulfilled" ? emojisOutcome.value : null;

  if (!channelsResponse.ok || !rolesResponse.ok) {
    const channelsDetails = await channelsResponse.text().catch(() => "");
    const rolesDetails = await rolesResponse.text().catch(() => "");

    return NextResponse.json(
      {
        error:
          "Бот не может получить каналы или роли этого сервера. Проверь, добавлен ли бот на сервер.",
        channelsStatus: channelsResponse.status,
        rolesStatus: rolesResponse.status,
        channelsDetails,
        rolesDetails,
      },
      { status: 403 }
    );
  }

  const channels = (await channelsResponse.json()) as DiscordChannel[];
  const roles = (await rolesResponse.json()) as DiscordRole[];

  let emojis: DiscordEmoji[] = [];
  const warnings: string[] = [];

  if (emojisOutcome.status === "rejected") {
    warnings.push("Не удалось загрузить эмоджи сервера");
  } else if (emojisResponse) {
    if (emojisResponse.ok) {
      emojis = (await emojisResponse.json()) as DiscordEmoji[];
    } else {
      warnings.push("Не удалось загрузить эмоджи сервера");
    }
  } else {
    warnings.push("Не удалось загрузить эмоджи сервера");
  }

  return NextResponse.json({
    channels: channels
      .filter((channel) => channel.name && ALLOWED_CHANNEL_TYPES.has(channel.type))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((channel) => ({
        id: channel.id,
        name: channel.name!,
        type: channel.type,
        parentId: channel.parent_id ?? null,
        mention: `<#${channel.id}>`,
      })),

    roles: roles
      .filter((role) => role.name !== "@everyone" && !role.managed)
      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
      .map((role) => {
        const raw = role.color;
        const color =
          typeof raw === "number" && !Number.isNaN(raw)
            ? raw
            : typeof raw === "string"
              ? parseInt(raw, 10) || 0
              : 0;
        return {
          id: role.id,
          name: role.name,
          managed: role.managed ?? false,
          mention: `<@&${role.id}>`,
          color,
        };
      }),

    emojis: emojis
      .filter((emoji) => emoji.name)
      .map((emoji) => ({
        id: emoji.id,
        name: emoji.name!,
        animated: emoji.animated ?? false,
        mention: buildEmojiMention(emoji),
      })),

    warnings,
  });
}
