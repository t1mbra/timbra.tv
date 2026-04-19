const { getPersistenceDriver } = require("./driver");
const json = require("./jsonBotStateStore");
const postgres = require("./postgresBotStateStore");

function backend() {
  return getPersistenceDriver() === "postgres" ? postgres : json;
}

/**
 * @param {{ version: number, updatedAt: string, guildIds: string[] }} payload
 */
async function writeBotStatePayload(payload) {
  return backend().writeBotStatePayload(payload);
}

async function getConnectedGuildIds() {
  return backend().getConnectedGuildIds();
}

async function isBotConnected(guildId) {
  return backend().isBotConnected(guildId);
}

async function writeConnectedGuildIds(guildIds) {
  return backend().writeConnectedGuildIds(guildIds);
}

module.exports = {
  writeBotStatePayload,
  getConnectedGuildIds,
  isBotConnected,
  writeConnectedGuildIds,
};
