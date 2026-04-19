import { getPersistenceDriver } from "@/lib/persistence/driver";
import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";
import * as jsonConfigStore from "@/lib/persistence/jsonConfigStore";
import * as postgresConfigStore from "@/lib/persistence/postgresConfigStore";

function configBackend() {
  return getPersistenceDriver() === "postgres"
    ? postgresConfigStore
    : jsonConfigStore;
}

/** Единая точка доступа к конфигу серверов (сейчас — JSON в shared-data). */
export async function readRawConfig(): Promise<RootConfig> {
  return configBackend().readRawConfig();
}

export async function writeRawConfig(root: RootConfig): Promise<void> {
  return configBackend().writeRawConfig(root);
}

export async function getGuildConfig(
  guildId: string
): Promise<GuildConfig | undefined> {
  return configBackend().getGuildConfig(guildId);
}

export async function getAllGuildConfigs(): Promise<
  Record<string, GuildConfig>
> {
  return configBackend().getAllGuildConfigs();
}

export async function saveGuildConfig(
  guildId: string,
  config: GuildConfig
): Promise<void> {
  return configBackend().saveGuildConfig(guildId, config);
}
