# Cardigo - Enterprise Master Handoff / Next Chat Full Playbook

_Обновлено: 2026-04-03 (после закрытия booking lifecycle + docs alignment + booking index replacement contour)_

---

## 0) Что это за документ

Это **актуальный большой master handoff** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты о проекте, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, решений “на глаз” и accidental drift;
- сохранить **закрытые контуры закрытыми**;
- отделить:
    - что уже завершено;
    - что intentionally deferred;
    - что логично брать следующим bounded workstream;
- зафиксировать роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить роль **Copilot Agent как исполнителя**, а не архитектора;
- дать следующему окну GPT полноценную инструкцию, как работать над Cardigo по-взрослому.

Этот документ нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- project doctrine;
- architecture memo;
- operational truth;
- инструкцию по тому, **как правильно работать над Cardigo**;
- и как базовый шаблон мышления для всех следующих bounded workstream-ов.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** - это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo - это не “просто визитка”.

Текущая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

Проект уже включает или должен включать:

- digital business card;
- public card surface;
- mini business page;
- lead surface;
- WhatsApp / QR / social entry points;
- self-service editing;
- analytics layer;
- structured-data / SEO layer;
- premium surface;
- organization/team surface;
- admin surface;
- AI-assisted content surfaces;
- services / business-hours operational contour;
- booking foundation и owner/public booking contour;
- discoverability stack;
- blog / guides public content surfaces;
- premium public marketing surfaces.

### 1.2 Рынок и продуктовая ориентация

Cardigo - **Israel-first / Israel-only baseline**.

Это означает:

- иврит / RTL - product default;
- product assumptions строятся под Израиль;
- multi-locale пока не является базовой product truth;
- использование `IL` как trusted default допустимо там, где это не ломает contracts и truth.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** - отдельный продукт;
- **Digitalyty** - отдельный бренд / сайт / маркетинговый слой.

Их нельзя смешивать в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- OG / sitemap / URL logic;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Production truth:

**https://cardigo.co.il**

Политика:

- canonical - non-www;
- Cardigo и Digitalyty не смешивать в canonical / OG / sitemap / URL logic / product copy / structured data.

### 1.5 Что проект уже умеет и куда должен расти дальше

Cardigo уже давно вышел за пределы “простого конструктора визиток”. Это платформа, которая уже движется в сторону более взрослого enterprise-продукта:

- личные и организационные карточки;
- кабинет / editor;
- owner inbox;
- admin area;
- leads / analytics / discoverability;
- premium / org / AI-направления;
- публичный маркетинговый слой;
- legal / docs / governance discipline;
- booking / operational business contour;
- защищённая auth / recovery / invite / verification архитектура;
- ручная DB/index governance вместо хаотического runtime-роста.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- **CSS Modules only**
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
- Netlify hosting / Netlify-facing surface
- preview/editor/product/admin/public layers

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
- backend deploy на Render-подобной схеме
- DTO-driven public truth
- SEO / analytics / routing logic
- manual index governance
- auth / org / admin / booking / leads / AI / content APIs

### 2.3 Дополнительные сервисы

- Supabase Storage
- Mailjet
- MongoDB Atlas / managed Mongo runtime
- payment contour / notify contour
- site gate / proxy gate contour
- AI provider contour

### 2.4 Mongo / index governance truth

Это очень важный operational закон проекта:

- `MONGOOSE_AUTO_INDEX=false`
- `MONGOOSE_AUTO_CREATE=false`

Это означает:

- production structural truth не должна рождаться хаотично на runtime;
- критичные индексы поднимаются **вручную**;
- миграции и sanity scripts - канонический путь;
- drift должен выявляться и исправляться осознанно, а не “сам создался и ладно”.

---

## 3) Текущая runtime / DB truth

### 3.1 Что произошло с базой

Было принято осознанное решение:

- **не мигрировать старые данные**;
- поднять **новый clean production-shaped Mongo cluster с нуля**;
- использовать его как новую operational baseline.

Target DB: **`cardigo_prod`**

Старый cluster:

- **не удалён**;
- оставлен как **rollback/reference**.

### 3.2 Что уже truth по новому кластеру

На новом cluster уже подтверждено:

