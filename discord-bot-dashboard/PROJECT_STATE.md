# PROJECT STATE

## Mainline and Branch Reality

- Исторически `feature/postgres-persistence` вышла за рамки исходной задачи и стала de facto интеграционной веткой.
- Текущий основной mainline проекта: `develop`.
- Railway production должен быть направлен на `develop`.
- Старые `feature/*` и `hotfix/*` ветки считаются историческими и не являются текущим source of truth.

## Current Released Baseline

- `v0.6.0` - Welcome delivery modes
- `v0.6.1` - fonts / message images / editor hotfixes
- `v0.6.2` - image upload compression
- `v0.7.0` - Farewell messages
- `v0.8.0` - Auto-roles core

## Current Bot and Dashboard Scope

Текущая продуктовая база в `discord-bot` + `discord-bot-dashboard`:

- `Welcome`
- `Farewell`
- `Auto-roles core`

## Welcome: Current State

Реализовано:

- общий shared message editor
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
- основная продуктовая модель больше не строится на single-role полях

## Current Open Work

- `/servers` через `bot-state.json`
- random welcome messages
- auto-roles synchronization
- баги в `Стиль приветствия` / image-card area

## Naming and Repository Ecosystem

- Имя бота: `Рогатик`
- Репозиторий включает:
  - `discord-bot`
  - `discord-bot-dashboard`
  - `website`
- Текущий приоритет: сначала bot + dashboard, затем `website` как media hub.
# PROJECT STATE

## Release freeze

**Текущая контрольная точка:** `v0.1.0-timbrabot-mvp` (замороженный MVP вместе с `discord-bot/` и `shared-data/`). Список возможностей релиза — в корневом `CHANGELOG.md`; ограничения MVP — в корневом `PROJECT_STATE.md` (раздел «Известные ограничения»).

## Текущее production-состояние (v0.3.1-prod-bugfixes)

Краткий снимок без мелких визуальных правок:

- **Railway:** задеплоены **Next.js-дашборд** и **воркер бота**; персистентность на **Postgres** включена.
- **Главная (`/`):** навигация только по **клику по CTA** — авто-редиректа при загрузке нет.
- **OAuth callback (`/api/auth/discord/callback`):** редирект на **`/dashboard/{guildId}`**, если есть хотя бы одна управляемая гильдия с **`botConnected`**; иначе на **`/servers`**. При выборе гильдии учитывается нечувствительный к секретам cookie **`timbrabot_last_guild_id`** (если id валиден в списке и с ботом), иначе — первая подключённая по той же сортировке, что и `GET /api/discord/guilds`.
- **Запоминание последнего дашборда:** cookie **`timbrabot_last_guild_id`** (ставится при входе в `/dashboard/[guildId]`); при logout **не** очищается; **`localStorage`** (`lastGuildId` / имя) по-прежнему для подписи на Home.
- **Футер:** общий **`AppFooter`** на всех страницах — только приглушённый текст (копирайт + версия), **без** отдельной подложки, на общем градиенте **`app-bg`**.
- **Сайт timbra.tv** (`website/` в корне репозитория) остаётся **отдельным** от этой панели бота.
- **Ассеты и шрифты карточки:** по-прежнему **файловые** (`shared-data`, whitelist TTF) — зафиксированное ограничение.

## Overview
Next.js dashboard для Discord-бота с OAuth-авторизацией через Discord. Сейчас приложение позволяет войти, выбрать доступный сервер, открыть страницу настроек конкретного сервера и сохранять welcome/autorole-конфиг в общий JSON-файл. На `/servers` для иконок статуса бота используется **lucide-react**.

## Routes
- `/` — лендинг: информация о боте, статус входа, CTA только по клику (без авто-редиректа); «Панель управления» ведёт на **`/dashboard/[guildId]`** для целевой подключённой гильдии (как у CTA — `localStorage` + список с сервера); допустимость и **`botConnected`** проверяются **на сервере** при загрузке дашборда (см. ниже).
- `/servers` — список доступных серверов пользователя (owner/admin), выбор сервера для перехода в dashboard.
- `/dashboard/[guildId]` — **server component** (`page.tsx`): по cookie и **`getUserManageableGuildsWithBotState`** (тот же источник, что **`GET /api/discord/guilds`**) проверяет, что гильдия есть в списке управляемых и **`botConnected`**; иначе **`redirect('/servers')`**; без сессии — **`redirect('/')`**. После guard в клиент передаётся **`connectedGuilds`** и **`availableWelcomeCardFontKeys`** (список ключей шрифтов карточки с локальным `.ttf` в **`shared-data/fonts/welcome-card`**, см. **`listAvailableWelcomeCardFontKeys`**): **`result.guilds.filter((g) => g.botConnected)`** (тип **`ConnectedGuildForDashboard`**). UI — **`DashboardGuildPageClient`** с **`key={guildId}`**. Клиент: конфиг — **`fetch`** с **`credentials: 'include'`** и **`AbortSignal`**; **каналы/роли/эмодзи** — только после **`GET /api/dashboard/bootstrap`** с ненулевым **`viewer`** (зависимости эффекта: `guildId` + `bootstrap?.viewer?.id`), иначе при первом SPA-входе с главной запрос ресурсов мог уйти «слишком рано» и эффект не повторялся; отмена — **`AbortController`** + счётчик поколений, чтобы **`resourcesLoading`** не залипал после `abort`. В **development** в консоль пишутся **`console.debug`** для bootstrap/resources (можно убрать позже).

