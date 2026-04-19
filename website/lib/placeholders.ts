/** Демо-данные для вёрстки; не подключены к API */

export const upcomingStreams = [
  {
    title: "Спокойное прохождение",
    when: "Скоро · вечер по МСК",
    note: "Сюжет, паузы на эмоции и чат без спешки.",
    tag: "Анонс",
  },
  {
    title: "Кооп с подписчиками",
    when: "Планируется",
    note: "Соберёмся вместе — формат объявлю заранее.",
    tag: "Скоро",
  },
  {
    title: "Ночной чилл",
    when: "Черновик слота",
    note: "Тихий стрим под разговоры и атмосферу игры.",
    tag: "Идея",
  },
] as const;

export const recentStreams = [
  {
    title: "Запись появится здесь",
    when: "—",
    note: "После первого эфира добавим VOD и таймкоды.",
    tag: "Архив",
  },
  {
    title: "Клипы и нарезки",
    when: "—",
    note: "Короткие моменты — отдельной дорожкой, без спойлеров.",
    tag: "План",
  },
] as const;

export const platformLinks = [
  {
    id: "twitch",
    name: "Twitch",
    hint: "Основной эфир (когда будет готово)",
    abbr: "Tw",
  },
  {
    id: "youtube",
    name: "YouTube",
    hint: "Записи и длинные форматы",
    abbr: "YT",
  },
  {
    id: "discord",
    name: "Discord",
    hint: "Сервер сообщества",
    abbr: "DC",
  },
  {
    id: "telegram",
    name: "Telegram",
    hint: "Короткие новости без шума",
    abbr: "TG",
  },
  {
    id: "vk",
    name: "VK",
    hint: "Дополнительная точка входа",
    abbr: "VK",
  },
] as const;
