import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";
import { getPool } from "@/lib/persistence/pgPool";

export async function readRawConfig(): Promise<RootConfig> {
  const pool = getPool();
  const { rows } = await pool.query<{ guild_id: string; config: GuildConfig }>(
    `SELECT guild_id, config FROM guild_configs ORDER BY guild_id`
  );
  const guilds: Record<string, GuildConfig> = {};
  for (const row of rows) {
    guilds[row.guild_id] = row.config;
  }
  return { guilds };
}

export async function writeRawConfig(root: RootConfig): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM guild_configs");
    const entries = Object.entries(root.guilds ?? {});
    for (const [guildId, config] of entries) {
      await client.query(
        `INSERT INTO guild_configs (guild_id, config, updated_at)
         VALUES ($1, $2::jsonb, now())`,
        [guildId, JSON.stringify(config)]
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

export async function getGuildConfig(
  guildId: string
): Promise<GuildConfig | undefined> {
  const pool = getPool();
  const { rows } = await pool.query<{ config: GuildConfig }>(
    `SELECT config FROM guild_configs WHERE guild_id = $1`,
    [guildId]
  );
  return rows[0]?.config;
}

export async function getAllGuildConfigs(): Promise<Record<string, GuildConfig>> {
  const root = await readRawConfig();
  return root.guilds ?? {};
}

export async function saveGuildConfig(
  guildId: string,
  config: GuildConfig
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO guild_configs (guild_id, config, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (guild_id) DO UPDATE SET
       config = EXCLUDED.config,
       updated_at = now()`,
    [guildId, JSON.stringify(config)]
  );
}
