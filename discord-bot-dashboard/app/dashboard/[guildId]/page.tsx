import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUserManageableGuildsWithBotState } from "@/lib/getUserManageableGuildsWithBotState";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import {
  resolveWelcomeCardFontDir,
  welcomeCardFontDirHasAnyFont,
} from "@/lib/resolveWelcomeCardFontDir";
import { DEFAULT_IMAGE_CARD_FONT } from "@/lib/welcomeCardConstants";

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

  const fontDir = resolveWelcomeCardFontDir();
  if (!welcomeCardFontDirHasAnyFont(fontDir)) {
    console.warn(
      "[dashboard] welcome-card fonts: в каталоге нет .ttf —",
      fontDir,
      "проверьте shared-assets/fonts/welcome-card на Railway и при необходимости задайте WELCOME_CARD_FONT_DIR"
    );
  }
  let availableWelcomeCardFontKeys = listAvailableWelcomeCardFontKeys(fontDir);
  if (availableWelcomeCardFontKeys.length === 0) {
    console.warn(
      "[dashboard] welcome-card font list empty — UI fallback key:",
      DEFAULT_IMAGE_CARD_FONT
    );
    availableWelcomeCardFontKeys = [DEFAULT_IMAGE_CARD_FONT];
  }

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
