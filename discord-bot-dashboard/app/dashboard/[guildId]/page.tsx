import path from "node:path";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUserManageableGuildsWithBotState } from "@/lib/getUserManageableGuildsWithBotState";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";

import { DashboardGuildPageClient } from "./DashboardGuildPageClient";

export default async function DashboardGuildPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;

  const result = await getUserManageableGuildsWithBotState(accessToken);

  if (result.status === "unauthenticated") {
    redirect("/");
  }

  if (result.status !== "ok") {
    redirect("/servers");
  }

  const guild = result.guilds.find((g) => g.id === guildId);
  if (!guild?.botConnected) {
    redirect("/servers");
  }

  const connectedGuilds = result.guilds.filter((g) => g.botConnected);

  const fontDir = path.join(resolveSharedDataDir(), "fonts", "welcome-card");
  const availableWelcomeCardFontKeys = listAvailableWelcomeCardFontKeys(fontDir);

  return (
    <DashboardGuildPageClient
      key={guildId}
      guildId={guildId}
      initialGuildName={guild.name}
      initialGuildIconUrl={guild.iconUrl}
      connectedGuilds={connectedGuilds}
      availableWelcomeCardFontKeys={availableWelcomeCardFontKeys}
    />
  );
}
