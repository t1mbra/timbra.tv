const { existsSync } = require("fs");
const path = require("path");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { generateWelcomeImageCardPngBuffer } = require("./welcomeImageCard");
const { resolveSharedDataDir } = require("./resolveSharedDataDir");
const configStore = require("./persistence/configStore");
const { configFilePath } = require("./persistence/jsonConfigStore");

const IMAGE_CARD_FONT_KEYS = new Set([
  "inter",
  "manrope",
  "montserrat",
  "nunito",
  "rubik",
  "roboto",
  "oswald",
  "open_sans",
  "play",
  "russo_one",
  "comfortaa",
  "cormorant_garamond",
  "alice",
  "marck_script",
  "underdog",
  "cinzel",
]);

/**
 * @param {string} sharedRoot
 * @param {unknown} bi
 */
function resolveImageCardBackgroundPath(sharedRoot, bi) {
  if (!bi || typeof bi !== "object" || bi.enabled !== true) return null;
  if (typeof bi.path !== "string") return null;
  const r = bi.path.trim();
  if (!r || r.includes("..")) return null;
  const full = path.resolve(sharedRoot, r);
  const root = path.resolve(sharedRoot);
  const rel = path.relative(root, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!existsSync(full)) return null;
  return full;
}

/** @typedef {{ guilds?: Record<string, unknown> }} SharedConfigShape */

const SNOWFLAKE_RE = /^\d{17,20}$/;

/**
 * @param {unknown} id
 * @returns {id is string}
 */
function isNonEmptySnowflake(id) {
  return typeof id === "string" && SNOWFLAKE_RE.test(id.trim());
}

/**
 * @param {string} text
 * @param {{ mention: string; username: string; serverName: string; memberCount: number; dateStr: string }} ctx
 */
function resolveTemplate(text, ctx) {
  if (typeof text !== "string") return "";
  return text
    .replaceAll("{user}", ctx.mention)
    .replaceAll("{username}", ctx.username)
    .replaceAll("{server}", ctx.serverName)
    .replaceAll("{memberCount}", String(ctx.memberCount))
    .replaceAll("{date}", ctx.dateStr);
}

/**
 * @param {string} hex
 * @returns {number | null}
 */
function hexToDiscordColor(hex) {
  if (typeof hex !== "string") return null;
  const s = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return Number.parseInt(s, 16);
}

/** Лимит вложения для надёжной отправки (ниже лимита Discord для обычных серверов). */
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const EMBED_ATTACH_NAME = "embed-welcome.png";

/**
 * @param {string} raw
 * @returns {Buffer | null}
 */
function bufferFromDataUrl(raw) {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(typeof raw === "string" ? raw.trim() : "");
  if (!m) return null;
  try {
    return Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
}

/**
 * @param {string} raw
 * @param {string} filename
 * @returns {import('discord.js').AttachmentBuilder | null}
 */
function attachmentFromDataUrl(raw, filename) {
  const buf = bufferFromDataUrl(raw);
  if (!buf || buf.length === 0 || buf.length > MAX_ATTACHMENT_BYTES) return null;
  return new AttachmentBuilder(buf, { name: filename });
}

/**
 * @param {string} url
 * @param {string} filename
 * @returns {Promise<import('discord.js').AttachmentBuilder | null>}
 */
async function attachmentFromHttpUrl(url, filename) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_ATTACHMENT_BYTES) return null;
    return new AttachmentBuilder(buf, { name: filename });
  } catch {
    return null;
  }
}

/**
 * Картинка к текстовому приветствию: вложение или null.
 * @param {unknown} raw
 * @param {ReturnType<typeof buildTemplateContext>} ctx
 */
async function resolveTextWelcomeAttachment(raw, ctx) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;

  if (s.startsWith("data:")) {
    const att = attachmentFromDataUrl(s, "welcome-message.png");
    if (!att) {
      console.warn(
        "[welcome] text: data-URL image invalid or too large; sending text only (if any)",
        { user: ctx.username }
      );
      return null;
    }
    return att;
  }

  if (/^https?:\/\//i.test(s)) {
    const att = await attachmentFromHttpUrl(s, "welcome-message.png");
    if (!att) {
      console.warn(
        "[welcome] text: could not fetch http(s) image; sending text only (if any)",
        { user: ctx.username }
      );
      return null;
    }
    return att;
  }

  console.warn(
    "[welcome] text: image value is not a supported data: or http(s) URL; skipping image",
    { user: ctx.username }
  );
  return null;
}

