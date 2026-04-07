# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-07_

---

## 0) Что это за документ

Это большой handoff-файл для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в реальную текущую **product / architecture / runtime truth**;
- передать не только факты, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- сохранить **закрытые контуры закрытыми**;
- не дать следующему чату скатиться в `scope creep`, broad refactor, решения “на глаз” и accidental drift;
- закрепить **роль ChatGPT как Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить **роль Copilot Agent как исполнителя**, а не архитектора;
- дать следующему окну GPT рабочую инструкцию, **как именно вести этот проект по-взрослому**.

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

---

## 8) Ключевые закрытые зрелые контуры

### 8.1 Trial / free / premium canonical truth

- trial даётся **новому eligible user**;
- trial стартует при **первом легитимном получении карточки**;
- trial длится **10 дней**;
- после expiry карточка **не удаляется**;
- entitlement уходит в **free**;
- publish/share на free остаётся доступным;
- gallery на free — premium-only;
- AI на free — hard-blocked.

### 8.2 Trial truth по данным

Во время trial:

У user:
- `trialActivatedAt`
- `trialEndsAt`
- `trialEligibilityClosedAt`

У card:
- `billing.status = "trial"`
- `billing.plan = "monthly"`
- `trialStartedAt`
- `trialEndsAt`

### 8.3 Free fallback after expiry

После окончания trial:

- runtime entitlement падает в free;
- reconcile job позже приводит lifecycle state к canonical free truth;
- карточка не удаляется;
- premium-only surfaces скрываются / блокируются;
- premium-only data сохраняется до retention window.

### 8.4 Reconciliation / retention purge truth

Отдельный job:

- переводит expired trial cards в canonical free billing truth;
- purge job позже чистит premium-only surplus data;
- purge идёт осторожно и storage-first;
- `retentionPurgedAt` ставится только при успешной очистке по дизайну.

### 8.5 Claim-flow transaction atomicity — CLOSED

Очень важная truth:

- DB writes `card.save({ session })` + `user.save({ session })` обёрнуты в native Mongo transaction;
- critical consistency window устранено;
- compensating rollback больше не primary consistency mechanism;
- storage cleanup intentionally остаётся outside transaction.

Итог:

> **claim-flow DB consistency переведена на взрослую transaction-based model; contour закрыт.**

### 8.6 Lead inbox contour — CLOSED

Закрыто:

- display-contract drift;
- stale-state after archive/trash/unarchive/unstar;
- important visual indicator/star;
- unread badge truth признана working as designed.

### 8.7 Mobile drawer icons contour — CLOSED

Закрыто:

- `/inbox` icon в mobile drawer;
- `/edit` icon в mobile drawer;
- unread badge не сломан;
- alignment подтверждён.

### 8.8 Cookie / privacy / consent contour — CLOSED

Закрыто:

- fixed-bottom banner в Layout-owned pages;
- persistence until user action;
- short default notice;
- two-view model вместо accordion;
- `הבנתי` как quick accept-all;
- `ניהול העדפות` как open preferences;
- `שמירה` как save selected optional third-party tracking preference;
- React-canonical footer reopen path:
  - footer button `העדפות פרטיות`
  - Layout owns reopen signal
  - Footer triggers callback
  - CookieConsentBanner reacts by prop change
  - reopen идёт сразу в prefs view
- internal first-party analytics остаётся независимой от consent;
- optional third-party tracking preference живёт в versioned consent state;
- `Privacy.jsx` дополнен clause 8.6;
- stable canonical doc создан для этого contour-а.

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
- FAQPage JSON-LD;
- Article / blog-like detail structured data;
- deterministic SEO logic;
- OG metadata generation;
- sitemap generation;
- structured-data assist flows.

### 9.4 Media
- hero image upload;
- section image upload;
- image canonicalization;
- Supabase storage;
- deletion cleanup lifecycle;
- save-first helper UX в admin.

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

---

## 10) Что важно помнить про legal / privacy / consent truth

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
- state shape:
  - `version`
  - `acknowledged`
  - `optionalTrackingAllowed`
  - `ts`

### 10.3 Stable canonical doc for privacy/consent

Не полагаться только на handoff.

Канонический durable SSoT:
- `docs/policies/privacy-consent-and-tracking.md`

Именно там зафиксированы:
- internal analytics independence rule;
- banner architecture;
- footer reopen path;
- future third-party loader gating rule;
- deferred follow-ups.

### 10.4 Future operational rule for GTM / Meta

Если позже включаются sitewide:
- GTM
- Meta Pixel
- other third-party loaders

они обязаны читать consent state и грузиться только когда:

```js
getConsentState()?.optionalTrackingAllowed === true
```

---

## 11) Pricing / lifecycle / product messaging truth

### 11.1 Pricing truth

Pricing contour был reopen-нут **только** из-за product-truth drift, а не ради redesign.

Текущая truth:
- free = permanent useful plan;
- new users get **10 days premium** onboarding;
- premium feature truth включает:
  - booking
  - services
  - business hours
- trial не является отдельным тарифом;
- `/pricing` остаётся 3-plan architecture.

### 11.2 Pricing messaging principle

Не делать fourth pricing card for trial.  
Trial = onboarding incentive, не отдельный plan.

### 11.3 Homepage CTA / pricing CTA

Homepage и pricing не обязаны быть текстово идентичными.  
Homepage CTA может быть более action-specific, pricing — более plan-entry specific.

---

