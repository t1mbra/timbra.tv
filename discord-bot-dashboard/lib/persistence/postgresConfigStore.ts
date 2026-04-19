import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";

function notImplemented(): never {
  throw new Error(
    "PERSISTENCE_DRIVER=postgres is not implemented yet. Use PERSISTENCE_DRIVER=json."
  );
}

export async function readRawConfig(): Promise<RootConfig> {
  return notImplemented();
}

export async function writeRawConfig(_root: RootConfig): Promise<void> {
  return notImplemented();
}

export async function getGuildConfig(
  _guildId: string
): Promise<GuildConfig | undefined> {
  return notImplemented();
}

export async function getAllGuildConfigs(): Promise<Record<string, GuildConfig>> {
  return notImplemented();
}

export async function saveGuildConfig(
  _guildId: string,
  _config: GuildConfig
): Promise<void> {
  return notImplemented();
}
