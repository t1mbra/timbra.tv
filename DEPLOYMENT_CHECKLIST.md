# Чеклист развёртывания (Timbrabot MVP)

## Подготовка

- [ ] Установить зависимости: `npm install` в `discord-bot/` и в `discord-bot-dashboard/`.
- [ ] Задать переменные окружения по `.env.example` в каждом пакете (см. комментарии в файлах).
- [ ] В Discord Developer Portal настроить redirect URL для OAuth, совпадающий с `DISCORD_REDIRECT_URI` (включая путь `/api/auth/discord/callback`).
- [ ] Настроить invite-ссылку бота с нужными scopes и permissions (см. документацию Discord для нашего сценария: участники, сообщения, вложения и т.д.).

## Общие данные (shared-data)

- [ ] Задать `SHARED_DATA_DIR` на **абсолютный** путь к одному и тому же каталогу `shared-data` для бота и дашборда.
- [ ] Обеспечить сохранение `shared-data` между перезапусками (том, bind mount и т.п.).
- [ ] Убедиться, что бот и дашборд читают/пишут один и тот же `config.json` и `bot-state.json` (один volume или одна файловая система).

## Шрифты карточки приветствия

- [ ] Положить нужные `.ttf` в `shared-data/fonts/welcome-card/` (whitelist и имена файлов — см. `discord-bot-dashboard/lib/welcomeCardConstants.ts`).

## Сборка и запуск

- [ ] Собрать дашборд: в `discord-bot-dashboard/` выполнить `npm run build` (или команду сборки из `package.json`).
- [ ] Запустить дашборд в production (например `npm start` после сборки).
- [ ] Запустить бота: в `discord-bot/` — `node index.js` (или скрипт из `package.json`).

## Postgres (если `PERSISTENCE_DRIVER=postgres`)

- [ ] Выполнить DDL: **`docs/sql/001_init_timbrabot.sql`** на целевой БД.
- [ ] Задать **`DATABASE_URL`** (и при необходимости **`PG_SSL`**) в окружении бота и дашборда.
- [ ] (Опционально) Перенести конфиги из JSON: `DATABASE_URL=... node scripts/migrate-json-config-to-postgres.js`.
- [ ] Smoke: `PERSISTENCE_DRIVER=postgres` + `DATABASE_URL` → `node scripts/smoke-postgres-config.js` и `node scripts/smoke-postgres-bot-state.js`.
- [ ] Помнить: **ассеты и шрифты** остаются в `shared-data/` (см. `DEPLOYMENT_ARCHITECTURE.md`).

## Проверки

- [ ] Открыть `/servers` — список серверов и статус бота отображаются корректно.
- [ ] Проверить доступ к дашборду после входа и выбор сервера.
- [ ] Отправить тестовое приветствие в стиле **imageCard** и убедиться, что PNG уходит в канал.
- [ ] Реальный вход участника: `guildMemberAdd` — приветствие и авто-роли по конфигу.
- [ ] Проверить guard несохранённых изменений (переход/смена сервера с грязной формой).
