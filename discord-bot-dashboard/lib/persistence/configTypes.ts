import type { ImageCardGuildConfigMerged } from "@/lib/mergeImageCardConfig";

export type AutoRoleDelayUnit = "seconds" | "minutes" | "hours" | "days";

/** Пер-серверный конфиг welcome (как в shared-data/config.json). */
export type GuildConfig = {
  /** Включено ли приветствие новых участников (дашборд; воркер может подхватить позже). */
  welcomeEnabled: boolean;
  channelId: string;
  /** @deprecated Используйте memberRoleIds; сохраняется для совместимости (первый элемент массива). */
  humanRoleId: string;
  /** @deprecated Используйте botRoleIds; сохраняется для совместимости. */
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
  /** Куда слать приветствие: канал, ЛС или оба. Отсутствие = channel. */
  welcomeDeliveryMode?: "channel" | "dm" | "both";
  /** Текст ЛС-приветствия (только текст; плейсхолдеры как у channel message). */
  welcomeDmMessage?: string;
  /** Картинка в ЛС-сообщение (data: или http(s), аналогично channel textImageDataUrl). */
  welcomeDmImageDataUrl?: string;
  /** Оригинальное имя DM-вложения (опционально). */
  welcomeDmImageFilename?: string;
  /** Дублировать ли отдельным текстом в канал сервера (режим ЛС). */
  welcomeDmAlsoSendToChannel?: boolean;
  /** Канал для дубля в режиме ЛС. Отсутствие → channelId. */
  welcomeDmChannelId?: string;
  /** Текст сообщения в канале при дубле (только текст). */
  welcomeDmChannelMessage?: string;
  /** Включено ли текстовое сообщение при выходе участника. */
  farewellEnabled?: boolean;
  /** Канал для прощального сообщения. */
  farewellChannelId?: string;
  /** Текст прощального сообщения. */
  farewellMessage?: string;
  /** Картинка в прощальном сообщении (data: или http(s)). */
  farewellImageDataUrl?: string;
  /** Оригинальное имя файла картинки прощания. */
  farewellImageFilename?: string;

  /** Модуль авто-ролей: глобальный выключатель (sidebar). */
  autoRolesEnabled?: boolean;
  /** Роли, выдаваемые обычным участникам при входе. */
  memberRoleIds?: string[];
  /** Ждать завершения показа правил (membership screening). */
  waitForMembershipScreening?: boolean;
  memberDelayEnabled?: boolean;
  memberDelayValue?: number;
  memberDelayUnit?: AutoRoleDelayUnit;
  /** Выдача ролей ботам при добавлении (по умолчанию выкл.). */
  botAutoRolesEnabled?: boolean;
  botUseSeparateRoles?: boolean;
  botRoleIds?: string[];
  botDelayEnabled?: boolean;
  botDelayValue?: number;
  botDelayUnit?: AutoRoleDelayUnit;
};

/** Корневой объект config.json: { guilds: { [guildId]: GuildConfig } }. */
export type RootConfig = {
  guilds: Record<string, GuildConfig>;
};
