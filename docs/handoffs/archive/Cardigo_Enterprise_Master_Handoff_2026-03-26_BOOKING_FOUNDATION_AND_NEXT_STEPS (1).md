# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-26 (services + business hours closed, booking kernel closed, owner incoming area closed, booking backend Batch A closed, sanity drift closed)_

---

## 0) Что это за документ

Это новый **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его цель:

- быстро ввести новый чат в реальный контекст проекта;
- зафиксировать текущую truth проекта после нескольких новых bounded workstream-ов;
- сохранить enterprise-доктрину работы;
- передать не только что уже сделано, но и **как именно правильно работать дальше**;
- зафиксировать закрытые контуры, чтобы их не переоткрывали casually;
- показать следующий правильный порядок действий без drift и without scope creep.

Этот файл — не просто заметка. Это одновременно:

- handoff;
- architecture memo;
- operating doctrine;
- senior-architect playbook;
- инструкция для следующего окна ChatGPT;
- рабочий устав того, как в этом проекте думать и принимать решения.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по факту это не “просто визитка”.

Cardigo одновременно включает:

- digital business card;
- mini business page;
- sharing layer;
- SEO surface;
- WhatsApp / QR / social entry point;
- lead surface;
- self-service editing system;
- analytics layer;
- structured-data layer;
- premium / org / admin surface;
- AI-assisted content surfaces;
- и теперь — foundation для booking-сценариев.

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + optional booking-ready foundation.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- UX, тексты и default assumptions строятся под израильский рынок;
- multi-locale пока не является продуктовой базой;
- дефолтная бизнес-логика допустимо ориентируется на **IL**, если это не ломает контракты.

### 1.3 Бренды и разделение

Критически важный инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

Их нельзя смешивать в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Канонический production domain:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- Cardigo и Digitalyty не смешивать в source-of-truth для canonical / OG / sitemap / URL logic / product copy.

---

## 2) High-level архитектура

### 2.1 Frontend

Стек:

- React;
- Vite;
- RTL-first;
- CSS Modules only;
- Mobile-first;
- Flex only;
- token-based styling;
- route-level head / SEO;
- shared render chain для public + preview.

Ключевые frontend-узлы:

- `CardRenderer`;
- `TemplateRenderer`;
- `CardLayout`;
- `EditCard`;
- editor shell;
- templates registry;
- skins system;
- motion subsystem;
- premium public pages;
- owner `/inbox` surface.

### 2.2 Backend

Стек:

- Node.js;
- Express;
- MongoDB / Mongoose;
- Supabase Storage;
- admin/public split;
- manual index governance.

Ключевые backend-контуры:

- cards / public cards / org cards;
- auth / registration / onboarding / invites;
- payments foundation;
- AI endpoints;
- analytics aggregates;
- blog subsystem;
- guides subsystem;
- sitemap / OG routes / discoverability;
- booking kernel foundation.

### 2.3 Инфраструктурные и operational принципы

- manual index governance;
- anti-drift verification;
- add-only wiring в shared files, где это возможно;
- избегать high-blast-radius edits без доказанного boundary;
- PROOF `file:line-range` обязателен для утверждений Copilot;
- smoke/manual checks выполнять через PowerShell + `curl.exe`, когда это возможно.

---

## 3) Жёсткая рабочая доктрина проекта

### 3.1 Роль ChatGPT

В этом проекте ChatGPT — не просто помощник, а:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**.

Обязанности ChatGPT в проекте:

- проектирование и оптимизация архитектуры;
- защита SSoT, контрактов, границ и инвариантов;
- выбор безопасного порядка работ;
- аудит и анализ blast radius;
- security-minded review;
- подготовка bounded prompts для Copilot Agent;
- проверка PROOF / RAW outputs / runtime truth;
- контроль отсутствия scope creep;
- поддержание enterprise-уровня мышления по всему проекту.

### 3.2 Роль Copilot Agent

Copilot Agent — **исполнитель**, а не архитектор.

Его роль:

- читать код и выдавать audit с PROOF;
- выполнять только одобренные минимальные правки;
- не расширять scope самостоятельно;
- не рефакторить “на будущее”; 
- прогонять проверки и показывать RAW outputs;
- не принимать архитектурные решения “по ощущению”.

