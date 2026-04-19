import path from "node:path";

/**
 * Единый каталог `shared-data` для дашборда и (через тот же env) для бота.
 *
 * Архитектура: локально бот (`discord-bot/`) и дашборд (`discord-bot-dashboard/`) — соседи;
 * fallback `path.resolve(process.cwd(), "../shared-data")` указывает на общий каталог при запуске из этих папок.
 * Если бот и Next.js крутятся в **разных контейнерах/хостах** без общего volume, пути по умолчанию **не совпадут** —
 * задайте **`SHARED_DATA_DIR`** (абсолютный путь к смонтированному `shared-data`) в обоих процессах.
 */
export function resolveSharedDataDir(): string {
  const env = process.env.SHARED_DATA_DIR;
  if (env != null && String(env).trim() !== "") {
    return path.resolve(env);
  }
  return path.resolve(process.cwd(), "../shared-data");
}
