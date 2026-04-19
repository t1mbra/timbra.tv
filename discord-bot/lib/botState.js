const { writeBotStatePayload } = require("./persistence/botStateStore");

const WRITE_DEBOUNCE_MS = 400;

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;

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
 * @param {import("discord.js").Client} client
 */
async function writeBotStateNow(client) {
  try {
    const payload = buildPayload(client);
    await writeBotStatePayload(payload);
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
