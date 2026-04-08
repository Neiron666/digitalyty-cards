# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-07 (после закрытия install/installability contour, docs contour и structured-data baseline contour)_

---

## 0) Что это за документ

Это большой handoff-файл для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- сохранить **закрытые контуры закрытыми**;
- не дать следующему чату скатиться в `scope creep`, broad refactor, решения “на глаз” и accidental drift;
- закрепить **роль ChatGPT как Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить **роль Copilot Agent как исполнителя**, а не архитектора;
- дать следующему окну GPT рабочую инструкцию, **как именно вести этот проект по-взрослому**;
- зафиксировать последние закрытые workstream-ы:
  - install / installability;
  - docs contour по installability;
  - structured-data baseline contour;
  - search/indexability launch-readiness truth.

Этот файл нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- operational truth memo;
- project doctrine;
- архитектурный конспект;
- инструкцию по тактике работы;
- baseline для следующих bounded workstream-ов;
- инструкцию для работы с Copilot Agent.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo — это уже не “просто визитка”.

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
- structured data / SEO layer;
- premium surface;
- organization / team surface;
- admin surface;
- AI-assisted content surfaces;
- services / business-hours operational contour;
- booking foundation и owner/public booking contour;
- discoverability stack;
- blog / guides public content surfaces;
- premium public marketing surfaces.

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- иврит / RTL — product default;
- product assumptions строятся под Израиль;
- multi-locale пока не является базовой product truth;
- использование `IL` как trusted default допустимо там, где это не ломает contracts и truth.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

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

- canonical — non-www;
- Cardigo и Digitalyty нельзя смешивать в canonical / OG / sitemap / URL logic / product copy / structured data.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- **CSS Modules only**
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
- Netlify-hosted / Netlify-facing surface
- preview / editor / product / admin / public layers

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
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

Это важный operational закон проекта:

- `MONGOOSE_AUTO_INDEX=false`
- `MONGOOSE_AUTO_CREATE=false`

Это означает:

- production structural truth не должна рождаться хаотично на runtime;
- критичные индексы поднимаются **вручную**;
- миграции и sanity scripts — канонический путь;
- drift нужно выявлять и исправлять осознанно, а не “сам создался и ладно”.

---

## 3) Текущая runtime / DB truth

### 3.1 Новый production-shaped cluster

Было принято осознанное решение:

- **не мигрировать старые данные**;
- поднять **новый clean production-shaped Mongo cluster с нуля**;
- использовать его как новую operational baseline.

Target DB: **`cardigo_prod`**

Старый cluster:

- не удалён;
- оставлен как rollback / reference.

### 3.2 Что truth по новому кластеру

Подтверждено:

- local и Render смотрят на новую DB truth;
- manual index governance сохранён;
- backend стартует;
- старый cluster не является текущей production truth.

### 3.3 Какие контуры уже подняты и проверены

Подтверждены manual indexes / bootstrap / tooling для:

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

### 3.4 Auth / security runtime truth

Важно помнить:

- browser runtime cookie-backed;
- browser auth truth больше **не localStorage-based**;
- browser Authorization header не должен быть переintroduced;
- cookie-auth / proxy / CSRF / CORS truth уже hardened и не должна casually reopen-иться;
- legal/privacy/cookie workstreams имеют собственную устойчивую policy truth.

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
- выбирать safest mature path, а не fastest hack.

### 4.2 Дополнительные обязанности ChatGPT

Как senior architect / full-stack / enterprise consultant, ChatGPT также отвечает за:

- архитектурное проектирование и улучшение проекта под масштабируемость, безопасность и производительность;
- технический консалтинг по backend, frontend, API architecture, data storage, deployment и production readiness;
- code review и improvement proposals с фокусом на качество, maintainability, clean code principles и design patterns;
- guidance по secure mechanisms:
  - CSRF / XSS / injection defenses
  - data protection
  - password / reset / token flow hardening
  - privacy / consent / legal truth
- помощь по CI/CD, monitoring, alerts, release discipline;
- обязательную документацию:
  - technical docs
  - runbooks
  - README
  - next-chat handoffs
  - anti-drift guidance
  - change docs

### 4.3 Роль Copilot Agent

Copilot Agent — **исполнитель, а не архитектор**.

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
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких code changes до audit.  
Никаких acceptance без verification.