/**
 * @param {unknown} raw
 * @param {ReturnType<typeof buildTemplateContext>} ctx
 * @returns {Promise<{ files: import('discord.js').AttachmentBuilder[]; imageUrl?: string }>}
 */
async function resolveEmbedImage(raw, ctx) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return { files: [] };

  if (s.startsWith("data:")) {
    const att = attachmentFromDataUrl(s, EMBED_ATTACH_NAME);
    if (!att) {
      console.warn("[welcome] embed: data-URL image invalid or too large; skipping embed image", {
        user: ctx.username,
      });
      return { files: [] };
    }
    return { files: [att], imageUrl: `attachment://${EMBED_ATTACH_NAME}` };
  }

  if (/^https?:\/\//i.test(s)) {
    return { files: [], imageUrl: s };
  }

  console.warn("[welcome] embed: image is not data: or http(s) URL; skipping embed image", {
    user: ctx.username,
  });
  return { files: [] };
}

/**
 * @param {unknown} raw
 * @param {ReturnType<typeof buildTemplateContext>} ctx
 */
function normalizeEmbedFields(raw, ctx) {
  if (!Array.isArray(raw)) return [];
  /** @type {{ name: string; value: string; inline: boolean }[]} */
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (entry);
    const nameRaw = typeof o.name === "string" ? o.name : "";
    const valueRaw = typeof o.value === "string" ? o.value : "";
    const name = resolveTemplate(nameRaw, ctx).trim();
    const value = resolveTemplate(valueRaw, ctx).trim();
    if (!name || !value) continue;
    out.push({
      name: name.slice(0, 256),
      value: value.slice(0, 1024),
      inline: Boolean(o.inline),
    });
  }
  return out;
}

/**
 * @param {import('discord.js').GuildMember} member
 */
function buildTemplateContext(member) {
  return {
    mention: `<@${member.id}>`,
    username: member.user.username,
    serverName: member.guild.name,
    memberCount: member.guild.memberCount,
    dateStr: new Date().toLocaleDateString(),
  };
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {unknown} roleIdRaw
 * @param {'human' | 'bot'} kind
 */
async function assignAutoRole(member, roleIdRaw, kind) {
  if (!isNonEmptySnowflake(roleIdRaw)) {
    console.log(`[autoRole] ${kind}: skipped (no valid role id)`);
    return;
  }
  const roleId = /** @type {string} */ (roleIdRaw).trim();
  try {
    const role = await member.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      console.warn(`[autoRole] ${kind}: role not found (${roleId})`);
      return;
    }
    if (role.managed) {
      console.warn(`[autoRole] ${kind}: role ${roleId} is managed, skip`);
      return;
    }
    await member.roles.add(role, "Auto-role on guild join");
    console.log(`[autoRole] ${kind}: assigned ${role.name} (${roleId}) to ${member.user.tag}`);
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn(`[autoRole] ${kind}: failed for ${member.user.tag}:`, e.message);
  }
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, unknown>} config
 */
