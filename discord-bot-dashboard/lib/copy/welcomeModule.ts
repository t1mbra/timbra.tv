/**
 * Тексты модуля «Приветствие» (RU). Для будущей i18n.
 */
export const welcomeModuleCopy = {
  deliverySectionTitle: "Отправление приветствия",
  deliveryChannelLabel: "Канал",
  /** Подпись к полю выбора канала (без дубля с сегментом «Канал») */
  deliveryChannelSelectHint: "Куда публиковать приветствие",
  /** Сегмент «ЛС» в заголовке блока отправления (пока без логики) */
  deliveryDmTab: "ЛС",
  deliveryDmUnavailableTitle: "ЛС появится позже",
  deliveryModeTablistAria: "Способ отправки приветствия: канал или личные сообщения",
  welcomeDisabledOverlayHint: "Функция выключена. Нажми, чтобы включить",
  sidebarWelcomeToggleAria: "Включить или выключить приветствие для новых участников",
  skipBotAccountsTitle: "Не приветствовать ботов",
  skipBotAccountsHelp: "Не отправлять приветствие аккаунтам с пометкой «бот».",
} as const;