### 5.2 Жёсткие ограничения для Copilot prompts

Во всех будущих промптах к Copilot использовать:

**PROJECT MODE: Cardigo enterprise workflow**

Hard constraints:

- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via `var(--fs-*)`
  - use only existing approved typography tokens from canonical SSoT
  - do NOT invent token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
  - `--fs-*` rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

### 5.3 Тактические правила

- без scope creep;
- без “заодно поправил”;
- всегда требовать `PROOF file:line-range`;
- boundaries сначала доказывать, потом трогать;
- broad refactor запрещён, пока он не доказан как safest path;
- verification важнее уверенного тона;
- в high-blast-radius зоны входить только при явной необходимости;
- smoke/manual проверки — через PowerShell + `curl.exe`, где уместно;
- если в каком-то материале сказано “две фазы”, помнить: для Cardigo verification — отдельная обязательная фаза;
- не переходить к следующей задаче, пока текущая не закрыта полностью или явно не классифицирована как non-blocking / deferred / intentional.

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
- `STOP` после нужной фазы.

### 5.5 Как принимать или не принимать работу Copilot

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

## 6) Жёсткие архитектурные инварианты проекта

Нельзя casually ломать:

- shared / SSoT render chain for public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- `CardLayout` DOM skeleton;
- `CardLayout.module.css` без отдельной серьёзной причины;
- public / QR / OG URLs только из backend DTO `publicPath/ogPath`;
- anti-enumeration 404 / membership-gate truth;
- sitemap без N+1;
- backend index governance только вручную.

### 6.1 Frontend / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary — разные contours, их нельзя смешивать “по чувству”.

### 6.2 Typography law

- `font-size` только через `var(--fs-*)`;
- `--fs-*` только rem-only;
- нельзя px, em, %, vw, vh, clamp, fluid formulas;
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
- proxy / gate assumptions

---

## 7) Что уже было закрыто раньше и не нужно casually reopen-ить

Считать закрытыми или не подлежащими casual reopen следующие contours:

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
- AI quota / shared budget direction;
- services cycle;
- business hours contour;
- booking backend foundation / owner incoming area / IA;
- legal/info public family;
- skip link;
- accessibility focus trap Tier 1 + Tier 2;
- fresh-cluster DB/bootstrap contour;
- большой bounded auth/security modernization contour;
- docs + anti-drift closure для auth/security contour;
- self-delete permanent blocked re-registration contour;
- booking lifecycle correction + docs alignment + booking index replacement contour;
- internal linking strengthening contour;
- analytics contour;
- trial / free / premium lifecycle + anti-bypass + UX + docs contour;
- lead inbox contour;
- mobile drawer icons contour;
- cookie/privacy consent contour, включая footer reopen path.

### 7.1 Новые закрытые contours в текущем окне

Добавить к закрытым также:

- install / installability contour;
- docs contour по install architecture;
- structured-data baseline contour;
- launch-readiness search/indexability audit contour как audit-truth stage (без снятия prelaunch noindex).

---

## 8) Ключевые закрытые зрелые контуры — последние важные truth

### 8.1 Trial / free / premium canonical truth

- trial даётся **новому eligible user**;
- trial стартует при **первом легитимном получении карточки**;
- trial длится **10 дней**;
- после expiry карточка **не удаляется**;
- entitlement уходит в **free**;
- publish/share на free остаётся доступным;
- gallery на free — premium-only;
- AI на free — hard-blocked.

### 8.2 Claim-flow transaction atomicity — CLOSED

Очень важная truth:

- DB writes `card.save({ session })` + `user.save({ session })` обёрнуты в native Mongo transaction;
- critical consistency window устранено;
- compensating rollback больше не primary consistency mechanism;
- storage cleanup intentionally остаётся outside transaction.

Итог:

> **claim-flow DB consistency переведена на взрослую transaction-based model; contour закрыт.**

### 8.3 Cookie / privacy / consent contour — CLOSED

Закрыто:

- fixed-bottom banner в Layout-owned pages;
- persistence until user action;
- short default notice;
- two-view model вместо accordion;
- `הבנתי` как quick accept-all;
- `ניהול העדפות` как open preferences;
- `שמירה` как save selected optional third-party tracking preference;
- React-canonical footer reopen path;
- internal first-party analytics остаётся независимой от consent;
- optional third-party tracking preference живёт в versioned consent state.

