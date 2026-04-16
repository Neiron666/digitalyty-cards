# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-28 (services cycle closed: functional repair, backend save hardening, UX/UI parity, max-governance, DesignPanel drift cleanup; booking owner/public contour previously stabilized and documented)_

---

## 0) Что это за документ

Это новый **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в реальный контекст проекта;
- зафиксировать **актуальную truth** по проекту;
- сохранить **рабочую доктрину**, enterprise-режим мышления и tactical rules;
- передать не только “что сделано”, но и **как правильно продолжать дальше**;
- не дать новому чату reopen-ить закрытые контуры casually;
- закрепить текущие deferred items и следующий правильный порядок действий.

Этот файл — не просто заметка. Это одновременно:

- master handoff;
- architecture memo;
- operating doctrine;
- senior-architect playbook;
- рабочая инструкция для следующего окна ChatGPT;
- карта закрытых, активных и deferred bounded workstream-ов.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это enterprise-minded SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но фактически это не “просто визитка”.

Cardigo уже включает или должен включать:

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
- booking foundation и рабочий owner/public booking contour v1;
- services/business-hours operational layer;
- premium public marketing surfaces;
- blog/guides/public discoverability stack.

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready owner/public flow foundation.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- UX, copy и product assumptions строятся под израильский рынок;
- multi-locale пока не является продуктовой базой;
- использование `IL` как trusted default допустимо там, где это не ломает контракты и truth.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

Их нельзя смешивать в:

- canonical;
- SEO;
- public paths;
- naming;
- structured data;
- product logic;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Канонический production domain:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- Cardigo и Digitalyty нельзя смешивать в canonical / OG / sitemap / URL logic / product copy.

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
- owner `/inbox` surface;
- services/business-hours editor panels;
- booking enablement/public booking UI.

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
- booking domain foundation + owner/public booking routes;
- services/business content schema and validation.

### 2.3 Инфраструктурные и operational принципы

- manual index governance;
- anti-drift verification;
- add-only wiring в shared files там, где это возможно;
- не входить в high-blast-radius файлы без доказанного boundary;
- PROOF `file:line-range` обязателен для утверждений Copilot;
- smoke/manual checks выполнять через PowerShell + `curl.exe`, где это возможно.

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
- аудит blast radius и runtime truth;
- security-minded review;
- подготовка bounded prompts для Copilot Agent;
- проверка PROOF / RAW outputs / runtime behavior;
- контроль отсутствия scope creep;
- поддержание enterprise-уровня мышления по всему проекту.

Дополнительная роль ChatGPT в проекте:

- архитектурное проектирование под масштабируемость, безопасность и производительность;
- технические консультации по frontend / backend / API / storage / deployment;
- code review и security review;
- предложения улучшений через clean code principles и design patterns без scope creep;
- guidance по secure mechanisms (CSRF / XSS / injections / data protection / password-gate classes и т.п.);
- помощь с CI/CD, тестированием, деплоем, мониторингом и alerts;
- поддержка documentation / runbooks / README / change docs / knowledge transfer.

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

Любое упоминание “двух фаз” считать shorthand. Канонически verification — всегда отдельная обязательная фаза.

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
- verification важнее уверенного тона;
- partial truth лучше красивой, но недоказанной истории.

### 3.6 Практический стандарт постановки задач Copilot

Каждая задача для Copilot должна содержать:

1. цель;
2. ожидаемое поведение;
3. ограничения;
4. список контуров, которые запрещено трогать;
5. definition of done;
6. что именно нужно доказать до изменений;
7. требование RAW stdout + EXIT для verification.

---

## 4) Ключевые архитектурные инварианты Cardigo

### 4.1 Render / frontend boundaries

- shared render chain для public + preview обязателен;
- templates registry только в `frontend/src/templates/templates.config.js`;
- preview-only styles только под `[data-preview="phone"]`;
- `CardLayout` DOM skeleton и `CardLayout.module.css` — high-blast-radius зона, не трогать casually;
- public / QR / OG URLs строятся из backend truth (`publicPath`, `ogPath`), не угадываются на фронте.

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

### 5.2 Blog subsystem

Закрыт и принят как зрелый bounded contour:

- public list page;
- public detail page;
- admin CRUD;
- SEO / JSON-LD / OG;
- sitemap integration;
- media upload flow;
- delete lifecycle;
- docs truth.

### 5.3 Guides subsystem

Закрыт как parallel bounded clone:

- backend foundation;
- admin CRUD;
- public list/detail;
- OG route;
- sitemap integration;
- SEO / JSON-LD;
- media flow;
- delete lifecycle.

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