## API Routes
- `/api/auth/discord/login` (GET) — редиректит в Discord OAuth authorize.
- `/api/auth/discord/callback` (GET) — обменивает `code` на токен, получает пользователя, ставит auth-cookie; редирект на **`/dashboard/{guildId}`** при наличии подключённой управляемой гильдии (приоритет валидного **`timbrabot_last_guild_id`**), иначе на **`/servers`**.
- `/api/auth/logout` (GET) — очищает auth-cookie и редиректит на `/`.
- `/api/dashboard/bootstrap` (GET) — возвращает текущего viewer (по access token), информацию о боте (по bot token) и **`applicationId`** (id приложения для OAuth-ссылки «добавить бота»). При сбоях Discord не отдаёт 500: частичные данные + опционально `bootstrapWarnings`.
- `/api/discord/guilds` (GET) — обёртка над **`getUserManageableGuildsWithBotState`** (`lib/getUserManageableGuildsWithBotState.ts`): те же гильдии, фильтр owner/admin, сортировка, **`botConnected`** из **`readBotConnectedGuildIds()`** / **`bot-state.json`**. Запросы к Discord через `lib/discordFetch.ts`. Поле `iconUrl`: CDN `https://cdn.discordapp.com/icons/{id}/{hash}.{png|gif}` (`gif` если hash начинается с `a_`).
- `/api/discord/guilds/[guildId]/resources` (GET) — проверяет доступ пользователя к серверу, затем через bot token загружает каналы/роли/эмодзи сервера; те же ретраи; сетевые ошибки после ретраев → 503 с понятным текстом.
- `/api/discord/guilds/[guildId]/connection` (GET) — для авторизованного пользователя с **owner/admin** на гильдии: сначала **`readBotConnectedGuildIds()`** — если id есть в `bot-state.json`, сразу `botConnected: true`, `presence: member` (без запроса к Discord). Иначе fallback: `discordFetch` + `DISCORD_BOT_TOKEN`, `GET /guilds/{id}`. Ответ `{ guildId, guildName?, guildIconUrl?, botConnected, presence?, message? }`. Поле **`presence`**: `member`, `not_in_guild`, `unknown`. Без прав на гильдию →401/403. Используется для **модалки «Подключить бота»** и **polling после invite** на `/servers`; **не** вызывается при первой загрузке `/dashboard/[guildId]` (доступ и `botConnected` берутся из того же **`/api/discord/guilds`**, что и на `/servers`).
- `/api/discord/guilds/[guildId]/send-test` (POST) — тестовое приветствие в выбранный канал от бота: `text` / `embed` / **`imageCard`** (плейсхолдеры `{user}` и др.; для embed — автор по введённому имени, `icon_url` автора при флаге и **`viewerAvatarUrl`** (не бот); поля `embed.fields`; картинка только `http(s)`); для **`imageCard`** — генерация PNG через **`lib/welcomeImageCard.ts`** (`@napi-rs/canvas`), отправка multipart с вложением `welcome-card.png`, опционально `content` из общего поля `message` (если текст не пустой — в конец добавляется `\n\u200B`, чтобы в Discord был зазор между текстом и вложением); для аватара на карточке в тесте используется **`viewerAvatarUrl`**.
- `/api/config/[guildId]` (GET/POST) — пер-серверный конфиг в `../shared-data/config.json` через `guilds[guildId]`; поля embed как раньше; опционально **`imageCard`**: `title`, `subtitle`, `description`, **`titleStyle`** / **`subtitleStyle`** (шрифт, S/M/L, начертание, цвет текста), устаревшие глобальные `fontFamily`/`textSize`/… подхватываются merge в стили полей, плюс фон/оверлей/`backgroundImage` — **`mergeImageCardConfig`** + **`listAvailableWelcomeCardFontKeys`**.
- `/api/config/[guildId]/welcome-card-background` (GET/POST/DELETE) — загрузка/выдача/удаление фона карточки: файлы в **`../shared-data/assets/guilds/{guildId}/welcome-card-background.{png|jpg|webp}`**; POST multipart поле `file`, лимит ~2,5 МБ, только PNG/JPEG/WebP; GET с проверкой доступа к гильдии (cookie).
- `/api/fonts/welcome-card/[fontKey]` (GET) — отдаёт локальный `.ttf` из **`shared-data/fonts/welcome-card`** по whitelist-ключу (для `@font-face` превью карточки).

