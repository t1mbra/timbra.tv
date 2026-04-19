import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getBotStatePathForDebug,
  readBotConnectedGuildIds,
} from "@/lib/readBotConnectedGuildIds";
import { getUserManageableGuildsWithBotState } from "@/lib/getUserManageableGuildsWithBotState";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;

  const result = await getUserManageableGuildsWithBotState(accessToken);

  if (result.status === "unauthenticated") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (result.status === "discord_unavailable") {
    return NextResponse.json(
      { error: "Discord временно недоступен. Попробуйте ещё раз." },
      { status: 503 }
    );
  }

  if (result.status === "discord_error") {
    return NextResponse.json(
      { error: "Failed to fetch guilds" },
      { status: result.httpStatus >= 500 ? 502 : 500 }
    );
  }

  if (process.env.NODE_ENV === "development") {
    const botGuildIds = await readBotConnectedGuildIds();
    return NextResponse.json({
      guilds: result.guilds,
      _debug: {
        botStatePath: getBotStatePathForDebug(),
        botConnectedCount: botGuildIds.size,
        cwd: process.cwd(),
      },
    });
  }

  return NextResponse.json({ guilds: result.guilds });
}