- local и Render работают на новой DB truth;
- manual index governance сохранён;
- backend на Render уже переведён на новый cluster;
- backend успешно стартует;
- старый cluster не используется как current production truth.

Render env truth:

- backend смотрит в новый Mongo cluster;
- `SITE_ANALYTICS_RETENTION_DAYS=365`
- `SITE_ANALYTICS_VISIT_RETENTION_DAYS=90`
- `MONGO_URI_OLD` сохранён для rollback.

### 3.3 Какие коллекции/контуры были подняты вручную

Manual indexes / bootstrap tooling были подтверждены для:

- organizations
- organizationmembers
- users
- cards
- emailverificationtokens
- emailsignuptokens
- passwordresets
- activepasswordresets
- mailjobs
- cardanalyticsdailys
- siteanalyticsdailys
- siteanalyticsvisits
- orginvites
- leads
- bookings
- aiusagemonthlies
- paymenttransactions
- blogposts
- guideposts
- deletedemailblocks

### 3.4 Какие migration/tooling проблемы уже были закрыты

Уже исправлены:

- scripts, которые не делали `mongoose.disconnect()`;
- bookings migration:
    - `NamespaceNotFound` safe path;
    - замена `process.exit()` на более безопасный lifecycle;
    - фикс `expireAfterSeconds: null` в non-TTL index path;
- leads migration:
    - dry-run/apply mismatch;
    - missing governed indexes;
    - добавлены `idx_leads_mailbox` и `idx_leads_deletedAt_ttl`.

---

## 4) Роль ChatGPT и роль Copilot Agent

### 4.1 Роль ChatGPT

В этом проекте ChatGPT должен работать как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

Это означает:

- защищать architecture truth;
- защищать invariants;
- различать runtime truth, product truth и transition truth;
- думать про security / scalability / maintainability / blast radius;
- не давать broad refactor “по вдохновению”;
- не принимать решения “на глаз”, если их можно доказать;
- строить bounded prompts для Copilot;
- требовать `PROOF file:line-range`;
- требовать `RAW stdout + EXIT`;
- фиксировать, что уже закрыто и не должно casually reopen-иться;
- выбирать safest mature path, а не fastest hack.

### 4.2 Дополнительные обязанности ChatGPT в проекте

Как senior architect / full-stack / enterprise consultant, ChatGPT также отвечает за:

- архитектурное проектирование и улучшение проекта под масштабируемость, безопасность и производительность;
- технический консалтинг по backend, frontend, API architecture, data storage, deployment и production readiness;
- code review и improvement proposals с фокусом на качество, maintainability, clean code principles и design patterns;
- guidance по secure mechanisms:
    - CSRF/XSS/injection defenses,
    - data protection,
    - password / reset / token flow hardening,
    - privacy / consent / legal truth;
- помощь по CI/CD, monitoring, alerts, release discipline;
- поддержку документации:
    - technical docs,
    - runbooks,
    - README,
    - next-chat handoffs,
    - anti-drift guidance.

### 4.3 Роль Copilot Agent

Copilot Agent - **исполнитель**, а не архитектор.

Его роль:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”;
- не трогать соседние контуры без доказанной необходимости.

---

## 5) Каноническая рабочая доктрина

### 5.1 Workflow

Всегда соблюдать:

1. **Architecture / intent clarification**
2. **Phase 1 - Read-Only Audit with PROOF**
3. **Phase 2 - Minimal Fix**
4. **Phase 3 - Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких code changes до audit.  
Никаких acceptance без verification.

### 5.2 Жёсткие ограничения для Copilot prompts

Всегда использовать:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Hard constraints:

- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
    - font-size only via var(--fs-\*)
    - use only existing approved typography tokens from canonical SSoT
    - do NOT invent token names ad hoc
    - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
    - --fs-\* rem-only
    - no px/em/%/vw/vh/clamp/fluid
    - no calc(non-rem)

### 5.3 Тактические правила

