const fs = require("fs/promises");
const path = require("path");
const { resolveSharedDataDir } = require("../resolveSharedDataDir");

const isDevLogging =
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_SHARED_DATA === "1";

/**
 * @param {{ version: number, updatedAt: string, guildIds: string[] }} payload
 */
async function writeBotStatePayload(payload) {
  const SHARED_DATA_DIR = resolveSharedDataDir();
  const BOT_STATE_PATH = path.join(SHARED_DATA_DIR, "bot-state.json");
  const BOT_STATE_TMP_PATH = path.join(SHARED_DATA_DIR, "bot-state.tmp.json");

  if (isDevLogging) {
    console.log(
      "[jsonBotStateStore] write attempt SHARED_DATA_DIR=%s BOT_STATE_PATH=%s cwd=%s",
      SHARED_DATA_DIR,
      BOT_STATE_PATH,
      process.cwd()
    );
  }

  await fs.mkdir(SHARED_DATA_DIR, { recursive: true });
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(BOT_STATE_TMP_PATH, body, "utf8");
  await fs.rename(BOT_STATE_TMP_PATH, BOT_STATE_PATH);

  if (isDevLogging) {
    console.log(
      "[jsonBotStateStore] записано OK guildIds=%d updatedAt=%s path=%s",
      payload.guildIds.length,
      payload.updatedAt,
      BOT_STATE_PATH
    );
  }
}

function botStateFilePath() {
  return path.join(resolveSharedDataDir(), "bot-state.json");
}

/**
 * @returns {Promise<Set<string>>}
 */
async function getConnectedGuildIds() {
  const botStatePath = botStateFilePath();
  try {
    const raw = await fs.readFile(botStatePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return new Set();
    }

    let ids = null;

    if (Array.isArray(parsed.guildIds)) {
      ids = new Set();
      for (const id of parsed.guildIds) {
        if (typeof id === "string" && id.length > 0) {
          ids.add(id);
        }
      }
    } else if (Array.isArray(parsed.guilds)) {
      ids = new Set();
      for (const entry of parsed.guilds) {
        if (
          entry &&
          typeof entry === "object" &&
          "id" in entry &&
          typeof entry.id === "string"
        ) {
          ids.add(entry.id);
        }
      }
    }

    return ids ?? new Set();
  } catch {
    return new Set();
  }
}

/**
 * @param {string} guildId
 */
async function isBotConnected(guildId) {
  const ids = await getConnectedGuildIds();
  return ids.has(guildId);
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
