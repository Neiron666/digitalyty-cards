# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-06 (после закрытия lead inbox contour и mobile drawer icons contour)_

---

## 0) Что это за документ

Это **большой handoff-файл для следующего окна ChatGPT** по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- сохранить **закрытые контуры закрытыми**;
- не дать следующему чату скатиться в `scope creep`, broad refactor, решение “на глаз” и accidental drift;
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
- baseline для следующих bounded workstream-ов.

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

### 3.4 Operational truth по среде

Render/backend уже работают на новом cluster как на основной truth. Старый cluster сохранён только как fallback/reference, а не как текущая production-истина. Это важно не забывать при любых следующих bounded работах вокруг runtime, мониторинга, индексов и rollout-readiness.

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
  - CSRF / XSS / injection defenses,
  - data protection,
  - password / reset / token flow hardening,
  - privacy / consent / legal truth;
- помощь по CI/CD, monitoring, alerts, release discipline;
- обязательную документацию:
  - technical docs,
  - runbooks,
  - README,
  - next-chat handoffs,
  - anti-drift guidance,
  - change docs.

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

1. Architecture / intent clarification
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
- trial / free / premium lifecycle + anti-bypass + UX + docs contour.

---

## 8) Большой contour, который уже закрыт и остаётся базовой truth

### 8.1 Trial / free / premium canonical truth

- trial даётся **новому eligible user**;
- trial стартует не при регистрации сам по себе, а при **первом легитимном получении карточки**;
- это означает:
  - обычное первое создание карточки;
  - или claim anonymous-card как первой карточки;
- trial длится **10 дней**;
- после expiry карточка **не удаляется**;
- entitlement уходит в **free**;
- gallery на free — **premium-only**;
- AI на free — **hard-blocked**.

### 8.2 Card-level truth during active trial

У trial card:

- `billing.status = "trial"`
- `billing.plan = "monthly"`
- `billing.paidUntil = null`
- `trialStartedAt`
- `trialEndsAt`

### 8.3 User-level truth during active trial

У user:

- `trialActivatedAt`
- `trialEndsAt`
- `trialEligibilityClosedAt`

### 8.4 After expiry / downgrade

У downgraded/free card:

- `billing.status = "free"`
- `billing.plan = "free"`
- `billing.paidUntil = null`
- `downgradedAt`

### 8.5 Retention purge truth

После retention окна purge:

- не подрезает gallery “до лимита”;
- **удаляет всю gallery полностью**;
- чистит uploads/storage по всем gallery items;
- ставит `retentionPurgedAt`.

### 8.6 Final Controlled Smoke Under Gate

Этот smoke уже пройден и подтверждён:

- anonymous → register → login → claim recovery → trial — PASS
- ordinary new user → first card create → trial — PASS
- forced expiry → free fallback — PASS
- public free truth — PASS
- retention purge — PASS

Итог:

> **Final Controlled Smoke Under Gate = PASS**

---

## 9) Claim-flow transaction atomicity — truth

Это важно не потерять в следующем окне:

Изначально claim-flow был реализован через последовательные независимые writes с best-effort rollback. Это создавало partial-state window.

Теперь:

- DB writes `card.save({ session })` + `user.save({ session })` обёрнуты в **native Mongo transaction**;
- critical consistency window устранено;
- compensating rollback больше не является primary consistency mechanism;
- Supabase I/O intentionally остаётся вне transaction boundary;
- cleanup storage остаётся best-effort outside transaction.

Итог:

> **claim-flow DB consistency переведена на взрослую transaction-based model; contour закрыт.**

---

## 10) Что было закрыто в текущем окне чата

Это новая truth, которую обязательно нужно перенести в следующее окно GPT.

### 10.1 Lead inbox contour — CLOSED

В этом окне был детально разобран и закрыт большой bounded contour вокруг owner inbox для leads.

#### A. Display-contract drift — CLOSED

Симптом:
- visitor заполнял все поля лида;
- owner видел только сообщение и fallback `"(ללא שם)"`;
- email / phone не отображались.

Audit доказал:
- write path корректен;
- backend DTO уже использует:
  - `senderName`
  - `senderEmail`
  - `senderPhone`
  - `archivedAt`
  - `deletedAt`
- drift сидел в `Inbox.jsx`, который продолжал читать старые поля:
  - `lead.name`
  - `lead.email`
  - `lead.phone`
  - `lead.isArchived`
  - `isTrash`

Был сделан узкий frontend-only fix в `Inbox.jsx`.

Итог:
- lead owner inbox снова правильно отображает:
  - имя
  - email
  - phone
  - message

#### B. Stale-state after archive/trash/unarchive/unstar — CLOSED

Симптом:
- archive/trash/unarchive/unstar backend path работал;
- но без reload лид оставался в текущей вкладке.

