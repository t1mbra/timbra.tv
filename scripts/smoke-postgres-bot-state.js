/**
 * Smoke: таблица bot_guild_state + проверка модулей бота (postgres).
 * Не затирает все строки — только добавляет/удаляет test_guild_001.
 * Запуск:
 *   PERSISTENCE_DRIVER=postgres DATABASE_URL="postgresql://..." node scripts/smoke-postgres-bot-state.js
 */
const path = require("node:path");
const { requirePg, tryLoadDotenv } = require("./loadPg");

const TEST_GUILD_ID = "test_guild_001";

async function main() {
  tryLoadDotenv();

  if (process.env.PERSISTENCE_DRIVER !== "postgres") {
    console.error("FAIL: set PERSISTENCE_DRIVER=postgres");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("FAIL: DATABASE_URL is required");
    process.exit(1);
  }

  const { Pool } = requirePg();
  const pool = new Pool({ connectionString: url, max: 2 });

  try {
    await pool.query("DELETE FROM bot_guild_state WHERE guild_id = $1", [TEST_GUILD_ID]);

    await pool.query(
      `INSERT INTO bot_guild_state (guild_id, updated_at) VALUES ($1, now())
       ON CONFLICT (guild_id) DO UPDATE SET updated_at = now()`,
      [TEST_GUILD_ID]
    );

    const { rows } = await pool.query(
      `SELECT guild_id FROM bot_guild_state WHERE guild_id = $1`,
      [TEST_GUILD_ID]
    );
    if (rows.length !== 1 || rows[0].guild_id !== TEST_GUILD_ID) {
      console.error("FAIL: direct SQL read mismatch");
      process.exit(1);
    }

    process.env.DATABASE_URL = url;
    const botRoot = path.join(__dirname, "..", "discord-bot");
    const pgStore = require(path.join(
      botRoot,
      "lib/persistence/postgresBotStateStore.js"
    ));
    const ids = await pgStore.getConnectedGuildIds();
    if (!ids.has(TEST_GUILD_ID)) {
      console.error("FAIL: getConnectedGuildIds missing test id", [...ids]);
      process.exit(1);
    }
    const connected = await pgStore.isBotConnected(TEST_GUILD_ID);
    if (!connected) {
      console.error("FAIL: isBotConnected false");
      process.exit(1);
    }

    await pool.query("DELETE FROM bot_guild_state WHERE guild_id = $1", [TEST_GUILD_ID]);
    if ((await pgStore.getConnectedGuildIds()).has(TEST_GUILD_ID)) {
      console.error("FAIL: row still visible after delete");
      process.exit(1);
    }

    console.log(
      "OK: Postgres bot_guild_state smoke test passed (test row removed; store API verified)."
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
