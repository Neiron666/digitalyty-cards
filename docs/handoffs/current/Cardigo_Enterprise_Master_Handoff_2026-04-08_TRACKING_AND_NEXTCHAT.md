# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook

_Обновлено: 2026-04-08 (после настройки GTM base container, privacy-aware Meta Pixel base setup и подготовки следующего tracking contour)_

---

## 0) Что это за документ

Это большой handoff-файл для следующего окна ChatGPT по проекту **Cardigo**.

Его цель:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- сохранить **закрытые контуры закрытыми**;
- не дать следующему чату скатиться в `scope creep`, broad refactor, решения “на глаз” и accidental drift;
- закрепить **роль ChatGPT как Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить **роль Copilot Agent как исполнителя**, а не архитектора;
- передать новую truth по **tracking / GTM / Meta Pixel / consent signal**;
- зафиксировать, что уже сделано по marketing-tracking, а что ещё intentionally deferred.

Этот документ нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- operational truth memo;
- project doctrine;
- архитектурный конспект;
- инструкцию по тактике работы;
- baseline для следующих bounded workstream-ов;
- инструкцию для работы с Copilot Agent;
- инструкцию для следующего окна GPT, как продолжать проект **по-взрослому**, а не “с наскока”.

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
- premium public marketing surfaces;
- marketing tracking layer;
- privacy/consent-aware third-party tracking governance.

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
- user-facing copy внутри Cardigo;
- business assets в Meta / Google tracking контурах, когда это можно развести чисто.

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
- Meta Business / Events Manager / Pixel
- Google Tag Manager

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
- legal/privacy/cookie workstreams теперь имеют собственную устойчивую policy truth.

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
- архитектурное мышление для tracking / attribution / privacy / consent контуров;
- guidance как PPC / performance / tracking / web analytics consultant там, где это уместно.

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
- если речь о “двух фазах”, помнить, что для Cardigo verification всегда отдельная обязательная фаза;
- никогда не переходить к следующей задаче, пока в текущей не убраны / не улажены все хвосты;
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
- `STOP` после нужной фазы.

### 5.5 Как принимать или не принимать работу Copilot

Принимать только то, что:

- прошло audit с PROOF;
- имеет минимальный blast radius;
- прошло verification или честно остановлено до него;
- не ломает accepted subsystems;
- не тащит scope creep;
- truthfully подтверждено runtime, если речь идёт о lifecycle / API / entitlement / persistence / tracking.

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
- site-level privacy/consent runtime without prior audit
- tracking shells без prior audit.

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
- cookie/privacy consent contour, включая footer reopen path;
- install / installability contour;
- docs contour по install architecture;
- structured-data baseline contour;
- search/indexability launch-readiness audit contour как audit-truth stage.

### 7.1 Новые закрытые contours в этом окне

Добавить к закрытым также:

- **Cardigo business portfolio creation in Meta**;
- **Cardigo Pixel creation**;
- **site-level GTM base container installation**;
- **consent-to-dataLayer wiring for GTM gating**;
- **site-level Meta Pixel base setup via GTM with consent gating**.

Важно: закрыт именно **base setup contour**, а не весь будущий marketing-tracking roadmap.

---

## 8) Новый tracking / GTM / Meta contour — актуальная truth

### 8.1 Что было решено архитектурно

Для Cardigo принято зрелое решение:

- **не использовать старый Digitalyty Pixel** для Cardigo;
- **не смешивать** business assets Cardigo и Digitalyty;
- создать **отдельный business portfolio Cardigo** в Meta;
- создать **отдельный Cardigo Pixel**;
- создать **отдельный GTM container** под `cardigo.co.il`;
- установить GTM container в общий shared HTML shell сайта;
- запускать site-level Meta Pixel не “всегда”, а **только после consent**.

### 8.2 Meta Business / Pixel truth

Подтверждено:

- создан отдельный business portfolio: **Cardigo**;
- Meta restriction на business portfolio был временно снят через review flow;
- создан отдельный pixel:
    - **Cardigo Pixel**
    - **Pixel ID: `1901625820558020`**
- automatic advanced matching **не включён**;
- advanced matching сейчас intentionally deferred как отдельный privacy/data-quality contour.

### 8.3 GTM truth

Подтверждено:

- создан GTM container для сайта:
    - **GTM ID: `GTM-W6Q8DP6R`**
