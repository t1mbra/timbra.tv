/**
 * Разрешает `pg` из `discord-bot/node_modules` при запуске скриптов из корня репо.
 */
const path = require("node:path");

function getDiscordBotRoot() {
  return path.join(__dirname, "..", "discord-bot");
}

function requirePg() {
  const { Pool } = require(require.resolve("pg", { paths: [getDiscordBotRoot()] }));
  return { Pool };
}

function tryLoadDotenv() {
  try {
    const dotenv = require(require.resolve("dotenv", { paths: [getDiscordBotRoot()] }));
    dotenv.config({ path: path.join(getDiscordBotRoot(), ".env") });
  } catch {
    /* optional */
  }
}

module.exports = { getDiscordBotRoot, requirePg, tryLoadDotenv };