async function sendWelcome(member, config) {
  const channelRaw = config.channelId;
  const channelId = typeof channelRaw === "string" ? channelRaw.trim() : "";
  if (!channelId) {
    console.log("[welcome] skipped: no channelId");
    return;
  }
  if (!isNonEmptySnowflake(channelId)) {
    console.warn("[welcome] skipped: channelId is not a valid snowflake");
    return;
  }

  if (member.user.bot && config.skipBotAccounts === true) {
    console.log(`[welcome] skipped for bot ${member.user.tag} (skipBotAccounts)`);
    return;
  }

  /** @type {import('discord.js').GuildChannel | import('discord.js').ThreadChannel | null} */
  let channel = null;
  try {
    const fetched = await member.guild.channels.fetch(channelId);
    channel = fetched;
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn(`[welcome] could not fetch channel ${channelId}:`, e.message);
    return;
  }

  if (!channel || !channel.isTextBased()) {
    console.warn(`[welcome] channel ${channelId} is not text-sendable`);
    return;
  }

  const ctx = buildTemplateContext(member);
  const styleRaw = config.welcomeStyle;
  const style =
    typeof styleRaw === "string" ? styleRaw.trim().toLowerCase() : "text";

  console.log(`[welcome] style=${style} channel=${channelId} member=${member.user.tag}`);

  if (style === "imagecard") {
    const icRaw = config.imageCard;
    const ic =
      icRaw && typeof icRaw === "object" && !Array.isArray(icRaw)
        ? /** @type {Record<string, unknown>} */ (icRaw)
        : {};

    const titleRaw = typeof ic.title === "string" ? ic.title : "Добро пожаловать";
    const subtitleRaw = typeof ic.subtitle === "string" ? ic.subtitle : "";
    const descRaw = typeof ic.description === "string" ? ic.description : "";
    let bgMode = "gradient";
    if (ic.backgroundMode === "solid") bgMode = "solid";
    else if (ic.backgroundMode === "image") bgMode = "image";
    const bgColor =
      typeof ic.backgroundColor === "string" ? ic.backgroundColor : "#12131a";
    const accColor =
      typeof ic.accentColor === "string" ? ic.accentColor : "#8038ce";
    const overlayColor =
      typeof ic.overlayColor === "string" ? ic.overlayColor : "#09090b";
    let overlayOpacity =
      typeof ic.overlayOpacity === "number" && !Number.isNaN(ic.overlayOpacity)
        ? ic.overlayOpacity
        : 0.35;
    overlayOpacity = Math.min(1, Math.max(0, overlayOpacity));

    const fontFamily =
      typeof ic.fontFamily === "string" && IMAGE_CARD_FONT_KEYS.has(ic.fontFamily)
        ? ic.fontFamily
        : "inter";
    let textSize = "m";
    if (ic.textSize === "s" || ic.textSize === "m" || ic.textSize === "l") textSize = ic.textSize;
    const fontWeight = ic.fontWeight === "bold" ? "bold" : "regular";
    const fontStyle = ic.fontStyle === "italic" ? "italic" : "normal";
    const textColor =
      typeof ic.textColor === "string" ? ic.textColor : "#f4f4f5";

    const legacyStyle = { fontFamily, textSize, fontWeight, fontStyle, textColor };

    function pickFieldStyle(obj) {
      const o = obj && typeof obj === "object" ? obj : {};
      const sz =
        o.textSize === "s" || o.textSize === "m" || o.textSize === "l"
          ? o.textSize
          : legacyStyle.textSize;
      const fw =
        o.fontWeight === "bold"
          ? "bold"
          : o.fontWeight === "regular"
            ? "regular"
            : legacyStyle.fontWeight;
      const fs =
        o.fontStyle === "italic"
          ? "italic"
          : o.fontStyle === "normal"
            ? "normal"
            : legacyStyle.fontStyle;
      return { textSize: sz, fontWeight: fw, fontStyle: fs };
    }

    const titleStyle = pickFieldStyle(ic.titleStyle);
    const subtitleStyle = pickFieldStyle(ic.subtitleStyle);

    const sharedRoot = resolveSharedDataDir();
    const fontDir = path.join(sharedRoot, "fonts", "welcome-card");
    const backgroundImagePath = resolveImageCardBackgroundPath(sharedRoot, ic.backgroundImage);

    const displayName = member.displayName || member.user.username;
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });

    try {
      const png = await generateWelcomeImageCardPngBuffer(
        {
          title: resolveTemplate(titleRaw, ctx),
          subtitle: resolveTemplate(subtitleRaw, ctx),
          description: resolveTemplate(descRaw, ctx),
          fontFamily,
          textColor,
          titleStyle,
          subtitleStyle,
          overlayColor,
          overlayOpacity,
          backgroundMode: bgMode,
          backgroundColor: bgColor,
          accentColor: accColor,
          backgroundImagePath,
          displayName,
          avatarUrl,
        },
        fontDir
      );

      const att = new AttachmentBuilder(png, { name: "welcome-card.png" });
      const messageRaw = typeof config.message === "string" ? config.message : "";
      const content = messageRaw.trim()
        ? `${resolveTemplate(messageRaw, ctx)}\n\u200B`
        : undefined;

      await channel.send({
        ...(content !== undefined ? { content } : {}),
        files: [att],
      });
      console.log(
        `[welcome] imageCard welcome sent for ${member.user.tag} (channel ${channelId})`
      );
      return;
    } catch (err) {
      const e = /** @type {Error} */ (err);
      console.warn(`[welcome] imageCard failed for ${member.user.tag}:`, e.message);

      const messageRaw = typeof config.message === "string" ? config.message : "";
      const fallback = messageRaw.trim()
        ? resolveTemplate(messageRaw, ctx)
        : `Добро пожаловать, ${ctx.mention}!`;

      try {
        await channel.send({ content: fallback });
        console.log(`[welcome] imageCard fallback text sent for ${member.user.tag}`);
      } catch (err2) {
        const e2 = /** @type {Error} */ (err2);
        console.warn(
          `[welcome] imageCard fallback send failed for ${member.user.tag}:`,
          e2.message
        );
      }
      return;
    }
  }

  try {
    if (style === "embed") {
      const messageRaw = typeof config.message === "string" ? config.message : "";
      const content = messageRaw.trim()
        ? resolveTemplate(messageRaw, ctx)
        : undefined;

      const titleRaw = typeof config.title === "string" ? config.title : "";
      const descRaw = typeof config.description === "string" ? config.description : "";
      const title = resolveTemplate(titleRaw, ctx).trim();
      const description = resolveTemplate(descRaw, ctx).trim();

      const colorInt = hexToDiscordColor(
        typeof config.color === "string" ? config.color : ""
      );
      const color = colorInt ?? 0x5865f2;

      const authorNameRaw =
        typeof config.embedAuthorName === "string" ? config.embedAuthorName : "";
      const authorName = resolveTemplate(authorNameRaw, ctx).trim();
      const showAvatar = config.embedAuthorAvatar === true;
      const avatarUrlStored =
        typeof config.embedAuthorAvatarUrl === "string"
          ? config.embedAuthorAvatarUrl.trim()
          : "";
      const iconURL =
        showAvatar &&
        (avatarUrlStored.startsWith("http://") || avatarUrlStored.startsWith("https://"))
          ? avatarUrlStored
          : undefined;

      const footerRaw = typeof config.embedFooter === "string" ? config.embedFooter : "";
      const footerText = resolveTemplate(footerRaw, ctx).trim();

      const fields = normalizeEmbedFields(config.embedFields, ctx);
      const { files: embedImageFiles, imageUrl: embedImageUrl } = await resolveEmbedImage(
        config.embedImageDataUrl,
        ctx
      );

      const hasAuthorBlock = Boolean(authorName || iconURL);
      const hasFooter = footerText.length > 0;
      const hasFields = fields.length > 0;
      const hasEmbedImage = Boolean(embedImageUrl);
      const hasTitle = title.length > 0;
      const hasDescription = description.length > 0;

      if (
        !hasTitle &&
        !hasDescription &&
        !hasFields &&
        !hasEmbedImage &&
        !hasFooter &&
        !hasAuthorBlock
      ) {
        console.log(
          "[welcome] embed skipped: no visible embed content after template resolution",
          { member: member.user.tag }
        );
        return;
      }

      const embed = new EmbedBuilder().setColor(color);
      if (hasTitle) embed.setTitle(title);
      if (hasDescription) embed.setDescription(description);
      if (hasAuthorBlock) {
        embed.setAuthor({
          name: authorName || "\u200b",
          ...(iconURL ? { iconURL } : {}),
        });
      }
      if (hasFooter) embed.setFooter({ text: footerText });
      if (hasFields) embed.addFields(fields);
      if (hasEmbedImage && embedImageUrl) embed.setImage(embedImageUrl);

      await channel.send({
        content: content ?? undefined,
        embeds: [embed],
        ...(embedImageFiles.length ? { files: embedImageFiles } : {}),
      });
      console.log(`[welcome] embed welcome sent for ${member.user.tag} (channel ${channelId})`);
      return;
    }

    // text (default)
    const messageRaw = typeof config.message === "string" ? config.message : "";
    const msg = resolveTemplate(messageRaw, ctx);
    const hasText = msg.trim().length > 0;

    const textImageRaw = config.textImageDataUrl;
    const attachment =
      textImageRaw && String(textImageRaw).trim()
        ? await resolveTextWelcomeAttachment(textImageRaw, ctx)
        : null;

    if (!hasText && !attachment) {
      console.log("[welcome] text skipped: empty message and no usable image", {
        member: member.user.tag,
      });
      return;
    }

    /** @type {import('discord.js').AttachmentBuilder[]} */
    const files = attachment ? [attachment] : [];

    await channel.send({
      content: hasText ? msg : undefined,
      ...(files.length ? { files } : {}),
    });
    console.log(`[welcome] text welcome sent for ${member.user.tag} (channel ${channelId})`);
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn(`[welcome] send failed for ${member.user.tag}:`, e.message);
  }
}

