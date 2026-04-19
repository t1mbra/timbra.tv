import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";
import {
  getGuildResourcesCached,
  setGuildResourcesCached,
} from "@/lib/guildResourcesCache";

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
  color?: number;
};

type DiscordEmoji = {
  id: string | null;
  name: string | null;
  animated?: boolean;
};

const ALLOWED_CHANNEL_TYPES = new Set([0, 5, 15, 16]);
const RESOURCE_TIMEOUT_MS = 10_000;
/** Отдельные запросы каналов/ролей/эмодзи — без многочисленных ретраев, чтобы не раздувать время ответа */
const RESOURCE_MAX_RETRIES = 0;

function buildEmojiMention(emoji: DiscordEmoji) {
  if (!emoji.id || !emoji.name) return emoji.name ?? "";
  return emoji.animated
    ? `<a:${emoji.name}:${emoji.id}>`
    : `<:${emoji.name}:${emoji.id}>`;
}

async function fetchUserGuilds(accessToken: string, guildId: string) {
  const t0 = Date.now();
  try {
    const res = await discordFetch("/users/@me/guilds?limit=200", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeoutMs: RESOURCE_TIMEOUT_MS,
      maxRetries: 1,
    });
    const durationMs = Date.now() - t0;
    console.log(
      `[guild-resources] guildId=${guildId} step=user_guilds durationMs=${durationMs} status=${res.status}`
    );
    return res;
  } catch (err) {
    const durationMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      `[guild-resources] guildId=${guildId} step=user_guilds durationMs=${durationMs} status=error error=${msg}`
    );
    throw err;
  }
}

type ResourceName = "channels" | "roles" | "emojis";

async function fetchBotResourceArray<T>(
  guildId: string,
  label: ResourceName,
  path: string,
  botHeaders: Record<string, string>
): Promise<{
  ok: boolean;
  data: T[];
  error?: string;
  status: number | null;
  durationMs: number;
}> {
  const t0 = Date.now();
  try {
    const res = await discordFetch(path, {
      headers: botHeaders,
      timeoutMs: RESOURCE_TIMEOUT_MS,
      maxRetries: RESOURCE_MAX_RETRIES,
    });
    const durationMs = Date.now() - t0;
    if (!res.ok) {
      const snippet = (await res.text().catch(() => "")).slice(0, 240);
      const errMsg = `HTTP ${res.status}${snippet ? ` ${snippet}` : ""}`;
      console.log(
        `[guild-resources] guildId=${guildId} resource=${label} durationMs=${durationMs} status=${res.status} count=0 error=${errMsg}`
      );
      return {
        ok: false,
        data: [],
        error: errMsg,
        status: res.status,
        durationMs,
      };
    }
    const raw = (await res.json()) as unknown;
    const data = Array.isArray(raw) ? (raw as T[]) : [];
    console.log(
      `[guild-resources] guildId=${guildId} resource=${label} durationMs=${durationMs} status=${res.status} count=${data.length}`
    );
    return { ok: true, data, status: res.status, durationMs };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      `[guild-resources] guildId=${guildId} resource=${label} durationMs=${durationMs} status=error count=0 error=${msg}`
    );
    return {
      ok: false,
      data: [],
      error: msg,
      status: null,
      durationMs,
    };
  }
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

  const cached = getGuildResourcesCached(guildId);
  if (cached) {
    console.log(`[guild-resources] guildId=${guildId} cache=hit`);
    return NextResponse.json(cached);
  }

  let guildsRes: Response;
  try {
    guildsRes = await fetchUserGuilds(accessToken, guildId);
  } catch {
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

  const [channelsR, rolesR, emojisR] = await Promise.all([
    fetchBotResourceArray<DiscordChannel>(
      guildId,
      "channels",
      `/guilds/${guildId}/channels`,
      botHeaders
    ),
    fetchBotResourceArray<DiscordRole>(
      guildId,
      "roles",
      `/guilds/${guildId}/roles`,
      botHeaders
    ),
    fetchBotResourceArray<DiscordEmoji>(
      guildId,
      "emojis",
      `/guilds/${guildId}/emojis`,
      botHeaders
    ),
  ]);

  const channels = channelsR.ok
    ? channelsR.data
        .filter(
          (channel) =>
            channel.name && ALLOWED_CHANNEL_TYPES.has(channel.type)
        )
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((channel) => ({
          id: channel.id,
          name: channel.name!,
          type: channel.type,
          parentId: channel.parent_id ?? null,
          mention: `<#${channel.id}>`,
        }))
    : [];

  const roles = rolesR.ok
    ? rolesR.data
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
        })
    : [];

  const emojis = emojisR.ok
    ? emojisR.data
        .filter((emoji) => emoji.name)
        .map((emoji) => ({
          id: emoji.id,
          name: emoji.name!,
          animated: emoji.animated ?? false,
          mention: buildEmojiMention(emoji),
        }))
    : [];

  const errors: {
    channels?: string;
    roles?: string;
    emojis?: string;
  } = {};

  if (!channelsR.ok && channelsR.error) {
    errors.channels = channelsR.error;
  }
  if (!rolesR.ok && rolesR.error) {
    errors.roles = rolesR.error;
  }
  if (!emojisR.ok && emojisR.error) {
    errors.emojis = emojisR.error;
  }

  const payload: Record<string, unknown> = {
    channels,
    roles,
    emojis,
  };

  if (Object.keys(errors).length > 0) {
    payload.errors = errors;
  }

  if (channelsR.ok || rolesR.ok || emojisR.ok) {
    setGuildResourcesCached(guildId, payload);
  }

  return NextResponse.json(payload);
}