## Current UI Flow
1. Пользователь открывает `/`.
2. Если не авторизован — нажимает "Войти через Discord" и идет в OAuth flow.
3. После callback попадает на **`/dashboard/...`** при наличии подключённой гильдии (см. callback), иначе на **`/servers`**.
4. На `/servers` после **`/api/discord/guilds`** сразу видны карточки с **`botConnected`** из **`bot-state.json`** (без N запросов `/connection` на загрузку). Сортировка: сначала с `botConnected`, затем без; внутри группы по имени. У карточки: рядом с названием — компактная иконка статуса бота (lucide: подключён / не подключён) и короткий бейдж роли (вл./адм./мод. по `owner` и `permissions`); CTA «Управление» — `ds-btn-primary`, «Подключить» — `ds-btn-secondary` (тот же flow и модалка). Модалка «Подключить бота»: «Открыть Discord» → новая вкладка → опрос **`/connection`** до успеха или таймаута; при успехе — переход в `/dashboard/[guildId]`; по таймауту — «Попробовать ещё» / «Отмена».
5. Переходит на `/dashboard/[guildId]` (ссылка с главной); сервер при рендере либо отдаёт панель, либо редирект на **`/servers`**.
6. Клиентский дашборд подгружает bootstrap, ресурсы и конфиг (без отдельного «гейта» доступа на клиенте). Верхняя полоса: слева — аватар и имя бота; справа — только **`UserMenu`** (имя пользователя, «Серверы» → **`/servers`**, «Выйти»). Селектор текущего сервера (**`SidebarServerSwitcher`**) — над левым сайдбаром навигации (не в шапке): список подключённых гильдий, отметка текущего, внизу «Подключить сервер» → **`/servers`**; колонка сайдбара **`lg:grid-cols-[minmax(0,272px)_1fr]`**, длинные имена обрезаются с **`title`**. Переходы и **`triggerUnsavedGuard`** без изменений.
7. Пользователь меняет настройки, смотрит live preview и сохраняет через `/api/config/[guildId]`.
8. При выходе через меню выполняется `/api/auth/logout` и возврат на `/`.

