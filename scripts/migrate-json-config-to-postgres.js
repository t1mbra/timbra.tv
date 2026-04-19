/**
 * Переносит guild-конфиги из shared-data/config.json в Postgres (guild_configs).
 * JSON-файл не удаляется. Повторный запуск идемпотентен (ON CONFLICT DO UPDATE).
 *
 * Запуск:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-json-config-to-postgres.js
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const { requirePg, tryLoadDotenv } = require("./loadPg");

async function main() {
  tryLoadDotenv();

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("FAIL: DATABASE_URL is required");
    process.exit(1);
  }

  const configPath = path.join(__dirname, "..", "shared-data", "config.json");
  let raw;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (e) {
    console.error("FAIL: cannot read", configPath, e);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("FAIL: invalid JSON", e);
    process.exit(1);
  }

  const guilds =
    data &&
    typeof data === "object" &&
    data.guilds &&
    typeof data.guilds === "object" &&
    !Array.isArray(data.guilds)
      ? data.guilds
      : {};

  const { Pool } = requirePg();
  const pool = new Pool({ connectionString: url, max: 5 });

  let migrated = 0;
  try {
    for (const [guildId, config] of Object.entries(guilds)) {
      if (typeof guildId !== "string" || !guildId) continue;
      if (!config || typeof config !== "object" || Array.isArray(config)) continue;
      await pool.query(
        `INSERT INTO guild_configs (guild_id, config, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (guild_id) DO UPDATE SET
           config = EXCLUDED.config,
           updated_at = now()`,
        [guildId, JSON.stringify(config)]
      );
      migrated += 1;
    }
  } finally {
    await pool.end();
  }

  console.log(`OK: migrated ${migrated} guild config(s) into Postgres (JSON file unchanged).`);
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
