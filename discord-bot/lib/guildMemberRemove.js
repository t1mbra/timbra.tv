const { AttachmentBuilder } = require("discord.js");
const configStore = require("./persistence/configStore");

const SNOWFLAKE_RE = /^\d{17,20}$/;

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

function bufferFromDataUrl(raw) {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(typeof raw === "string" ? raw.trim() : "");
  if (!m) return null;
  try {
    return Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
}

async function bufferFromHttpUrl(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

async function handleGuildMemberRemove(member) {
  try {
    const guildId = member.guild.id;
    const shared = await configStore.readRawConfig();
    if (!shared) return;
    const config = configStore.getGuildConfig(shared, guildId);
    if (!config) return;

    if (config.farewellEnabled !== true) return;

    const channelId =
      typeof config.farewellChannelId === "string" ? config.farewellChannelId.trim() : "";
    if (!channelId || !SNOWFLAKE_RE.test(channelId)) return;

    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const template =
      typeof config.farewellMessage === "string"
        ? config.farewellMessage
        : "{username} покинул сервер {server}. Будем скучать 🌙";
    const username = member.displayName || member.user?.globalName || member.user?.username || "Участник";
    const msg = resolveTemplate(template, {
      mention: `<@${member.id}>`,
      username,
      serverName: member.guild.name,
      memberCount: member.guild.memberCount,
      dateStr: new Date().toLocaleDateString(),
    });
    if (!msg.trim()) return;

    const imageRaw =
      typeof config.farewellImageDataUrl === "string" ? config.farewellImageDataUrl.trim() : "";
    if (!imageRaw) {
      await channel.send({ content: msg });
      return;
    }

    let imageBuffer = null;
    if (imageRaw.startsWith("data:")) {
      imageBuffer = bufferFromDataUrl(imageRaw);
    } else if (/^https?:\/\//i.test(imageRaw)) {
      imageBuffer = await bufferFromHttpUrl(imageRaw);
    }
    if (!imageBuffer) {
      await channel.send({ content: msg });
      return;
    }
    const filenameRaw =
      typeof config.farewellImageFilename === "string" ? config.farewellImageFilename.trim() : "";
    const safeFilename = filenameRaw.replace(/[^\w.\-]/g, "_") || "farewell-message.png";
    const attachment = new AttachmentBuilder(imageBuffer, { name: safeFilename });
    await channel.send({ content: msg, files: [attachment] });
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn("[farewell] send failed:", e.message);
  }
}

module.exports = {
  handleGuildMemberRemove,
  resolveFarewellTemplate: resolveTemplate,
};