## 12) Booking / services / business hours truth

### 12.1 Booking
- owner/public booking contour v1 собран;
- pending blocks slot;
- owner approves/cancels;
- availability logic — backend truth first;
- booking retrieval / owner inbox truth закрыта.

### 12.2 Services / business hours
- контуры закрыты;
- services/business-hours — operational product layer;
- free plan editor tabs по UX parity больше не исчезают полностью;
- premium lock state выровнен.

### 12.3 Deferred booking follow-up
Later:
- header/nav incoming badge + further booking-related follow-ups возможны как отдельные bounded contours, не смешивать с текущими закрытыми scopes.

---

## 13) Актуализированные docs / handoff truth

Canonical текущие документы, которые считаются важными и актуальными по зрелому состоянию проекта:

- `docs/policies/privacy-consent-and-tracking.md`
- `docs/leads-inbox-architecture.md`
- `docs/runbooks/trial-lifecycle-ssot.md`
- `docs/upload-supabase-contract.md`
- `docs/bookings-inbox-architecture.md`
- `docs/runbooks/bookings-indexes-ops.md`

Актуальный current handoff тоже должен считаться значимым, но это **не единственный** source of truth для долгоживущих архитектурных правил.

---

## 14) Что intentionally deferred, а не “забыто”

Ниже — не баги текущих закрытых contours, а отдельные будущие work items.

### 14.1 Косметический rename helper-ов в retention purge
Naming helper-ов типа `overflow` после purge-all semantics технически неидеален, но поведение правильное. Rename — отдельный косметический item.

### 14.2 Rollout-readiness / gate-opening observability contour
Отдельный mature следующий operational contour:
- operator readiness;
- env truth;
- jobs / schedulers / heartbeats;
- logging / observability;
- monitoring / alerts;
- gate-opening checklist;
- first-hours / day-1 monitoring discipline.

### 14.3 Reopen preferences path — CLOSED
Этот пункт уже больше **не deferred**.  
Footer reopen path реализован и задокументирован.

### 14.4 Actual sitewide GTM / Meta loader gating
Отдельный будущий contour:
- когда реально подключаются sitewide GTM / Meta / similar third-party tools;
- loaders должны быть связаны с `optionalTrackingAllowed`.

### 14.5 Fuller consent manager / reject-all flow
Пока intentionally deferred:
- `דחה`
- richer preference center
- reopen/change from more than one surface
- fuller CMP-like experience

### 14.6 Homepage holistic audit
По зрелости это всё ещё хороший следующий кандидат, если product priority сместится на public conversion / SEO / IA / CTA hierarchy.

---

## 15) Следующие зрелые шаги

### Вариант A — rollout-readiness / gate-opening audit
Если цель — двигаться к открытию gate:
- operator readiness audit;
- env / jobs / logging / monitoring / smoke notes;
- checklists перед opening gate;
- first-hours/day-1 operating discipline.

### Вариант B — homepage holistic audit
Если цель — усиливать public acquisition:
- on-page SEO;
- helper-copy;
- IA / CTA hierarchy;
- anti-drift review;
- но только bounded, audit-first и без broad redesign.

### Вариант C — security / error-handling hardening
Если цель — enterprise reliability:
- invalid token / invalid input paths;
- API error handling;
- auth/registration hardening;
- bounded resilience workstreams.

### Вариант D — GTM / Meta future rollout contour
Когда реально придёт время:
- third-party loader gating by consent state;
- no accidental pre-consent load;
- verification against privacy policy truth.

---

## 16) Практический skeleton prompt для нового окна ChatGPT

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
- cookie/privacy truth canonical doc = docs/policies/privacy-consent-and-tracking.md

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking / deferred / intentional.

Choose safest mature path over fastest hack.
```

---

## 17) Напутствие следующему окну GPT

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

## 18) Короткая сводка по последнему окну

В последнем окне были закрыты и/или подтверждены следующие ключевые вещи:

- `/pricing` pricing-truth alignment с новой model:
  - 10 дней premium onboarding
  - permanent free truth
  - premium features now include booking/services/business hours
- cookie/privacy banner evolved from simple notice to mature two-view consent layer
- `Manage preferences` сделан без overengineering
- `Privacy.jsx` дополнен `8.6`
- canonical durable policy doc создан
- footer reopen path `העדפות פרטיות` добавлен
- reopen реализован React-канонично через `Layout`, а не DOM event
- internal first-party analytics сохранена полностью независимой от consent banner
- docs truth приведена в соответствие с кодом и UX

---

## 19) Финальная выжимка в одном абзаце

Cardigo сейчас находится в сильной зрелой точке: это enterprise-minded Israel-first SaaS для цифровых визиток с ручной DB/index governance, строгой архитектурной дисциплиной, закрытым trial/free/premium lifecycle contour, корректным claim/recovery path, работающим forced expiry/free fallback, retention purge с premium-data cleanup, реализованной claim-flow transaction atomicity через native Mongo transaction, чистой truth по owner inbox leads, исправленным stale-state после archive/trash/unarchive/unstar, persistent important star indicator в lead rows, дополнительной polish-правкой mobile drawer icons для `/inbox` и `/edit`, и закрытым privacy/consent contour с fixed two-view banner, `Manage preferences`, footer reopen path и aligned privacy policy. Следующий GPT должен не “чинить всё подряд”, а идти bounded contours, держать architecture truth, соблюдать enterprise workflow и выбирать safest mature path over fastest hack.
