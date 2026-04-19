import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GuildConfig, RootConfig } from "@/lib/persistence/configTypes";

/**
 * Тот же путь, что раньше в `app/api/config/[guildId]/route.ts`:
 * `process.cwd()/../shared-data/config.json` (не через SHARED_DATA_DIR — поведение сохранено).
 */
function configFilePath(): string {
  return path.join(process.cwd(), "..", "shared-data", "config.json");
}

export async function readRawConfig(): Promise<RootConfig> {
  try {
    const raw = await readFile(configFilePath(), "utf8");
    const parsed = JSON.parse(raw) as RootConfig;
    return {
      guilds: parsed.guilds ?? {},
    };
  } catch {
    return { guilds: {} };
  }
}

export async function writeRawConfig(root: RootConfig): Promise<void> {
  await writeFile(
    configFilePath(),
    `${JSON.stringify(root, null, 2)}`,
    "utf8"
  );
}

export async function getGuildConfig(
  guildId: string
): Promise<GuildConfig | undefined> {
  const root = await readRawConfig();
  return root.guilds[guildId];
}

export async function getAllGuildConfigs(): Promise<Record<string, GuildConfig>> {
  const root = await readRawConfig();
  return root.guilds ?? {};
}

export async function saveGuildConfig(
  guildId: string,
  config: GuildConfig
): Promise<void> {
  const root = await readRawConfig();
  root.guilds[guildId] = config;
  await writeRawConfig(root);
}