- canonical insertion contour proven and implemented in `index.html`;
- GTM `<script>` вставлен в `<head>` после viewport meta;
- GTM `<noscript>` вставлен сразу после `<body>`;
- `robots noindex,nofollow` intentionally не трогали;
- `gate.html` intentionally не трогали;
- per-card GTM logic intentionally не трогали.

### 8.4 Runtime proof по GTM base container

Подтверждено:

- raw HTML production содержит GTM container ID **ровно 2 раза**:
    - один раз в base `<script>`
    - один раз в `<noscript>`
- GTM Preview / Tag Assistant видит контейнер и штатные lifecycle events;
- GTM base-container contour считать закрытым.

### 8.5 Consent truth до исправления

До отдельного bounded fix было доказано:

- consent хранится в `localStorage` под ключом:
    - **`cardigo_cookie_consent_v1`**
- состояние имело вид:

```json
{
  "version": 1,
  "acknowledged": true,
  "optionalTrackingAllowed": true | false,
  "ts": 1234567890
}
```

Но при этом:

- banner **не отправлял сигнал в GTM**;
- `optionalTrackingAllowed` был сохранён, но orphaned from GTM;
- GTM не знал о consent changes;
- Tag Assistant не видел consent update events.

### 8.6 Что было исправлено по consent-to-dataLayer

В bounded contour было добавлено:

- `pushConsentToDataLayer(state)` helper;
- push при каждом `saveConsent()`;
- page-load initialization push при mount layout для returning visitors.

Итоговый custom event payload:

```json
{
  "event": "cardigo_consent_update",
  "cardigo_consent_version": 1,
  "cardigo_consent_acknowledged": true,
  "cardigo_consent_optional_tracking": true | false
}
```

### 8.7 GTM gating truth

В GTM были созданы:

- **DLV variable**:
    - `DLV — Consent Optional Tracking`
    - data layer key: `cardigo_consent_optional_tracking`

- **Custom Event trigger**:
    - `CE — Consent Update — Optional Tracking Allowed`
    - event name: `cardigo_consent_update`
    - condition: `cardigo_consent_optional_tracking equals true`

### 8.8 Meta Pixel tag truth

В GTM создан site-level base Meta tag:

- **Tag name:** `Meta Pixel — Base — Cardigo`
- type: **Custom HTML**
- используется **полный JS Meta Pixel bootstrap snippet**
- используется `fbq('init', '1901625820558020');`
- используется `fbq('track', 'PageView');`
- trigger = **не All Pages**, а consent-gated trigger:
    - `CE — Consent Update — Optional Tracking Allowed`

Важно:

- тэг настроен **через GTM**, а не ручной вставкой Meta code в сайт;
- `noscript` Meta snippet внутрь GTM tag **не вставлялся**;
- логика выбора именно GTM path — сознательная и зрелая.

### 8.9 Runtime proof по Meta Pixel

Подтверждено runtime:

- после consent GTM preview показывает, что tag **`Meta Pixel — Base — Cardigo` fires**;
- в Network появляются:
    - `https://connect.facebook.net/en_US/fbevents.js`
    - `https://www.facebook.com/tr?...id=1901625820558020...`
    - `https://connect.facebook.net/signals/config/1901625820558020...`
- Meta Pixel Helper показывает:
    - Pixel ID `1901625820558020`
    - active `PageView`

Важная truth:

- Meta Events Manager → Test Events UI на этой конкретной попытке не дал надёжного визуального подтверждения;
- это классифицировано как:
    - **runtime proof = PASS**
    - **Test Events UI = delayed / not reliable for this run**

Итог:

> **Base Meta Pixel contour for Cardigo считается рабочим и закрытым на уровне runtime truth.**

### 8.10 Что intentionally НЕ делали в этом contour

- не включали automatic advanced matching;
- не включали Conversions API / CAPI Gateway / Stape;
- не настраивали Google tag / GA4 / Google Ads;
- не добавляли Meta standard events beyond PageView;
- не исправляли per-card tracking consent gap;
- не трогали Google Consent Mode;
- не делали broad analytics redesign;
- не пытались “дотащить всё сразу”.

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

### 9.8 Tracking / privacy-aware marketing layer

