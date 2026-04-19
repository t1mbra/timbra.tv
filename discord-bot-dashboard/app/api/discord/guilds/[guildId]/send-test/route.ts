import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";
import { resolveImageCardBackgroundAbsolutePath } from "@/lib/resolveImageCardBackgroundPath";
import { mergeImageCard } from "@/lib/mergeImageCardConfig";
import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { generateWelcomeImageCardPngBuffer } from "@/lib/welcomeImageCard";
import { DEFAULT_OVERLAY_COLOR, DEFAULT_OVERLAY_OPACITY } from "@/lib/welcomeCardConstants";

type DiscordGuild = {
  id: string;
  name: string;
};

type WelcomeStyle = "text" | "embed" | "imageCard";

type SendTestBody = {
  /** Тест ЛС: отправить текст текущему пользователю дашборда (OAuth), не в канал. */
  welcomeDeliveryMode?: string;
  welcomeDmMessage?: string;
  channelId?: string;
  welcomeStyle?: string;
  message?: string;
  title?: string;
  description?: string;
  color?: string;
  textImageDataUrl?: string;
  embedAuthorName?: string;
  embedAuthorAvatar?: boolean;
  embedFooter?: string;
  embedImageDataUrl?: string;
  embedFields?: { name?: string; value?: string; inline?: boolean }[];
  viewerAvatarUrl?: string | null;
  imageCard?: {
    title?: string;
    subtitle?: string;
    description?: string;
    fontFamily?: string;
    textColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    backgroundMode?: string;
    backgroundColor?: string;
    accentColor?: string;
    backgroundImage?: { enabled?: boolean; path?: string; filename?: string };
    showAvatar?: boolean;
    showUsername?: boolean;
  };
};

const SNOWFLAKE_RE = /^\d{17,20}$/;

function resolveTestVariables(text: string): string {
  const dateStr = new Date().toLocaleDateString();
  return text
    .replaceAll("{user}", "@TestUser")
    .replaceAll("{username}", "TestUser")
    .replaceAll("{server}", "Test Server")
    .replaceAll("{memberCount}", "999")
    .replaceAll("{date}", dateStr);
}

function hexToDiscordColor(hex: string): number | null {
  const s = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return Number.parseInt(s, 16);
}

function isDiscordHttpImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function fetchGuildsForUser(accessToken: string) {
  return discordFetch("/users/@me/guilds?limit=200", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function fetchOAuthUser(accessToken: string) {
  return discordFetch("/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function readDiscordErrorText(res: Response): Promise<string> {
  const t = await res.text().catch(() => "");
  if (!t) return `HTTP ${res.status}`;
  try {
    const j = JSON.parse(t) as { message?: string };
    if (typeof j.message === "string" && j.message) return j.message;
  } catch {
    /* raw text */
  }
  return t.slice(0, 500);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await context.params;

  if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or missing guildId",
      },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  if (!botToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing DISCORD_BOT_TOKEN",
      },
      { status: 500 }
    );
  }

  let body: SendTestBody;
  try {
    body = (await request.json()) as SendTestBody;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const deliveryRaw =
    typeof body.welcomeDeliveryMode === "string"
      ? body.welcomeDeliveryMode.trim().toLowerCase()
      : "channel";
  const isDmTest = deliveryRaw === "dm";

  let channelId = "";
  let welcomeStyle: WelcomeStyle | undefined;

  if (!isDmTest) {
    channelId = body.channelId?.trim() ?? "";
    if (!channelId || !SNOWFLAKE_RE.test(channelId)) {
      return NextResponse.json(
        {
          success: false,
          message: "channelId is required and must be a valid Discord snowflake",
        },
        { status: 400 }
      );
    }

    welcomeStyle = body.welcomeStyle as WelcomeStyle | undefined;
    if (
      welcomeStyle !== "text" &&
      welcomeStyle !== "embed" &&
      welcomeStyle !== "imageCard"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'welcomeStyle must be "text", "embed", or "imageCard"',
        },
        { status: 400 }
      );
    }
  }

  let guildsRes: Response;
  try {
    guildsRes = await fetchGuildsForUser(accessToken);
  } catch (err) {
    console.error("[send-test] guilds list fetch failed:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Discord temporarily unavailable; try again.",
      },
      { status: 503 }
    );
  }

  if (!guildsRes.ok) {
    const discordError = await readDiscordErrorText(guildsRes);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to validate user guild access",
        discordError,
      },
      { status: guildsRes.status >= 500 ? 502 : 500 }
    );
  }

  const userGuilds = (await guildsRes.json()) as DiscordGuild[];
  const hasAccess = userGuilds.some((guild) => guild.id === guildId);

  if (!hasAccess) {
    return NextResponse.json(
      {
        success: false,
        message: "Guild not available for this user",
      },
      { status: 403 }
    );
  }

  const botHeadersJson = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  };

  if (isDmTest) {
    const dmRaw = typeof body.welcomeDmMessage === "string" ? body.welcomeDmMessage : "";
    const content = resolveTestVariables(dmRaw).trim();
    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Укажите текст сообщения в ЛС для теста",
        },
        { status: 400 }
      );
    }

    let meRes: Response;
    try {
      meRes = await fetchOAuthUser(accessToken);
    } catch (err) {
      console.error("[send-test] users/@me failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Discord временно недоступен; попробуйте снова.",
        },
        { status: 503 }
      );
    }

    if (!meRes.ok) {
      const discordError = await readDiscordErrorText(meRes);
      return NextResponse.json(
        {
          success: false,
          message: "Не удалось получить профиль для теста ЛС",
          discordError,
        },
        { status: meRes.status >= 500 ? 502 : 500 }
      );
    }

    const me = (await meRes.json()) as { id?: string };
    const recipientId = typeof me.id === "string" && SNOWFLAKE_RE.test(me.id) ? me.id : "";
    if (!recipientId) {
      return NextResponse.json(
        {
          success: false,
          message: "Не удалось определить пользователя для теста ЛС",
        },
        { status: 500 }
      );
    }

    let dmChannelRes: Response;
    try {
      dmChannelRes = await discordFetch("/users/@me/channels", {
        method: "POST",
        headers: botHeadersJson,
        body: JSON.stringify({ recipient_id: recipientId }),
      });
    } catch (err) {
      console.error("[send-test] create DM failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Ошибка сети при создании ЛС",
        },
        { status: 503 }
      );
    }

    if (!dmChannelRes.ok) {
      const discordError = await readDiscordErrorText(dmChannelRes);
      return NextResponse.json(
        {
          success: false,
          message:
            "Не удалось отправить тест в ЛС (возможно, у вас закрыты личные сообщения от участников серверов)",
          discordError,
        },
        { status: dmChannelRes.status >= 500 ? 502 : dmChannelRes.status }
      );
    }

    const dmCh = (await dmChannelRes.json()) as { id?: string };
    const dmChannelId = typeof dmCh.id === "string" ? dmCh.id : "";
    if (!dmChannelId) {
      return NextResponse.json(
        { success: false, message: "Discord не вернул канал ЛС" },
        { status: 502 }
      );
    }

    let msgRes: Response;
    try {
      msgRes = await discordFetch(`/channels/${dmChannelId}/messages`, {
        method: "POST",
        headers: botHeadersJson,
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      console.error("[send-test] DM message send failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Ошибка сети при отправке в ЛС",
        },
        { status: 503 }
      );
    }

    if (!msgRes.ok) {
      const discordError = await readDiscordErrorText(msgRes);
      return NextResponse.json(
        {
          success: false,
          message: "Не удалось отправить тест в ЛС",
          discordError,
        },
        { status: msgRes.status >= 500 ? 502 : msgRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Тестовое сообщение отправлено вам в личку от бота",
    });
  }

  if (welcomeStyle === "imageCard") {
    const icRaw = body.imageCard && typeof body.imageCard === "object" ? body.imageCard : {};
    const sharedRoot = resolveSharedDataDir();
    const fontDirForMerge = path.join(sharedRoot, "fonts", "welcome-card");
    const availableFontKeys = listAvailableWelcomeCardFontKeys(fontDirForMerge);
    const ic = mergeImageCard(icRaw, { availableFontKeys });

    const titleRaw = typeof ic.title === "string" ? ic.title : "Добро пожаловать";
    const subtitleRaw = typeof ic.subtitle === "string" ? ic.subtitle : "";
    const descriptionRaw = typeof ic.description === "string" ? ic.description : "";
    let bgMode: "gradient" | "solid" | "image" = "gradient";
    if (ic.backgroundMode === "solid") bgMode = "solid";
    else if (ic.backgroundMode === "image") bgMode = "image";
    const bgColor =
      typeof ic.backgroundColor === "string" ? ic.backgroundColor : "#12131a";
    const accColor =
      typeof ic.accentColor === "string" ? ic.accentColor : "#8038ce";
    const overlayColor =
      typeof ic.overlayColor === "string" ? ic.overlayColor : DEFAULT_OVERLAY_COLOR;
    const overlayOpacity =
      typeof ic.overlayOpacity === "number" && !Number.isNaN(ic.overlayOpacity)
        ? Math.min(1, Math.max(0, ic.overlayOpacity))
        : DEFAULT_OVERLAY_OPACITY;

    const fontDir = fontDirForMerge;

    let backgroundImagePath: string | null = null;
    if (
      bgMode === "image" &&
      ic.backgroundImage &&
      typeof ic.backgroundImage === "object"
    ) {
      const bi = ic.backgroundImage as { enabled?: boolean; path?: string };
      if (bi.enabled === true && typeof bi.path === "string") {
        backgroundImagePath = resolveImageCardBackgroundAbsolutePath(sharedRoot, bi.path);
      }
    }

    const viewerAvatarUrl =
      typeof body.viewerAvatarUrl === "string" &&
      (body.viewerAvatarUrl.startsWith("https://") || body.viewerAvatarUrl.startsWith("http://"))
        ? body.viewerAvatarUrl
        : null;

    let png: Buffer;
    try {
      png = await generateWelcomeImageCardPngBuffer(
        {
          title: resolveTestVariables(titleRaw),
          subtitle: resolveTestVariables(subtitleRaw),
          description: resolveTestVariables(descriptionRaw),
          fontFamily: ic.fontFamily,
          textColor: ic.textColor,
          titleStyle: ic.titleStyle,
          subtitleStyle: ic.subtitleStyle,
          overlayColor,
          overlayOpacity,
          backgroundMode: bgMode,
          backgroundColor: bgColor,
          accentColor: accColor,
          backgroundImagePath,
          displayName: resolveTestVariables("{username}"),
          avatarUrl: viewerAvatarUrl,
        },
        fontDir
      );
    } catch (err) {
      console.error("[send-test] imageCard generation failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Не удалось сгенерировать изображение карточки",
        },
        { status: 500 }
      );
    }

    const messageRaw = typeof body.message === "string" ? body.message : "";
    const content = messageRaw.trim()
      ? `${resolveTestVariables(messageRaw)}\n\u200B`
      : undefined;

    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        ...(content !== undefined ? { content } : {}),
        attachments: [{ id: 0, filename: "welcome-card.png" }],
      })
    );
    form.append(
      "files[0]",
      new Blob([new Uint8Array(png)]),
      "welcome-card.png"
    );

    let msgRes: Response;
    try {
      msgRes = await discordFetch(`/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        body: form,
      });
    } catch (err) {
      console.error("[send-test] imageCard send failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Network error while sending message to Discord",
        },
        { status: 503 }
      );
    }

    if (!msgRes.ok) {
      const discordError = await readDiscordErrorText(msgRes);
      return NextResponse.json(
        {
          success: false,
          message: "Discord отклонил тестовое сообщение с карточкой",
          discordError,
        },
        { status: msgRes.status >= 500 ? 502 : msgRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Тестовое приветствие с карточкой отправлено",
    });
  }

  const botHeaders = botHeadersJson;

  if (welcomeStyle === "text") {
    const raw = typeof body.message === "string" ? body.message : "";
    const content = resolveTestVariables(raw);

    let msgRes: Response;
    try {
      msgRes = await discordFetch(`/channels/${channelId}/messages`, {
        method: "POST",
        headers: botHeaders,
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      console.error("[send-test] message send failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Network error while sending message to Discord",
        },
        { status: 503 }
      );
    }

    if (!msgRes.ok) {
      const discordError = await readDiscordErrorText(msgRes);
      return NextResponse.json(
        {
          success: false,
          message: "Discord rejected the test message",
          discordError,
        },
        { status: msgRes.status >= 500 ? 502 : msgRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test welcome message sent as plain text",
    });
  }

  // embed
  const titleRaw = typeof body.title === "string" ? body.title : "";
  const descriptionRaw =
    typeof body.description === "string" ? body.description : "";
  const colorRaw = typeof body.color === "string" ? body.color : "";

  if (!colorRaw.trim()) {
    return NextResponse.json(
      {
        success: false,
        message: "color is required for embed style (hex, e.g. #5865F2)",
      },
      { status: 400 }
    );
  }

  const colorInt = hexToDiscordColor(colorRaw);
  if (colorInt === null) {
    return NextResponse.json(
      {
        success: false,
        message: "color must be a6-digit hex string (e.g. #5865F2)",
      },
      { status: 400 }
    );
  }

  const title = resolveTestVariables(titleRaw);
  const description = resolveTestVariables(descriptionRaw);
  const messageRaw = typeof body.message === "string" ? body.message : "";
  const content =
    messageRaw.trim().length > 0
      ? resolveTestVariables(messageRaw)
      : undefined;

  const embed: Record<string, unknown> = {
    title: title || undefined,
    description: description || undefined,
    color: colorInt,
  };

  const authorNameRaw =
    typeof body.embedAuthorName === "string" ? body.embedAuthorName.trim() : "";
  const showAuthorAvatar = Boolean(body.embedAuthorAvatar);
  const viewerAvatarUrl =
    typeof body.viewerAvatarUrl === "string" &&
    (body.viewerAvatarUrl.startsWith("https://") || body.viewerAvatarUrl.startsWith("http://"))
      ? body.viewerAvatarUrl
      : null;
  const authorNameResolved =
    authorNameRaw.length > 0 ? resolveTestVariables(authorNameRaw) : "";
  const iconUrl = showAuthorAvatar && viewerAvatarUrl ? viewerAvatarUrl : undefined;

  if (authorNameResolved || iconUrl) {
    embed.author = {
      ...(authorNameResolved ? { name: authorNameResolved } : {}),
      ...(iconUrl ? { icon_url: iconUrl } : {}),
    };
  }

  const rawFields = Array.isArray(body.embedFields) ? body.embedFields : [];
  const discordFields = rawFields
    .map((f) => ({
      name: typeof f?.name === "string" ? resolveTestVariables(f.name).trim() : "",
      value: typeof f?.value === "string" ? resolveTestVariables(f.value).trim() : "",
      inline: Boolean(f?.inline),
    }))
    .filter((f) => f.name.length > 0 && f.value.length > 0)
    .map((f) => ({
      name: f.name.slice(0, 256),
      value: f.value.slice(0, 1024),
      inline: f.inline,
    }));
  if (discordFields.length > 0) {
    embed.fields = discordFields;
  }

  const footerRaw =
    typeof body.embedFooter === "string" ? body.embedFooter.trim() : "";
  if (footerRaw.length > 0) {
    embed.footer = { text: resolveTestVariables(footerRaw) };
  }

  const imageCandidate =
    typeof body.embedImageDataUrl === "string"
      ? body.embedImageDataUrl.trim()
      : "";
  if (imageCandidate.length > 0 && isDiscordHttpImageUrl(imageCandidate)) {
    embed.image = { url: imageCandidate };
  }

  const payload: { content?: string; embeds: typeof embed[] } = {
    embeds: [embed],
  };
  if (content !== undefined) payload.content = content;

  let msgRes: Response;
  try {
    msgRes = await discordFetch(`/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[send-test] embed send failed:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Network error while sending message to Discord",
      },
      { status: 503 }
    );
  }

  if (!msgRes.ok) {
    const discordError = await readDiscordErrorText(msgRes);
    return NextResponse.json(
      {
        success: false,
        message: "Discord rejected the test embed",
        discordError,
      },
      { status: msgRes.status >= 500 ? 502 : msgRes.status }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Test welcome message sent with embed",
  });
}
