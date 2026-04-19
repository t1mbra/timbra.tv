const fs = require("fs/promises");
const path = require("path");
const { guildConfigFromShared } = require("./guildConfigFromShared");

/**
 * @typedef {{ guilds?: Record<string, unknown> }} SharedConfigShape
 */

/**
 * Тот же путь, что в `lib/guildMemberAdd.js` до рефакторинга:
 * `discord-bot/lib` → два уровня вверх → `shared-data/config.json` относительно корня репо
 * (из `lib/persistence` — на один уровень глубже).
 * @returns {string}
 */
function configFilePath() {
  return path.join(__dirname, "..", "..", "..", "shared-data", "config.json");
}

/**
 * @returns {Promise<SharedConfigShape | null>}
 */
async function readRawConfig() {
  const CONFIG_PATH = configFilePath();
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("guilds" in data) ||
      typeof data.guilds !== "object" ||
      data.guilds === null
    ) {
      console.warn(
        "[jsonConfigStore] invalid shape: expected top-level object with guilds"
      );
      return null;
    }
    return /** @type {SharedConfigShape} */ (data);
  } catch (err) {
    const e = /** @type {NodeJS.ErrnoException} */ (err);
    if (e.code === "ENOENT") {
      console.warn("[jsonConfigStore] file missing:", CONFIG_PATH);
      return null;
    }
    console.warn("[jsonConfigStore] read or parse failed:", e.message);
    return null;
  }
}

/**
 * @param {SharedConfigShape | null} shared
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
  const shared = await readRawConfig();
  return getGuildConfig(shared, guildId);
}

module.exports = {
  readRawConfig,
  getGuildConfig,
  getGuildConfigById,
  configFilePath,
};