### 3.3 Канонический workflow

Каноническая формула:

> **Architecture → Audit → Minimal Fix → Verification → Documentation**

Для Copilot — строгий 3-фазный режим:

- **Phase 1 — Read-Only Audit with PROOF → STOP**
- **Phase 2 — Minimal Fix → STOP**
- **Phase 3 — Verification with RAW stdout + EXIT → STOP**

Любое упоминание “двух фаз” считать shorthand. Канонически verification всегда отдельная обязательная фаза.

### 3.4 Непереговорные ограничения для каждого Copilot prompt

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

### 3.5 Тактические правила работы

- без scope creep;
- без “заодно поправил”;
- не давать изменения без предварительного audit;
- всегда требовать `PROOF file:line-range`;
- boundaries доказывать, а не угадывать;
- в shared/high-blast-radius файлы входить только при доказанной необходимости;
- broad refactor запрещён, пока не доказан как самый безопасный путь;
- Copilot не должен предлагать git-команды;
- verification важнее уверенного тона;
- partial truth лучше красивой, но недоказанной истории.

---

## 4) Ключевые архитектурные инварианты Cardigo

### 4.1 Render / frontend boundaries

- shared render chain для public + preview обязателен;
- templates registry только в `frontend/src/templates/templates.config.js`;
- preview-only styles только под `[data-preview="phone"]`;
- `CardLayout` DOM skeleton и `CardLayout.module.css` — high-blast-radius зона, не трогать casually;
- public / QR / OG URLs должны строиться из backend truth (`publicPath`, `ogPath`), не угадываться на фронте.

### 4.2 Skins / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary — разные контуры, их нельзя смешивать “по чувству”.

### 4.3 Typography law

Typography policy — корпоративный закон:

- `font-size` только через `var(--fs-*)`;
- `--fs-*` только rem-only;
- нельзя `px`, `em`, `%`, `vw`, `vh`, `clamp`, fluid formulas;
- нельзя `calc(non-rem)`;
- responsive typography только через token overrides и rem breakpoints;
- нельзя придумывать новые typography tokens ad hoc.

### 4.4 Security / org / public truth

- anti-enumeration 404;
- membership-gate до SEO/410 на org surfaces;
- sitemap без N+1 drift;
- manual index governance: `autoIndex/autoCreate` нельзя считать production truth.

---

## 5) Что уже было закрыто ранее и не должно casually переоткрываться

### 5.1 Premium public pages family

Закрыты и приняты:

- Home `/`
- `/cards`
- `/pricing`
- `/contact`
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`
- `/privacy`
- `/terms`

Это не значит, что туда нельзя входить никогда. Это значит:

- нельзя casually переделывать стиль;
- нельзя ломать общий public canon;
- нельзя лезть в globals/shared public layer без доказательства.

### 5.2 Blog subsystem

Blog subsystem закрыт и принят как зрелый bounded contour:

- public list page;
- public detail page;
- admin CRUD;
- SEO / JSON-LD / OG;
- sitemap integration;
- media upload flow;
- delete lifecycle;
- docs truth.

### 5.3 Guides subsystem

Guides subsystem закрыт как **parallel bounded clone**, а не как generic content engine.

Сделано:

- backend foundation;
- admin CRUD;
- public list/detail;
- OG route;
- sitemap integration;
- SEO / JSON-LD;
- media upload flow;
- delete lifecycle;
- save-first helper UX.

### 5.4 Pricing / contact / governance / docs cycles

Закрыты:

- pricing public page;
- contact redesign;
- analytics/admin visibility cycle;
- governance hardening cycle;
- blog docs updates;
- guides MVP closure.

### 5.5 Broad card-boundary typography cleanup

Широкая чистка card-boundary намеренно **не должна трогаться casually**. Это high-blast-radius зона.

---

## 6) Что было сделано в этом окне чата — новый слой работы

Ниже — свежий статус именно по новым workstream-ам, которые были выполнены после предыдущих handoff-ов.

---

## 7) Services workstream — закрыт

### 7.1 Что было решено архитектурно

`Services` был сделан как **чисто описательная карточечная секция**, без booking-логики, без цен, без service duration, без таймзоны.

Правильное решение хранения:

- **`content.services`**

Почему это было правильно:

- это описательный контент, а не operational config;
- existing content pipeline уже умел безопасно тащить это через editor → PATCH → DTO → public render;
- blast radius был минимальный.

### 7.2 Что реализовано

- новый editor tab `שירותים`;
- новый editor panel;
- public collapsible section;
- null-render при пустом состоянии;
- shared render chain сохранён;
- preview/public drift был отдельно устранён;
- итоговый batch принят и закрыт.

### 7.3 Важный вывод

`Services` не надо reopen-ить при будущих booking workstream-ах. Это отдельный, закрытый descriptive contour.

---

## 8) Business Hours workstream — закрыт

### 8.1 Ключевое продуктовое решение

`BusinessHours` — это **не контент**, а **top-level operational config**.

Правильное хранение:

- **top-level `businessHours`**

### 8.2 Что именно зафиксировано как truth

- `businessHours` — optional owner-controlled section;
- есть явный `enabled` switch;
- у каждого дня есть open/closed semantics;
- интервалы задаются **только через curated controls**, не free-text;
- 30-minute time grid — canonical V1 basis;
- public section collapsible и null-render, если disabled / пусто.

### 8.3 Что реализовано

- новый tab `שעות פעילות` после `שירותים`;
- editor panel с owner-friendly UX;
- section-level enabled switch;
- per-day open/closed;
- select-only time controls;
- отдельный UX correction pass: нативный `<select>` popup заменён на локальный dark themed listbox/popover;
- public section в shared card chain;
- copy drift был замечен и исправлен вручную;
- batch принят и закрыт.

### 8.4 Важный вывод

`BusinessHours` — уже готовая source-of-truth база для booking, но:

- **само наличие часов работы не означает включённую запись**;
- booking должен включаться отдельно.

---

## 9) Booking backend/kernel foundation — закрыт как backend/domain batch

Это был важный архитектурный слой. Он **не равен готовой booking feature целиком**, но он дал корректную backend truth.

### 9.1 Что было решено правильно

Booking нельзя было строить через Lead-only модель.

Почему:

- Lead не даёт atomic slot lock truth;
- Lead не даёт DB-level collision safety;
- Lead не является корректной source-of-truth сущностью для booking lifecycle.

Выбранная модель:

- **отдельная коллекция / truth entity `Booking`**

### 9.2 Что зафиксировано как V1 truth

Минимальная status-модель:

- `pending`
- `approved`
- `canceled`
- `expired`

Блокировка:

- `pending` и `approved` блокируют слот;
- `canceled` и `expired` слот освобождают.

### 9.3 Ключевые архитектурные решения

#### A) Separate expiry from retention

Нельзя смешивать:

- `expiresAt` — pending hold expiry
- `purgeAt` — history retention purge

Они разные по смыслу и должны жить раздельно.

#### B) Blocking-only uniqueness

Нельзя использовать naive permanent unique на slot, если:

- canceled / expired history сохраняется до purge;
- slot должен снова бронироваться позже.

Поэтому выбран blocking-only uniqueness:

- partial unique logic только для blocking-state rows.

#### C) Same-person anti-repeat

Зафиксирован enterprise-safe V1 policy:

- **один blocking booking на одну карточку для одного человека**

Identity anchor:

- `customerPhoneNormalized`
- `personKey` (deterministic key на основе normalized phone, scoped appropriately)

То есть защита от повторного бронирования не зависит от:

- refresh;
- revisit;
- local/session state.

Она server-truth based.

#### D) Pending release

Одного `expiresAt` недостаточно. Нужен реальный release mechanism.

Выбран безопасный путь:

- stale pending release должен происходить на create path и/или через лёгкую reconcile механику,
- но correctness не должен зависеть только от owner action.

#### E) BusinessHours legality — fail-closed

Booking create не должен “угадывать” доступность.

Если:

- booking disabled,
- businessHours disabled,
- businessHours malformed,
- slot outside allowed interval,

то create path должен fail-closed.

### 9.4 Что реализовано в kernel batch

- `Booking` model;
- status lifecycle;
- blocking-only uniqueness foundations;
- same-person anti-repeat foundations;
- `expiresAt` / `purgeAt` separation;
- public create endpoint;
- owner list / approve / cancel endpoints;
- owner-scope list truth;
- partial-unique / TTL / governance artifacts;
- retention logic foundations;
- fail-closed businessHours legality.

### 9.5 Что НЕ было частью kernel batch

Не было реализовано:

- public calendar UI;
- owner unified UI на первом шаге;
- booking enable toggle;
- availability read contract (это было сделано уже следующим bounded backend batch);
- customer self-cancel;
- payments;
- external calendar sync;
- holidays / exceptions;
- generic scheduling engine.

---

## 10) Unified owner incoming area on `/inbox` — закрыт

### 10.1 Ключевое продуктовое решение

Нельзя было делать новый top-level nav item ради bookings.

Почему:

- `/inbox` уже является owner incoming surface;
- header / route / mental model уже существуют;
- отдельная новая owner page дала бы navigation drift.

### 10.2 Что реализовано

На `/inbox` добавлен внутренний category split:

- `פניות`
- `בקשות תיאום`

При этом:

- это **не mixed feed**;
- leads/messages остаются в своей truth-модели;
- bookings requests остаются в своей truth-модели;
- switch — только UI-layer разделение.

### 10.3 Очень важный anti-drift момент

Сначала была ошибка: bookings category пытались строить через guessed current card / personal-only fallback.

Это было **не принято** и исправлено.

Правильное решение:

- bookings list на `/inbox` должен быть backed by **owner-scope backend contract**, а не guessed editor context.

### 10.4 Дополнительная доработка

У bookings `cardKind` сначала был эвристический.

Потом отдельно был сделан micro-audit и micro-fix:

- найден canonical source of truth через `getPersonalOrgId` из правильного util;
- bookings.cardKind выровнен по той же логике, что leads.cardKind;
- runtime-safe import доказан;
- debt закрыт.

### 10.5 Итог

`/inbox` unified incoming area для текущего bounded scope закрыт.

---

## 11) Booking Batch A (backend-only) — закрыт

Это следующий слой поверх booking kernel.

### 11.1 Что было добавлено

#### A) Booking enablement truth

Зафиксирован правильный V1 shape:

- **top-level `bookingSettings`**
- минимальный safe V1 shape:

```js
bookingSettings = {
  enabled: false
}
```

Почему так:

- booking enablement должен быть **отдельно** от `businessHours`;
- владелец может показывать часы работы, но не принимать запись;
- shape extensible для будущего V2.

#### B) Entitlement truth

Booking больше не должен piggyback-ить на `canUseLeads`.

Сделано:

- отдельный feature flag `booking` в `plans.js`;
- отдельный computed entitlement `canUseBooking`.

#### C) Availability read truth

Появился backend availability read endpoint.

Важно: я отдельно дожал архитектуру так, чтобы backend возвращал **готовую slot truth для UI**, а не заставлял фронт вычислять её из:

- `intervals`
- `occupiedSlots`
- `slotDuration`

То есть frontend должен оставаться thin presentation layer.

### 11.2 Что теперь умеет backend availability layer

Backend truth now knows:

- card exists / active;
- booking enabled;
- canUseBooking;
- businessHours legality;
- blocking bookings occupancy;
- slot duration = 30 minutes;
- bounded date range.

### 11.3 Что verification доказал

Batch A был принят после отдельного verification и после закрытия всех minor notes.

### 11.4 Minor notes, которые были закрыты потом

После verification были отдельно закрыты:

- consent drift в `sanity-org-membership` / `sanity-org-access`;
- publish-tier drift в `sanity-org-access`;
- `bookings.cardKind` micro-debt.

Итог: Batch A сейчас можно считать **чисто закрытым**.

---

## 12) Что сейчас уже готово, а чего ещё нет

### 12.1 Уже готово

#### Product/backend foundations

- card/public/editor foundations;
- Services;
- BusinessHours;
- booking kernel;
- booking enablement truth (`bookingSettings`);
- booking entitlement truth (`canUseBooking`);
- booking availability backend read truth;
- owner incoming area `/inbox` с switch и booking requests.

#### Closed public/content subsystems

- blog;
- guides;
- pricing;
- contact;
- cards page;
- general governance/docs cycles.

### 12.2 Ещё НЕ готово

#### Public booking surface в карточке

Пока ещё нет:

- owner-side booking enable toggle в editor UI;
- public booking section inside the card;
- date picker / calendar-like UI;
- slot selection UI;
- form submit UX inside the card;
- success / conflict / pending-confirmation UX on the public surface.

Это критически важно понимать:

> **Полная booking feature как product UI contour ещё не закрыта.**

Закрыты только foundations и owner incoming surface.

---

## 13) Что проект теперь включает на текущий момент

### Public / marketing / discoverability

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
- OG routes
- sitemap integration

### Editing / admin / owner

- editor for digital cards;
- admin surfaces;
- blog admin CRUD;
- guides admin CRUD;
- `/inbox` unified incoming area with separate categories;
- businessHours editor panel;
- services editor panel.

### Content / SEO / structured data

- route-level `SeoHelmet`;
- FAQPage JSON-LD;
- Article / blog-like detail structured data;
- deterministic SEO logic;
- OG metadata generation;
- sitemap generation.

### Media

- hero image upload;
- section image upload;
- image canonicalization;
- Supabase storage;
- delete cleanup lifecycle;
- save-first helper UX in admin.

### AI / growth

- AI About generation;
- AI FAQ;
- AI SEO;
- quota governance;
- premium feature surfaces.

### New operational/service surfaces

- Services section;
- BusinessHours section;
- booking kernel foundation;
- booking enablement truth;
- availability read truth;
- owner incoming bookings surface.

---

## 14) Что ещё должен включать проект дальше

Ниже — уже зрелый roadmap, а не wishlist.

### 14.1 Следующий ближайший большой workstream

## Booking Enablement UI + Public Booking UI

Следующий реальный продуктовый шаг теперь такой:

### A) Owner-side booking enablement UI

В editor owner должен получить явный toggle:

- booking enabled / disabled

Важно:

- это отдельная truth;
- это не то же самое, что `businessHours.enabled`;
- логика должна быть визуально рядом с businessHours, но **не смешиваться** с ними в одну и ту же сущность.

На уровне продукта:

- `businessHours.enabled === true` означает: показываем часы работы
- `bookingSettings.enabled === true` означает: разрешаем онлайн-запись

Booking section должен работать только когда **обе truth согласованы**.

### B) Public booking section in card

Нужен новый bottom-area section в карточке:

- собственный заголовок;
- date selection / calendar-like UI;
- list/grid of available 30-min slots;
- required name;
- required valid phone;
- consent checkbox;
- success state: заявка принята, но это не instant confirmation;
- conflict handling на основе backend codes.

### C) Availability consumption from backend truth

Frontend не должен угадывать доступность по `businessHours`.

Frontend должен:

- запрашивать backend availability;
- рисовать то, что backend already computed;
- повторно fetch-ить при конфликтах / refresh states.

### D) Section placement

Этот вопрос нужно решать bounded-реализацией, но текущая product-logic такова:

- booking section должен быть в **нижнем action cluster** карточки;
- после FAQ;
- при этом нужно аккуратно согласовать его с QR + LeadForm;
- safest direction: встраивать booking в нижний кластер без случайного reordering уже принятых surface-ов.

### 14.2 Что должно оставаться deferred

Не трогать сейчас:

- customer self-cancel;
- external calendar sync;
- holidays / exceptions / vacations engine;
- variable duration booking;
- payments;
- notifications / reminders;
- multi-staff / resources;
- generic scheduling platform.

### 14.3 После public booking UI

Дальше логичный путь:

- runtime smoke на booking flow end-to-end;
- docs/runbook для booking operations;
- possible product refinement around booking copy/labels;
- only later — advanced booking features.

---

## 15) Как правильно работать дальше в следующем окне

### 15.1 Стартовая позиция нового чата

Следующее окно ChatGPT должно сразу принять как truth:

- проект живёт в enterprise-mode;
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant;
- Copilot = executor;
- все prompts идут фазами;
- все claims требуют PROOF;
- закрытые workstreams нельзя casually reopen-ить;
- booking kernel и Batch A уже сделаны;
- `/inbox` unified incoming area уже сделан;
- booking public UI ещё не реализован.

### 15.2 Как формулировать задачи

Любую новую задачу формулировать так:

1. какая цель;
2. какой ожидаемый результат;
3. какие ограничения;
4. какой контур запрещено трогать;
5. что является Definition of Done;
6. что нужно доказать прежде, чем что-то менять.

### 15.3 Как не ломать проект

Нельзя:

- лезть в shared files “потому что так удобнее”;
- смешивать отдельные truth-контуры;
- делать broad cleanup/refactor без business / architecture reason;
- делать fake frontend truth вместо backend truth;
- принимать build-success за доказательство корректного решения;
- принимать code summary без post-change PROOF.

### 15.4 Как принимать или не принимать работу Copilot

Принимать только то, что:

- прошло audit с PROOF;
- имеет минимальный blast radius;
- прошло verification;
- не ломает accepted subsystems;
- не тащит scope creep;
- truthfully подтверждено runtime, если речь идёт о lifecycle / API / entitlement / delete / booking / invite.

---

## 16) Практический шаблон хорошего Copilot prompt

Ниже — канонический skeleton.

```text
Ты — Copilot Agent, acting as senior frontend/full-stack engineer.

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
  - do NOT invent new token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Canonical workflow:
