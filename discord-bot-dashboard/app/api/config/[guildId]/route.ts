import { NextResponse } from "next/server";
import path from "node:path";

import {
  mergeImageCard,
  type ImageCardGuildConfigMerged,
} from "@/lib/mergeImageCardConfig";
import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";
import {
  readRawConfig,
  writeRawConfig,
} from "@/lib/persistence/configStore";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";

function availableImageCardFontKeys() {
  const fontDir = path.join(resolveSharedDataDir(), "fonts", "welcome-card");
  return listAvailableWelcomeCardFontKeys(fontDir);
}

const defaultGuildConfig: GuildConfig = {
  channelId: "",
  humanRoleId: "",
  botRoleId: "",
  skipBotAccounts: true,
  welcomeStyle: "text",
  textImageDataUrl: "",
  message: "Добро пожаловать, {user}! ✨",
  title: "Добро пожаловать",
  description: "Очень рады тебя видеть на сервере {server} 💜",
  color: "#8b5cf6",
  embedAuthorName: "",
  embedAuthorAvatar: false,
  embedAuthorAvatarUrl: "",
  embedFooter: "",
  embedImageDataUrl: "",
  embedFields: [],
  imageCard: mergeImageCard(undefined, { availableFontKeys: availableImageCardFontKeys() }),
};

async function readRootConfig(): Promise<RootConfig> {
  return readRawConfig();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await context.params;
    const rootConfig = await readRootConfig();

    const g = rootConfig.guilds[guildId];
    if (!g) {
      return NextResponse.json(defaultGuildConfig);
    }
    const avail = availableImageCardFontKeys();
    return NextResponse.json({
      ...g,
      imageCard: mergeImageCard(
        g && typeof g === "object" && "imageCard" in g
          ? (g as GuildConfig).imageCard
          : undefined,
        { availableFontKeys: avail }
      ),
    });
  } catch (error) {
    console.error("Failed to read shared config", error);

    return NextResponse.json(
      { error: "Failed to read shared config" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await context.params;
    const body = await request.json();
    const rootConfig = await readRootConfig();
    const avail = availableImageCardFontKeys();

    const nextGuildConfig: GuildConfig = {
      channelId: body.channelId ?? "",
      humanRoleId: body.humanRoleId ?? "",
      botRoleId: body.botRoleId ?? "",
      skipBotAccounts: body.skipBotAccounts ?? true,
      welcomeStyle: body.welcomeStyle ?? defaultGuildConfig.welcomeStyle,
      textImageDataUrl: body.textImageDataUrl ?? "",
      message: body.message ?? defaultGuildConfig.message,
      title: body.title ?? defaultGuildConfig.title,
      description: body.description ?? defaultGuildConfig.description,
      color: body.color ?? defaultGuildConfig.color,
      embedAuthorName:
        typeof body.embedAuthorName === "string"
          ? body.embedAuthorName
          : defaultGuildConfig.embedAuthorName,
      embedAuthorAvatar: Boolean(body.embedAuthorAvatar),
      embedAuthorAvatarUrl:
        typeof body.embedAuthorAvatarUrl === "string"
          ? body.embedAuthorAvatarUrl
          : defaultGuildConfig.embedAuthorAvatarUrl,
      embedFooter:
        typeof body.embedFooter === "string"
          ? body.embedFooter
          : defaultGuildConfig.embedFooter,
      embedImageDataUrl:
        typeof body.embedImageDataUrl === "string"
          ? body.embedImageDataUrl
          : defaultGuildConfig.embedImageDataUrl,
      embedFields: Array.isArray(body.embedFields)
        ? body.embedFields
            .filter((x: unknown) => x && typeof x === "object")
            .map((x: object) => {
              const o = x as Record<string, unknown>;
              return {
                name: typeof o.name === "string" ? o.name : "",
                value: typeof o.value === "string" ? o.value : "",
                inline: Boolean(o.inline),
              };
            })
        : defaultGuildConfig.embedFields,
      imageCard: mergeImageCard(body.imageCard, { availableFontKeys: avail }),
    };

    rootConfig.guilds[guildId] = nextGuildConfig;

    await writeRawConfig(rootConfig);

    return NextResponse.json({
      ok: true,
      guildId,
      config: nextGuildConfig,
    });
  } catch (error) {
    console.error("Failed to write shared config", error);

    return NextResponse.json(
      { error: "Failed to save shared config" },
      { status: 500 }
    );
  }
}