- без `scope creep`;
- без “заодно поправил”;
- всегда требовать `PROOF file:line-range`;
- boundaries сначала доказывать, потом трогать;
- broad refactor запрещён, пока он не доказан как safest path;
- verification важнее уверенного тона;
- в high-blast-radius зоны входить только при явной необходимости;
- smoke/manual проверки - через PowerShell + `curl.exe`, где уместно;
- если речь о “двух фазах”, помнить, что для Cardigo verification всегда отдельная обязательная фаза;
- **никогда не переходить к следующей задаче, пока в текущей не убраны / не улажены все хвосты**;
- хвост считается закрытым только если он:
    - либо исправлен,
    - либо явно классифицирован как non-blocking / deferred / intentional truth.

### 5.4 Как формулировать хорошие задачи Copilot

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

## 6) Жёсткие архитектурные инварианты проекта

Нельзя casually ломать:

- shared / SSoT render chain for public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- CardLayout DOM skeleton;
- CardLayout.module.css без отдельной серьёзной причины;
- public/QR/OG URLs только из backend DTO `publicPath/ogPath`;
- anti-enumeration 404 / membership-gate truth;
- sitemap без N+1;
- backend index governance только вручную.

### 6.1 Frontend / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary - разные контуры, их нельзя смешивать “по чувству”.

### 6.2 Typography law

Typography policy - корпоративный закон:

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
- global auth transport rules
- proxy/gate assumptions

---

## 7) Что уже было важно закрыто раньше и не должно casually reopen-иться

Считаются закрытыми или не подлежащими casual reopen следующие contours:

- premium public pages family;
- `/cards` examples page;
- `/pricing`;
- `/contact`;
- blog subsystem;
- guides subsystem MVP;
- governance hardening cycle;
- typography remediation вне deferred card-boundary zone;
- motion framework foundation;
- FAQ AI bounded v1;
- AI quota/shared budget direction;
- services cycle;
- business hours contour;
- booking backend foundation / owner incoming area / IA;
- legal/info public family;
- skip link;
- accessibility focus trap Tier 1 + Tier 2;
- fresh-cluster DB/bootstrap contour;
- большой bounded auth/security modernization contour;
- docs + anti-drift closure для этого contour-а.

---

## 8) Большая auth/security migration program - что было сделано

### 8.1 Что было целью

Не “переписать auth ради красоты”, а перевести проект на более зрелую browser/session/security модель, не сломав runtime, tooling, admin, uploads и связанные поверхности.

### 8.2 Что закрыто по факту

#### Browser runtime

- browser runtime переведён на **httpOnly cookie-backed auth**;
- browser auth больше не строится на `localStorage["token"]`;
- browser-side `Authorization` header как primary auth mechanism убран.

#### Response-body token decommission

JWT больше не возвращается в body для browser auth flows:

- `/auth/login`
- `/auth/signup-consume`
- `/invites/accept`

#### Browser localStorage auth truth removal

- auth token больше не живёт в browser localStorage;
- остались только non-auth localStorage keys, которые допустимы:
    - cooldown flags,
    - device/anonymous IDs,
    - AI consent,
    - UX/analytics opt-outs и т.п.

#### Admin regression closure

- `requireAdmin` больше не ломает browser runtime в cookie-backed модели;
- `/admin` снова доступен корректно;
- tabs/users/cards/orgs грузятся;
- non-admin не получает admin access.

#### CSRF contour

Принята и закрыта текущая CSRF truth:

- cookie-auth mutation requests требуют `X-Requested-With: XMLHttpRequest`;
- middleware mounted globally;
- frontend отправляет header централизованно;
- в текущей topology это считается достаточной финальной моделью;
- **не reopen-ить casually** без нового отдельного contour-а.

#### CORS contour

Принята и закрыта текущая CORS truth:

- explicit allowlist from `CORS_ORIGINS`;
- `credentials: true`;
- no wildcard drift;
- no-origin path intentionally allowed for server-to-server / curl / internal tooling;
- proxy/topology проверены и признаны согласованными;
- **не reopen-ить casually** без нового отдельного contour-а.

#### Bearer/tooling decision

Закрыт не удалением, а зрелым decision:

- backend dual-mode middleware intentionally оставлен;
- browser runtime от Bearer уже не зависит;
- Bearer теперь живёт как **controlled internal tooling compatibility layer**;
- сейчас removal **не justified**.

