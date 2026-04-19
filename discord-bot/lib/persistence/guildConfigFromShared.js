/**
 * Чистая функция: достаёт конфиг гильдии из уже загруженного объекта `{ guilds }`.
 * Без файлов и без БД — используется после readRawConfig() (json или postgres).
 *
 * @param {{ guilds?: Record<string, unknown> } | null | undefined} shared
 * @param {string} guildId
 * @returns {Record<string, unknown> | null}
 */
function guildConfigFromShared(shared, guildId) {
  if (!shared || !guildId || typeof guildId !== "string") return null;
  const g = shared.guilds?.[guildId];
  if (!g || typeof g !== "object" || Array.isArray(g)) return null;
  return /** @type {Record<string, unknown>} */ (g);
}

module.exports = { guildConfigFromShared };
