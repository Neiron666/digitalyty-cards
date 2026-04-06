# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook

_Обновлено: 2026-04-05 (после полного закрытия большого contour-а trial / free / premium lifecycle + anti-bypass + UX + docs)_

---

## 0) Что это за документ

Это **актуальный большой master handoff** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты о проекте, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, решений “на глаз” и accidental drift;
- сохранить **закрытые contours закрытыми**;
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
- базовый шаблон мышления для всех следующих bounded workstream-ов.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo — это не “просто визитка”.

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
- миграции и sanity scripts — канонический путь;
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

### 3.3 Какие collections/contours подняты вручную

Подтверждены manual indexes / bootstrap tooling для:

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

### 3.4 База уже не “в переходе ради перехода”

Сейчас проект уже живёт не в хаотической фазе восстановления, а в управляемом production-shaped режиме:

- старый cluster оставлен как rollback/reference;
- новый cluster — operational baseline;
- manual governance — канон;
- новые lifecycle jobs и feature truth уже строятся поверх этого baseline, а не “времянки”.

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
- выбирать **safest mature path**, а не fastest hack.

### 4.2 Дополнительные обязанности ChatGPT

Как senior architect / full-stack / enterprise consultant, ChatGPT также отвечает за:

- архитектурное проектирование и улучшение проекта под масштабируемость, безопасность и производительность;
- технический консалтинг по backend, frontend, API architecture, data storage, deployment и production readiness;
- code review и improvement proposals с фокусом на качество, maintainability, clean code principles и design patterns;
- guidance по secure mechanisms:
    - CSRF / XSS / injection defenses,
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

Copilot Agent — **исполнитель, а не архитектор**.

Его роль:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”;
- не трогать соседние contours без доказанной необходимости.

---

## 5) Каноническая рабочая доктрина

### 5.1 Workflow

Всегда соблюдать:

1. Architecture / intent clarification
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. Documentation / Handoff

Никаких code changes до audit.
Никаких acceptance без verification.

### 5.2 Жёсткие ограничения для Copilot prompts

Всегда использовать:

**PROJECT MODE: Cardigo enterprise workflow.**

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

---

## 6) Жёсткие архитектурные инварианты проекта

Нельзя casually ломать:

- shared / SSoT render chain for public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- CardLayout DOM skeleton;
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

Typography policy — корпоративный закон:

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
- docs + anti-drift closure для этого contour-а;
- self-delete permanent blocked re-registration contour;
- booking lifecycle correction + docs alignment + pending-index replacement contour;
- internal linking strengthening contour.

Теперь к этому списку добавлен ещё один очень крупный contour:

- **trial / free / premium lifecycle + anti-bypass + premium-lock UX + docs alignment**

Он тоже считается **closed** и не должен casually reopen-иться без отдельного bounded повода.

---

## 8) Большой trial / free / premium contour — итоговая canonical truth

Ниже — самая важная новая часть этого handoff-а. Это именно тот большой contour, который был доведён до closure в этом чате.

### 8.1 Продуктовая цель

Новая бизнес-логика даёт **новому пользователю**, зарегистрировавшемуся **после rollout date**, **trial premium** на ограниченный срок.

Основная идея:

- новый пользователь получает trial premium;
- после окончания срока карточка **не удаляется**;
- пользователь автоматически откатывается на **free**;
- premium-only функции блокируются;
- часть premium-данных временно сохраняется и позднее purged по retention policy;
- free / trial / paid truth теперь разведены чётко и консистентно.

### 8.2 Canonical product decisions

Подтверждённые продуктовые решения:

- trial стартует **не при регистрации**, а **при создании первой карточки**;
- старые пользователи trial **не получают**;
- если старый пользователь удалил карточку и создал новую — trial **не появляется**;
- после окончания trial карточка **остаётся опубликованной**, а premium-функции блокируются;
- premium-данные **не удаляются сразу**;
- retention window для purge premium-only surplus data = **90 дней**;
- FAQ оставлен **free**;
- share/publish на free **разрешён**;
- AI на free **недоступен**, trial получает **lower AI profile**, paid premium получает **premium AI profile**;
- gallery на free сейчас трактуется как **premium-only access truth**:
    - данные могут временно жить в DB до purge,
    - но free user не должен иметь обычного доступа к gallery через DTO / editor / public surfaces;
- contact premium socials на free не должны молча исчезать — должен быть premium upsell UX;
- в editor trial должен отображаться как **`פרמיום ניסיון`**;
- в sidebar должен быть **compact premium-trial countdown card**.

### 8.3 Trial eligibility truth

Trial eligibility определяется строго и детерминированно.

Пользователь eligible только если одновременно выполняется всё это:

- `TRIAL_ROLLOUT_DATE` configured and active;
- `user.createdAt >= TRIAL_ROLLOUT_DATE`;
- `user.trialActivatedAt == null`;
- `user.trialEligibilityClosedAt == null`;
- пользователь не находится в paid state.

Это означает:

- старые пользователи не получают trial;
- claim flow activates trial first (if eligible), then permanently closes eligibility;
- delete/recreate tricks не должны открывать trial заново.

### 8.4 Trial activation truth

Trial активируется при **первом легитимном получении карточки** — будь то создание новой карточки или claim anonymous-карточки eligible пользователем.

Во время первого card creation или eligible anonymous-card claim пользователь получает:

У пользователя:

- `trialActivatedAt`
- `trialEndsAt`

У карточки:

- `billing.status = "trial"`
- `billing.plan = "monthly"`
- `trialStartedAt`
- `trialEndsAt`

### 8.5 effectiveBilling truth during active trial

Во время активного user premium trial backend resolveBilling truth такая:

- `effectiveBilling.source = "trial-premium"`
- `effectiveBilling.plan = "monthly"`
- `effectiveBilling.until = trialEndsAt`
- `effectiveBilling.isPaid = true`
- `effectiveBilling.isEntitled = true`

Это важно потому, что:

- UI может распознавать active trial без raw trial fields;
- sidebar countdown может строиться frontend-only на `effectiveBilling.source + effectiveBilling.until`;
- raw trial fields для user/anon flows могут быть suppressed, но effectiveBilling остаётся usable.

### 8.6 Trial duration truth

`TRIAL_DURATION_DAYS = 10`

Это canonical truth для этого contour-а.

### 8.7 Free fallback after expiry

Когда active trial expires:

- runtime entitlement падает в free;
- reconcile job позже приводит lifecycle state к canonical free billing truth;
- карточка не удаляется;
- publish/share остаётся доступным;
- premium-only surfaces скрываются / блокируются;
- premium-only data сохраняется до purge window.

### 8.8 Reconciliation truth

Отдельный reconciliation job переводит expired user-owned trial cards в canonical free billing truth.

Job:

- query: expired user-owned trial cards;
- idempotent;
- race-safe;
- uses `downgradedAt`;
- normalizes:
    - `billing.status -> "free"`
    - `billing.plan -> "free"`
    - `billing.paidUntil -> null`
    - `downgradedAt = now`

Этот job не делает purge premium data. Он делает **state reconciliation**.

### 8.9 Retention / purge truth

Через `RETENTION_GRACE_DAYS = 90` после downgrade отдельный purge job чистит premium-only surplus data.

Он делает:

- purge extra paragraphs beyond free truth;
- purge services;
- purge videoUrl;
- purge businessHours;
- purge bookingSettings (card-side toggle/config only);
- purge premium contact fields;
- purge **all** gallery items (gallery is premium-only on free — full removal, not partial trim);
- clean uploads ledger for purged gallery paths;
- best-effort Supabase cleanup for removable gallery objects;
- stamp `retentionPurgedAt`.

### 8.10 Storage-first purge ordering truth

Очень важная финальная safety truth:

Если purgeable gallery items имеют removable storage paths:

- storage deletion идёт **раньше** DB purge;
- если storage deletion падает:
    - DB purge **не происходит** для этой карточки в этом run;
    - `retentionPurgedAt` **не ставится**;
    - карточка остаётся на retry следующего запуска.

Это сделано, чтобы не создавать permanent orphaned storage objects по дизайну.

### 8.11 Gallery truth after final correction

Финальная product/access truth по gallery:

- gallery на free — **premium-only**;
- free user не должен видеть gallery в обычных DTO flows;
- free user не должен видеть gallery в editor;
- free user не должен инициировать upload/add UX;
- free user не должен обходить это create/patch/upload путями;
- stored gallery data может временно жить в DB до retention purge;
- admin/debug/support truth может видеть stored data через includePrivate/admin paths.

### 8.12 AI truth after final correction

Финальная truth по AI:

- **FREE**:
    - backend hard-block;
    - frontend locked UX;
- **TRIAL premium**:
    - backend allow;
    - **lower/free AI profile**;
    - monthly quota = 10;
    - daily profile = lower/free;
- **PAID premium**:
    - backend allow;
    - premium AI profile;
    - monthly quota = 30;
    - daily profile = premium.

### 8.13 Contact truth after final correction

В `פרטי קשר` на free:

- free fields visible/editable:
    - phone
    - whatsapp
    - email
    - website
    - instagram
- premium social fields:
    - Facebook
    - X
    - TikTok
    - Waze
      не должны молча исчезать;
- вместо этого показывается **premium upsell block**;
- CTA ведёт на `/pricing`.

### 8.14 Trial countdown UX truth

Во время active user premium trial в sidebar editor shell:

- `מסלול:` показывает **`פרמיום ניסיון`**;
- ниже показывается compact premium-trial card;
- countdown low-noise:
    - `נותרו עוד X ימים לניסיון פרמיום`
    - `נותר עוד יום לניסיון פרמיום`
    - `נותר פחות מיום לניסיון פרמיום`
- CTA: `עבור למסלולים` → `/pricing`
- никаких ticking timers / setInterval;
- вычисление идёт от `effectiveBilling.until`.

---

## 9) Как именно был закрыт большой contour trial / free / premium

Ниже не просто “что сделали”, а **почему sequence был именно такой**.

### 9.1 Foundation / lifecycle foundation

Сначала был построен lifecycle foundation:

- trial eligibility fields;
- rollout cutoff;
- first-card activation;
- `trial-premium` billing source;
- lower AI profile for trial;
- claim flow trial activation + eligibility closure.

### 9.2 Entitlement normalization

Потом выровнена canonical plan / capability truth:

- plans matrix;
- gallery/access truth;
- content paragraph truth;
- missing capability keys;
- DTO entitlements.

### 9.3 Write-path normalization

Потом закрыт write-path drift:

- services;
- businessHours;
- video;
- content paragraphs;
- contact extras;
- free-plan write gates.

### 9.4 Public suppression + editor invisibility

Потом закрыта visibility truth:

- public suppression;
- noindex / sitemap truth;
- editor hidden/locked premium surfaces;
- premium upsell consistency.

### 9.5 Lifecycle jobs

Потом были добавлены:

- reconcile job;
- retention purge job;
- storage-first ordering;
- retry-safe behavior.

### 9.6 Hard anti-bypass

Потом отдельно, как самостоятельный contour, был закрыт anti-bypass:

- gallery DTO suppression;
- gallery create / patch / upload denial;
- AI backend hard denial on free;
- owner/editor DTO boundary proof.

### 9.7 Premium-lock UX polish

И только после этого были сделаны UX-слои:

- gallery crown + locked panel;
- contact upsell block;
- AI locked UX в FAQ;
- AI locked UX в Content;
- trial countdown UX;
- docs truth alignment.

Именно такой порядок был выбран потому, что:

> **сначала anti-bypass и lifecycle correctness, потом UX polish.**

Это было одним из главных “взрослых” решений в этом contour-е.

---

## 10) Docs truth после closure

В процессе был проведён docs audit и docs truth alignment.

Обновлены / созданы:

- `billing-flow-ssot.md`
- `README.md`
- `ai-about-workstream.md`
- `docs/runbooks/trial-lifecycle-ssot.md`

Итог:

- lifecycle truth больше не разбросана хаотично;
- trial-premium source documented;
- env vars documented;
- free/premium/gallery/AI truth aligned;
- new runbook exists as canonical home для trial lifecycle.

---

## 11) Текущие rollout / env truths

### 11.1 Runtime env vars

К этому contour-у относятся:

- `TRIAL_ROLLOUT_DATE`
- `TRIAL_DURATION_DAYS=10`
- `TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS=21600000`
- `RETENTION_GRACE_DAYS=90`
- `RETENTION_PURGE_INTERVAL_MS=21600000`
- `TRIAL_LIFECYCLE_HEARTBEAT_MS=43200000`
- `RETENTION_PURGE_HEARTBEAT_MS=43200000`

### 11.2 Production stance

Final Controlled Smoke Under Gate **PASSED** (2026-04-06). Gate is ready to open.

> **FINAL CONTROLLED SMOKE PASSED — GATE READY TO OPEN**

### 11.3 Monitoring stance

Путь A был выбран осознанно:

- без задержки по причине отсутствия `SENTRY_DSN`;
- code rollout не заблокирован;
- Sentry desirable, but not code-level blocker;
- monitoring first days after opening gate должен быть более внимательным по логам.

---

## 12) Что НЕ нужно casually reopen-ить теперь

После closure этого contour-а не нужно casually reopen-ить:

- trial activation logic;
- free fallback logic;
- reconcile job logic;
- retention purge logic;
- gallery anti-bypass;
- AI anti-bypass;
- free/premium visibility truth;
- sidebar countdown UX;
- docs truth-alignment по этому contour-у.

Повторное открытие возможно только если будет:

- доказанный runtime bug;
- новый product decision;
- или отдельный bounded operational need.

---

## 13) Что НЕ надо делать следующим шагом

Не надо:

- заново redesign-ить pricing/public pages внутри этого contour-а;
- переизобретать auth contour под шумок;
- reopening analytics / internal linking / blog / guides / legal contours без повода;
- broad cleanup “раз уж мы рядом”;
- выдумывать новый config/unification batch без необходимости;
- делать “housekeeping ради красоты”, если нет явной production value.

---

## 14) Final Controlled Smoke — COMPLETED