#### Observability / correctness fixes

Были закрыты узкие foundation gaps:

- structured logging для CSRF rejections;
- structured logging для CORS rejections;
- `Vary` correctness для `/auth/me`:  
  **`Authorization, Cookie`**

#### Startup/runtime validation hardening

Закрыты важные env/runtime gaps:

- `JWT_SECRET` теперь fail-fast на startup;
- `CARDIGO_PROXY_SHARED_SECRET` теперь fail-fast на startup в production;
- `.env.example` поджат в безопасную сторону для relevant env;
- misconfiguration переведена из fail-open/fail-late в fail-fast.

### 8.3 Что именно теперь считается auth/security truth

#### Browser auth contract

Browser auth теперь - это:

- **cookie-backed**
- **httpOnly**
- `sameSite: "lax"`
- `secure: true` в production
- `path: "/"`

Browser runtime truth:

- frontend использует `withCredentials: true`;
- frontend не пишет `Authorization` header для browser auth;
- frontend не хранит auth token в localStorage;
- session bootstrap идёт через `/auth/me`;
- logout идёт через backend;
- browser auth responses не возвращают token в body.

#### Cookie names

- production: `__Host-cardigo_auth`
- non-production: `cardigo_auth`

#### Dual-mode backend truth

Backend middleware intentionally остаётся:

- `Authorization` header first
- cookie fallback second

Но это уже **не browser dependency**, а intentional internal compatibility layer.

#### Response-body truth

`/register`

- **не выдаёт auth cookie/session**
- response truth:
    - `{ registered: true, isVerified: false }`

`/login`

- **ставит auth cookie**
- response truth:
    - `{ ok: true }`

`/auth/signup-consume`

- **ставит auth cookie**
- response truth:
    - `{ ok: true }`

`/invites/accept`

- **ставит auth cookie**
- response truth:
    - `{ ok: true, orgId, orgSlug }`

`/auth/me`

- browser truth: cookie-backed auth
- tooling/curl truth: Bearer still accepted
- `Vary: Authorization, Cookie`

### 8.4 Что intentionally остаётся открытым / deferred

- Gate / public launch strategy
- Refresh-token architecture
- Broader auth redesign
- `CARDIGO_NOTIFY_TOKEN` / payment-notify contour
- optional low-priority tech-debt notes вроде stale comments, AUTH_COOKIE_NAME dedup и similar micro-items

### 8.5 Что НЕ нужно делать в следующем окне

Нельзя:

- заново открывать закрытые auth/body-token contours без причины;
- casually трогать backend dual-mode Bearer;
- смешивать gate/public-launch тему с auth modernization;
- возвращать localStorage как auth truth;
- возвращать JWT в response body “на всякий случай”;
- делать broad auth rewrite без audit;
- ломать manual index governance;
- массово чистить DB/index/runtime/CSRF/CORS всё одним батчем;
- открывать сразу refresh-token redesign без отдельного contour-а;
- “улучшать безопасность” только ради ощущения движения, если реального blocking residual нет.

---

## 9) Self-delete finality / permanent blocked re-registration

### 9.1 Что была за проблема

До этого workstream пользователь мог:

1. зарегистрировать аккаунт;
2. удалить аккаунт полностью;
3. затем снова зарегистрировать новый аккаунт на тот же email.

Это противоречило продуктовой финальности self-delete.

### 9.2 Какое архитектурное решение было выбрано

Выбран bounded взрослый вариант:

**hard delete + dedicated deleted-email tombstone/block collection**

Почему не soft-delete в `users`:

- это раздувает `users` мёртвыми документами;
- усложняет почти все user queries;
- повышает риск случайного всплытия deleted users в других поверхностях;
- даёт больший blast radius.

### 9.3 Что было реализовано

Добавлены:

- `DeletedEmailBlock` model;
- `emailBlock.util.js`;
- startup fail-fast validation for `EMAIL_BLOCK_SECRET`.

DB governance:

- collection: `deletedemailblocks`
- unique index: `emailKey_1`

Hashing / privacy truth:

- raw email не хранится;
- используется HMAC-SHA256 + `EMAIL_BLOCK_SECRET`;
- payload prefix: `cardigo-email-block-v1:` + normalizedEmail