## Implemented Features
- OAuth login/logout через Discord.
- Хранение access-token и user данных в httpOnly cookie.
- Получение профиля пользователя и данных о боте для хедера/лендинга.
- Список серверов с фильтром по правам (owner/admin); на `/servers` данные из одного **`/api/discord/guilds`** (в т.ч. `botConnected` из **`bot-state.json`**); **`/connection`** только в модалке/опросе после invite (см. flow). Карточки: спокойный фон/обводка, статус бота и роль — иконки/бейджи у названия; Ошибка загрузки списка — «Повторить»; сбой **`/api/dashboard/bootstrap`** не блокирует карточки.
- Дашборд `/dashboard/[guildId]`: вход разрешён только если серверная проверка **`getUserManageableGuildsWithBotState`** нашла гильдию с **`botConnected`**; иначе редирект на **`/servers`**. Клиент не делает fetch для валидации доступа при открытии страницы.
- Dashboard по `guildId` с 2 разделами: приветствие и авто-роли.
- Подтягивание ресурсов сервера: каналы, роли, эмодзи.
- Инсертеры в сообщение: emoji/channel/role/variables; выпадающие панели рендерятся через `createPortal` в `document.body` с `position: fixed` у якоря кнопок и тем же inline glass (rgba + `backdrop-filter: blur(20px)`) что у `CustomSelect`, чтобы размытие не гасилось родительскими `backdrop-filter` у карточек. Вставка в **`textarea`** (сырое приветствие, описание embed, заголовок/подзаголовок карточки) идёт через **`insertTextIntoTextAreaControlled`**: при фокусе на поле — актуальные `selectionStart`/`End`, иначе якорь с **`valueLen`** с момента mousedown; если длина текста изменилась после снимка — якорь сбрасывается, вставка только в **конец** (без восстановления удалённого текста); приоритет **`document.execCommand("insertText")`**, иначе **`setRangeText`** + `input`, иначе slice; при любом вводе в поле соответствующий якорь обнуляется. Preview: при **`onInput`** сбрасываются сохранённый `Range` и строка-снимок сериализации; вставка использует сохранённый диапазон **только если** сериализация совпадает со снимком на mousedown тулбара.
- Live предпросмотр обычного сообщения, embed и **карточки приветствия** (`imageCard`: фон — иконки режима, **`ColorPopover`** (локальный цвет + **requestAnimationFrame** для `onChange` при drag, позиция без пересчёта от `offsetHeight` панели); слайдер оверлея; фон-картинка — **иконки** загрузки/удаления без «кнопочного» фона; **заголовок/подзаголовок** — `textarea` (`field-sizing: content`), перенос как у PNG (**860px**); **глобально** `fontFamily` и `textColor` на всю карточку; **`titleStyle` / `subtitleStyle`** — только S/M/L, жирный, курсив; старые `fontFamily`/`textColor` внутри полей merge поднимает в корень; превью шрифтов — те же TTF, что PNG (**`WelcomeCardPreviewFontFaces`** + **`/api/fonts/welcome-card/[fontKey]`**); **градиент** фона — заметное смешение с `accentColor` (**`lib/imageCardGradient.ts`**, то же в боте); плавающая панель: **`CustomSelect` minimal** (глобальный шрифт, высота/бордер как у кнопок тулбара) + глобальный цвет + вставки + **Aa** (только активное поле; поповер **Aa** рендерится через **`createPortal` в `document.body`** как выпадашка шрифта, та же поверхность панели, что у **`CustomSelect`**, через общий **`DashboardDropdownSurface`**, позиция над кнопкой **Aa**); закрытие пикера вставок не считает клик по **`imageCardTextToolbarRef`** «снаружи»; при загрузке ресурсов — «Загрузка…», пустые списки — короткие русские подписи. PNG/превью: **`welcomeImageCardLayout.ts`** (**1200×515**, **860px** текст, **`IMAGE_CARD_RADIUS_PX` (32)** на превью и на PNG с прозрачными углами; аватар по пресетам **190 / 215 / 240** px).
- Сохранение пер-серверной конфигурации в общий `shared-data/config.json`.
- Запоминание последнего выбранного сервера в `localStorage`.
- `CustomSelect` реализован как кастомный popover/listbox, а не нативный `<select>`: dropdown рендерится через portal в `document.body` отдельной `absolute`-панелью над контентом, сохраняя поиск и текущее поведение выбора.
- Floating-панель `CustomSelect` использует прямой glass-стиль на popup-контейнере (`rgba(18, 22, 36, 0.42)` + `backdrop-filter: blur(20px)` + border/shadow/radius), `isolation: isolate` и высокий z-index без родительского `overflow: hidden` у самой панели.
- Общие токены выпадающих меню дашборда: `app/components/dashboardMenuTokens.ts` (glass, **`rounded-2xl`**/**`rounded-xl`**, тихий hover/active, **`min-w-0`**/**`overflow-hidden`** у строк, **`max-h`** с **`dvh`**). **`SidebarServerSwitcher`** (`app/components/SidebarServerSwitcher.tsx`): над сайдбаром; список **`connectedGuilds`** в **`flex`-колонке** с **`max-h-[min(85dvh,28rem)]`**, прокрутка только у списка, разделитель и «Подключить сервер» снизу вне скролла; **`overflow-x-clip`** у обёртки; **`Check`**, **`triggerUnsavedGuard`**, **`truncate`**/**`title`**. **`UserMenu`**: **`max-h-[min(70dvh,18rem)]`**, **`max-w-[min(20rem,calc(100vw-1.5rem))]`**; длинное имя в триггере — **`truncate`**/**`title`**; hover только у аватара.
- В `dashboard` возвращён floating bottom action bar для UX несохраненных изменений: отображается при наличии `isDirty`, позволяет сохранить или отменить изменения до `lastSavedConfig`; панель центрируется через flex-обёртку (`inset-x-0` + `justify-center`); при обычном редактировании панель **без** анимации тряски; краткая анимация внимания (`unsaved-bar-attention` в `globals.css`: shake + scale + кольцо; при **`prefers-reduced-motion`** — opacity/box-shadow pulse) запускается **только** при **`triggerUnsavedGuard`** (попытка уйти со страницы / сменить сервер / защищённая навигация при несохранённых изменениях), через **`pingUnsavedChangesPanel`**; повторная попытка — повторный «пинг».
- В `dashboard/[guildId]` добавлены guard-механизмы от потери несохранённых изменений: блок переключения разделов и внутренних переходов в хедере (`UserMenu`), в **`SidebarServerSwitcher`**, главная по логотипу бота через `triggerUnsavedGuard`, плюс системная защита `beforeunload` при refresh/закрытии вкладки.
- `CustomSelect` ограничивает dropdown по viewport: панель клампится по горизонтали, получает динамический `max-height` и при нехватке места снизу автоматически открывается вверх, чтобы селекты каналов/ролей не выходили за границы окна.
- Welcome: порядок блоков — канал → «Не приветствовать ботов» → **общий композер** «Сообщение приветствия» (Preview/Raw, тот же `message`, тот же тулбар вставок и токены) → **стиль** (сегмент «Текст / Embed / Карточка») → вложенный модуль только с настройками выбранного стиля (`text`: опциональное изображение к сообщению; `embed`: редактор embed; `imageCard`: только заголовок и подзаголовок на превью, фон и оверлей в верхней панели, см. пункт про `imageCard` выше). Для embed и карточки общее сообщение трактуется как текст над вложением/карточкой (как в API send-test и live-боте).
- Режим **Embed**: одна «живая» карточка в духе Discord (полоса слева, фон `#111214`): компактная верхняя утилитарная полоса (круглый пикер цвета, переключатель аватара автора, поле имени, превью аватара viewer); автор/заголовок/текст/поля/картинка/футер редактируются **внутри** карточки без разделения превью и формы. Иерархия: заголовок чуть крупнее и ярче; автор и футер вторичнее (`#b5bac1` / `#72767d`); тело в мягком inset. Подписи у большинства полей — `sr-only` + русские placeholder'ы; секция «Поля» — `.welcome-nested-kicker` (см. `globals.css`); «Добавить поле» — лёгкая inline-действие с «+»; слот изображения и поля — в том же визуальном ключе карточки (лёгкие inset-границы). Аватар в карточке — viewer; логика сохранения и `send-test` без изменений.
- Общий композер «Сообщение приветствия»: один внешний `rounded-xl` с тихим `ring` и inset-highlight как у соседних модулей; заголовок, подсказка и переключатель Preview/Raw — одна верхняя строка; область ввода без лишнего внутреннего кольца.
- Welcome (финальная визуальная согласованность): между крупными блоками `space-y-4`; панель параметров стиля — те же горизонтальные отступы, что у `.welcome-settings-module`, лёгкий `ring`, внутри `space-y-3.5`; оба сегментированных контрола (режим редактора и стиль) на фоне `bg-black/[0.26]`; подсказки и вторичные подписи опираются на `.welcome-help-text` / `.welcome-nested-kicker`; активное перетаскивание изображений (текст и embed) подсвечивается нейтральным светлым контуром; разделитель зоны «Отправить тест» — в том же тоне `border-white/[0.05]`.
- Пикер каналов/ролей: канал слева `#имя`, справа тип; роль — только точка в нативном RGB Discord + имя (без колонки meta). `/api/discord/guilds/[guildId]/resources` отдаёт у роли `color` (integer, `0` если нет цвета).
- Preview welcome-редактора: интерактивные «упоминания» только для канала, роли и плейсхолдера `{user}` (`.welcome-interactive-token` / `.welcome-token-variable-user`). Кастомные emoji — обычный инлайн `img` с CDN Discord и `data-welcome-src` (без `contentEditable=false`, без пилюли/класса интерактивного токена; fallback `:name:` — обычный `span` с тем же атрибутом). `{username}`, `{server}`, `{memberCount}`, `{date}` — как обычный текст превью (плейсхолдер в `data-welcome-src` на нейтральном `span`). `onCopy`: если выделение целиком внутри одного интерактивного токена — в буфер кладётся значение `data-welcome-src`; иначе при несхлопнутом выделении — `cloneContents` + `serializeWelcomeRichEditorRoot` (в т.ч. смешанный текст с emoji). Клик вне интерактивного токена снимает только визуальный «selected» с токена, не принудительно очищая системное выделение браузера. Пикер переменных: строки с иконкой, заголовком, описанием и компактным токеном справа.
- Секции Welcome и «Авто-роли» (HIG/macOS): одна карточка `ds-card` на активный раздел; обе обёрнуты в `CollapsibleSettingsSection` (`app/components/CollapsibleSettingsSection.tsx`): спокойный заголовок-кнопка без заливки, тонкий `focus-visible` ring, лёгкий hover только у chevron; разделитель `border-b` под заголовком только в развёрнутом состоянии; простой chevron без круглой кнопки, поворот при раскрытии; тело — `grid` 0fr/1fr + `inert` при сворачивании (без размонтирования и потери состояния). Канал — первая группа без отдельной модуля; «Не приветствовать ботов», общий композер сообщения и блок «Стиль приветствия» — отдельные `.welcome-settings-module`; под сегментом стиля — `rounded-xl bg-black/[0.18]` только для опций стиля; подписи — `ds-kicker`.
- Preview: дерево `contentEditable` не пересобирается на каждый ввод — `onInput` только нормализует, сериализует в строку `message` и восстанавливает каретку; полная перерисовка через `fillWelcomeRichEditor` только при загрузке/откате конфига (`richEditorBootstrap`), смене контекста превью (`welcomeRichCtx`), счётчике `previewEditorSyncSeq` (undo/redo и прочие явные ресинки). Собственная история отмены: стек снимков `{ message, caret, editorMode }`, debounce ~550 ms для группировки непрерывного ввода, немедленный commit после вставки с тулбара, paste, удаления выбранного токена; в Preview перехватываются Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z и Ctrl+Y (Windows/Linux) по `event.code` (`KeyZ`/`KeyY`), чтобы отмена работала при русской раскладке; Cmd+Shift+Z — redo на macOS; без ломания IME (`isComposing`). Raw textarea: без перехвата горячих клавиш отмены; в историю пишется debounced-снимок для согласованности состояния `message`, нативный undo в поле не отключается.
- Портал пикера вставок (emoji/channel/role/variable): стеклянный корневой блок панели (`ds-liquid-list`) с `ref={pickerPanelRef}` и `onMouseDown` с `stopPropagation`, чтобы клики по панели не конфликтовали с document-level закрытием; позиция панели якорится к кнопке активного тулбара через `welcomePickerAnchorRefs`, `embedPickerAnchorRefs` или **`imageCardToolbarPickerAnchorRefs`** при `insertPickerSurface` `imageCardTitle` / `imageCardSubtitle`; `pickerAreaRef` — область общего композера, `embedPickerAreaRef` — область embed; закрытие по клику снаружи — `mousedown` на `document`.
- В разделе Welcome: внизу секции тихая accessory-полоса (разделитель `border-t`, без «футера формы»): слева компактная pill-кнопка «Отправить тест» вторичнее основного сохранения; справа короткий хелпер «Проверить, как сообщение выглядит в Discord» и компактный `role="status"` для успеха/ошибки. Запрос — тот же `POST /api/discord/guilds/[guildId]/send-test`, без требования сохранения.
- Для текстового стиля добавлена загрузка изображения (drag-and-drop + file picker) с локальным хранением в data URL (`textImageDataUrl`) и предпросмотром/удалением.
- `skipBotAccounts` влияет только на отправку welcome-сообщения ботам; выбор `botRoleId` в авто-ролях больше не блокируется этим флагом.
- В секции `Авто-роли` больше не показываются welcome-элементы (`skipBotAccounts`, канал приветствия); эти настройки отображаются только в разделе `Приветствие`.

## Persistence
- **cookies (httpOnly):**
  - `discord_access_token`
  - `discord_user_id`
  - `discord_user_name`
- **cookie (не httpOnly, не секрет):**
  - `timbrabot_last_guild_id` — последний открытый дашборд (для post-OAuth редиректа; не очищается при logout)
- **localStorage:**
  - `lastGuildId`
  - `lastGuildName`
- **`../shared-data/config.json`:**
  - единственный источник сохранённых настроек, структура `guilds[guildId]` (в т.ч. поля embed: `embedAuthorName`, `embedAuthorAvatar`, `embedAuthorAvatarUrl`, `embedFooter`, `embedImageDataUrl`, `embedFields`; опционально **`imageCard`** для стиля `imageCard`, в т.ч. относительный путь к фону в **`backgroundImage.path`**).
- **`../shared-data/assets/guilds/{guildId}/`** — опционально `welcome-card-background.*` (фон карточки; не в git по необходимости).
- **`../shared-data/fonts/welcome-card/`** — TTF для **`@napi-rs/canvas`** (`registerWelcomeCardFonts`); дашборд и **`mergeImageCard`** учитывают фактически существующие файлы (**`lib/resolveImageCardFont.ts`**); при отсутствии выбранного файла PNG использует тот же fallback, что и превью (предупреждение в логе).
- **`../shared-data/bot-state.json`:**
  - `{ version: 1, updatedAt: ISO string, guildIds: string[] }` — пишет **`discord-bot`** (debounce, атомарно через `bot-state.tmp.json` → rename); события `ready`, `guildCreate`, `guildDelete` + полный resync каждые **60 с**. Чтение: `lib/readBotConnectedGuildIds.ts` (поддержка устаревшего формата с `guilds[].id`). Каталог: **`SHARED_DATA_DIR`** (env) или `path.resolve(process.cwd(), "../shared-data")` — см. `lib/resolveSharedDataDir.ts` и `discord-bot/lib/resolveSharedDataDir.js` (должны совпадать при локальном запуске из соседних папок; при разных контейнерах без общего volume задайте **`SHARED_DATA_DIR`**). В **development** в ответе `/api/discord/guilds` может быть `_debug` с путём и `botConnectedCount`.

## Discord API resilience
- `lib/discordFetch.ts` — общий `fetch` к `https://discord.com/api`: таймаут по умолчанию 8s, до 2 ретраев после сбоя (всего до 3 попыток), экспоненциальный бэкофф + джиттер, ретраи на 5xx и 429 (с учётом `Retry-After`).

## Important Files
- `app/components/AppFooter.tsx` — общий нижний колонтитул (копирайт + версия, без логотипа).
- `app/components/CollapsibleSettingsSection.tsx` — сворачиваемый блок настроек (заголовок + подзаголовок + тело; a11y, анимация).
- `app/components/dashboardMenuTokens.ts` — общие стили панелей/строк меню дашборда.
- `app/components/SidebarServerSwitcher.tsx` — выбор сервера над сайдбаром (только подключённые гильдии из пропсов).
- `app/page.tsx` — лендинг, проверка bootstrap, CTA логина/навигации.
- `app/servers/page.tsx` — загрузка и рендер списка серверов.
- `app/dashboard/[guildId]/page.tsx` — server guard + рендер клиента.
- `app/dashboard/[guildId]/DashboardGuildPageClient.tsx` — главный UI редактора конфигурации и предпросмотра.
- `lib/getUserManageableGuildsWithBotState.ts` — общая логика списка гильдий + `botConnected` для API и дашборда; экспорт типа **`ConnectedGuildForDashboard`** для пропсов UI.
- `app/api/auth/discord/login/route.ts` — старт OAuth.
- `app/api/auth/discord/callback/route.ts` — обмен кода, установка cookie, redirect.
- `app/api/auth/logout/route.ts` — очистка cookie.
- `app/api/dashboard/bootstrap/route.ts` — bootstrap данные viewer/bot (мягкая деградация).
- `lib/discordFetch.ts` — таймаут и ретраи для Discord API.
- `lib/readBotConnectedGuildIds.ts` — чтение `bot-state.json` → `Set<string>` guild id (без throw при сбое).
- `app/api/discord/guilds/route.ts` — серверы пользователя.
- `app/api/discord/guilds/[guildId]/resources/route.ts` — каналы/роли/эмодзи сервера.
- `app/api/discord/guilds/[guildId]/send-test/route.ts` — POST: тестовое welcome-сообщение в канал (`text` / `embed` / `imageCard` с PNG).
- `lib/welcomeImageCardLayout.ts` — **1200×515**, **`IMAGE_CARD_RADIUS_PX` (32)**, **`IMAGE_CARD_TEXT_MAX_W` (860)**, пресеты S/M/L (аватар 190/215/240, типографика заголовок30/38/45, подзаголовок 20/25/30), **`computeImageCardAvatarTopPx`**, **`imageCardPreviewScaledMetrics`**.
- `lib/resolveImageCardFont.ts` — **`listAvailableWelcomeCardFontKeys`**, **`resolveImageCardFontForRendering`** (fallback для PNG).
- `app/components/DashboardDropdownSurface.tsx` — общая поверхность выпадающих панелей (inline-стили как у **`CustomSelect`**: фон, blur, border, shadow, radius); **`CustomSelect`** и поповер **Aa** карточки.
- `app/components/ColorPopover.tsx` — выбор цвета (HEX, пресеты, **react-colorful** `HexColorPicker`), портал в `document.body`, позиционирование с учётом `avoidRect`.
- `app/components/WelcomeCardPreviewFontFaces.tsx` — клиентские `@font-face` для доступных TTF карточки.
- `lib/colorHex.ts` — нормализация и проверка HEX для `ColorPopover`.
- `lib/welcomeImageCard.ts` — PNG карточки (`@napi-rs/canvas`): один резолв шрифта на карточку (`fontFamily` + `textColor` в входе); весь рисунок клипуется скруглённым прямоугольником **`IMAGE_CARD_RADIUS_PX`** (прозрачные углы PNG); фон → оверлей → аватар → текст; в **development** — краткие логи шрифта при генерации.
- `lib/imageCardGradient.ts` — второй цвет градиента фона (превью + PNG).
- `lib/mergeImageCardConfig.ts` — дефолты и слияние `imageCard` для старых конфигов (`titleStyle`/`subtitleStyle` без шрифта/цвета в модели).
- `lib/registerWelcomeCardFonts.ts` — `registerFont` для whitelist-шрифтов из `shared-data/fonts/welcome-card`.
- `lib/resolveImageCardBackgroundPath.ts` — абсолютный путь к фону из относительного `backgroundImage.path`.
- `lib/welcomeCardConstants.ts` — whitelist шрифтов карточки, **`IMAGE_CARD_FONT_DISPLAY_NAME`**, имена файлов TTF; превью и PNG используют **одни и те же** локальные файлы в **`../shared-data/fonts/welcome-card/`**; выбор в UI только при наличии TTF.
- `lib/welcomeCardPreviewFonts.ts` — CSS `font-family` для превью (имена как у canvas / `@font-face`).
- `app/api/config/[guildId]/route.ts` — чтение/запись пер-серверного конфига в shared-data.
- `../shared-data/config.json` — общее хранилище настроек.
- `../shared-data/bot-state.json` — список гильдий бота (см. Persistence).
- `../discord-bot/lib/botState.js` — атомарная запись `bot-state.json`, debounce, payload `version`/`updatedAt`/`guildIds`.
- `../discord-bot/index.js` — `scheduleBotStateWrite` на событиях; `setInterval` 60 с для `writeBotStateNow`.
- `../discord-bot/lib/welcomeImageCard.js` — та же генерация PNG, что и в дашборде (CommonJS для бота): скругление **`IMAGE_CARD_RADIUS_PX` (32)** и те же размеры аватара по пресетам.
- `../discord-bot/lib/guildMemberAdd.js` — live-бот: на `guildMemberAdd` читает тот же `config.json`, выдаёт авто-роли, отправляет приветствие в стилях `text`, `embed` и **`imageCard`** (вложение `welcome-card.png`, опционально `content` из `message`; для **`imageCard`** при непустом тексте — суффикс `\n\u200B` перед вложением); полный embed: автор/`embedAuthorAvatarUrl`, title, description, color, footer, fields, image; картинки `textImageDataUrl` / `embedImageDataUrl` — `data:` как вложение, `http(s)` — загрузка или URL в embed); плейсхолдеры `{user}`, `{username}`, `{server}`, `{memberCount}`, `{date}`; при ошибке генерации/отправки **`imageCard`** — fallback на короткий текст в `message` или `Добро пожаловать, {mention}!`; подробные логи `[welcome]` / `[autoRole]`.

