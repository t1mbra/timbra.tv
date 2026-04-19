const { getPool } = require("./pgPool");
const { guildConfigFromShared } = require("./guildConfigFromShared");

/**
 * @returns {Promise<{ guilds: Record<string, unknown> } | null>}
 */
async function readRawConfig() {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT guild_id, config FROM guild_configs ORDER BY guild_id`
    );
    /** @type {Record<string, unknown>} */
    const guilds = {};
    for (const row of rows) {
      if (
        row &&
        typeof row.guild_id === "string" &&
        row.config &&
        typeof row.config === "object"
      ) {
        guilds[row.guild_id] = row.config;
      }
    }
    return { guilds };
  } catch (err) {
    console.warn("[postgresConfigStore] readRawConfig failed:", err);
    return null;
  }
}

/**
 * @param {{ guilds?: Record<string, unknown> } | null | undefined} shared
 * @param {string} guildId
 * @returns {Record<string, unknown> | null}
 */
function getGuildConfig(shared, guildId) {
  return guildConfigFromShared(shared, guildId);
}

/**
 * @param {string} guildId
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function getGuildConfigById(guildId) {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT config FROM guild_configs WHERE guild_id = $1`,
      [guildId]
    );
    const g = rows[0]?.config;
    if (!g || typeof g !== "object" || Array.isArray(g)) return null;
    return /** @type {Record<string, unknown>} */ (g);
  } catch (err) {
    console.warn("[postgresConfigStore] getGuildConfigById failed:", err);
    return null;
  }
}

module.exports = {
  readRawConfig,
  /** Выборка из объекта, уже прочитанного из Postgres (@see readRawConfig). */
  getGuildConfig,
  getGuildConfigById,
};
