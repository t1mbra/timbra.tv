import { getPersistenceDriver } from "@/lib/persistence/driver";
import * as jsonBotStateStore from "@/lib/persistence/jsonBotStateStore";
import * as postgresBotStateStore from "@/lib/persistence/postgresBotStateStore";

function backend() {
  return getPersistenceDriver() === "postgres"
    ? postgresBotStateStore
    : jsonBotStateStore;
}

export function getBotStatePathForDebug(): string {
  return backend().getBotStatePathForDebug();
}

export async function getConnectedGuildIds(): Promise<Set<string>> {
  return backend().getConnectedGuildIds();
}

export async function writeConnectedGuildIds(
  guildIds: readonly string[]
): Promise<void> {
  return backend().writeConnectedGuildIds(guildIds);
}

export async function isBotConnected(guildId: string): Promise<boolean> {
  return backend().isBotConnected(guildId);
}