Final Controlled Smoke Under Gate was executed and **PASSED** (2026-04-06).

All scenarios confirmed end-to-end in production-like environment under gate.

### 14.1 Smoke checklist — CONFIRMED

#### A. Trial activation — ✅ CONFIRMED

На новом пользователе после rollout date:

- `user.trialActivatedAt` есть
- `user.trialEndsAt` есть
- `card.billing.status = "trial"`
- `card.billing.plan = "monthly"`
- `card.trialStartedAt` есть
- `card.trialEndsAt` есть

Confirmed via both paths:

- anonymous → register → login → claim recovery → trial activation
- ordinary new user → first card create → trial activation

#### B. Trial UX — ✅ CONFIRMED

У active trial user:

- sidebar показывает `פרמיום ניסיון`
- compact trial countdown card visible
- premium features доступны

#### C. Downgrade — ✅ CONFIRMED

После forced expiry + restart:

- `billing.status = "free"`
- `billing.plan = "free"`
- `billing.paidUntil = null`
- `downgradedAt` есть

#### D. Free UX truth — ✅ CONFIRMED

У downgraded/free user:

- gallery tab locked
- gallery editor content locked / not shown
- contact premium socials → upsell block
- AI in Content → locked block
- AI in FAQ → locked block
- public premium-only surfaces hidden
- public visitors do NOT see owner-facing premium paywall UI

#### E. Retention — ✅ CONFIRMED

После forced old `downgradedAt` + restart:

- `retentionPurgedAt` есть
- premium-only stored data purged (including full gallery removal)
- booking records untouched

### 14.2 Post-smoke status

All smoke scenarios confirmed. Gate is ready to open.

---

## 15) Практический skeleton хорошего Copilot prompt для будущих задач

```text
Ты — Copilot Agent, acting as senior <relevant specialty> engineer with strong <relevant domain awareness> and enterprise discipline.

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
    - font-size only via var(--fs-*)
    - use only existing approved typography tokens from the canonical project SSoT for the relevant scope
    - do NOT invent token names ad hoc
    - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
    - --fs-* rem-only
    - no px/em/%/vw/vh/clamp/fluid
    - no calc(non-rem)

Canonical workflow:
Phase 1 — Read-Only Audit
Phase 2 — Minimal Fix
Phase 3 — Verification
STOP after the requested phase
```

Дальше в prompt всегда должно быть:

- что именно нужно доказать;
- какие файлы читать;
- какие shared/high-blast-radius файлы не трогать casually;
- точный deliverable format;
- требование `RAW stdout + EXIT` для verification.

---

## 16) Практические правила следующего окна GPT

Следующий чат должен помнить:

- ChatGPT здесь — архитектор, не code monkey;
- Copilot — исполнитель;
- всё делается bounded contours;
- сначала доказать truth;
- потом minimal fix;
- потом verification;
- потом handoff/documentation;
- не invent-ить новые задачи, если реального blocking residual нет;
- не смешивать соседние contours ради ощущения прогресса;
- если contour реально закрыт — лучше остановиться, чем искусственно “добивать до идеала”.

---

## 17) Готовый bootstrap для нового окна ChatGPT

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

Current major closed contour:
- trial / free / premium lifecycle + anti-bypass + UX + docs is CLOSED
- Final Controlled Smoke PASSED — gate is ready to open

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking/deferred/intentional.

Choose safest mature path over fastest hack.
```

---

## 18) Финальная выжимка в одном абзаце

Если совсем коротко, то на сейчас Cardigo — это зрелый Israel-first SaaS для цифровых визиток с сильной архитектурной дисциплиной, ручным DB/index governance, cookie-backed browser auth, закрытым большим auth/security milestone, закрытым self-delete identity-finality contour, зрелой booking/logical lifecycle truth, закрытым analytics и internal-linking contour-ом, и теперь ещё с полностью закрытым большим contour-ом trial / free / premium lifecycle: first-card activation, trial-premium effectiveBilling, free fallback, reconcile, retention purge, gallery/AI anti-bypass, premium-lock UX, sidebar countdown и docs alignment.

---

## 19) Финальное напутствие

Проект сейчас находится в очень хорошей зрелой точке.

Это уже не этап “чинить всё подряд”.
Сейчас главный риск — не отсутствие ещё одной фичи, а **неосторожное смешивание contours и улучшения ради улучшений**.

Главное правило продолжения:

> **Не искать самый быстрый путь. Искать самый безопасный, зрелый и enterprise-правильный путь.**

ChatGPT здесь — не “помогатор по коду”.
ChatGPT здесь — архитектор, который:

- защищает invariants;
- держит discipline;
- следит за blast radius;
- не даёт проекту скатиться в хаотичные патчи;
- не создаёт новые задачи там, где mature decision — это остановиться.
