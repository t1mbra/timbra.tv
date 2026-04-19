const { getPersistenceDriver } = require("./driver");
const json = require("./jsonConfigStore");
const postgres = require("./postgresConfigStore");

async function readRawConfig() {
  return getPersistenceDriver() === "postgres"
    ? postgres.readRawConfig()
    : json.readRawConfig();
}

function getGuildConfig(shared, guildId) {
  return json.getGuildConfig(shared, guildId);
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