Flow truth:

- tombstone-first ordering;
- если запись tombstone не удалась - destructive cascade не стартует.

Enforcement:

- `/auth/register`
- `/auth/signup-link`
- `/auth/signup-consume`
- `/invites/accept` - только new-user branch

Anti-enumeration сохранена:

- register → тот же `409`
- signup-link → тот же `204`
- signup-consume → тот же neutral/fail path
- invite accept → тот же `404`

UX truth:

- перед удалением пользователь получает явное предупреждение;
- после удаления - финальное сообщение, что этот email больше не будет доступен для нового аккаунта.

### 9.4 Что считать закрытым truth

Теперь в Cardigo self-delete означает:

- аккаунт удалён;
- связанные сущности удалены по текущему cascade truth;
- тот же email **не может** создать новый аккаунт снова;
- система enforce’ит это без раскрытия blocked-email history;
- product UX заранее предупреждает пользователя об этой финальности.

### 9.5 Что intentionally НЕ включено

- `admin-delete` policy;
- broader verification-link lifecycle redesign;
- deeper identity-lifecycle cleanup outside this bounded milestone.

---

## 10) Booking contour - текущая canonical truth

Этот раздел особенно важен, потому что именно booking contour в последних циклах был тщательно audited, исправлен, проверен руками в production, и затем выровнен в docs.

### 10.1 Что уже было закрыто раньше

Раньше были закрыты:

- booking backend foundation;
- public booking UI;
- owner inbox IA;
- owner retrieval bug;
- slot blocking через statuses;
- docs:
    - `docs/bookings-inbox-architecture.md`
    - `docs/runbooks/bookings-indexes-ops.md`

### 10.2 Текущая owner inbox truth

Owner incoming IA должна мыслиться так:

- `פניות`
- `בקשות תיאום`
- `פגישות עתידיות`

В `בקשות תיאום` живут:

- `pending`
- `canceled`
- `expired`

В `פגישות עתידיות` живут только:

- `status === "approved"`
- и встреча ещё **не закончилась**
- то есть `endAt > now`

Approved future bookings **не должны дублироваться** одновременно в двух вкладках.

### 10.3 Current safe owner actions

Current safe owner actions:

- `approve`
- `cancel`

Слот освобождается через:

- **`canceled`**
- а не через физическое delete

Потому что blocking semantics построены на статусах:

- `pending` / `approved` блокируют
- `canceled` / `expired` не блокируют

Hard delete **не должен** считаться default owner action.

### 10.4 Самая важная booking truth после последнего workstream

Раньше была старая неправильная модель:

- booking request создавался как `pending`
- и через 30 минут auto-expire переходил в `expired`
- даже если slot date была в будущем
- этим же случайно снимался:
    - slot lock
    - person lock по тому же телефону

Эта модель была **продуктово неправильной** для Cardigo.

Теперь текущая canonical truth такая:

#### Pending truth

- visitor выбирает день/время и отправляет заявку;
- booking становится `pending`;
- пока booking `pending`, выбранный слот остаётся **занят**;
- пока booking `pending`, тот же нормализованный телефон / тот же `personKey` на той же карточке **не может** создать вторую активную booking request;
- owner должен принять решение:
    - approve → слот остаётся занят
    - cancel → слот освобождается

#### No 30-minute auto-expiry

- никакого 30-minute auto-expiry больше нет;
- future booking request **не должна** auto-expire до owner decision.

#### Past-slot cleanup truth

Система всё ещё может делать cleanup, но только так:

- если slot уже прошёл,
- stale `pending` может перейти в `expired`
- то есть cleanup разрешён **только после фактического конца слота**, а не через таймер после создания.

### 10.5 Current duplicate/person blocking truth

Person-level duplicate truth:

- `personKey = SHA256(cardId + "|" + normalizedPhone)`
- блокировка person-level является **card-scoped**
- на той же карточке один и тот же нормализованный телефон не может иметь вторую активную booking request, пока первая находится в blocking-status.

Blocking-status truth:

- `pending`
- `approved`

Non-blocking statuses:

- `canceled`
- `expired`

### 10.6 Current booking index truth

