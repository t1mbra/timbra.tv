import { NextResponse } from "next/server";

import { mergeImageCard } from "@/lib/mergeImageCardConfig";
import { normalizeAutoRolesOnRead } from "@/lib/normalizeAutoRolesConfig";
import type {
  AutoRoleDelayUnit,
  GuildConfig,
  RootConfig,
} from "@/lib/persistence/configTypes";
import {
  readRawConfig,
  writeRawConfig,
} from "@/lib/persistence/configStore";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { resolveWelcomeCardFontDir } from "@/lib/resolveWelcomeCardFontDir";

function availableImageCardFontKeys() {
  return listAvailableWelcomeCardFontKeys(resolveWelcomeCardFontDir());
}

function parseDelayUnit(raw: unknown, fallback: AutoRoleDelayUnit): AutoRoleDelayUnit {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (
    s === "seconds" ||
    s === "minutes" ||
    s === "hours" ||
    s === "days"
  ) {
    return s;
  }
  return fallback;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  return fallback;
}

function parseSnowflakeArray(raw: unknown, guildId: string): string[] {
  if (!Array.isArray(raw)) return [];
  const re = /^\d{17,20}$/;
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!re.test(t) || t === guildId) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
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
  autoRolesEnabled: false,
  memberRoleIds: [],
  waitForMembershipScreening: false,
  memberDelayEnabled: false,
  memberDelayValue: 1,
  memberDelayUnit: "seconds",
  botAutoRolesEnabled: false,
  botUseSeparateRoles: false,
  botRoleIds: [],
  botDelayEnabled: false,
  botDelayValue: 1,
  botDelayUnit: "seconds",
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
    const autoRoles = normalizeAutoRolesOnRead(gc, guildId);
    return NextResponse.json({
      ...gc,
      ...mergeDeliveryWithDefaults(gc, baseMessage, baseChannelId),
      ...autoRoles,
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

    const memberRoleIds = parseSnowflakeArray(body.memberRoleIds, guildId);
    const botRoleIds = parseSnowflakeArray(body.botRoleIds, guildId);
    const autoRolesEnabled =
      typeof body.autoRolesEnabled === "boolean"
        ? body.autoRolesEnabled
        : defaultGuildConfig.autoRolesEnabled;
    const botAutoRolesEnabled =
      typeof body.botAutoRolesEnabled === "boolean"
        ? body.botAutoRolesEnabled
        : defaultGuildConfig.botAutoRolesEnabled;
    const botUseSeparateRoles =
      typeof body.botUseSeparateRoles === "boolean"
        ? body.botUseSeparateRoles
        : defaultGuildConfig.botUseSeparateRoles;

    const legacyHuman = memberRoleIds[0] ?? "";
    const legacyBot =
      botAutoRolesEnabled && botUseSeparateRoles
        ? botRoleIds[0] ?? ""
        : memberRoleIds[0] ?? "";

    const nextGuildConfig: GuildConfig = {
      welcomeEnabled:
        typeof body.welcomeEnabled === "boolean"
          ? body.welcomeEnabled
          : defaultGuildConfig.welcomeEnabled,
      channelId: mergedChannelId,
      humanRoleId:
        typeof body.humanRoleId === "string" && body.humanRoleId.trim()
          ? body.humanRoleId.trim()
          : legacyHuman,
      botRoleId:
        typeof body.botRoleId === "string" && body.botRoleId.trim()
          ? body.botRoleId.trim()
          : legacyBot,
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
      autoRolesEnabled,
      memberRoleIds,
      waitForMembershipScreening: body.waitForMembershipScreening === true,
      memberDelayEnabled: body.memberDelayEnabled === true,
      memberDelayValue: parsePositiveInt(
        body.memberDelayValue,
        defaultGuildConfig.memberDelayValue ?? 1
      ),
      memberDelayUnit: parseDelayUnit(
        body.memberDelayUnit,
        defaultGuildConfig.memberDelayUnit ?? "seconds"
      ),
      botAutoRolesEnabled,
      botUseSeparateRoles,
      botRoleIds,
      botDelayEnabled: body.botDelayEnabled === true,
      botDelayValue: parsePositiveInt(
        body.botDelayValue,
        defaultGuildConfig.botDelayValue ?? 1
      ),
      botDelayUnit: parseDelayUnit(
        body.botDelayUnit,
        defaultGuildConfig.botDelayUnit ?? "seconds"
      ),
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
