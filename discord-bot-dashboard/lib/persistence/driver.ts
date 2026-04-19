/**
 * Выбор драйвера хранилища. По умолчанию `json` — текущий MVP (файлы в shared-data).
 * `postgres` зарезервирован под будущую реализацию и сейчас не активен.
 */
export type PersistenceDriver = "json" | "postgres";

export function getPersistenceDriver(): PersistenceDriver {
  const v = process.env.PERSISTENCE_DRIVER?.trim().toLowerCase();
  if (!v || v === "json") {
    return "json";
  }
  if (v === "postgres") {
    return "postgres";
  }
  throw new Error(
    `Unknown PERSISTENCE_DRIVER="${process.env.PERSISTENCE_DRIVER}". Use "json" or "postgres".`
  );
}