- separate GTM container;
- site-level GTM base shell installation;
- separate Cardigo Pixel;
- consent-aware GTM gating via dataLayer;
- site-level Meta Pixel base PageView after consent.

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
- теперь consent state ещё и сигнализируется в GTM через:
    - `cardigo_consent_update`

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

### 11.6 Automatic Advanced Matching

Осознанно **не включали**.  
Это будущий bounded privacy / data-quality contour, если и когда будет доказана необходимость.

### 11.7 Conversions API / CAPI Gateway / Stape

Осознанно **не делали**.  
Это отдельный server-side tracking contour, не хвост текущего setup.

### 11.8 Google tag / GA4 / Google Ads (site-level)

Осознанно **ещё не делали**.  
Нельзя расползаться туда без отдельного bounded workstream.

**Per-card GA4 — отдельная truth (не site-level):**  
В коде существует owner-configured per-card GA4 как часть `SeoHelmet.jsx`.  
Это **НЕ** site-level GA4 contour и **НЕ** часть approved site-level tracking foundation:

- Владелец карточки сам указывает `G-XXXXXXX` в `card.seo.gaMeasurementId`.
- Inject — через react-helmet-async на публичных маршрутах `/card/:slug`, `/c/:orgSlug/:slug`.
- Только base config: `gtag('config', id)` — custom events не используются.
- Gate: `PROD || VITE_SEO_DEBUG=1` — **не gated за consent**.
- Priority: GTM > GA4 > Pixel (если указан GTM ID — GA4 напрямую не подключается).
- Это отдельный privacy hardening target, аудит завершён, gap задокументирован в 11.10.

### 11.9 Meta event taxonomy beyond PageView

**Аудит завершён. Реализация намеренно отложена.**

Завершённый read-only audit выявил следующих кандидатов:

| Candidate event        | Code location                      | Status                                        |
| ---------------------- | ---------------------------------- | --------------------------------------------- |
| `CompleteRegistration` | `SignupConsume.jsx`                | Технически SAFE — Layout-wrapped route        |
| `Contact`              | `Contact.jsx`                      | Технически SAFE — Layout-wrapped route        |
| `Lead`                 | `LeadForm.jsx` (public card)       | BLOCKED — нет consent signal на `/card/:slug` |
| `Schedule`             | `BookingSection.jsx` (public card) | BLOCKED — нет consent signal на `/card/:slug` |

`Lead` и `Schedule` заблокированы pending исправления public card consent gap (см. 11.10).  
**Ни одно из этих событий не одобрено для реализации в текущем contour.**  
Для открытия этого contour необходимо явное product/architecture решение.

### 11.10 Per-card tracking consent gap

Доказано, что per-card tracking currently ignores consent.  
Это **отдельный privacy hardening contour**, а не хвост site-level Meta base setup.

**Scope этого gap включает:**

- Per-card GTM, GA4, Meta Pixel через `SeoHelmet.jsx` — инжектятся без проверки consent.
- `Layout.jsx` consent init push НЕ запускается на public card routes (`/card/:slug`, `/c/:orgSlug/:slug`) — эти маршруты рендерятся без Layout ancestor.
- GTM не получает `cardigo_consent_update` при прямом заходе на `/card/:slug`.
- Из-за этого `Lead` и `Schedule` из section 11.9 технически заблокированы pending gap fix.

**Минимально необходимый fix (когда contour открывается):**  
Одна строка в `main.jsx` — вызов `pushConsentToDataLayer(getConsentState())` до монтирования RouterProvider.  
Это prerequisite для разблокировки Meta event contour (11.9) и для consent compliance per-card tracking.

---

## 12) Следующие зрелые шаги

### Вариант A — Meta event implementation (audit завершён, реализация отложена)

**Статус: аудит завершён. Реализация не начата. Contour официально закрыт без реализации.**

Аудит выявил 4 кандидата, которые **не одобрены** для реализации в текущем contour:

- `CompleteRegistration` — audit: SAFE; статус: не реализован, нет одобрения
- `Contact` — audit: SAFE; статус: не реализован, нет одобрения
- `Lead` — audit: BLOCKED (public card consent gap); статус: не реализован
- `Schedule` — audit: BLOCKED (public card consent gap); статус: не реализован

Для открытия этого contour необходимы два предварительных шага:

1. Fix public card consent gap (`main.jsx` single line — см. 11.10).
2. Явное product/architecture решение с одобрением конкретных событий.

