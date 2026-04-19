import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";
import { readBotConnectedGuildIds } from "@/lib/readBotConnectedGuildIds";

type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

const ADMINISTRATOR_PERMISSION = BigInt("0x0000000000000008");

function buildGuildIconUrl(guildId: string, icon?: string | null) {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=128`;
}

function hasAdministratorPermission(permissions?: string) {
  if (!permissions) return false;
  try {
    const value = BigInt(permissions);
    return (value & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
  } catch {
    return false;
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
      {
        guildId,
        botConnected: false,
        presence: "unknown" as const,
        message: "Сервер не настроен: отсутствует DISCORD_BOT_TOKEN",
      },
      { status: 200 }
    );
  }

  let guildsRes: Response;
  try {
    guildsRes = await discordFetch("/users/@me/guilds?limit=200", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("[connection] user guilds fetch failed:", err);
    return NextResponse.json(
      { error: "Discord временно недоступен. Попробуйте ещё раз." },
      { status: 503 }
    );
  }

  if (!guildsRes.ok) {
    const details = await guildsRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Не удалось проверить доступ к серверу", details },
      { status: guildsRes.status >= 500 ? 502 : 500 }
    );
  }

  const userGuilds = (await guildsRes.json()) as DiscordGuild[];
  const guildMeta = userGuilds.find((g) => g.id === guildId);
  const allowed =
    guildMeta &&
    (guildMeta.owner === true || hasAdministratorPermission(guildMeta.permissions));

  if (!allowed || !guildMeta) {
    return NextResponse.json({ error: "Guild not available for this user" }, { status: 403 });
  }

  const guildName = guildMeta.name;
  const guildIconUrl = buildGuildIconUrl(guildId, guildMeta.icon ?? null);

  const botStateIds = await readBotConnectedGuildIds();
  if (botStateIds.has(guildId)) {
    return NextResponse.json({
      guildId,
      guildName,
      guildIconUrl,
      botConnected: true,
      presence: "member" as const,
    });
  }

  let botGuildRes: Response;
  try {
    botGuildRes = await discordFetch(`/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
  } catch (err) {
    console.error("[connection] bot guild fetch failed:", err);
    return NextResponse.json(
      {
        guildId,
        guildName,
        guildIconUrl,
        botConnected: false,
        presence: "unknown" as const,
        message: "Не удалось проверить подключение бота (сеть или Discord)",
      },
      { status: 200 }
    );
  }

  if (botGuildRes.ok) {
    return NextResponse.json({
      guildId,
      guildName,
      guildIconUrl,
      botConnected: true,
      presence: "member" as const,
    });
  }

  if (botGuildRes.status === 404) {
    return NextResponse.json({
      guildId,
      guildName,
      guildIconUrl,
      botConnected: false,
      presence: "not_in_guild" as const,
      message: "Бот не состоит на этом сервере",
    });
  }

  const errText = await botGuildRes.text().catch(() => "");
  console.warn(
    "[connection] bot GET /guilds unexpected status:",
    botGuildRes.status,
    errText.slice(0, 200)
  );

  return NextResponse.json({
    guildId,
    guildName,
    guildIconUrl,
    botConnected: false,
    presence: "unknown" as const,
    message: "Бот не может получить доступ к этому серверу",
  });
}