/**
 * Приветствие в ЛС + опционально отдельный текст в канал (только текст, без embed/imageCard).
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, unknown>} config
 */
async function sendWelcomeDm(member, config) {
  if (member.user.bot && config.skipBotAccounts === true) {
    console.log(`[welcome] DM skipped for bot ${member.user.tag} (skipBotAccounts)`);
    return;
  }

  const ctx = buildTemplateContext(member);

  const dmTemplateRaw =
    typeof config.welcomeDmMessage === "string"
      ? config.welcomeDmMessage
      : typeof config.message === "string"
        ? config.message
        : "";
  const dmContent = resolveTemplate(dmTemplateRaw, ctx).trim();
  if (!dmContent) {
    console.log("[welcome] DM skipped: empty welcomeDmMessage", { member: member.user.tag });
  } else {
    try {
      await member.user.send({ content: dmContent });
      console.log(`[welcome] DM welcome sent for ${member.user.tag}`);
    } catch (err) {
      const e = /** @type {Error & { code?: number }} */ (err);
      const code = e.code;
      console.warn(
        `[welcome] DM failed for ${member.user.tag}:`,
        e.message,
        typeof code === "number" ? `(code ${code})` : ""
      );
    }
  }

  if (config.welcomeDmAlsoSendToChannel !== true) return;

  const chRaw = config.welcomeDmChannelId;
  const channelId = typeof chRaw === "string" ? chRaw.trim() : "";
  if (!channelId) {
    console.warn("[welcome] channel copy skipped: welcomeDmChannelId missing");
    return;
  }
  if (!isNonEmptySnowflake(channelId)) {
    console.warn("[welcome] channel copy skipped: welcomeDmChannelId is not a valid snowflake");
    return;
  }

  const chMsgRaw =
    typeof config.welcomeDmChannelMessage === "string"
      ? config.welcomeDmChannelMessage
      : typeof config.message === "string"
        ? config.message
        : "";
  const channelText = resolveTemplate(chMsgRaw, ctx).trim();
  if (!channelText) {
    console.log("[welcome] channel copy skipped: empty welcomeDmChannelMessage", {
      member: member.user.tag,
    });
    return;
  }

  /** @type {import('discord.js').GuildChannel | import('discord.js').ThreadChannel | null} */
  let channel = null;
  try {
    const fetched = await member.guild.channels.fetch(channelId);
    channel = fetched;
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn(`[welcome] channel copy: could not fetch channel ${channelId}:`, e.message);
    return;
  }

  if (!channel || !channel.isTextBased()) {
    console.warn(`[welcome] channel copy: channel ${channelId} is not text-sendable`);
    return;
  }

  try {
    await channel.send({ content: channelText });
    console.log(`[welcome] channel copy sent for ${member.user.tag} (channel ${channelId})`);
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn(`[welcome] channel copy send failed for ${member.user.tag}:`, e.message);
  }
}

