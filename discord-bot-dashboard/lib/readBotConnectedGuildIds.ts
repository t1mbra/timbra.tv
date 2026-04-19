import { getConnectedGuildIds } from "@/lib/persistence/botStateStore";

/**
 * Читает `shared-data/bot-state.json` и возвращает множество id гильдий, где бот состоит.
 * Реализация: {@link getConnectedGuildIds} (JSON / будущий Postgres).
 */
export async function readBotConnectedGuildIds(): Promise<Set<string>> {
  return getConnectedGuildIds();
}

export { getBotStatePathForDebug } from "@/lib/persistence/jsonBotStateStore";