### 8.4 PWA / Install / Installability contour — CLOSED

Это один из главных workstream-ов текущего окна.

#### Что было сделано

1. **Manifest foundation**
   - создан `manifest.webmanifest`;
   - подключён в shared HTML shell;
   - без service worker;
   - без vite-plugin-pwa;
   - с одной app identity для всего Cardigo.

2. **Site footer install CTA**
   - реализован отдельный install/help control в footer сайта;
   - на supported Chromium с `beforeinstallprompt` клик запускает native install prompt;
   - на unsupported/manual states остаётся truthful helper behavior;
   - поведение выровнено без disabled-регрессий.

3. **Card footer install CTA**
   - реализован отдельный install/help row в footer карточки;
   - добавлен в boundary `CardFooter`;
   - `CardLayout` и `CardLayout.module.css` не тронуты;
   - install row скрыт в embedded editor preview через preview-only CSS под `[data-preview="phone"]`.

4. **Shared lifecycle fix**
   - убран one-way `isInstalled` latch;
   - убрана optimistic truth `accepted prompt => installed`;
   - добавлены lifecycle re-sync paths;
   - install truth теперь строится на реальных browser signals.

5. **Early shared install prompt capture runtime**
   - причина card-route bug была доказана: `beforeinstallprompt` терялся на public card routes из-за позднего mount after lazy route + async fetch;
   - внедрён shared runtime/store, который инициализируется рано на уровне app boot;
   - `useInstallPrompt` переведён в thin subscriber через shared runtime truth;
   - homepage и public cards теперь используют одну install truth без потери early event.

#### Ключевая product truth

- **устанавливается один Cardigo app**, а не “отдельная карточка как отдельное приложение”;
- install с homepage и install с card route приводят к одной app identity;
- **per-card PWA не реализован и не планируется в рамках этого contour**;
- service worker в этом contour **не используется**;
- backend и analytics в этом contour **не участвовали**.

#### Канонический doc
- `docs/pwa-install-architecture.md`

### 8.5 Docs contour по install architecture — CLOSED

Закрыто:

- создан один canonical doc:
  - `docs/pwa-install-architecture.md`
- обновлён актуальный master handoff:
  - отражён закрытый install contour;
  - добавлен короткий summary и cross-reference;
- truth не размазана по archive handoff, README, runbooks и случайным docs.

### 8.6 Structured-data baseline contour — CLOSED

В этом окне отдельно и аккуратно был закрыт structured-data baseline contour.

#### Что есть теперь

1. **Homepage**
   - `FAQPage` — уже был;
   - добавлен `WebSite` JSON-LD;
   - добавлен `Organization` JSON-LD;
   - всё идёт через существующий `SeoHelmet -> jsonLdItems` emitter.

2. **Pricing**
   - добавлен `FAQPage` JSON-LD;
   - используется truth-based subset из существующего `PRICING_FAQ`;
   - JSX-ответы не сериализуются “на глаз”, а аккуратно исключаются из schema.

3. **Что намеренно НЕ добавляли**
   - `SearchAction` — не добавляли;
   - `SiteNavigationElement` — не добавляли;
   - `BreadcrumbList` на flat pages — не добавляли;
   - robots/noindex gate — не трогали.

#### Текущая structured-data truth по public surfaces

- `/` — `WebSite` + `Organization` + `FAQPage`
- `/blog` — `FAQPage`
- `/blog/:slug` — `BlogPosting` + `BreadcrumbList`
- `/guides` — `FAQPage`
- `/guides/:slug` — `Article` + `BreadcrumbList`
- `/cards` — `FAQPage`
- `/contact` — `FAQPage`
- `/pricing` — `FAQPage`
- `/card/:slug` и `/c/:orgSlug/:slug` — conditional card-level `FAQPage`
- `/privacy`, `/terms`, `/accessibility-statement` — без JSON-LD, и это acceptable truth

#### Важная граница
- site-level structured data не смешивается с card-level structured data;
- весь JSON-LD продолжает рендериться через **один** канонический emitter в `SeoHelmet.jsx`.

### 8.7 SEO / indexability launch-readiness truth — AUDIT CLOSED