Нельзя переходить к реализации без решения обоих шагов.

### Вариант B — Google tracking contour

Только отдельным bounded workstream:

- Google tag / GA4 base setup
- возможно Google Ads conversion layer
- возможно Consent Mode contour позже

Но не смешивать это с Meta next steps.

### Вариант C — Privacy hardening contour for per-card tracking

Если приоритет privacy correctness:

- провести read-only audit per-card GTM/GA/Pixel logic;
- доказать, как именно он сейчас обходит consent;
- спроектировать bounded hardening.

### Вариант D — Monitoring / observability contour

Если приоритет operational maturity:

- log/alert strategy
- production smoke discipline
- tracking verification runbook
- marketing attribution sanity checklist

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
- browser auth/runtime is cookie-backed
- global noindex in index.html is intentional prelaunch truth

Current important truths:
- trial duration = 10 days
- free is permanent after trial expiry
- installability contour is closed
- installing from homepage or card installs the same single Cardigo app
- per-card PWA is not implemented
- GTM base container is installed and verified
- GTM container ID = GTM-W6Q8DP6R
- Cardigo Pixel ID = 1901625820558020
- site-level Meta Pixel base PageView is live via GTM and consent-gated
- consent GTM event = cardigo_consent_update
- DLV = cardigo_consent_optional_tracking
- automatic advanced matching is intentionally OFF
- site-level Google tag / GA4 / Google Ads are intentionally deferred (separate bounded workstream)
- per-card GA4 exists as owner-configured feature in SeoHelmet.jsx — base config only, NOT site-level, NOT consent-gated
- Meta event mapping audit completed — 4 candidates audited (CompleteRegistration, Contact, Lead, Schedule)
- Meta event candidates are NOT approved for implementation; Lead + Schedule blocked by public card consent gap
- public card consent gap proven — /card/:slug routes do not receive cardigo_consent_update signal
- pending main.jsx consent bootstrap (1 line) — prerequisite before Meta event contour can open

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking / deferred / intentional.

Choose safest mature path over fastest hack.
```

---

## 14) Напутствие следующему окну GPT

Главное, что нужно помнить:

- здесь нельзя работать “по ощущениям”;
- symptom часто оказывается только входом в более глубокую problem cluster;
- если contour вскрыт — добивать его нужно **до чистой truth**, а не до “примерно работает”;
- но при этом нельзя бездумно раздувать scope — каждый новый слой должен быть **доказан**;
- когда код закрыт, docs тоже должны быть закрыты;
- когда lifecycle / reliability / tracking contour закрыт, smoke должен быть реальным, а не теоретическим;
- ChatGPT здесь — архитектор, который:
    - защищает invariants,
    - держит discipline,
    - отличает root cause от workaround,
    - не даёт проекту деградировать в patchwork.

Особенно по marketing-tracking:

- не ставить “всё подряд”;
- не включать все Meta/Google опции автоматически;
- не расширять data collection без privacy/governance reasoning;
- сначала доказать business intent и trigger truth;
- только потом внедрять события / matching / conversions.

Ключевая практическая формула:

> **Не чинить всё подряд. Не прыгать по задачам. Не смешивать contours. Сначала доказать boundary. Потом минимально исправить. Потом верифицировать. Потом обновить truth в документации.**

---

## 15) Финальная выжимка в одном абзаце

Cardigo сейчас находится в сильной зрелой точке: это enterprise-minded Israel-first SaaS для цифровых визиток с ручной DB/index governance, строгой архитектурной дисциплиной, закрытым trial/free/premium lifecycle contour, корректным claim/recovery path, working install/installability contour, закрытым structured-data baseline contour, чистым cookie-backed auth runtime, отдельным business portfolio Cardigo в Meta, отдельным Cardigo Pixel `1901625820558020`, отдельным GTM container `GTM-W6Q8DP6R`, корректной установкой GTM в shared HTML shell, consent signal через `cardigo_consent_update`, consent-gated site-level Meta Pixel base setup через GTM и подтверждённым runtime `PageView` после consent. Следующий GPT должен не “накидывать трекинг везде”, а идти bounded contour-ами, держать architecture truth, уважать privacy/consent model, не смешивать Cardigo с Digitalyty и выбирать safest mature path over fastest hack.