После отдельного bounded governance contour booking index truth была приведена к новой runtime semantics.

Раньше существовал индекс:

- `idx_booking_pending_expiresAt`
- key: `{ status: 1, expiresAt: 1, _id: 1 }`

Он стал семантически stale после перехода booking lifecycle на `endAt`.

Затем был выполнен безопасный replacement contour:

1. schema declaration изменена на новый индекс;
2. в production создан новый индекс;
3. planner `explain()` подтвердил, что новый индекс выбирается;
4. старый индекс удалён;
5. docs выровнены.

### 10.7 Текущий canonical booking pending index

Текущий canonical pending index:

- **name:** `idx_booking_pending_endAt`
- **key:** `{ status: 1, endAt: 1, _id: 1 }`

Это production truth, schema truth и docs truth.

### 10.8 Canonical booking docs

Основные canonical docs по booking:

- `docs/bookings-inbox-architecture.md`
- `docs/runbooks/bookings-indexes-ops.md`

Они теперь должны считаться truth-aligned по отношению к:

- owner-decision-driven pending model
- same-phone/person blocking
- endAt-based cleanup
- canonical index `idx_booking_pending_endAt`

### 10.9 Что было осознанно НЕ превращено в отдельный workstream

Во время проверки legacy records были найдены future-`expired` booking-записи, но они оказались **тестовыми / пробными**.  
Потому:

- отдельный repair-script contour НЕ открывался;
- тестовые записи могут быть удалены вручную;
- этот пункт не считается runtime defect, который требует отдельного продукта/кода.

### 10.10 Что остаётся deferred в booking

Считается deferred:

- history/completed meetings tab;
- broader archive/hide logic;
- reschedule flow;
- hard delete strategy;
- отдельный governance contour по `card_1/status_1` schema-vs-production drift, если вообще возникнет практический смысл его открывать.

### 10.11 Что нельзя делать дальше casually

Нельзя:

- возвращать 30-minute pending expiry;
- ослаблять person-level duplicate blocking “на глаз”;
- смешивать owner inbox IA cleanup с broader history/archive workstream;
- трогать booking index governance без отдельного bounded contour;
- вводить broad booking redesign без audit и доказанного product need.

---

## 11) AI / quota / FAQ / SEO contours - high-level truth

AI направление в Cardigo уже имеет зрелую bounded truth:

- About AI endpoint(s);
- FAQ AI bounded v1;
- SEO AI bounded v1;
- shared monthly quota;
- internal limiter + provider quota distinction;
- provider invoked only via backend;
- enterprise-safe taxonomy ошибок;
- UI показывает remaining quota / disables actions when exhausted;
- AI workstream считается собранным на хорошем enterprise-уровне для текущего продукта.

Не reopen-ить casually:

- quota model
- provider distinction
- shared limiter storage truth
- FAQ bounded empty-only generation semantics
- SEO field scope restrictions

---

## 12) Публичные / маркетинговые / discoverability contours - high-level truth

Считаются закрытыми или зрелыми:

- home / cards / pricing / contact family;
- blog subsystem;
- guides subsystem;
- legal family (`privacy`, `terms`, `accessibility-statement`);
- sitemap runtime generation;
- OG / canonical discipline;
- skip-link и accessibility focus-trap workstreams;
- services/business-hours public/editor alignment cycle;
- analytics source/visits contour;
- several premium public UX cycles.

Это не значит “никогда не трогать”, но значит:

- нельзя casually переделывать;
- нельзя открывать broad public redesign без product need;
- нельзя ломать общий public canon и SEO invariants ради мелкой локальной задачи.

---

## 13) Закрытые контуры, которые НЕ нужно casually reopen-ить

- browser auth migration
- response-body token decommission
- browser localStorage auth removal
- CSRF contour
- CORS contour
- Bearer/tooling compatibility decision
- startup/runtime validation hardening
- self-delete permanent email-block contour
- booking lifecycle correction contour
- booking docs alignment contour
- booking pending-index replacement contour
- docs + anti-drift closure для этих контуров

---

## 14) Текущие canonical truth sources

### 14.1 Главный handoff source

Для следующего чата использовать **этот handoff** как основной master playbook.

