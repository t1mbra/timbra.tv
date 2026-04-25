const { PermissionFlagsBits } = require("discord.js");

const SNOWFLAKE_RE = /^\d{17,20}$/;

/**
 * @param {unknown} id
 * @returns {id is string}
 */
function isNonEmptySnowflake(id) {
  return typeof id === "string" && SNOWFLAKE_RE.test(id.trim());
}

/**
 * @param {unknown} raw
 * @param {string} guildId
 * @returns {string[]}
 */
function parseSnowflakeList(raw, guildId) {
  if (!Array.isArray(raw)) return [];
  /** @type {string[]} */
  const out = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!SNOWFLAKE_RE.test(t) || t === guildId) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
function normalizeMemberRoleIds(config, guildId) {
  let ids = parseSnowflakeList(config.memberRoleIds, guildId);
  if (ids.length === 0 && isNonEmptySnowflake(config.humanRoleId)) {
    const h = /** @type {string} */ (config.humanRoleId).trim();
    if (h !== guildId) ids = [h];
  }
  return ids;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
function normalizeBotRoleIds(config, guildId) {
  let ids = parseSnowflakeList(config.botRoleIds, guildId);
  if (ids.length === 0 && isNonEmptySnowflake(config.botRoleId)) {
    const b = /** @type {string} */ (config.botRoleId).trim();
    if (b !== guildId) ids = [b];
  }
  return ids;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
function isAutoRolesGloballyEnabled(config, guildId) {
  const hasLegacyHuman =
    isNonEmptySnowflake(config.humanRoleId) &&
    /** @type {string} */ (config.humanRoleId).trim() !== guildId;
  const memberIds = normalizeMemberRoleIds(config, guildId);
  if (config.autoRolesEnabled === false) return false;
  if (config.autoRolesEnabled === true) return true;
  return Boolean(hasLegacyHuman || memberIds.length > 0);
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
function isBotAutoRolesEnabled(config, guildId) {
  return config.botAutoRolesEnabled === true;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
function botUsesSeparateRoles(config, guildId) {
  if (Object.prototype.hasOwnProperty.call(config, "botUseSeparateRoles")) {
    return config.botUseSeparateRoles === true;
  }
  const memberIds = normalizeMemberRoleIds(config, guildId);
  const botIds = normalizeBotRoleIds(config, guildId);
  if (memberIds.length === 0 && botIds.length > 0) return true;
  const hh = isNonEmptySnowflake(config.humanRoleId);
  const bb = isNonEmptySnowflake(config.botRoleId);
  if (!hh || !bb) return false;
  return (
    /** @type {string} */ (config.humanRoleId).trim() !==
    /** @type {string} */ (config.botRoleId).trim()
  );
}

/**
 * @param {Record<string, unknown>} config
 */
function delayMillisFromConfig(enabled, valueRaw, unitRaw) {
  if (enabled !== true) return 0;
  const v = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? Math.max(1, Math.floor(valueRaw)) : 1;
  const u = typeof unitRaw === "string" ? unitRaw.trim().toLowerCase() : "seconds";
  if (u === "minutes") return v * 60_000;
  if (u === "hours") return v * 3_600_000;
  if (u === "days") return v * 86_400_000;
  return v * 1000;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} roleId
 * @param {string} guildId
 * @param {'member' | 'bot'} kind
 */
async function assignOneAutoRole(member, roleId, guildId, kind) {
  if (!isNonEmptySnowflake(roleId)) return;
  const rid = roleId.trim();
  if (rid === member.guild.id) {
    console.warn("[autoRoles] skip @everyone-equivalent role", { guildId, roleId: rid, kind });
    return;
  }
  try {
    const role =
      member.guild.roles.cache.get(rid) ?? (await member.guild.roles.fetch(rid).catch(() => null));
    if (!role) {
      console.warn("[autoRoles] role not found", { guildId, roleId: rid, kind });
      return;
    }
    if (role.managed) {
      console.warn("[autoRoles] role is managed / integration-owned", { guildId, roleId: rid, kind });
      return;
    }
    if (role.id === member.guild.id) {
      console.warn("[autoRoles] skip guild everyone role", { guildId, kind });
      return;
    }
    const me = member.guild.members.me;
    if (!me) {
      console.warn("[autoRoles] bot member not available", { guildId, kind });
      return;
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.warn("[autoRoles] bot lacks ManageRoles", { guildId, kind });
      return;
    }
    const highest = me.roles.highest;
    if (role.position >= highest.position) {
      console.warn("[autoRoles] role is not below bot's highest role", {
        guildId,
        roleId: rid,
        kind,
      });
      return;
    }
    if (member.roles.cache.has(rid)) return;
    await member.roles.add(role, "Auto-roles: member joined");
    console.log(`[autoRoles] ${kind}: assigned ${role.name} (${rid}) to ${member.user.tag}`);
  } catch (err) {
    const e = /** @type {Error} */ (err);
    console.warn("[autoRoles] assign failed", {
      guildId,
      roleId: rid,
      kind,
      message: e.message,
    });
  }
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string[]} roleIds
 * @param {string} guildId
 * @param {'member' | 'bot'} kind
 */
async function assignAutoRolesSequential(member, roleIds, guildId, kind) {
  for (const id of roleIds) {
    await assignOneAutoRole(member, id, guildId, kind);
  }
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
async function runMemberAutoRolesPipeline(member, config, guildId) {
  if (!isAutoRolesGloballyEnabled(config, guildId)) return;
  const roleIds = normalizeMemberRoleIds(config, guildId);
  if (roleIds.length === 0) return;

  if (config.waitForMembershipScreening === true && member.pending === true) {
    return;
  }

  const delayMs = delayMillisFromConfig(
    config.memberDelayEnabled === true,
    config.memberDelayValue,
    config.memberDelayUnit
  );
  if (delayMs > 0) await sleep(delayMs);

  await assignAutoRolesSequential(member, roleIds, guildId, "member");
}

/**
 * @param {import('discord.js').GuildMember} member
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
async function runBotAutoRolesPipeline(member, config, guildId) {
  if (!isAutoRolesGloballyEnabled(config, guildId)) return;
  if (!isBotAutoRolesEnabled(config, guildId)) return;

  const useSep = botUsesSeparateRoles(config, guildId);
  const roleIds = useSep
    ? normalizeBotRoleIds(config, guildId)
    : normalizeMemberRoleIds(config, guildId);
  if (roleIds.length === 0) return;

  const delayMs = delayMillisFromConfig(
    config.botDelayEnabled === true,
    config.botDelayValue,
    config.botDelayUnit
  );
  if (delayMs > 0) await sleep(delayMs);

  await assignAutoRolesSequential(member, roleIds, guildId, "bot");
}

/**
 * После прохождения screening: pending true → false.
 * @param {import('discord.js').GuildMember} oldMember
 * @param {import('discord.js').GuildMember} newMember
 * @param {Record<string, unknown>} config
 * @param {string} guildId
 */
async function runMemberAutoRolesAfterScreening(oldMember, newMember, config, guildId) {
  if (!isAutoRolesGloballyEnabled(config, guildId)) return;
  if (config.waitForMembershipScreening !== true) return;
  if (oldMember.pending !== true || newMember.pending !== false) return;
  if (newMember.user.bot) return;

  const roleIds = normalizeMemberRoleIds(config, guildId);
  if (roleIds.length === 0) return;

  const delayMs = delayMillisFromConfig(
    config.memberDelayEnabled === true,
    config.memberDelayValue,
    config.memberDelayUnit
  );
  if (delayMs > 0) await sleep(delayMs);

  await assignAutoRolesSequential(newMember, roleIds, guildId, "member");
}

/**
 * Совместимость со старым API guildMemberAdd (одна роль).
 * @param {import('discord.js').GuildMember} member
 * @param {unknown} roleIdRaw
 * @param {'human' | 'bot'} kind
 */
async function assignAutoRole(member, roleIdRaw, kind) {
  if (!isNonEmptySnowflake(roleIdRaw)) return;
  const guildId = member.guild.id;
  await assignOneAutoRole(
    member,
    /** @type {string} */ (roleIdRaw).trim(),
    guildId,
    kind === "bot" ? "bot" : "member"
  );
}

module.exports = {
  normalizeMemberRoleIds,
  normalizeBotRoleIds,
  isAutoRolesGloballyEnabled,
  isBotAutoRolesEnabled,
  botUsesSeparateRoles,
  runMemberAutoRolesPipeline,
  runBotAutoRolesPipeline,
  runMemberAutoRolesAfterScreening,
  assignAutoRole,
};
