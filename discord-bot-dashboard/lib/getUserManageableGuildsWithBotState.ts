import { discordFetch } from "@/lib/discordFetch";
import {
  getBotStatePathForDebug,
  readBotConnectedGuildIds,
} from "@/lib/readBotConnectedGuildIds";

type DiscordGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

const ADMINISTRATOR_PERMISSION = BigInt("0x0000000000000008");

export function buildGuildIconUrl(guildId: string, icon?: string | null) {
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

/** Совпадает с payload в `GET /api/discord/guilds`. */
export type ManageableGuildPayload = {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
  botConnected: boolean;
};

/** Подмножество для UI дашборда (список подключённых серверов из того же ответа, что и guard). */
export type ConnectedGuildForDashboard = Pick<
  ManageableGuildPayload,
  "id" | "name" | "iconUrl" | "botConnected"
>;

export type GetUserManageableGuildsResult =
  | { status: "unauthenticated" }
  | { status: "discord_unavailable" }
  | { status: "discord_error"; httpStatus: number }
  | { status: "ok"; guilds: ManageableGuildPayload[] };

/**
 * Один источник правды для списка управляемых гильдий + botConnected из bot-state.
 * Используется в `GET /api/discord/guilds` и в server guard для `/dashboard/[guildId]`.
 */
export async function getUserManageableGuildsWithBotState(
  accessToken: string | undefined
): Promise<GetUserManageableGuildsResult> {
  if (!accessToken) {
    return { status: "unauthenticated" };
  }

  let res: Response;
  try {
    res = await discordFetch("/users/@me/guilds?limit=200", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    console.error("[manageable-guilds] fetch failed:", err);
    return { status: "discord_unavailable" };
  }

  if (!res.ok) {
    return { status: "discord_error", httpStatus: res.status };
  }

  const guilds = (await res.json()) as DiscordGuild[];

  const botGuildIds = await readBotConnectedGuildIds();

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[manageable-guilds] bot-state path=%s botConnectedCount=%d cwd=%s",
      getBotStatePathForDebug(),
      botGuildIds.size,
      process.cwd()
    );
  }

  const filteredGuilds = guilds
    .filter((guild) => guild.owner || hasAdministratorPermission(guild.permissions))
    .sort((a, b) => {
      if (!!a.owner !== !!b.owner) {
        return a.owner ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "ru");
    });

  const guildPayload: ManageableGuildPayload[] = filteredGuilds.map((guild) => ({
    id: guild.id,
    name: guild.name,
    iconUrl: buildGuildIconUrl(guild.id, guild.icon ?? null),
    owner: guild.owner ?? false,
    permissions: guild.permissions ?? "0",
    botConnected: botGuildIds.has(guild.id),
  }));

  return { status: "ok", guilds: guildPayload };
}
