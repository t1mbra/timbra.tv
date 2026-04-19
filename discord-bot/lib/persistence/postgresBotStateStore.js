const { getPool } = require("./pgPool");

/**
 * @param {{ version: number, updatedAt: string, guildIds: string[] }} payload
 */
async function writeBotStatePayload(payload) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM bot_guild_state");
    const seen = new Set();
    for (const id of payload.guildIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      await client.query(
        `INSERT INTO bot_guild_state (guild_id, updated_at) VALUES ($1, now())`,
        [id]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * @returns {Promise<Set<string>>}
 */
async function getConnectedGuildIds() {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT guild_id FROM bot_guild_state`);
  return new Set(rows.map((r) => r.guild_id).filter((id) => typeof id === "string"));
}

/**
 * @param {string} guildId
 */
async function isBotConnected(guildId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT 1 FROM bot_guild_state WHERE guild_id = $1 LIMIT 1`,
    [guildId]
  );
  return rows.length > 0;
}

/**
 * @param {readonly string[]} guildIds
 */
async function writeConnectedGuildIds(guildIds) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    guildIds: [...guildIds].sort(),
  };
  await writeBotStatePayload(payload);
}

module.exports = {
  writeBotStatePayload,
  getConnectedGuildIds,
  isBotConnected,
  writeConnectedGuildIds,
};