### 5.6 Services-related bounded workstreams (закрыты в текущем цикле)

Закрыты и не должны reopen-иться без новой необходимости:

- Services tab functional repair:
  - add-row visibility bug fixed;
  - UI local draft lifecycle stabilized.
- Backend save defect for `content.services` null→object transition fixed:
  - targeted atomic-write cleanup after `buildSetUpdateFromPatch`, по паттерну faq/business.
- Services UI/UX parity cycle:
  - ServicesPanel visual/structural flow подтянут ближе к ContentPanel без backend/save reopen.
- Services max-governance cycle:
  - canonical max = 10;
  - frontend slot cap added;
  - backend authoritative validator lowered to 10;
  - legacy >10 rows stay visible with warning; no silent trim.
- DesignPanel top-level services drift cleanup:
  - dead top-level `services` branch removed;
  - stale dead `services: 8` seeding cap removed.

---

## 6) Booking workstream — актуальная truth на текущий момент

### 6.1 Что уже было закрыто

#### Services

Закрыт как descriptive section в `content.services`.

#### BusinessHours

Закрыт как top-level operational config в `businessHours`.

#### Booking backend/kernel foundation

Закрыт как отдельный domain/backend batch.

Зафиксировано:

- отдельная truth-сущность `Booking`, не reuse через leads;
- статусы:
  - `pending`
  - `approved`
  - `canceled`
  - `expired`
- blocking semantics:
  - `pending` и `approved` блокируют слот
  - `canceled` и `expired` не блокируют слот
- `expiresAt` и `purgeAt` имеют разный смысл;
- same-person anti-repeat есть;
- create flow fail-closed по booking/businessHours truth;
- owner list / approve / cancel endpoints существуют.

#### Booking Batch A backend

Закрыт как backend-only bounded batch.

Зафиксировано:

- `bookingSettings.enabled` — отдельная truth;
- `canUseBooking` — отдельный entitlement, не piggyback на leads;
- availability endpoint считает truth на backend;
- frontend не должен вычислять availability сам.

### 6.2 Что было закрыто в последнем booking cycle

- owner booking retrieval bug fixed (`actor.userId` vs `actor.id`);
- public booking request flow работает в bounded v1 смысле;
- owner action/load truth separation hardened;
- owner timing truth clarified (`createdAt` vs requested slot);
- retention truth surfaced owner-facing;
- canonical booking architecture doc exists:
  - `docs/bookings-inbox-architecture.md`;
- separate ops/index doc exists:
  - `bookings-indexes-ops.md`.

### 6.3 Owner inbox IA truth

Каноническая owner IA для incoming surfaces:

- `פניות`
- `בקשות תיאום`
- `פגישות עתידיות`

Где:

- requests queue содержит `pending`, `canceled`, `expired`;
- future meetings содержит только `approved` и ещё не завершившиеся встречи (`endAt > now`);
- approved future booking **не должна** дублироваться в двух вкладках одновременно.

### 6.4 Что остаётся deferred по booking

Не считать закрытым навсегда:

- header/nav incoming badge parity для booking requests;
- archive/hide semantics;
- completed/history meetings tab;
- broader booking CRUD;
- hard delete strategy;
- reschedule flow;
- revisit hold policy как отдельный product/architecture change, если понадобится.

---

## 7) Services cycle — финальная truth после закрытия

Это важный новый блок для следующего чата.

### 7.1 Каноническая truth по services

`services` живёт **только** в:

- `content.services`

И нигде больше не должен жить как canonical editor/save truth.

Это подтверждено по:

- ServicesPanel editor path;
- EditorPanel wiring;
- EditCard dirty/save path;
- backend schema/model;
- backend controller write semantics;
- DTO/public render.

### 7.2 Что реально было сломано и закрыто

#### A. Functional editor bug

Проблема:

- кнопка `הוסף שירות` визуально “не работала”;
- реальная причина была в том, что пустая новая строка немедленно pruning-илась самим ServicesPanel commit lifecycle.

Решение:

- ServicesPanel получил local draft behavior для временных пустых строк;
- visible new editable row больше не пропадает мгновенно.

#### B. Save-path defect на backend

После frontend fix открылся реальный backend defect:

- при `content.services = null` сохранение non-null services падало с Mongo error:
  - `Cannot create field 'items' in element {services: null}`

Реальная причина:

- backend write path рекурсивно разворачивал `content.services` в dotted child writes (`content.services.title`, `content.services.items`);
- MongoDB не может создать дочерние поля внутри `null` parent.

Решение:

- в `card.controller.js` добавлен targeted atomic-write cleanup для `content.services`, по уже существующему паттерну faq/business;
- `null -> object` и `object -> null` теперь проходят корректно;
- broad generalization `buildSetUpdateFromPatch()` намеренно **не делалась**.

#### C. UX/UI parity with Content tab

ServicesPanel был ощутимо примитивнее ContentPanel.

Что было закрыто:

- title field переведён на semantic `Input label` pattern;
- service items получили более явную block hierarchy;
- remove action перестал визуально конкурировать с input в одной строке;
- add action стал локально стилизованным contextual action;
- dead `formStyles.inlineButton` reference removed;
- typography usage выровнено в рамках локального scope.

#### D. Max-governance

Раньше пользователь мог добавлять услуги без нормального лимита.

Теперь зафиксирована canonical policy:

- max = **10**;
- frontend authoring cap есть;
- backend authoritative validator lowered to 10;
- UI показывает remaining capacity;
- legacy `>10` rows не режутся silently;
- user видит warning и должен вручную снизить количество до лимита.

#### E. DesignPanel latent drift

Был найден и закрыт dead drift:

- DesignPanel содержал dead branch, которая ссылалась на top-level `services` вместо canonical `content.services`;
- в `seedTemplateContent.js` был stale dead cap `services: 8`.

Что важно:

- это было **dead/inactive behavior**, а не активный runtime-bug;
- cleanup удалил latent trap на будущее, не меняя user-visible runtime behavior.

### 7.3 Итог после services cycle

Следующий чат должен считать как truth:

- `content.services` — единственная canonical truth;
- functional add/remove/save flow по services закрыт;
- backend null→object transition закрыт;
- UI/UX parity для ServicesPanel закрыта в bounded scope;
- max-governance = 10 закрыта;
- DesignPanel top-level drift закрыт;
- без новой явной причины **не надо** снова копать services.

---

## 8) AI / SEO / structured data truth

### 8.1 AI surfaces

Закрыты и зафиксированы отдельные bounded workstreams:

- About AI generation;
- FAQ AI generation;
- SEO AI generation;
- shared monthly quota governance;
- anti-abuse daily rails;
- error taxonomy и UI mapping.

### 8.2 SEO / JSON-LD / robots truth

Зафиксировано:

- route-level head через `SeoHelmet`;
- pre-launch global noindex kill switch;
- deterministic SEO defaults;
- structured-data assist strategy bounded;
- robots UX hardening был признан отдельным правильным enterprise-step, а не “заодно”.

### 8.3 Token economy policy for AI v1

Для SEO AI v1 закреплён приоритет token economy:

- брать только trusted minimal context;
- жёстко ограничивать outbound payload;
- не тянуть лишние тяжёлые about paragraphs без необходимости;
- short structured outputs лучше, чем переизбыточный context dump.

---

## 9) Billing / receipts / payment truth

Направление зафиксировано так:

- Notify — единственный source of truth для payment status;
- success_url не считается authoritative truth;
- `PaymentTransaction` ledger обязателен и append-only;
- anti-oracle подход для notify handler;
- Tranzila как реальный payment provider;
- receipt direction через YeshInvoice / private storage / signed URLs;
- premium fulfillment не должен roll back-иться из-за downstream receipt/email failure.

Это не означает, что весь billing contour уже полностью закрыт product-wide, но архитектурная truth по его форме уже задана.

---

## 10) Что проект уже включает на сейчас

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

- editor for digital cards
- admin surfaces
- blog admin CRUD
- guides admin CRUD
- `/inbox` owner incoming surface
- businessHours editor panel
- services editor panel
- booking enablement UI
- owner booking requests / future meetings IA direction

### Content / SEO / structured data

- route-level `SeoHelmet`
- JSON-LD flows
- deterministic SEO logic
- OG metadata generation
- sitemap generation

### Media

- hero image upload
- section image upload
- image canonicalization
- Supabase storage
- delete cleanup lifecycle

### AI / growth

- AI About generation
- AI FAQ
- AI SEO
- quota governance
- premium feature surfaces

### Booking / operational layer

- Services section
- BusinessHours section
- booking kernel foundation
- booking enablement truth
- availability read truth
- public booking request UI
- owner booking inbox retrieval
- owner booking timing truth
- owner IA split direction
- retention note truth
- booking architecture documentation

---

## 11) Что ещё должен включать проект дальше

Это уже зрелый roadmap, а не wishlist.

### 11.1 Ближайшие правильные bounded направления

Наиболее здравые следующие workstream-ы после закрытия services cycle:

#### A. Booking header/nav badge parity

Проверить, должны ли booking requests участвовать в header/nav incoming indicator.

Важно:

- отдельный bounded workstream;
- не смешивать с already closed booking retrieval / IA / docs scope.

#### B. Auth / registration hardening

Продолжить enterprise-hardening auth/registration flows:

- error handling;
- invalid token paths;
- malformed input handling;
- user-facing safety and predictability.

#### C. API error mapping / UX hardening

Отдельно можно открыть bounded scope на улучшение frontend mapping для backend validation / save errors, чтобы меньше полагаться на generic save error там, где можно показать более точную panel-local подсказку.

#### D. Monitoring / CI/CD / release discipline

Следующий зрелый слой после локальных функциональных repair scopes:

- stronger CI/CD baseline;
- test/prod deploy discipline;
- monitoring;
- alerts;
- release safety.

### 11.2 Следующие большие product themes

После bounded hardening cycles у проекта должен усиливаться следующий слой:

- security/data protection layers;
- production readiness baseline;
- stress / scalability / performance testing;
- documentation / runbooks / team enablement;
- later — refined booking CRUD/history/archive workstreams.

---

## 12) Как правильно работать дальше в следующем окне

### 12.1 Стартовая позиция нового чата

Следующее окно ChatGPT должно сразу принять как truth:

- проект живёт в enterprise-mode;
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant;
- Copilot = executor;
- все prompts идут фазами;
- все claims требуют PROOF;
- закрытые workstreams нельзя casually reopen-ить;
- services family currently closed;
- booking owner/public contour уже значительно продвинут и не находится “в нуле”.

### 12.2 Как формулировать задачи

Любую новую задачу формулировать так:

1. какая цель;
2. какой ожидаемый результат;
3. какие ограничения;
4. какой контур запрещено трогать;
5. что является Definition of Done;
6. что нужно доказать, прежде чем что-то менять.

### 12.3 Как не ломать проект

Нельзя:

- лезть в shared files “потому что так удобнее”;
- смешивать отдельные truth-контуры;
- делать broad cleanup/refactor без business/architecture reason;
- делать fake frontend truth вместо backend truth;
- принимать build-success за доказательство корректного решения;
- принимать code summary без post-change PROOF;
- создавать локальные ad hoc исключения из CSS/token/typography laws.

### 12.4 Как принимать или не принимать работу Copilot

Принимать только то, что:

- прошло audit с PROOF;
- имеет минимальный blast radius;
- прошло verification или честно остановлено до него;
- не ломает accepted subsystems;
- не тащит scope creep;
- truthfully подтверждено runtime, если речь идёт о lifecycle / API / entitlement / delete / booking / invite / persistence.

---

## 13) Практический skeleton хорошего Copilot prompt

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

## 14) Что считать каноническими docs / truth sources

### Canonical booking docs

- `docs/bookings-inbox-architecture.md` — главный architecture/product-truth doc по booking owner inbox / lifecycle / IA / deferred scope
- `bookings-indexes-ops.md` — ops/index/runbook doc

### Canonical project handoff source

Для следующего чата использовать именно **этот handoff** как стартовый master playbook, а более старые handoff-файлы воспринимать как historical context, а не как более свежую truth.

### Не надо смешивать

- architecture truth не запихивать в ops doc;
- ops команды и index runbook не размазывать по handoff notes;
- старые handoff files не переписывать без сильной причины;
- closed services scopes не reopen-ить без новой явной product/bug/security причины.

---

## 15) Практический статус на сейчас — очень коротко

Если нужно передать проект в сверхкоротком виде:

- Cardigo — Israel-first SaaS для digital business cards.
- Canonical domain: `https://cardigo.co.il`.
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant.
- Copilot = executor, работает строго фазами.
- No git commands. No inline styles. CSS Modules only. Flex only. Mobile-first.
- Typography: only approved `var(--fs-*)` tokens, rem-only.
- Blog/guides/pricing/contact/public docs cycles — закрыты.
- Services и BusinessHours как базовые operational sections — закрыты.
- Booking backend/kernel foundation — закрыт.
- Booking public UI — работает в bounded v1.
- Owner booking retrieval / timing / IA / retention truth — значительно продвинуты и задокументированы.
- Hard delete booking не является текущей стратегией.
- Services functional/save/UI/max/drift family — закрыта.
- Следующий booking follow-up: header/nav badge parity как отдельный bounded workstream.
- Следующие enterprise themes: auth hardening, API error mapping, monitoring/CI/CD baseline, security/perf/stress.

---

## 16) Последнее напутствие

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
Только доказанные boundaries.  
Только минимальный blast radius.  
Только зрелое enterprise-мышление.

И самое важное:

> **Не скорость важнее всего, а зрелость решения и доказанная truth.**
