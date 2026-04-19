# Состояние репозитория `timbra.tv`

## Заморозка релиза: Timbrabot MVP **v0.1.0-timbrabot-mvp**

Текущая рабочая версия стека **`discord-bot/`** + **`discord-bot-dashboard/`** + **`shared-data/`** зафиксирована как **замороженный MVP** (см. `CHANGELOG.md`). Дальнейшие изменения функциональности выходят за рамки этой контрольной точки, если не оговорено отдельно.

### Известные ограничения (MVP)

- Персистентность **shared-data** основана на **локальной файловой системе** (`config.json`, `bot-state.json`, ассеты, шрифты).
- Если бот и дашборд работают в **разных контейнерах** без общего тома, пути по умолчанию к `shared-data` не совпадут — нужен **общий volume** или **база данных** вместо разнесённых файлов.
- Режим **imageCard** требует локальных файлов **TTF** в `shared-data/fonts/welcome-card/` (whitelist в коде дашборда).
- Этот релиз — **MVP**, не финальная production-архитектура (сессии, масштабирование, секреты — см. Known Problems в `discord-bot-dashboard/PROJECT_STATE.md`).

## Обзор

В корне зафиксировано состояние **личного сайта Timbra** в папке `website/` (только фронтенд, без бэкенд-интеграций).

## Проект: `website/` — Next.js (личный сайт)

### Стек

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Шрифты: Manrope (текст), Lora (заголовки), подмножества latin + cyrillic

### Маршруты

| Путь | Содержание |
|------|------------|
| `/` | Главная (медиа-хаб): герой, утилита (слот/статус/календарь/Discord), 4 карточки-раздела, стримы, календарь, новости, сообщество, о себе, бот |
| `/about` | О себе: козочка-стример/блогер, уют, животные, атмосферные игры |
| `/streams` | Стримы: демо-карточки «ближайшие / недавние», зона-плейсхолдер под плеер |
| `/calendar` | Календарь: визуальная сетка месяца + текст про будущие подписки Google / Apple / Microsoft |
| `/news` | Новости: каркас ленты + упоминание будущей синдикации (без реализации) |
| `/bot` | Discord-бот как часть экосистемы + неактивная кнопка входа в панель |
| `/links` | Хаб ссылок: карточки платформ с неактивными кнопками |

### Компоненты и дизайн

- Оболочка: `SiteShell`, `SiteHeader`, `SiteFooter`, `MobileNav`, `Container`
- Главная: `HomeUtilityStrip`, `HomeQuickNav`, секции в `components/sections/*` — мало текста, упор на действия и сетку; `SectionHeading` с режимом `compact`
- UI: `Button` / `ButtonLink`, `Card` (опции `glow`, `hover`), `SectionHeading`, `PageIntro`
- Стримы: `StreamBlockCard` + демо-данные в `lib/placeholders.ts`
- Календарь: `CalendarPlaceholder` — статическая сетка месяца без API
- Тема: `app/globals.css` — тёмная палитра, градиенты, шум, утилиты `surface-gradient-ring`, `hero-stars`
- Контент на русском; ссылка «Перейти к содержимому»

### Не реализовано (намеренно)

- Бэкенд, OAuth, вебхуки, встраивание стримов, реальные URL соцсетей

### Следующий шаг

- Подключить данные и интеграции по мере готовности API и политики платформ

## Другие проекты

- `discord-bot-dashboard/` — см. локальный `PROJECT_STATE.md` (конфиг только через `/api/config/[guildId]` и `shared-data/config.json`; legacy `/api/config` и `data/config.json` удалены). **MVP зафиксирован:** `v0.1.0-timbrabot-mvp` (`CHANGELOG.md`).
- `discord-bot/` — Node.js + discord.js: при `GuildMemberAdd` читает `shared-data/config.json`, выдаёт авто-роли (`humanRoleId` / `botRoleId` независимо от приветствия), шлёт welcome в `channelId` с подстановками; `skipBotAccounts` только отключает приветствие для ботов; стили `text` / `embed` / **`imageCard`** (PNG через `@napi-rs/canvas`, как в дашборде). **MVP зафиксирован:** `v0.1.0-timbrabot-mvp` (`CHANGELOG.md`).
