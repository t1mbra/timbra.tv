# PROJECT STATE

## Mainline and Branch Reality

- Исторически `feature/postgres-persistence` вышла за рамки исходной задачи и стала de facto интеграционной веткой.
- Текущий основной mainline проекта: `develop`.
- Railway production должен быть направлен на `develop`.
- Старые `feature/*` и `hotfix/*` ветки считаются историческими и не являются текущим source of truth.

## Repository Scope and Focus

Репозиторий включает:

- `discord-bot`
- `discord-bot-dashboard`
- `website`

Текущий приоритет разработки:

- сначала стабилизация и развитие `discord-bot` + `discord-bot-dashboard`
- затем развитие `website` как media hub

Именование:

- имя бота: `Рогатик`

## Current Released Baseline

- `v0.6.0` - Welcome delivery modes
- `v0.6.1` - fonts / message images / editor hotfixes
- `v0.6.2` - image upload compression
- `v0.7.0` - Farewell messages
- `v0.8.0` - Auto-roles core

## Current Bot and Dashboard State

Текущая продуктовая база в `discord-bot` + `discord-bot-dashboard`:

- `Welcome`
- `Farewell`
- `Auto-roles core`

## Welcome: Current State

Реализовано:

- shared message editor
- delivery modes
- image/message attachments
- style settings

Открытая работа:

- random welcome messages
- баги и polish в `Стиль приветствия`
- проблемы в card/image-card зоне

## Farewell: Current State

Реализовано как lifecycle-модуль:

- канал
- сообщение
- send test
- live runtime

## Auto-roles: Current State

Актуальная продуктовая модель:

- `autoRolesEnabled`
- `memberRoleIds`
- `waitForMembershipScreening`
- member delay
- `botAutoRolesEnabled`
- `botUseSeparateRoles`
- `botRoleIds`
- bot delay

Операционные правила:

- назначение ролей ботам по умолчанию выключено
- при включении bot auto-roles боты могут использовать общий список ролей
- при включении separate bot roles боты используют отдельный список ролей

Совместимость:

- legacy single-role поля используются только для backward compatibility
- legacy single-role поля больше не являются основной продуктовой моделью

## Current Open Work

- `/servers` через `bot-state.json`
- random welcome messages
- auto-roles synchronization
- баги в `Стиль приветствия` / image-card area
