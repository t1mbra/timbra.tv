import type { ImageCardGuildConfigMerged } from "@/lib/mergeImageCardConfig";

/** Пер-серверный конфиг welcome (как в shared-data/config.json). */
export type GuildConfig = {
  channelId: string;
  humanRoleId: string;
  botRoleId: string;
  skipBotAccounts: boolean;
  welcomeStyle: "text" | "embed" | "imageCard";
  textImageDataUrl: string;
  message: string;
  title: string;
  description: string;
  color: string;
  embedAuthorName: string;
  embedAuthorAvatar: boolean;
  embedAuthorAvatarUrl: string;
  embedFooter: string;
  embedImageDataUrl: string;
  embedFields: { name: string; value: string; inline: boolean }[];
  imageCard?: ImageCardGuildConfigMerged;
};

/** Корневой объект config.json: { guilds: { [guildId]: GuildConfig } }. */
export type RootConfig = {
  guilds: Record<string, GuildConfig>;
};
