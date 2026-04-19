const fs = require("fs/promises");
const path = require("path");
const { resolveSharedDataDir } = require("./resolveSharedDataDir");

const WRITE_DEBOUNCE_MS = 400;

const isDevLogging =
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_SHARED_DATA === "1";

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;

function getPaths() {
  const SHARED_DATA_DIR = resolveSharedDataDir();
  return {
    SHARED_DATA_DIR,
    BOT_STATE_PATH: path.join(SHARED_DATA_DIR, "bot-state.json"),
    BOT_STATE_TMP_PATH: path.join(SHARED_DATA_DIR, "bot-state.tmp.json"),
  };
}

/**
 * @param {import("discord.js").Client} client
 */
function buildPayload(client) {
  const guildIds = client.guilds.cache.map((g) => g.id).sort();
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    guildIds,
  };
}

/**
 * Атомарная запись: tmp → rename в bot-state.json
 * @param {import("discord.js").Client} client
 */
async function writeBotStateNow(client) {
  const { SHARED_DATA_DIR, BOT_STATE_PATH, BOT_STATE_TMP_PATH } = getPaths();

  if (isDevLogging) {
    console.log(
      "[bot-state] write attempt SHARED_DATA_DIR=%s BOT_STATE_PATH=%s cwd=%s",
      SHARED_DATA_DIR,
      BOT_STATE_PATH,
      process.cwd()
    );
  }

  try {
    await fs.mkdir(SHARED_DATA_DIR, { recursive: true });
    const payload = buildPayload(client);
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    await fs.writeFile(BOT_STATE_TMP_PATH, body, "utf8");
    await fs.rename(BOT_STATE_TMP_PATH, BOT_STATE_PATH);

    if (isDevLogging) {
      console.log(
        "[bot-state] записано OK guildIds=%d updatedAt=%s path=%s",
        payload.guildIds.length,
        payload.updatedAt,
        BOT_STATE_PATH
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[bot-state] не удалось записать bot-state.json:", msg);
  }
}

/**
 * Отложенная запись (debounce), чтобы не дёргать диск на сериях guildCreate/Delete
 * @param {import("discord.js").Client} client
 */
function scheduleBotStateWrite(client) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void writeBotStateNow(client);
  }, WRITE_DEBOUNCE_MS);
}

module.exports = {
  writeBotStateNow,
  scheduleBotStateWrite,
};
