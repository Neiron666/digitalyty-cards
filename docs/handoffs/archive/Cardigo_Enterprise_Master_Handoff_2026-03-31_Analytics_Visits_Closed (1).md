# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-31 (site-level analytics source + visits/uniques closed; booking calendar UX hardening closed; legal/info/a11y family remains closed)_

---

## 0) Что это за документ

Это **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **актуальную product / architecture truth**;
- зафиксировать **рабочую доктрину** и enterprise-режим мышления;
- передать не только **что уже сделано**, но и **как правильно продолжать дальше**;
- удержать следующий чат от `scope creep`, broad refactor и решений “на глаз”; 
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить роль Copilot Agent как **исполнителя**, а не архитектора;
- зафиксировать текущий статус проекта, закрытые bounded workstream-ы, открытые truth-gap-ы и следующий безопасный порядок действий.

Этот файл одновременно является:

- master handoff;
- project brief;
- operating doctrine;
- architecture memo;
- senior-architect playbook;
- инструкцией для следующего окна ChatGPT;
- картой уже закрытых и ещё возможных bounded workstream-ов;
- практической инструкцией по работе с Copilot Agent.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это enterprise-minded SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но фактически это не просто “визитка”.

Cardigo уже включает или должен включать:

- digital business card;
- mini business page;
- sharing layer;
- SEO surface;
- QR / WhatsApp / social entry point;
- lead surface;
- self-service editing system;
- analytics layer;
- structured-data layer;
- premium / org / admin surface;
- AI-assisted content surfaces;
- booking foundation и owner/public booking contour;
- services / business hours operational layer;
- premium public marketing surfaces;
- blog / guides / discoverability stack.

Итоговая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на **иврит и RTL**;
- UX, copy и product assumptions строятся под израильский рынок;
- multi-locale пока **не является продуктовой базой**;
- использование `IL` как trusted default допустимо там, где это не ломает truth и контракты.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

Их **нельзя смешивать** в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Production truth:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- Cardigo и Digitalyty нельзя смешивать в canonical / OG / sitemap / URL logic / product copy.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- CSS Modules only
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
- Netlify hosting

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
- backend на Render-подобной схеме деплоя
- proxy gate / route-level guards
- DTO / SEO / analytics logic на backend truth
- runtime sitemap generation

### 2.3 Дополнительные сервисы

- Supabase Storage
- Mailjet
- MongoDB Atlas / совместимый managed Mongo runtime

### 2.4 Важная operational truth

- `autoIndex: false`
- `autoCreate: false`

Это означает:

- индексы в проде **не создаются автоматически** только от Mongoose schema;
- все важные индексы живут через **manual index governance**;
- production structural truth должна подтверждаться **реальными индексами в БД**, а не только schema metadata;
- migration scripts + drift sanity — канонический operational путь.

---

## 3) Основные поверхности продукта

### 3.1 Public / marketing / legal / discoverability