Audit доказал:
- вкладки лида фильтруются **server-side** по `view`;
- `Inbox.jsx` рендерит raw `leads` state;
- `handleFlag` делал только optimistic merge через `.map(...)`;
- но не удалял lead из local state после успешного tab-moving mutation.

Был сделан минимальный fix в `Inbox.jsx`:

- optimistic merge сохранён;
- после успешного `updateLeadFlags(...)` lead удаляется из local state, если он больше не принадлежит текущей вкладке;
- покрыты cases:
  - archive from active view;
  - trash from non-trash view;
  - unarchive from archived view;
  - unstar from important view;
- no-op rollback был исправлен на реальный rollback.

Ручной smoke подтвердил:
- archive immediate remove — ok
- unarchive immediate remove — ok
- trash immediate remove — ok
- important stays in all — ok
- unstar disappears from important — ok

Итог:
> **stale-state after archive/trash/unarchive/unstar — CLOSED**

#### C. Important visual indicator / star — CLOSED

После закрытия state contour был поднят отдельный bounded UI contour:
- почему у important lead нет persistent visual marker в row.

Audit доказал:
- unread badge работает как задумано и живёт в header, а не в inbox;
- persistent important visual marker действительно отсутствовал;
- `.starBadge` уже существовал в `Inbox.module.css`, но не был подключён в JSX;
- это выглядело как **partial / incomplete implementation**, а не regression.

Был сделан минимальный purely presentational fix:
- в `Inbox.jsx` добавлена persistent star indicator для `lead.isImportant`;
- переиспользован существующий `styles.starBadge`;
- state, backend, unread logic и другие paths не трогались.

Ручной smoke подтвердил:
- звёздочка появляется и работает.

Итог:
> **important visual indicator in lead row — CLOSED**

#### D. Unread badge truth — CLOSED AS WORKING AS DESIGNED

Была отдельно проверена тема unread badge.

Audit доказал:
- unread badge живёт **в Header**, не в Inbox page;
- считает **unread leads + pending bookings**;
- archive/trash/hard delete/mark read уже корректно меняют local unread count;
- polling потом выравнивает возможные edge cases.

Итог:
> **не баг; working as designed**

#### E. 429 incident — NOT PROVEN AS BUG

В момент одной из проверок у пользователя всплывала ошибка load/fetch во всех вкладках inbox. Позже выяснилось, что в Network был 429 Too Many Requests. Поскольку состояние потом само вернулось к норме, это не было принято как доказанный кодовый баг.

Нормальная классификация:

- transient operational/runtime incident;
- potential follow-up only if reproducible;
- не смешивать с закрытым inbox contour.

---

### 10.2 Mobile drawer icons contour — CLOSED

Был отдельно поднят bounded UI contour:
добавить подходящие и уже существующие в проекте SVG в mobile drawer для двух кнопок:

- `/inbox` — `הודעות נכנסות`
- `/edit` — `הכרטיס שלי`

#### Audit truth

Audit доказал:

- обе кнопки рендерятся напрямую в `Header.jsx` внутри mobile drawer;
- `Button` не требует API change, потому что children composition уже оборачивается в `.label` с `inline-flex` и `gap`;
- для `/inbox` лучшая семантика — тот же envelope SVG, который уже используется в desktop header inbox;
- для `/edit` лучшая семантика — `HeadIcon` из `EditorTabIcons.jsx`.

#### Fix truth

Был сделан узкий minimal fix:

- `Header.jsx`
- `Header.module.css`

Что изменено:

- в mobile drawer `/inbox` добавлен envelope SVG, совместимый с desktop icon language;
- в mobile drawer `/edit` добавлен `HeadIcon`;
- добавлен маленький sizing class `.drawerBtnIcon`;
- unread badge на `/inbox` сохранён;
- `Button.jsx`, desktop header, icon system и другие surfaces не трогались.

Ручной smoke подтвердил:
- icons видны;
- alignment корректный;
- unread badge не ломается;
- кнопки работают.

Итог:
> **mobile drawer icons for /inbox and /edit — CLOSED**

---

## 11) Что intentionally deferred, а не “забыто”

Это важно: ниже не баги текущих закрытых contours, а осознанно отдельные future-work items.

### 11.1 Cosmetic rename helper-ов в retention purge

Naming helper-ов после purge-all semantics технически уже неидеален, но поведение правильное. Rename — отдельный косметический item, не текущая задача.

### 11.2 Rollout-readiness / gate-opening observability contour

Отдельным зрелым следующим направлением остаётся:

- operator readiness;
- env truth;
- jobs / schedulers / heartbeats;
- logging / observability;
- monitoring / alerts;
- gate-opening checklist;
- first-hours / day-1 monitoring discipline.

