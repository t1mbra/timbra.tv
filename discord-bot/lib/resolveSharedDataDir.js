const path = require("path");

/**
 * Должен совпадать по смыслу с `discord-bot-dashboard/lib/resolveSharedDataDir.ts`.
 * См. комментарий там про SHARED_DATA_DIR и разные контейнеры.
 * @returns {string}
 */
function resolveSharedDataDir() {
  const env = process.env.SHARED_DATA_DIR;
  if (env != null && String(env).trim() !== "") {
    return path.resolve(env);
  }
  return path.resolve(process.cwd(), "../shared-data");
}

module.exports = { resolveSharedDataDir };
