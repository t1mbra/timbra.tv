import { getPool } from "@/lib/persistence/pgPool";

export function getBotStatePathForDebug(): string {
  return "[postgres] public.bot_guild_state";
}

export async function getConnectedGuildIds(): Promise<Set<string>> {
  const pool = getPool();
  const { rows } = await pool.query<{ guild_id: string }>(
    `SELECT guild_id FROM bot_guild_state`
  );
  return new Set(rows.map((r) => r.guild_id));
}

export async function isBotConnected(guildId: string): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT 1 FROM bot_guild_state WHERE guild_id = $1 LIMIT 1`,
    [guildId]
  );
  return rows.length > 0;
}

export async function writeConnectedGuildIds(
  _guildIds: readonly string[]
): Promise<void> {
  throw new Error(
    "Dashboard does not write bot guild state; only the Discord bot process does."
  );
}
