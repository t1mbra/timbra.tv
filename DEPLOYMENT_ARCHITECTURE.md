# Архитектура развёртывания (Timbrabot)

## Целевое production-разбиение

| Компонент | Платформа | Назначение |
|-----------|-----------|------------|
| Основной сайт **timbra.tv** | Vercel | Публичный маркетинговый сайт (`website/`), позже |
| Дашборд бота **bot.timbra.tv** | Railway (web service) | Next.js: OAuth, панель, API (`discord-bot-dashboard/`) |
| Процесс Discord-бота | Railway (worker / отдельный сервис) | `discord.js`, welcome, авто-роли (`discord-bot/`) |
| Общее хранилище (цель) | **Postgres** | Единый источник правды для конфигов и состояния бота |
| Локальная разработка / fallback | **JSON в `shared-data/`** | `config.json`, `bot-state.json`, ассеты, шрифты |

## Персистентность

- **`PERSISTENCE_DRIVER=json`** — файлы под `SHARED_DATA_DIR` / `../shared-data` (как в MVP).
- **`PERSISTENCE_DRIVER=postgres`** — таблицы **`guild_configs`** и **`bot_guild_state`**, пул через **`pg`**, строка подключения **`DATABASE_URL`** (обязательна в этом режиме). Инициализация: **`docs/sql/001_init_timbrabot.sql`**.
- **Важно:** при разнесённых сервисах без общего диска для общих данных нужен **Postgres** (или общий volume). Локальный JSON на каждом хосте рассинхронится.

## Связь с кодом

- Реализации: `discord-bot-dashboard/lib/persistence/*`, `discord-bot/lib/persistence/*`.
- Схема и DDL: `docs/POSTGRES_SCHEMA_DRAFT.md`, `docs/sql/001_init_timbrabot.sql`.

## Postgres: DDL и миграция данных

1. **Создать таблицы** — выполнить SQL из **`docs/sql/001_init_timbrabot.sql`** в вашей БД (psql, веб-консоль Neon/Railway, CI и т.д.).
2. **Перенести конфиги из JSON** (опционально, если уже есть `shared-data/config.json`):
   ```bash
   DATABASE_URL="postgresql://..." node scripts/migrate-json-config-to-postgres.js
   ```
   Файл `shared-data/config.json` **не удаляется**; повторный запуск безопасен (`ON CONFLICT DO UPDATE`).

## Ручные smoke-тесты Postgres

Зависимости для скриптов берутся из **`discord-bot/node_modules`** (перед первым запуском: `npm install` в `discord-bot/`).

```bash
# Конфиг (guild_configs)
set PERSISTENCE_DRIVER=postgres
set DATABASE_URL=postgresql://...
node scripts/smoke-postgres-config.js

# Bot state (bot_guild_state + модули postgres бота)
node scripts/smoke-postgres-bot-state.js
```

На Unix: `PERSISTENCE_DRIVER=postgres DATABASE_URL=... node scripts/smoke-postgres-config.js`.

## Ассеты и шрифты

Фоны welcome-card, загрузки в `shared-data/assets/`, TTF в **`shared-data/fonts/welcome-card/`** по-прежнему **файловые**; Postgres закрывает только **`guild_configs`** и **`bot_guild_state`**. Планируйте общий volume или внешнее хранилище для бинарников при разнесённых сервисах.
