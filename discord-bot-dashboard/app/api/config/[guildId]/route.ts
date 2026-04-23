import { NextResponse } from "next/server";

import { mergeImageCard } from "@/lib/mergeImageCardConfig";
import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";
import {
  readRawConfig,
  writeRawConfig,
} from "@/lib/persistence/configStore";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { resolveWelcomeCardFontDir } from "@/lib/resolveWelcomeCardFontDir";

function availableImageCardFontKeys() {
  return listAvailableWelcomeCardFontKeys(resolveWelcomeCardFontDir());
}

const defaultGuildConfig: GuildConfig = {
  welcomeEnabled: true,
  channelId: "",
  humanRoleId: "",
  botRoleId: "",
  skipBotAccounts: true,
  welcomeDeliveryMode: "channel" as const,
  welcomeDmMessage: "Добро пожаловать, {user}! ✨",
  welcomeDmImageDataUrl: "",
  welcomeDmImageFilename: "",
  welcomeDmAlsoSendToChannel: false,
  welcomeDmChannelId: "",
  welcomeDmChannelMessage: "Добро пожаловать, {user}! ✨",
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
  farewellEnabled: false,
  farewellChannelId: "",
  farewellMessage: "{username} покинул сервер {server}. Будем скучать 🌙",
  farewellImageDataUrl: "",
  farewellImageFilename: "",
};

function normalizeWelcomeDeliveryMode(
  g: Partial<GuildConfig> | undefined
): "channel" | "dm" | "both" {
  const raw =
    typeof g?.welcomeDeliveryMode === "string"
      ? g.welcomeDeliveryMode.trim().toLowerCase()
      : "";
  if (raw === "both") return "both";
  if (raw === "dm") {
    if (g?.welcomeDmAlsoSendToChannel === true) return "both";
    return "dm";
  }
  return "channel";
}

function mergeDeliveryWithDefaults(
  g: Partial<GuildConfig> | undefined,
  baseMessage: string,
  baseChannelId: string
): Pick<
  GuildConfig,
  | "welcomeDeliveryMode"
  | "welcomeDmMessage"
  | "welcomeDmImageDataUrl"
  | "welcomeDmImageFilename"
  | "welcomeDmAlsoSendToChannel"
  | "welcomeDmChannelId"
  | "welcomeDmChannelMessage"
> {
  const mode = normalizeWelcomeDeliveryMode(g);
  return {
    welcomeDeliveryMode: mode,
    welcomeDmMessage:
      typeof g?.welcomeDmMessage === "string" ? g.welcomeDmMessage : baseMessage,
    welcomeDmImageDataUrl:
      typeof g?.welcomeDmImageDataUrl === "string" ? g.welcomeDmImageDataUrl : "",
    welcomeDmImageFilename:
      typeof g?.welcomeDmImageFilename === "string" ? g.welcomeDmImageFilename : "",
    welcomeDmAlsoSendToChannel: mode === "both",
    welcomeDmChannelId:
      typeof g?.welcomeDmChannelId === "string" ? g.welcomeDmChannelId : baseChannelId,
    welcomeDmChannelMessage:
      typeof g?.welcomeDmChannelMessage === "string"
        ? g.welcomeDmChannelMessage
        : baseMessage,
  };
}

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
    const gc = g as GuildConfig;
    const baseMessage =
      typeof gc.message === "string" ? gc.message : defaultGuildConfig.message;
    const baseChannelId =
      typeof gc.channelId === "string" ? gc.channelId : defaultGuildConfig.channelId;
    const avail = availableImageCardFontKeys();
    return NextResponse.json({
      ...gc,
      ...mergeDeliveryWithDefaults(gc, baseMessage, baseChannelId),
      farewellEnabled: gc.farewellEnabled === true,
      farewellChannelId:
        typeof gc.farewellChannelId === "string"
          ? gc.farewellChannelId
          : defaultGuildConfig.farewellChannelId,
      farewellMessage:
        typeof gc.farewellMessage === "string"
          ? gc.farewellMessage
          : defaultGuildConfig.farewellMessage,
      farewellImageDataUrl:
        typeof gc.farewellImageDataUrl === "string" ? gc.farewellImageDataUrl : "",
      farewellImageFilename:
        typeof gc.farewellImageFilename === "string" ? gc.farewellImageFilename : "",
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

    const mergedMessage =
      typeof body.message === "string" ? body.message : defaultGuildConfig.message;
    const mergedChannelId =
      typeof body.channelId === "string" ? body.channelId : "";

    const nextGuildConfig: GuildConfig = {
      welcomeEnabled:
        typeof body.welcomeEnabled === "boolean"
          ? body.welcomeEnabled
          : defaultGuildConfig.welcomeEnabled,
      channelId: mergedChannelId,
      humanRoleId: body.humanRoleId ?? "",
      botRoleId: body.botRoleId ?? "",
      skipBotAccounts: body.skipBotAccounts ?? true,
      ...mergeDeliveryWithDefaults(body as Partial<GuildConfig>, mergedMessage, mergedChannelId),
      welcomeDmImageDataUrl:
        typeof body.welcomeDmImageDataUrl === "string" ? body.welcomeDmImageDataUrl : "",
      welcomeDmImageFilename:
        typeof body.welcomeDmImageFilename === "string" ? body.welcomeDmImageFilename : "",
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
      farewellEnabled:
        typeof body.farewellEnabled === "boolean"
          ? body.farewellEnabled
          : defaultGuildConfig.farewellEnabled,
      farewellChannelId:
        typeof body.farewellChannelId === "string"
          ? body.farewellChannelId
          : defaultGuildConfig.farewellChannelId,
      farewellMessage:
        typeof body.farewellMessage === "string"
          ? body.farewellMessage
          : defaultGuildConfig.farewellMessage,
      farewellImageDataUrl:
        typeof body.farewellImageDataUrl === "string"
          ? body.farewellImageDataUrl
          : defaultGuildConfig.farewellImageDataUrl,
      farewellImageFilename:
        typeof body.farewellImageFilename === "string"
          ? body.farewellImageFilename
          : defaultGuildConfig.farewellImageFilename,
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
