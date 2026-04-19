/**
 * Smoke: таблица guild_configs (запись / чтение / очистка тестовой строки).
 * Запуск из корня репозитория:
 *   PERSISTENCE_DRIVER=postgres DATABASE_URL="postgresql://..." node scripts/smoke-postgres-config.js
 */
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

  const testConfig = {
    channelId: "",
    message: "smoke-verify-config",
    welcomeStyle: "text",
  };

  try {
    await pool.query("DELETE FROM guild_configs WHERE guild_id = $1", [TEST_GUILD_ID]);

    await pool.query(
      `INSERT INTO guild_configs (guild_id, config, updated_at)
       VALUES ($1, $2::jsonb, now())`,
      [TEST_GUILD_ID, JSON.stringify(testConfig)]
    );

    const { rows } = await pool.query(
      `SELECT config FROM guild_configs WHERE guild_id = $1`,
      [TEST_GUILD_ID]
    );
    const cfg = rows[0]?.config;
    if (!cfg || cfg.message !== "smoke-verify-config") {
      console.error("FAIL: read back mismatch", cfg);
      process.exit(1);
    }

    await pool.query("DELETE FROM guild_configs WHERE guild_id = $1", [TEST_GUILD_ID]);

    console.log("OK: Postgres guild_configs smoke test passed (test row removed).");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
