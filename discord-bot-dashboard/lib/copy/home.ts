/**
 * Тексты лендинга (сейчас ru). Структура — чтобы позже подключить i18n без поиска по проекту.
 */
export const homeCopy = {
  tagline: "Твой маленький рогатый помощник",
  ctaLogin: "Войти через Discord",
  ctaDashboard: "Панель управления",
  ctaPickServer: "Выбрать сервер",
  loading: "Загрузка…",
  guildsLoadError: "Не удалось загрузить список серверов",
  retry: "Повторить",
  serverLine: (name: string) => `Сервер: ${name}`,
  brandKicker: "Discord-бот",
  /** Показывается рядом с номером версии; при локализации можно заменить порядок в шаблоне. */
  versionProductName: "Timbrabot",
  copyrightLine: "© 2026 timbra.tv",
} as const;