Важный вывод audit-а:

- текущая SEO/indexability architecture в целом зрелая;
- **главный blocker для индексации сейчас — intentional prelaunch gate**:
  - static `<meta name="robots" content="noindex, nofollow">` в `index.html`
- это **не баг**, а текущая сознательная launch-truth;
- после снятия этого gate почти вся публичная SEO-инфраструктура становится launch-ready сразу.

#### Важные выводы
- installability/PWA status **не является SEO-фактором сам по себе**;
- structured data помогает пониманию сущностей и appearance, но не заменяет indexability;
- current public surfaces уже имеют зрелую head/canonical/JSON-LD/sitemap truth;
- launch contour будет отдельным и осознанным:
  - убрать global noindex в момент открытия,
  - прогнать final smoke.

---

## 9) Что проект сейчас уже включает по факту

### 9.1 Public / marketing / discoverability
- Home
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

### 9.2 Editing / admin / product
- editor for digital cards;
- premium/admin/org surfaces;
- analytics/admin related surfaces;
- owner inbox / booking owner-facing surface;
- services/business-hours editor panels.

### 9.3 Content / SEO / structured data
- route-level `SeoHelmet`;
- homepage `WebSite` + `Organization` + `FAQPage`;
- `FAQPage` on key public/listing pages;
- `BlogPosting` / `Article` on content detail pages;
- `BreadcrumbList` on blog/guide detail pages;
- deterministic card-level structured-data assist;
- OG metadata generation;
- sitemap generation;
- robots/indexability policy layer.

### 9.4 Media
- hero image upload;
- section image upload;
- image canonicalization;
- Supabase storage;
- deletion cleanup lifecycle;
- save-first helper UX в admin;
- corrected OG fallback path for public card social metadata;
- `og:url` quality hygiene fixed on legal/info pages.

### 9.5 AI / growth
- About AI;
- FAQ AI;
- SEO AI;
- shared quota governance;
- premium surface expansion logic.

### 9.6 Operational / business layers
- services;
- business hours;
- booking kernel foundation;
- booking public/owner contour v1.

### 9.7 Installability / app-like layer
- installable Cardigo app identity;
- homepage install CTA;
- public card footer install CTA;
- shared install prompt runtime/store;
- lifecycle-resilient install state handling;
- truthful helper states for non-prompt environments.

---

## 10) Что важно помнить про legal / privacy / consent / SEO truth

### 10.1 Legal/info public family

Собраны и приняты:

- `/privacy`
- `/terms`
- `/accessibility-statement`

Они не должны casually reopen-иться без новой сильной причины.

### 10.2 Privacy / consent current model

Текущая архитектурная truth:

- internal first-party analytics Cardigo **не зависит** от consent banner;
- banner управляет **optional third-party tracking** only;
- current consent UX = fixed-bottom two-view model;
- current consent persistence key:
  - `cardigo_cookie_consent_v1`

### 10.3 Search/indexability prelaunch truth

Очень важно не забыть:

- глобальный static `noindex, nofollow` в `index.html` сейчас **намеренный prelaunch gate**;
- это не “сломанный SEO слой”, а сознательная блокировка индексации до нужного момента;
- убирать её нужно **только отдельным launch contour**, а не “между делом”.

### 10.4 Что произойдёт после снятия global noindex

По текущему audit-truth:
- homepage, public pages, blog/guides, paid public cards уже в целом готовы к индексации;
- preview routes останутся noindex;
- free-tier cards останутся noindex + excluded from sitemap;
- sitemap/robots/canonical в основном готовы;
- запуск search surface — это отдельный controlled switch, не “случайная правка одной строки”.

---

## 11) Что intentionally deferred, а не “забыто”

Ниже — не баги текущих закрытых contours, а отдельные будущие work items.

### 11.1 Launch-moment search switch contour
Будущий bounded contour:
- убрать global prelaunch noindex;
- прогнать final indexability smoke;
- перепроверить homepage / public cards / blog / guides / sitemap / robots.

### 11.2 SearchAction
Осознанно **не делали** и сейчас делать не надо.

### 11.3 SiteNavigationElement
Осознанно **не делали** и сейчас делать не надо.

### 11.4 Per-card PWA
Осознанно **не делали** и не надо тянуть в текущую архитектуру.  
Текущая truth:
- install from card installs the single Cardigo app;
- отдельной app identity на карточку нет.

