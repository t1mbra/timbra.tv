import type { ImageCardGuildConfigMerged } from "@/lib/mergeImageCardConfig";

/** Пер-серверный конфиг welcome (как в shared-data/config.json). */
export type GuildConfig = {
  /** Включено ли приветствие новых участников (дашборд; воркер может подхватить позже). */
  welcomeEnabled: boolean;
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
  /** Куда слать приветствие: в канал (как раньше) или в ЛС. Отсутствие = channel. */
  welcomeDeliveryMode?: "channel" | "dm";
  /** Текст ЛС-приветствия (только текст; плейсхолдеры как у channel message). */
  welcomeDmMessage?: string;
  /** Дублировать ли отдельным текстом в канал сервера (режим ЛС). */
  welcomeDmAlsoSendToChannel?: boolean;
  /** Канал для дубля в режиме ЛС. Отсутствие → channelId. */
  welcomeDmChannelId?: string;
  /** Текст сообщения в канале при дубле (только текст). */
  welcomeDmChannelMessage?: string;
};

/** Корневой объект config.json: { guilds: { [guildId]: GuildConfig } }. */
export type RootConfig = {
  guilds: Record<string, GuildConfig>;
};