Phase 1 — Read-Only Audit
Phase 2 — Minimal Fix
Phase 3 — Verification
STOP after Phase 3
```

Дальше в prompt всегда должно быть:

- что именно нужно доказать;
- какие файлы читать;
- какие shared/high-blast-radius файлы не трогать casually;
- точный deliverable format;
- требование RAW stdout + EXIT для verification.

---

## 17) Следующий правильный bounded шаг

Наиболее правильный следующий workstream для нового окна:

# **Booking Enablement UI + Public Booking UI**

Но делать его надо не одним гигантским промптом “сделай всё”.

Правильный путь:

### Phase 1 audit нового окна должен доказать:

- safest owner-side contour for `bookingSettings.enabled` UI;
- safest insertion point for public booking section in `CardLayout` bottom cluster;
- exact frontend states;
- exact consumption contract for availability endpoint;
- что фронт будет thin и не будет считать availability сам.

### Потом минимальный bounded implementation batch

Скорее всего safest Phase 2 следующего окна должен включать:

- owner-side booking toggle inside/near BusinessHours panel (но как отдельный subsection);
- public booking section component;
- date / slot UI;
- service layer for availability + create booking;
- insertion into `CardLayout` bottom cluster;
- no extra platform scope.

### Потом отдельная verification phase

С обязательной проверкой:

- no inline styles;
- CSS Modules only;
- no grid;
- no drift against availability backend truth;
- no Services / BusinessHours regressions;
- no `/inbox` regressions;
- no booking kernel regressions.

---

## 18) Сверхкраткая сводка статуса на сейчас

Если нужно передать проект в 15 строках:

- Cardigo — Israel-first SaaS для digital business cards.
- Canonical domain: `https://cardigo.co.il`.
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant.
- Copilot = executor, работает строго фазами.
- No git commands. No inline styles. CSS Modules only. Flex only. Mobile-first.
- Typography: only approved `var(--fs-*)` tokens, rem-only, no px/clamp/vw/etc.
- Blog subsystem закрыт.
- Guides subsystem закрыт.
- Services workstream закрыт.
- BusinessHours workstream закрыт.
- Booking backend/kernel foundation закрыт.
- Unified owner incoming area `/inbox` закрыт.
- Booking Batch A backend (bookingSettings + canUseBooking + availability read truth) закрыт.
- Все текущие minor notes закрыты.
- Следующий workstream: **Booking Enablement UI + Public Booking UI**.

---

## 19) Последнее напутствие

В этом проекте нельзя думать как “быстрый кодер”. Здесь нужно думать как взрослый архитектор:

- сначала границы;
- потом доказательства;
- потом минимальная правка;
- потом verification;
- потом фиксация truth.

Никаких inline styles.  
Никакого CSS Grid.  
Только CSS Modules.  
Только Flex.  
Только доказанные границы.  
Только минимальный blast radius.  
Только зрелое enterprise-мышление.

И самое важное:

> **Не скорость важнее всего, а зрелость решения и доказанная truth.**