### 14.2 Canonical booking docs

- `docs/bookings-inbox-architecture.md` - главный architecture/product-truth doc по booking owner inbox / lifecycle / IA / deferred scope
- `docs/runbooks/bookings-indexes-ops.md` - ops/index/runbook doc по booking index truth

### 14.3 Не смешивать

- architecture truth не размазывать по runbooks;
- ops truth не размазывать по handoff notes;
- старые historical handoffs не переписывать без серьёзной причины;
- closed contours не reopen-ить только потому, что “рядом лежал похожий файл”.

---

## 15) Как принимать или не принимать работу Copilot

Принимать только то, что:

- прошло audit с PROOF;
- имеет минимальный blast radius;
- прошло verification или честно остановлено до него;
- не ломает accepted subsystems;
- не тащит scope creep;
- truthfully подтверждено runtime, если речь идёт о lifecycle / API / entitlement / delete / booking / invite / persistence.

Не принимать:

- красивые формулировки без PROOF;
- “скорее всего” вместо line-range и stdout;
- broad refactor “на всякий случай”;
- улучшения, которые открывают новый contour, но скрывают это под видом маленького fix.

---

## 16) Практический skeleton хорошего Copilot prompt

```text
Ты - Copilot Agent, acting as senior <relevant specialty> engineer with strong <relevant domain awareness> and enterprise discipline.

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens from the canonical project SSoT for the relevant scope
  - do NOT invent new token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Canonical workflow:
Phase 1 - Read-Only Audit
Phase 2 - Minimal Fix
Phase 3 - Verification
STOP after the requested phase
```

Дальше в prompt всегда должно быть:

- что именно нужно доказать;
- какие файлы читать;
- какие shared/high-blast-radius файлы не трогать casually;
- точный deliverable format;
- требование RAW stdout + EXIT для verification.

---

## 17) Практические правила следующего окна GPT

Следующий чат должен помнить:

- ChatGPT здесь - архитектор, не code monkey;
- Copilot - исполнитель;
- всё делается bounded contours;
- сначала доказать truth;
- потом minimal fix;
- потом verification;
- потом handoff/documentation;
- не invent-ить новые задачи, если реального blocking residual нет;
- не смешивать соседние contours ради ощущения прогресса;
- если contour реально закрыт - лучше остановиться, чем искусственно “добивать до идеала”.

---

## 18) Следующие логичные bounded workstream-ы

Текущий booking/index/docs contour закрыт. Следующий шаг уже должен быть **новым отдельным contour-ом**, а не хвостом старого.

Логичные следующие направления:

### Вариант A - card_1 / status_1 schema-vs-production drift governance

Это не баг booking runtime. Это отдельный DB governance question:

- в schema есть field-level `index: true`
- в production эти индексы не доказаны как существующие
- нужно отдельно решить:
    - они реально нужны?
    - их надо создать вручную?
    - или наоборот убрать эти schema declarations, если compound/governed indexes покрывают реальную нагрузку?

Это отдельный bounded ops/governance contour, не booking-fix contour.

### Вариант B - product / roadmap contour

Если нужен функциональный прогресс, а не governance:

- support/admin tools
- premium/org surfaces
- next AI/product growth contour
- auth/registration UX improvements
- public launch / gate strategy

### Вариант C - compliance / lifecycle / policy contour

Например:

- stale unverified users policy
- token TTL / cleanup policy
- retroactive consent / null-consent users strategy

---

## 19) Что не стоит делать следующим окном

Не стоит:

- снова открывать booking lifecycle как будто он сломан;
- снова спорить про 30-minute expiry;
- снова поднимать тему старого `idx_booking_pending_expiresAt`;
- делать broad booking redesign;
- смешивать governance, product, docs и infra в один батч;
- трогать сразу несколько high-blast-radius зон, если задача bounded.

---

## 20) Ready-to-paste bootstrap для нового окна ChatGPT

