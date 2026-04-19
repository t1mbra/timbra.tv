# Черновик схемы Postgres (Timbrabot)

Документ описывает возможное будущее состояние после миграции с JSON. **Не является миграцией и не используется кодом MVP.**

## Таблица `guild_configs`

Хранение пер-серверного welcome / autorole конфигурации (аналог `shared-data/config.json` → `guilds[guildId]`).

| Колонка | Тип (черновик) | Примечание |
|---------|----------------|------------|
| `guild_id` | `TEXT` PK | Discord snowflake |
| `config` | `JSONB` | Весь объект конфига гильдии (как в JSON сейчас) |
| `updated_at` | `TIMESTAMPTZ` | Опционально для аудита |

## Таблица `bot_guild_state`

Множество гильдий, где бот состоит (аналог `shared-data/bot-state.json` → `guildIds` / legacy `guilds[]`).

| Колонка | Тип (черновик) | Примечание |
|---------|----------------|------------|
| `guild_id` | `TEXT` PK | Discord snowflake |
| `updated_at` | `TIMESTAMPTZ` | Синхронизация / TTL опционально |

Альтернатива: одна строка `singleton` с массивом `guild_ids TEXT[]` и полем `updated_at` — ближе к текущему файлу `version` + `updatedAt` + `guildIds`.

## Таблица `guild_assets`

Бинарные/файловые артефакты (аналог `shared-data/assets/guilds/{guildId}/…`).

| Колонка | Тип (черновик) | Примечание |
|---------|----------------|------------|
| `id` | `UUID` PK | |
| `guild_id` | `TEXT` | FK логически к `guild_configs` |
| `kind` | `TEXT` | Например `welcome_card_background` |
| `content_type` | `TEXT` | MIME |
| `bytes` | `BYTEA` или внешнее хранилище (S3) | |
| `created_at` | `TIMESTAMPTZ` | |

## Индексы и ограничения (идеи)

- Уникальность `(guild_id, kind)` для «один активный фон на гильдию», если модель такая же, как у файлов на диске.
