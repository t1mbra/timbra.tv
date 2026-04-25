const configStore = require("./persistence/configStore");
const { runMemberAutoRolesAfterScreening } = require("./autoRolesRuntime");

/**
 * @param {import('discord.js').GuildMember} oldMember
 * @param {import('discord.js').GuildMember} newMember
 */
async function handleGuildMemberUpdate(oldMember, newMember) {
  try {
    if (oldMember.guild.id !== newMember.guild.id) return;
    const guildId = newMember.guild.id;
    const shared = await configStore.readRawConfig();
    if (!shared) return;
    const config = configStore.getGuildConfig(shared, guildId);
    if (!config) return;
    const cfg = /** @type {Record<string, unknown>} */ (config);
    await runMemberAutoRolesAfterScreening(oldMember, newMember, cfg, guildId);
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.error("[GuildMemberUpdate] unexpected error:", e.message);
  }
}

module.exports = { handleGuildMemberUpdate };
