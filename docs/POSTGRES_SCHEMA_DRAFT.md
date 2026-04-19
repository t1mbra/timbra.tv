# Схема Postgres (Timbrabot)

Используется при **`PERSISTENCE_DRIVER=postgres`**. DDL для создания таблиц: **`docs/sql/001_init_timbrabot.sql`**.

## Таблица `guild_configs`

Пер-серверный welcome / autorole конфиг (аналог `shared-data/config.json` → `guilds[guildId]`).

| Колонка | Тип | Примечание |
|---------|-----|------------|
| `guild_id` | `TEXT` PK | Discord snowflake |
| `config` | `JSONB` NOT NULL | Объект конфига гильдии |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT now() | |

Запись полного снимка (`writeRawConfig`): транзакция `DELETE` всех строк + `INSERT` по каждой гильдии (эквивалент перезаписи файла). Одиночное сохранение: `INSERT ... ON CONFLICT DO UPDATE`.

## Таблица `bot_guild_state`

Множество гильдий, где бот состоит (аналог `bot-state.json` → массив `guildIds`).

| Колонка | Тип | Примечание |
|---------|-----|------------|
| `guild_id` | `TEXT` PK | Discord snowflake |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT now() | |

Обновление от бота: транзакция `DELETE` всех строк + `INSERT` по каждому id (дедупликация на вставке).

## Таблица `guild_assets` (будущее)

Бинарные артефакты (фоны карточек и т.д.) пока остаются в **`shared-data/`** / файлах; отдельная таблица под S3/BYTEA не реализована в текущем драйвере.