Это не хвост trial/claim/inbox workstreams. Это отдельный следующий operational contour.

### 11.3 cardLabel / kindPill docs drift around leads rows

В docs была замечена частичная drift truth:
описание cardLabel / kindPill для leads rows не совпадает с текущим кодом и больше похоже на bookings rows logic. Это отдельный маленький docs/UI contour, не мешающий текущим закрытым работам.

### 11.4 transient 429 / Too Many Requests observation

Пока не воспроизводится стабильно и не доказан как кодовый defect. Если повторится, нужно собирать:

- exact endpoint;
- method;
- status;
- response body;
- headers;
- что именно пользователь делал перед этим.

Только после этого поднимать отдельный bounded audit.

---

## 12) Что проект уже умеет прямо сейчас

Cardigo уже не выглядит как ранняя заготовка. На текущий момент он включает mature-level product surfaces и governance:

- personal and org card flows;
- editor/cabinet;
- preview/public shared render chain;
- public marketing pages;
- legal/info/a11y family;
- blog subsystem;
- guides subsystem;
- services/business-hours operational layer;
- booking foundation + owner/public booking flows;
- owner inbox;
- analytics and discoverability;
- admin surfaces;
- AI-assisted content surfaces;
- auth / verification / reset / recovery contours;
- trial/free/premium lifecycle;
- manual DB/index governance;
- cleaned production-shaped cluster truth;
- verified claim-flow transaction consistency.

---

## 13) Что проект должен продолжать включать дальше

Следующие зрелые направления развития:

- production-grade rollout discipline;
- operator readiness / monitoring / alerts;
- bounded security and resilience passes;
- CI/CD baseline and release discipline;
- security / stress / scalability / performance testing;
- documentation / runbooks / onboarding truth;
- ещё более строгую anti-drift культуру между code truth, docs truth и runtime truth.

---

## 14) Следующие зрелые шаги

После этого окна логично идти не в случайный кодовый фикс, а в один из взрослых путей:

### Вариант A — rollout-readiness / gate-opening audit

Если цель — двигаться к открытию gate, следующий bounded шаг:

- operator / rollout readiness audit;
- env / jobs / logging / monitoring / smoke notes;
- checklists перед открытием gate;
- что должен видеть оператор в первые часы/дни;
- observability contour без смешивания с уже закрытыми trial/claim/inbox/mobile scopes.

### Вариант B — homepage holistic audit

Если есть продуктовая цель улучшать публичную главную:
- holistic audit домашней страницы;
- on-page SEO;
- helper-copy;
- IA / CTA hierarchy;
- anti-drift review;
- но только bounded, audit-first и без broad redesign.

### Вариант C — новый отдельный bounded contour

Например:
- invalid token / invalid input paths hardening;
- отдельный docs truth alignment contour;
- bounded polish на owner inbox / nav / discoverability;
- отдельный small UI contract contour.

Критическое правило:

> не смешивать новый contour с уже закрытым scope и не reopen-ить закрытые решения без сильной доказанной причины.

---

## 15) Практический skeleton prompt для нового окна ChatGPT

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

Recently fully closed contours:
- Final Controlled Smoke Under Gate PASSED
- claim/recovery lifecycle bugs fixed
- create-path / claim-path trial parity fixed
- public lead paywall leak fixed
- retention gallery full purge fixed
- claim-flow Mongo transaction atomicity implemented and documented
- lead inbox display-contract drift fixed
- lead inbox stale-state after archive/trash/unarchive/unstar fixed
- important row star indicator fixed
- mobile drawer icons for /inbox and /edit fixed

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking / deferred / intentional.

Choose safest mature path over fastest hack.
```

---

## 16) Напутствие следующему окну GPT

Главное, что нужно помнить следующему чату:

- здесь нельзя работать “по ощущениям”;
- symptom часто оказывается только входом в более глубокий cluster problem;
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

## 17) Финальная выжимка в одном абзаце

Cardigo сейчас находится в сильной зрелой точке: это enterprise-minded Israel-first SaaS для цифровых визиток с ручной DB/index governance, строгой архитектурной дисциплиной, закрытым trial/free/premium lifecycle contour, корректным claim/recovery path, работающим forced expiry/free fallback, retention purge с полной gallery cleanup, реализованной claim-flow transaction atomicity через native Mongo transaction, чистой truth по owner inbox leads, исправленным stale-state после archive/trash/unarchive/unstar, persistent important star indicator в lead rows, корректной unread badge truth, и дополнительной polish-правкой mobile drawer icons для `/inbox` и `/edit`. Следующий GPT должен не “чинить всё подряд”, а идти bounded contours, держать architecture truth, соблюдать enterprise workflow и выбирать safest mature path over fastest hack.