```text
Ты - Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot - исполнитель.

Работаем строго фазами:
Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP;
Phase 2 Minimal Fix (узко, без рефакторинга и без scope creep) → STOP;
Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP;
затем Documentation/Handoff.

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens from canonical SSoT
  - do NOT invent token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Project truth:
- Cardigo = Israel-first / Israel-only
- canonical domain = https://cardigo.co.il
- Cardigo and Digitalyty must not be mixed
- templates registry only in frontend/src/templates/templates.config.js
- skins token-only
- preview-only styles only under [data-preview="phone"]
- CardLayout DOM skeleton is high-blast-radius
- public/QR/OG URLs only from backend DTO publicPath/ogPath
- anti-enumeration 404 / membership-gate truth
- sitemap without N+1
- backend index governance is manual

Auth/security truth:
- browser runtime is cookie-backed
- browser auth truth is no longer localStorage-based
- browser Authorization header must not be reintroduced
- login / signup-consume / invite-accept do not return JWT body tokens for browser flows
- /register does NOT issue auth cookie/session; it returns { registered: true, isVerified: false }
- backend dual-mode middleware remains intentional for tooling/internal compatibility
- CSRF contract:
  - cookie-auth mutation requests require X-Requested-With: XMLHttpRequest
- CORS contract:
  - explicit allowlist from CORS_ORIGINS
  - credentials: true
  - no wildcard drift
- startup env validation contract:
  - JWT_SECRET required at startup
  - CARDIGO_PROXY_SHARED_SECRET required at startup in production only
  - EMAIL_BLOCK_SECRET required at startup

Booking truth:
- booking becomes pending after visitor submit
- pending blocks slot
- pending blocks same normalized phone/person on same card
- owner approves or cancels
- no 30-minute auto-expiry exists anymore
- stale pending may only auto-expire after slot end time
- canonical pending index is idx_booking_pending_endAt with key { status: 1, endAt: 1, _id: 1 }
- canonical booking docs are:
  - docs/bookings-inbox-architecture.md
  - docs/runbooks/bookings-indexes-ops.md

Closed contours - do NOT casually reopen:
- browser auth migration
- response-body token decommission
- browser localStorage auth removal
- CSRF contour
- CORS contour
- Bearer/tooling decision
- startup/runtime validation hardening
- docs + anti-drift closure
- self-delete permanent email-block / re-registration prevention contour
- booking lifecycle correction contour
- booking docs alignment contour
- booking pending-index replacement contour

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking/deferred/intentional.

Choose safest mature path over fastest hack.
```

---

## 21) Финальное напутствие

Проект находится в хорошей зрелой точке.

Это уже не ситуация “всё сломано и надо срочно чинить что угодно”.

Сейчас наоборот:

- много критичных контуров закрыто;
- runtime truth стабилизирована;
- auth/security modernization дошла до серьёзного milestone;
- docs truth и anti-drift layer закрыты;
- self-delete identity finality теперь тоже закрыта;
- booking lifecycle, docs и index governance для pending cleanup приведены к одной truth;
- и потому главный риск дальше - не отсутствие фичи, а **неосторожное смешивание контуров** и “улучшения ради улучшений”.

### Главное правило продолжения

Не пытаться “добить до идеала всё сразу”.

Правильный путь:

- отделять contour от contour;
- сначала доказывать;
- потом чинить минимально;
- потом верифицировать;
- потом обновлять handoff truth.

### Главная роль ChatGPT

ChatGPT здесь не “помогатор по коду”.

ChatGPT здесь - **архитектор**, который:

- защищает invariants;
- держит discipline;
- следит за blast radius;
- не даёт проекту скатиться в хаотичные патчи;
- не создаёт новые задачи там, где mature decision - это остановиться.

### Главная установка проекта

Не искать самый быстрый путь.  
Искать самый безопасный, зрелый и enterprise-правильный путь.

---

## 22) Итоговый текущий статус проекта в одной выжимке

Если совсем коротко, то сегодня Cardigo - это:

- зрелый Israel-first SaaS для цифровых визиток;
- с сильной архитектурной дисциплиной;
- с ручным DB/index governance;
- с cookie-backed browser auth;
- с закрытым большим auth/security migration milestone;
- с закрытым self-delete permanent email-block milestone;
- с исправленным booking lifecycle;
- с canonical pending index `idx_booking_pending_endAt`;
- и с clear doctrine, где ChatGPT - архитектор, а Copilot - исполнитель.
