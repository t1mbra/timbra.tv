/**
 * Тексты модуля «Приветствие» (RU). Для будущей i18n.
 */
export const welcomeModuleCopy = {
  deliverySectionTitle: "Отправление приветствия",
  deliveryChannelLabel: "Канал",
  /** Подпись к полю выбора канала (без дубля с сегментом «Канал») */
  deliveryChannelSelectHint: "Куда публиковать приветствие",
  deliveryDmTab: "ЛС",
  deliveryDmMessageLabel: "Сообщение в ЛС",
  deliveryDmMessageHelp: "Только текст. Плейсхолдеры: {user}, {username}, {server}, {memberCount}, {date}",
  deliveryAlsoChannelLabel: "Также отправить в канал сервера",
  deliveryChannelCopyHint: "Канал сервера",
  deliveryChannelMessageLabel: "Сообщение в канал",
  deliveryDmPrivacyNote:
    "ЛС может не прийти, если у участника закрыты личные сообщения от участников сервера.",
  deliveryModeTablistAria: "Способ отправки приветствия: канал или личные сообщения",
  welcomeDisabledOverlayHint: "Функция выключена. Нажми, чтобы включить",
  sidebarWelcomeToggleAria: "Включить или выключить приветствие для новых участников",
  skipBotAccountsTitle: "Не приветствовать ботов",
  skipBotAccountsHelp: "Не отправлять приветствие аккаунтам с пометкой «бот».",
} as const;
