/**
 * Короткий in-memory кэш ответа GET /api/discord/guilds/[guildId]/resources
 * (снимает повторные медленные вызовы Discord при навигации в пределах одного процесса).
 */
const TTL_MS = 45_000;

type CachedPayload = Record<string, unknown>;

const store = new Map<string, { expiresAt: number; payload: CachedPayload }>();

export function getGuildResourcesCached(guildId: string): CachedPayload | null {
  const row = store.get(guildId);
  if (!row || Date.now() > row.expiresAt) {
    if (row) store.delete(guildId);
    return null;
  }
  return row.payload;
}

export function setGuildResourcesCached(
  guildId: string,
  payload: CachedPayload
): void {
  store.set(guildId, { expiresAt: Date.now() + TTL_MS, payload });
}
