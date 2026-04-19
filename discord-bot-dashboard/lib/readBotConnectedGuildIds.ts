import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";

const isDevLogging =
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_SHARED_DATA === "1";

function botStateFilePath(): string {
  return path.join(resolveSharedDataDir(), "bot-state.json");
}

/**
 * Читает `shared-data/bot-state.json` и возвращает множество id гильдий, где бот состоит.
 * При отсутствии файла или невалидном JSON — пустой Set (без throw), с логом ошибки.
 */
export async function readBotConnectedGuildIds(): Promise<Set<string>> {
  const botStatePath = botStateFilePath();

  try {
    const raw = await readFile(botStatePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object") {
      if (isDevLogging) {
        console.warn(
          "[readBotConnectedGuildIds] bot-state: не объект, path=%s cwd=%s",
          botStatePath,
          process.cwd()
        );
      }
      return new Set();
    }

    let ids: Set<string> | null = null;
    let updatedAt: string | undefined;

    if (typeof parsed.updatedAt === "string") {
      updatedAt = parsed.updatedAt;
    }

    if (Array.isArray(parsed.guildIds)) {
      ids = new Set<string>();
      for (const id of parsed.guildIds) {
        if (typeof id === "string" && id.length > 0) {
          ids.add(id);
        }
      }
    } else {
      /** Совместимость со старым форматом `{ guilds: [{ id }] }` */
      const legacy = parsed as { guilds?: unknown };
      if (Array.isArray(legacy.guilds)) {
        ids = new Set<string>();
        for (const entry of legacy.guilds) {
          if (
            entry &&
            typeof entry === "object" &&
            "id" in entry &&
            typeof (entry as { id: unknown }).id === "string"
          ) {
            ids.add((entry as { id: string }).id);
          }
        }
      }
    }

    if (!ids) {
      if (isDevLogging) {
        console.warn(
          "[readBotConnectedGuildIds] нет guildIds/guilds в файле, path=%s",
          botStatePath
        );
      }
      return new Set();
    }

    if (isDevLogging) {
      console.log(
        "[readBotConnectedGuildIds] ok cwd=%s path=%s guildIds=%d updatedAt=%s",
        process.cwd(),
        botStatePath,
        ids.size,
        updatedAt ?? "(нет)"
      );
    }

    return ids;
  } catch (err) {
    console.error(
      "[readBotConnectedGuildIds] ошибка чтения bot-state.json path=%s cwd=%s",
      botStatePath,
      process.cwd(),
      err
    );
    return new Set();
  }
}

/** Для отладки в API (dev): абсолютный путь к читаемому файлу */
export function getBotStatePathForDebug(): string {
  return botStateFilePath();
}