/**
 * @param {import('discord.js').GuildMember} member
 */
async function handleGuildMemberAdd(member) {
  try {
    const guildId = member.guild.id;
    console.log(`[member] joined: ${member.user.tag} (guild ${guildId})`);

    const shared = await configStore.readRawConfig();
    if (!shared) {
      console.log("[member] no valid shared config; skipping guild handlers");
      return;
    }

    const config = configStore.getGuildConfig(shared, guildId);
    if (!config) {
      console.log(`[member] no config entry for guild ${guildId}; skipping`);
      return;
    }

    console.log(`[welcome] guild config found for guild ${guildId}`);

    const isBot = member.user.bot === true;

    if (isBot) {
      await assignAutoRole(member, config.botRoleId, "bot");
    } else {
      await assignAutoRole(member, config.humanRoleId, "human");
    }

    if (config.welcomeEnabled === false) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[welcome] disabled for guild ${guildId}`);
      }
      return;
    }

    const modeRaw = config.welcomeDeliveryMode;
    const mode =
      typeof modeRaw === "string" ? modeRaw.trim().toLowerCase() : "channel";
    if (mode === "dm") {
      await sendWelcomeDm(member, config);
    } else {
      await sendWelcome(member, config);
    }
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.error("[GuildMemberAdd] unexpected error:", e.message);
  }
}

module.exports = {
  readSharedConfig: configStore.readRawConfig,
  getGuildConfig: configStore.getGuildConfig,
  resolveTemplate,
  hexToDiscordColor,
  assignAutoRole,
  sendWelcome,
  sendWelcomeDm,
  handleGuildMemberAdd,
  get CONFIG_PATH() {
    return configFilePath();
  },
};
