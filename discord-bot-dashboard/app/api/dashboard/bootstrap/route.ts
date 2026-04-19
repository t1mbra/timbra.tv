import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

type DiscordApplication = {
  id: string;
  name: string;
  icon?: string | null;
  bot?: {
    id: string;
    username: string;
    avatar?: string | null;
  } | null;
};

function buildUserAvatarUrl(userId?: string, avatar?: string | null) {
  if (!userId || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`;
}

function buildAppIconUrl(appId?: string, icon?: string | null) {
  if (!appId || !icon) return null;
  return `https://cdn.discordapp.com/app-icons/${appId}/${icon}.png?size=128`;
}

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("discord_access_token")?.value;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  let viewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null = null;

  let bot: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
  } | null = null;

  /** OAuth2 client_id для ссылки «добавить бота» (id приложения, не user id бота) */
  let applicationId: string | null = null;

  const bootstrapWarnings: string[] = [];

  if (accessToken) {
    try {
      const userRes = await discordFetch("/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userRes.ok) {
        const user = (await userRes.json()) as DiscordUser;

        viewer = {
          id: user.id,
          name: user.global_name || user.username,
          avatarUrl: buildUserAvatarUrl(user.id, user.avatar ?? null),
        };
      } else {
        bootstrapWarnings.push(`viewer_http_${userRes.status}`);
      }
    } catch (err) {
      console.error("[bootstrap] Discord users/@me failed:", err);
      bootstrapWarnings.push("viewer_unavailable");
    }
  }

  if (botToken) {
    try {
      const appRes = await discordFetch("/applications/@me", {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      if (appRes.ok) {
        const app = (await appRes.json()) as DiscordApplication;

        applicationId = app.id ?? null;
        bot = {
          id: app.bot?.id ?? null,
          name: app.bot?.username || app.name,
          avatarUrl:
            buildUserAvatarUrl(app.bot?.id, app.bot?.avatar ?? null) ||
            buildAppIconUrl(app.id, app.icon ?? null),
        };
      } else {
        bootstrapWarnings.push(`bot_http_${appRes.status}`);
      }
    } catch (err) {
      console.error("[bootstrap] Discord applications/@me failed:", err);
      bootstrapWarnings.push("bot_unavailable");
    }
  }

  return NextResponse.json({
    viewer,
    bot,
    applicationId,
    ...(bootstrapWarnings.length > 0 ? { bootstrapWarnings } : {}),
  });
}

