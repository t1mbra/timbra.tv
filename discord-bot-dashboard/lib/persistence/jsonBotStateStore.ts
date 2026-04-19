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
 * Читает `shared-data/bot-state.json` и возвращает множество id гильдий (логика без изменений).
 */
export async function getConnectedGuildIds(): Promise<Set<string>> {
  const botStatePath = botStateFilePath();

  try {
    const raw = await readFile(botStatePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object") {
      if (isDevLogging) {
        console.warn(
          "[jsonBotStateStore] bot-state: не объект, path=%s cwd=%s",
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
          "[jsonBotStateStore] нет guildIds/guilds в файле, path=%s",
          botStatePath
        );
      }
      return new Set();
    }

    if (isDevLogging) {
      console.log(
        "[jsonBotStateStore] ok cwd=%s path=%s guildIds=%d updatedAt=%s",
        process.cwd(),
        botStatePath,
        ids.size,
        updatedAt ?? "(нет)"
      );
    }

    return ids;
  } catch (err) {
    console.error(
      "[jsonBotStateStore] ошибка чтения bot-state.json path=%s cwd=%s",
      botStatePath,
      process.cwd(),
      err
    );
    return new Set();
  }
}

export function getBotStatePathForDebug(): string {
  return botStateFilePath();
}

export async function isBotConnected(guildId: string): Promise<boolean> {
  const ids = await getConnectedGuildIds();
  return ids.has(guildId);
}

export async function writeConnectedGuildIds(_guildIds: readonly string[]): Promise<void> {
  throw new Error(
    "Dashboard does not write bot-state.json; only the Discord bot process writes it."
  );
}