### 11.5 Service worker / offline layer
Осознанно **не входит** в текущий install contour.  
Если когда-нибудь понадобится:
- это должен быть отдельный bounded contour с отдельным audit и runtime risk review.

---

## 12) Следующие зрелые шаги

### Вариант A — Launch-moment search switch contour
Когда будет принято product/operational решение открыть индексацию:

1. audit-ready check:
   - robots gate removal scope;
   - final public-surface smoke list;
2. minimal fix:
   - убрать global static `noindex, nofollow` в `index.html`;
3. verification:
   - homepage;
   - public cards;
   - blog/guides;
   - legal/public pages;
   - sitemap.xml;
   - robots.txt;
   - head/meta/canonical/JSON-LD smoke.

Это самый логичный следующий contour, если приоритет — выход в индекс.

### Вариант B — Production launch readiness / observability contour
Если приоритет — операционная зрелость перед открытием:
- env truth;
- jobs/schedulers/heartbeats;
- logging / monitoring / alerts;
- post-launch smoke discipline;
- rollback notes.

### Вариант C — Security / error-handling hardening
Если приоритет — enterprise reliability:
- invalid token / invalid input paths;
- API error handling;
- bounded resilience workstreams.

### Вариант D — SEO / search polish после открытия
Только после controlled launch:
- если нужно, проверить:
  - search console readiness;
  - post-launch crawlability;
  - possible explicit `robots="index, follow"` as readability-only choice;
  - minor canonical hygiene if потребуется.
- Без broad rewrite и без SEO folklore.

---

## 13) Практический skeleton prompt для нового окна ChatGPT

```text
Ты — Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot — исполнитель.

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
- Flex only — no grid
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

Current important truths:
- trial duration = 10 days
- free is permanent after trial expiry
- internal first-party analytics is independent of cookie banner consent
- optional third-party tracking must later read consent state before loading
- installability contour is closed
- installing from homepage or card installs the same single Cardigo app
- per-card PWA is not implemented
- docs canonical install doc = docs/pwa-install-architecture.md
- homepage structured data now includes WebSite + Organization + FAQPage
- pricing now includes FAQPage
- global noindex in index.html is still intentional prelaunch truth

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking / deferred / intentional.

Choose safest mature path over fastest hack.
```

---

## 14) Напутствие следующему окну GPT

Главное, что нужно помнить:

- здесь нельзя работать “по ощущениям”;
- symptom часто оказывается только входом в более глубокую cluster problem;
- если contour вскрыт — добивать его нужно **до чистой truth**, а не до “примерно работает”;
- но при этом нельзя бездумно раздувать scope — каждый новый слой должен быть **доказан**;
- когда код закрыт, docs тоже должны быть закрыты;
- когда lifecycle / reliability contour закрыт, smoke должен быть реальным, а не теоретическим;
- ChatGPT здесь — архитектор, который:
  - защищает invariants,
  - держит discipline,
  - отличает root cause от workaround,
  - не даёт проекту деградировать в patchwork.

Ключевая практическая формула:

> **Не чинить всё подряд. Не прыгать по задачам. Не смешивать contours. Сначала доказать boundary. Потом минимально исправить. Потом верифицировать. Потом обновить truth в документации.**

---

## 15) Финальная выжимка в одном абзаце

Cardigo сейчас находится в сильной зрелой точке: это enterprise-minded Israel-first SaaS для цифровых визиток с ручной DB/index governance, строгой архитектурной дисциплиной, закрытым trial/free/premium lifecycle contour, корректным claim/recovery path, работающим forced expiry/free fallback, retention purge с premium-data cleanup, реализованной claim-flow transaction atomicity через native Mongo transaction, зрелым privacy/consent contour, закрытым install/installability contour с manifest foundation, shared runtime store, site/footer + card/footer CTA layers и корректным lifecycle across routes, отдельным canonical doc `docs/pwa-install-architecture.md`, а также закрытым structured-data baseline contour с homepage WebSite/Organization/FAQPage и Pricing FAQPage. Следующий GPT должен не “чинить всё подряд”, а идти bounded contours, держать architecture truth, соблюдать enterprise workflow и выбирать safest mature path over fastest hack.