## Known Problems
- При `next build` Turbopack может выдавать предупреждение NFT (трассировка `welcome-card-background/route.ts` + `resolveSharedDataDir`) — сборка проходит; при необходимости см. рекомендации Next по `turbopackIgnore` для путей.
- Cookie выставляются с `secure: false` (небезопасно для production).
- В `/api/discord/guilds/[guildId]/resources` доступ пользователя проверяется только по membership guild, без повторной проверки owner/admin как в списке серверов.
- В `dashboard/[guildId]/page.tsx` присутствуют большие UI/state-блоки в одном файле, что усложняет поддержку.
- Нет видимых тестов и явной валидации входных данных API при записи конфига.

## Current Next Step
При желании убрать предупреждение Turbopack NFT для `welcome-card-background` или усилить проверку прав в `/api/discord/guilds/[guildId]/resources` (owner/admin как в списке серверов) и валидацию тела при записи конфига.

## Layout Consistency
- В `app/globals.css`: токены `--interactive-ease`, `--interactive-fast` / `--interactive-normal`, `--focus-ring-strong` / `--focus-ring-soft`; у `.ds-btn-*`, `.ds-liquid-btn`, `button.ds-liquid-list-item` — согласованные hover/active/disabled (у disabled без «живого» hover); фокус у ссылок-кнопок и `.welcome-interactive-token`; `prefers-reduced-motion` убирает scale на active; в `@layer base` — курсоры (pointer / text / not-allowed). `CollapsibleSettingsSection`, `UserMenu`, переключатель ботов — `focus-visible` и тихие hover/active.
- В корневом `app/layout.tsx` подключён общий футер `app/components/AppFooter.tsx`: копирайт и версия приложения, тихая вторичная типографика, без отдельной подложки; контент и футер обёрнуты в общий блок с классом `app-bg`. Оболочка `min-h-screen` + `flex` + `flex-1` у области `children`. У `<main>` на `/`, `/servers` и `/dashboard/[guildId]` вместо `min-h-screen` используется `flex-1` / `min-h-0`, чтобы не суммировать высоту с футером; класс `app-bg` с `<main>` снят, фон задаётся обёрткой в `layout`.
- В `app/globals.css` добавлен единый контейнер контента `app-container` (`max-width: 1200px`).
- На страницах `app/page.tsx`, `app/servers/page.tsx` и `app/dashboard/[guildId]/page.tsx` заменены разные `max-w-*` обёртки на `app-container`, чтобы ширина “тела” была одинаковой на всех страницах.
- Для внутренних страниц (`app/servers/page.tsx` и `app/dashboard/[guildId]/page.tsx`) добавлен отдельный более узкий контейнер `app-shell-container` (`max-width: 1040px`), чтобы shell-поток был компактнее и ближе к desktop HIG-паттернам.
- Верхняя панель `app/servers/page.tsx` унифицирована с `dashboard`: тот же плоский header-паттерн `ds-header-bar`, имя бота и аватар без отдельной строки-кикера; на дашборде крупнее аватар бота, селектор сервера — в левой колонке над навигацией; статус **`botConnected`** у карточек — только на **`/servers`**.

## Notes for Future Edits
- Не делать предположений: сначала читать текущие файлы и подтверждать фактическое поведение.
- Перед любым изменением проверять связанные route/page файлы и текущее хранилище данных.
- После значимых изменений в роутинге, API, flow или persistence обязательно обновлять `PROJECT_STATE.md`.
