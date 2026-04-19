const { getPersistenceDriver } = require("./driver");
const json = require("./jsonConfigStore");
const postgres = require("./postgresConfigStore");
const { guildConfigFromShared } = require("./guildConfigFromShared");

async function readRawConfig() {
  return getPersistenceDriver() === "postgres"
    ? postgres.readRawConfig()
    : json.readRawConfig();
}

/**
 * Достаёт конфиг из результата readRawConfig() (источник — JSON-файл или Postgres).
 */
function getGuildConfig(shared, guildId) {
  return guildConfigFromShared(shared, guildId);
}

async function getGuildConfigById(guildId) {
  return getPersistenceDriver() === "postgres"
    ? postgres.getGuildConfigById(guildId)
    : json.getGuildConfigById(guildId);
}

module.exports = {
  readRawConfig,
  getGuildConfig,
  getGuildConfigById,
};