- `/`
- `/cards`
- `/pricing`
- `/contact`
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`
- `/privacy`
- `/terms`
- `/accessibility-statement`
- OG routes
- sitemap integration

### 3.2 Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

### 3.3 Preview surfaces

- preview routes
- editor preview
- phone-preview wrappers

### 3.4 Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

### 3.5 Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

### 3.6 Admin surface

- `/admin`

### 3.7 Boundary principle

Главное правило:

**Никогда не менять границы контуров “на глаз”.**

Сначала:

1. доказать boundary;
2. понять, к какому контуру относится поверхность;
3. только потом менять.

---

## 4) Роль ChatGPT и роль Copilot Agent

### 4.1 ChatGPT в этом проекте

ChatGPT в Cardigo должен работать как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

Это означает:

- защищать архитектурную truth;
- думать про scalability / security / performance / maintainability;
- различать product truth, runtime truth и temporary transition truth;
- минимизировать blast radius;
- не допускать `scope creep`;
- готовить узкие и безопасные задачи для Copilot Agent;
- требовать `PROOF file:line-range` и RAW outputs;
- не принимать решения “на глаз”, если их можно доказать;
- поддерживать docs / runbooks / handoff truth;
- выбирать safest path, а не fastest hack.

### 4.2 Дополнительные обязанности ChatGPT

Как senior architect / full-stack / enterprise consultant, ChatGPT также отвечает за:

- архитектурное проектирование и оптимизацию под рост, производительность и безопасность;
- технический консалтинг по frontend / backend / API / storage / deployment;
- security-minded review;
- guidance по secure mechanisms:
  - CSRF / XSS / injection defenses,
  - data protection,
  - password / reset / token flow hardening,
  - privacy / consent / legal truth;
- guidance по CI/CD, тестам, deploy discipline, monitoring и alerts;
- documentation / runbooks / README / next-chat truth.

### 4.3 Copilot Agent в этом проекте

Copilot Agent — **исполнитель**, а не архитектор.

Он должен:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”;
- не лезть в соседние контуры без доказанной необходимости.

---

## 5) Жёсткая рабочая доктрина проекта

### 5.1 Канонический workflow

Всегда сохраняется строгий порядок:

1. **Architecture / Intent clarification**
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких реализаций до аудита.  
Никаких acceptance без verification.

### 5.2 Обязательные ограничения для каждого Copilot prompt

Всегда использовать:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Жёсткие ограничения:

- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens from the canonical project SSoT for the relevant scope
  - do NOT invent new token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

### 5.3 Тактические правила

- без `scope creep`;
- без “заодно поправил”;
- всегда требовать `PROOF file:line-range`;
- boundaries доказывать, а не угадывать;
- в shared/high-blast-radius файлы входить только при доказанной необходимости;
- broad refactor запрещён, пока не доказан как safest path;
- verification важнее уверенного тона;
- temp `_tmp*` / probe artifacts удалять, если они больше не нужны;
- smoke/manual проверки проводить через **PowerShell + `curl.exe`**, где это возможно.

### 5.4 Практический стандарт постановки задач Copilot

Каждый хороший prompt должен содержать:

- цель;
- expected behavior;
- constraints;
- in-scope;
- out-of-scope;
- что нельзя трогать;
- definition of done;
- deliverable format;
- STOP после нужной фазы.

---

## 6) Важные архитектурные инварианты

Нельзя casually ломать:

- SSoT render chain for public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- CardLayout DOM skeleton;
- public/QR/OG URLs только из backend DTO `publicPath/ogPath`;
- anti-enumeration 404 / membership gate на org surfaces;
- sitemap без N+1;
- backend index governance только вручную.

### 6.1 Frontend / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary — разные контуры, их нельзя смешивать “по чувству”.

### 6.2 Typography law

Typography policy — корпоративный закон:

- `font-size` только через `var(--fs-*)`;
- `--fs-*` только rem-only;
- нельзя `px`, `em`, `%`, `vw`, `vh`, `clamp`, fluid formulas;
- нельзя `calc(non-rem)`;
- responsive typography только через token overrides и rem breakpoints;
- нельзя придумывать новые typography tokens ad hoc.

### 6.3 High-blast-radius зоны

Без отдельного bounded workstream не трогать casually:

- `CardLayout.module.css`
- CardLayout DOM skeleton
- card-boundary typography
- shared render chain
- templates registry
- shared public styling primitives

---

## 7) Что уже закрыто раньше и не должно casually reopen-иться

Ниже — контуры, которые уже закрыты или не должны reopen-иться без отдельной причины:

- premium public pages family;
- `/cards` examples page;
- `/pricing` public pricing contour;
- `/contact` public page;
- blog subsystem;
- guides subsystem MVP contour;
- governance hardening cycle;
- typography app/editor remediation outside deferred card-boundary zone;
- motion framework foundation + controlled usage;
- FAQ AI bounded v1;
- AI quota / shared budget direction;
- services cycle closed;
- business hours closed;
- booking backend foundation / owner incoming area / IA closed;
- services tab functional repair and UX alignment cycle closed;
- reset validation / error truth fix;
- docs truth for reset flow updated;
- legal/info public family (`/privacy`, `/terms`, `/accessibility-statement`);
- skip link;
- accessibility focus-trap Tier 1 + Tier 2.

---

## 8) Что было закрыто в этом окне / в последних bounded workstream-ах

### 8.1 Public booking calendar UX hardening — CLOSED

Это отдельный закрытый bounded workstream.

#### Product truth

Публичный booking UI не должен был:
- пихать конец одного месяца и начало другого в один сломанный grid;
- выглядеть как “временный костыль”; 
- создавать впечатление, что booking window считается фронтом “на глаз”.

#### Что было решено

Принято и внедрено:

- booking horizon на frontend changed from **7 days** to **14 days**;
- календарь переведён в режим **single-month view**;
- если 14-дневное окно заходит в следующий месяц, UI показывает **navigation between months present in the returned window**;
- навигация по месяцам делается **локально внутри уже загруженного 14-day window**, а не через опасный backend `startDate`-navigation;
- RTL semantics стрелок исправлена:
  - **правая** = предыдущий месяц
  - **левая** = следующий месяц;
- CSS cascade regressions были закрыты через bounded selector fixes;
- full-week overflow rows были закрыты отдельным corrective pass.

#### Почему именно так

Сначала был найден tempting path через `startDate`, но он был отклонён как небезопасный, потому что мог размыть product truth “только rolling 14-day window”.

Правильный path был выбран такой:

- backend availability остаётся canonical truth;
- frontend не придумывает bookability;
- frontend лишь **делит already returned 14-day window** на month views;
- UI navigation = presentation layer, не источник truth.

#### Что было намеренно не тронуто

- backend booking create/availability semantics;
- owner inbox;
- services/businessHours;
- CardLayout;
- shared render chain;
- broad calendar/date utilities.

#### Итоговая truth

Booking public UI теперь считается закрытым в части:

- `7 days -> 14 days`
- `single-month view`
- `local month navigation`
- `RTL arrow semantics`
- `CSS regressions fixed`
- `Phase 3 verification passed`

### 8.2 Site-level analytics truthful source + visit intelligence — CLOSED

Это главный новый закрытый workstream текущего окна.

Он прошёл в несколько bounded подбатчей, и важно помнить их порядок.

---

## 9) Site-level analytics truthful source + visit intelligence — полная truth

### 9.1 Исходная проблема

Изначально `/admin -> אנליטיקה` страдала сразу от нескольких truth-gap-ов:

1. **Новый / anonymous / incognito / in-app traffic не считался** в site-level analytics, потому что proxy gate блокировал analytics POST.
2. Даже когда traffic стал считаться, source/channel truth была слишком грубой (`direct`, `referral`, `social`).
3. Даже после source-improvement analytics отвечала на вопрос “откуда пришла активность”, но не отвечала честно на вопрос:
   - сколько было **визитов**;
   - сколько было **уникальных посетителей**;
   - что именно делали после входа.

Эта проблема была решена **не одной большой переделкой**, а серией bounded workstream-ов.

---

### 9.2 P0 fix — proxy gate unblock for site analytics ingest — CLOSED

#### Root cause

Публичный POST на `/api/site-analytics/track` проходил через общий `/api/*` proxy gate и требовал `__Host-cardigo_gate` cookie.

Из-за этого:

- новые пользователи;
- incognito/private visitors;
- users inside Facebook/Instagram/TikTok/X app browsers;
- вообще fresh anonymous traffic

не доходили до backend ingest, и `/admin` не видел их page views.

#### Что было сделано

В proxy function был добавлен **узкий bypass** только для:

- `POST /api/site-analytics/track`

При этом:

- все остальные `/api/*` routes остались gated;
- GET на analytics path остался gated;
- backend целиком не был открыт.

#### Truth

С этого момента site-level analytics стала честно считать:

- anonymous;
- incognito;
- app browser;
- fresh visitor traffic.

---

### 9.3 Site-level normalized source — CLOSED

#### Исходная проблема

Даже после unblock admin analytics показывала источник слишком грубо:

- `direct`
- `referral`
- `social`

Это не отвечало на вопрос “откуда именно пришёл человек?”.

#### Что было сделано

Сначала был сделан frontend display-hardening:
- raw channel keys были заменены на человекочитаемые labels;
- UI начал показывать sub-hint из уже существующих данных.

Но этого было недостаточно.

Дальше был построен правильный backend/source слой:

- добавлен отдельный `sourceCounts` как новая additive truth для site analytics;
- `sourceCounts` отделён от:
  - `channelCounts` (coarse truth),
  - `referrerCounts` (raw host truth),
  - `utm*Counts` (raw marketing truth);
- source нормализуется на ingest path;
- в admin API появился `sourceTop`;
- UI перестал гадать source через approximation и стал использовать **реальную source truth**.

#### Важная архитектурная развязка

Было **специально запрещено**:

- складывать raw `utm_source` как есть в `sourceCounts` без нормализации;
- перегружать `referrerCounts` новой семаникой;
- импортировать card analytics util напрямую в site analytics runtime.

#### Итоговая truth

Теперь `/admin -> אנליטיקה` умеет показывать нормализованный site source:

- Facebook
- Instagram
- TikTok
- X
- Google
- Bing
- DuckDuckGo
- Yahoo
- Direct
- bounded external/unknown fallback

Это уже отвечает на вопрос:

> **Откуда именно пришла активность?**

Но ещё не отвечает на вопрос:

> **Сколько было визитов / уникальных посетителей?**

---

### 9.4 Site visit intelligence foundation — CLOSED

После source-truth стало очевидно, что `views/clicks/source` — это всё ещё **event truth**, а не visit/unique truth.

#### Архитектурное решение

Была осознанно отвергнута идея:
- строить это на `SiteAnalyticsDaily`;
- или хранить один документ на `{ siteKey, deviceHash, day }`.

Потому что такой путь смешивал бы:
- visit truth
- unique truth

и врал бы про визиты.

#### Что было принято

Финально была выбрана следующая truth-model:

- `deviceId` / `deviceHash` = **best-effort unique visitor identity**
- `visitId` / `visitHash` = **visit identity**

#### Важная semantics decision

Сначала был отвергнут `sessionStorage per-tab` как source of truth для visit.

Почему:
- он переоценивает multi-tab behavior;
- считает вкладки, а не визиты;
- недооценивает return-after-inactivity;
- не подходит для enterprise-честной метрики “visit”.

Правильный выбор:

- `visitId` на **localStorage-backed** ключе
- с **30-minute inactivity timeout**
- cross-tab shared
- truthful enough for lightweight visit analytics

#### Что было внедрено на frontend foundation layer

Появился отдельный helper:

- `siteAnalyticsIdentity.util.js`

Он отвечает за:

- `getOrCreateDeviceId()`
- `getOrCreateVisitId()`

С ключами:

- `digitalyty_deviceId`
- `digitalyty_visitId`
- `digitalyty_visitActivity`

Важные правила:

- `digitalyty_deviceId` intentionally совпадает по ключу с card-side browser storage, чтобы один и тот же браузер имел одну best-effort device identity across contexts;
- при этом **card analytics runtime не трогался**;
- `visitId` обновляет activity timestamp на каждом analytics event;
- если localStorage blocked, используется bounded in-memory fallback, стабильный на время жизни страницы.

`siteAnalytics.client.js` теперь отправляет:

- `deviceId`
- `visitId`

в site analytics payload.

---

### 9.5 SiteAnalyticsVisit collection + index governance — CLOSED

#### Что было сделано

Добавлена новая truth collection:

- `SiteAnalyticsVisit`

Это **не raw event warehouse** и не total surveillance.

Это именно **lightweight visit intelligence layer**.

#### Что хранит visit truth

Минимально:

- `siteKey`
- `day`
- `deviceHash`
- `visitHash`
- `channel`
- `source`
- `landingPage`
- `referrerHost`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmContent` (если есть в payload)
- `startedAt`
- `lastSeenAt`
- `pageViewsCount`
- `clicksCount`
- `importantActions[]`

#### Важные инварианты

- raw `deviceId` и raw `visitId` **никогда не хранятся**;
- backend пишет только hashed values;
- visit truth создаётся по **первому событию визита**;
- source/channel/landingPage — immutable через `$setOnInsert`;
- `lastSeenAt`, counters и importantActions — mutable;
- write path стал **best-effort / fire-and-forget** и не держит основной `204` response path.

#### Индексы

Индексы были не просто описаны, а полностью переведены на manual governance:

- migration script;
- drift sanity script;
- package scripts;
- apply подтверждён;
- post-apply drift confirmed.

Канонические индексы:

1. unique `{ siteKey: 1, visitHash: 1 }`
2. query `{ siteKey: 1, day: 1 }`
3. TTL `{ startedAt: 1 }` with retention policy

Schema-level index declarations были **удалены**, чтобы не было второй operational truth besides migration + drift sanity.

---

### 9.6 Admin visit API — CLOSED

После foundation был собран новый bounded admin API endpoint для visit intelligence.

Endpoint:

- `GET /api/admin/site-analytics/visits`

Он возвращает truthful read-model:

- `rangeDays`
- `totalUniqueVisitors`
- `visitsBySource`
- `uniquesBySource`
- `topActionsBySource`
- `topLandingsBySource`

#### Важные semantics

- `visitsBySource` = count visit documents
- `uniquesBySource` = DISTINCT `deviceHash` **per source** over range
- `totalUniqueVisitors` = DISTINCT `deviceHash` across **all** visits in range
- `totalUniqueVisitors` **не** выводится суммой по source buckets
- `topActionsBySource` uses only stored `importantActions`
- `topLandingsBySource` uses stored `landingPage`

#### Важная performance-correction

Сначала unique counting было сделано через `$addToSet`, но это было отклонено как memory-heavier path.

Финально принято enterprise-safe решение:

- `uniquesBySource` через two-stage distinct grouping by `{ source, deviceHash }`
- `totalUniqueVisitors` через distinct grouping by `deviceHash`
- **без materialized arrays** ради одного только count distinct.

Это важно помнить как архитектурное правило: **если нужен count distinct, не надо materialize-ить большой set, если можно получить тот же результат через group pattern.**

---

### 9.7 Admin UI for visits / uniques / important actions — CLOSED

После того как backend truth был закрыт и live smoke показал корректный JSON shape, была собрана новая UI-секция в `/admin -> אנליטיקה`.

#### Что теперь показывается

Новый UI-слой показывает:

- `מבקרים (בקירוב)`
- `visits by source`
- `unique visitors by source`
- `top important actions by source`
- `top landing pages by source`

#### Честность wording

Это отдельная и очень важная часть truth.

Специально было решено:

- не писать “people”;
- не писать “точные пользователи”;
- использовать честную формулировку:
  - `מבקרים (בקירוב)`
  - `מבקרים ייחודיים (בקירוב)`
- объяснить overlap semantics.

#### Resilience-correction

Изначально visits fetch был зашит в общий `Promise.all` вместе с `summary + sources`, и это было отклонено.

Правильная final truth:

- base analytics layer (`summary + sources`) остаётся primary load path;
- visits/uniques layer — additive fetch;
- если новый endpoint временно падает, page не должна рушиться;
- visits block деградирует отдельно и безопасно.

Это было исправлено отдельным corrective pass.

#### Итоговая truth

Теперь `/admin -> אנליטיקה` даёт уже **двухслойную аналитику**:

### Activity layer
- views
- clicks
- conversion
- channels
- normalized sources
- referrers
- UTM
- campaigns
- top pages
- top actions

### Visit intelligence layer
- visits by source
- unique visitors by source (best effort)
- total unique visitors
- landing pages by source
- important actions by source

И это уже отвечает на реальные бизнес-вопросы:

- откуда пришли;
- сколько было визитов;
- сколько было уникальных посетителей;
- какие действия были после входа;
- какие посадочные страницы работали.

---

## 10) Что важно помнить про аналитику после закрытия workstream-а

### 10.1 Текущая admin analytics стала зрелой, но не “всевидящей”

Это **не** поведенческий warehouse и **не** tracking every micro-event.

Это намеренно облегчённая enterprise-модель.

### 10.2 Что честно считает система сейчас

#### Activity metrics
- сколько было views
- сколько было clicks
- какая активность пришла с источника

#### Visit intelligence
- сколько было visits by source
- сколько было unique visitors by source (`best effort / approx_device`)
- какие landing pages были по источнику
- какие important actions были по источнику

### 10.3 Что система сознательно не делает

- не хранит полный raw event stream каждого посетителя;
- не пишет hover/scroll/micro-events;
- не даёт обещание “точных людей”;
- не пытается быть full surveillance warehouse.

### 10.4 Что важно не врать в UI и docs

Нельзя писать:
- “люди”
- “точные пользователи”
- “уникальные люди”

Правильно писать:
- `מבקרים (בקירוב)`
- `מבקרים ייחודיים (בקירוב)`
- browser/device-based approximation

### 10.5 Семаника uniques by source

Один и тот же device/browser может:
- попасть в Facebook source bucket,
- позже попасть в Google source bucket,
- в том же диапазоне.

Это **нормально**.

Поэтому:
- `totalUniqueVisitors` не равен сумме per-source uniques;
- UI/документация не должны создавать ложное ожидание, что buckets складываются в total.

---

## 11) Что project ещё должен включать / усиливать дальше

Enterprise-мышление требует смотреть дальше.

### 11.1 Security / auth / hardening

Roadmap остаётся актуальным:

- дальше усиливать auth / registration;
- улучшать token / API error handling;
- закрывать уязвимые классы сценариев;
- держать focus на security posture;
- улучшать observability.

### 11.2 Billing / premium / org maturity

Проект должен продолжать включать и усиливать:

- billing clarity;
- premium entitlements;
- org/admin maturity;
- support flows;
- clearer product rules around paid capabilities.

### 11.3 Monitoring / alerts / CI/CD

Нужны зрелые production-readiness шаги:

- monitoring;
- alerts;
- CI/CD baseline;
- performance readiness;
- stress testing;
- support/debug runbooks.

### 11.4 Analytics next-step possibilities

Analytics теперь закрыта на хорошем уровне, но возможны bounded follow-ups:

- alias tuning для source normalization;
- help-text / tooltip про unique semantics;
- campaign / ad-level attribution (`utm_content`, `ad_id`, `adset_id`) как отдельный future marketing workstream;
- lightweight dashboard polish without changing truth;
- retention / aggregation tuning только при реальном росте нагрузки.

### 11.5 AI growth, но только bounded

Если продолжать AI, то только bounded задачами:

- AI policy audit;
- AI support docs;
- AI observability;
- отдельные small-surface improvements.

---

## 12) Рекомендуемый следующий bounded step после этого окна

Если выбирать safest path, то я бы рекомендовал **не reopen-ить только что закрытую analytics architecture**, а идти в один из таких bounded follow-up путей:

### Вариант A — Analytics wording/help polish (рекомендуется как маленький safe batch)

Добавить маленький bounded UI/help слой:
- tooltip / helper text про `מבקרים (בקירוב)`;
- пояснение, что per-source uniques могут пересекаться и не должны суммироваться до total.

Почему это хороший шаг:
- низкий blast radius;
- укрепляет trust в аналитике;
- не меняет backend truth.

### Вариант B — Marketing attribution deeper layer

Если продукту важно видеть не только платформу, но и:
- campaign
- ad set
- creative / ad

тогда открывать отдельный bounded workstream на:
- `utm_campaign`
- `utm_content`
- optional `ad_id` / `adset_id`

Но это уже **следующий маркетинговый слой**, а не часть текущей site analytics truth.

### Вариант C — Auth / registration hardening

Если фокус снова сместится на security/platform maturity, это тоже безопасный следующий path:
- auth;
- invalid-token paths;
- registration;
- API error truth.

---

## 13) Как должен работать следующий чат GPT

### 13.1 Поведение нового чата

Новый чат должен работать **не как быстрый помощник**, а как архитектор.

Ключевые установки:

- ChatGPT — архитектор;
- Copilot — исполнитель;
- думать enterprise-grade;
- держать в голове SSoT, contracts, invariants, boundaries и blast radius;
- не делать broad cleanup;
- резать scope;
- уважать protocol;
- не жертвовать архитектурой ради скорости.

### 13.2 Каноническая последовательность

Правильная последовательность всегда одна:

1. Phase 1 audit
2. прочитать ответ Copilot
3. как архитектор выбрать safest path
4. дать Phase 2
5. дать Phase 3
6. если изменение meaningful — обновить docs / handoff truth

### 13.3 Что всегда требовать от Copilot

- PROOF `file:line-range`
- RAW stdout + EXIT
- grep/search proof
- visual/manual smoke при необходимости

---

## 14) Чего нельзя делать в следующем окне

Нельзя:

- быстро чинить без audit;
- смешивать boundaries;
- ломать архитектуру ради скорости;
- позволять Copilot делать “заодно поправил”;
- возвращать inline styles / grid / invented typography tokens;
- трогать `CardLayout` casually;
- придумывать новые `--fs-*` names;
- документировать stale truth как current truth;
- делать broad cleanup “ради чистоты” без реального business / UX / ops обоснования;
- reopen-ить без сильной причины закрытые analytics sub-batches, booking calendar UX, legal/info/a11y family и другие явно закрытые bounded workstream-ы.

---

## 15) Ready-to-paste bootstrap для нового окна ChatGPT

Ниже текст, который можно вставить в новое окно как bootstrap:

```text
Ты — Senior Project Architect / Senior Full-Stack / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot — исполнитель. Работаем строго фазами: Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP; Phase 2 Minimal Fix (1–3 файла, без рефакторинга/форматирования, backward compatible, если не утверждено иначе) → STOP; Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP; затем Documentation.

PROJECT MODE: Cardigo enterprise workflow.

Ограничения Copilot:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid in styles
- Mobile-first mandatory
- Typography policy:
  - font-size only через var(--fs-*)
  - use only existing approved typography tokens from canonical SSoT
  - do NOT invent token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Инварианты:
- SSoT render chain public+preview
- templates registry только frontend/src/templates/templates.config.js
- skins token-only
- preview-only стили только [data-preview="phone"]
- CardLayout DOM skeleton не менять casually
- public/QR/OG только из backend DTO publicPath/ogPath
- org security anti-enumeration 404 и membership-gate до SEO
- sitemap без N+1
- backend index governance autoIndex/autoCreate off, drift via sanity, manual index scripts only

Cardigo — Israel-first / Israel-only.
Cardigo и Digitalyty не смешивать.

Последние полностью закрытые workstreams:
- /privacy, /terms, /accessibility-statement shell+truth closed
- sitemap update for /accessibility-statement closed
- skip link closed
- accessibility focus trap Tier 1 + Tier 2 closed
- booking public calendar UX hardening closed (14 days, single-month view, local month nav, RTL arrows fixed)
- site analytics source truth + visit intelligence closed

Текущая analytics truth:
- event/activity layer: views, clicks, channels, normalized sources
- visit intelligence layer: visits by source, unique visitors by source (מבקרים בקירוב), total unique visitors, top landings by source, top actions by source
- total unique visitors НЕ равен сумме per-source uniques
- не говорить "people"; говорить "מבקרים (בקירוב)"

Рабочее правило:
сначала доказать runtime/code truth, потом минимальный fix, потом verification, потом documentation.
```

---

## 16) Финальное напутствие

Проект зрелый.  
Это не место для «быстренько что-то подправить».

Правильный подход здесь:

- не спешить;
- не расползаться по scope;
- не смешивать архитектурные уровни;
- не ломать boundaries ради удобства;
- всегда сначала доказывать;
- потом чинить минимально;
- потом проверять;
- потом документировать.

### Главное правило проекта
Не искать самый быстрый путь.  
Искать самый безопасный, зрелый и enterprise-правильный путь.

### Главное правило роли ChatGPT
ChatGPT здесь не «просто помощник по коду».  
ChatGPT здесь — **архитектор проекта**, который защищает:

- систему;
- продуктовую правду;
- техническую правду;
- границы;
- качество решений;
- долгосрочную поддерживаемость.

### Итоговая выжимка в одном абзаце

Cardigo — зрелый Israel-first SaaS для digital business cards с широкой продуктовой поверхностью: public marketing/legal pages, public card surfaces, editor/product/admin layers, AI, analytics, SEO/structured data, booking/services/business-hours и owner-facing operational contours. В последних циклах были полностью закрыты legal/info public pages (`/privacy`, `/terms`, `/accessibility-statement`), accessibility hardening (skip link + focus trap), booking public calendar UX hardening (14-day window, single-month calendar, local month navigation, RTL-safe controls) и большой bounded workstream по site-level analytics truth в `/admin`: unblock ingest через узкий proxy bypass, normalized source attribution, отдельная visit-truth collection, manual index governance, truthful admin API for visits/uniques/actions/landings, и честный admin UI c `מבקרים (בקירוב)`. Следующий чат должен продолжать работать как senior architect: не переписывать вслепую, не расширять scope, сначала доказывать code/runtime truth, потом делать минимальный fix, потом verification, и только потом фиксировать новую truth в docs/handoff.
