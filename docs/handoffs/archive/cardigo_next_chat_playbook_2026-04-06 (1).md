# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-06 + актуализация после закрытия claim-flow transaction atomicity и doc-closure_

---

## 0) Что это за документ

Это **большой handoff-файл для следующего окна ChatGPT** по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime truth**;
- передать не только факты, но и **тактику работы**;
- зафиксировать **enterprise-режим мышления**;
- сохранить **закрытые контуры закрытыми**;
- не дать следующему чату скатиться в `scope creep`, broad refactor, решение “на глаз” и accidental drift;
- передать **текущую зрелую truth проекта**, а не старые допущения;
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

## 8) Большой contour, который был полностью добит раньше

Ниже — самое важное: что реально было найдено, исправлено, проверено и задокументировано в зрелом lifecycle contour до этого окна.

---

## 9) Trial / free / premium canonical truth

### 9.1 Product truth

- trial даётся **новому eligible user**;
- trial стартует не при регистрации сам по себе, а при **первом легитимном получении карточки**;
- это теперь означает:
  - **обычное первое создание карточки**
  - **или claim anonymous-card как первой карточки**
- trial длится **10 дней**;
- после expiry карточка **не удаляется**;
- entitlement уходит в **free**;
- premium-only data живут до retention purge;
- gallery на free — **premium-only**;
- AI на free — **hard-blocked**;
- claim-path и create-path выровнены по anti-abuse closure truth.

### 9.2 Card-level truth during active trial

У trial card:

- `billing.status = "trial"`
- `billing.plan = "monthly"`
- `billing.paidUntil = null`
- `trialStartedAt`
- `trialEndsAt`

### 9.3 User-level truth during active trial

У user:

- `trialActivatedAt`
- `trialEndsAt`
- `trialEligibilityClosedAt`

### 9.4 After expiry / downgrade

У downgraded card:

- `billing.status = "free"`
- `billing.plan = "free"`
- `billing.paidUntil = null`
- `downgradedAt`

Исторические `trialStartedAt` / `trialEndsAt` могут сохраняться как history.

### 9.5 Retention purge truth

После retention окна purge:

- не подрезает gallery “до лимита”;
- **удаляет всю gallery полностью**;
- чистит uploads/storage по всем gallery items;
- ставит `retentionPurgedAt`.

---

## 10) Что было найдено и исправлено в claim/recovery + lifecycle contour

### 10.1 Public lead premium-lock leak

Симптом:  
На public card visitor видел owner-facing premium paywall по lead form.

Исправление:

- `mode` передаётся в `LeadForm`;
- при `mode="public"` и `!canUseLeads` компонент возвращает `null`;
- owner/editor premium-lock остаётся, visitor-facing paywall исчезает.

Итог:  
public free truth чистая.

### 10.2 Claim → trial activation bug

Симптом:  
Новый eligible user, который claim-ил anonymous card, не получал законный 10-day trial.

Исправление:

- claim path активирует canonical trial fields у card;
- claim path активирует canonical trial fields у user;
- после этого eligibility закрывается.

### 10.3 Claim-flow atomicity — contour closed

Изначально claim-flow был реализован через:

- `card.save()`
- затем `user.save()`
- и best-effort compensating rollback при падении второго write.

Это создавало partial-state window:

- Card уже мог стать claimed;
- User ещё не был связан с card;
- compensating rollback не давал полной атомарности.

Теперь:

- DB writes (`card.save({ session })` + `user.save({ session })`) обёрнуты в **native Mongo transaction**;
- критичное окно между независимыми writes устранено;
- compensating rollback больше не является primary consistency mechanism;
- ручной rollback-блок удалён;
- Supabase I/O **намеренно оставлен вне transaction boundary**;
- cleanup storage остаётся best-effort outside transaction.

Важно:

- transaction contour был проведён как **отдельный bounded reliability workstream**, а не как хвост прошлого lifecycle-fix;
- topology prerequisite был отдельно подтверждён вручную: runtime target — transaction-capable replica set;
- core runtime smoke подтверждён;
- post-smoke `sanity:ownership-consistency` показал нули по всем ownership mismatch counters.

Итог:

- claim-flow DB consistency переведена на взрослую transaction-based model;
- contour закрыт и в коде, и в документации.

### 10.4 Fallback claim after login/init

Симптом:  
Если register-time claim не приводил к owned card, authenticated user попадал в “создай новую карточку”, хотя у него уже была anonymous card.

Исправление:

- если `GET /cards/mine` пустой;
- и локально есть anonymous id;
- frontend делает `POST /cards/claim`;
- при success:
  - берёт claimed card;
  - очищает anonymous id;
  - не показывает create-card CTA.

### 10.5 Recovery-state semantics

После этого было добито:

- terminal no-claim → normal create-card path;
- transient recovery failure → recovery-specific error + retry;
- recovery error и create-card error разведены;
- duplicate-card risk больше не маскируется под “чистое пустое состояние”.

### 10.6 Register-time claim observability

register-time claim logging выровнен:

- exact whitelist warn outcomes:
  - `"(none)"`
  - `"USER_ALREADY_HAS_CARD"`
- всё прочее → `console.error`
- лог включает `userId`, `code`
- anonymousId логируется только как `(present)` / `(empty)`

### 10.7 Root-cause crash in claim: `design.selfThemeV1`

Симптом:  
`POST /cards/claim` падал с `CLAIM_FAILED`, а в логах было:
`design.selfThemeV1: Cast to Object failed for value "undefined"`.

Исправление:

- `card.design` начал переводиться через `.toObject()` перед мутацией.

Итог:

- claim больше не теряет `selfThemeV1`;
- media remapping работает;
- `card.save()` не валится.

### 10.8 Create-path parity bug

Симптом:  
Обычный first-card create path не ставил `user.trialEligibilityClosedAt`.

Исправление:

- в create-path trial activation добавлен `user.trialEligibilityClosedAt = now`.

Итог:

- create-path и claim-path выровнены по anti-abuse closure truth.

### 10.9 Retention gallery legacy rule bug

Симптом:  
После retention purge из gallery удалялась только “лишняя часть”, а хвост оставался.

Исправление:

- сделана **purge-all semantics**;
- `gallery = []`;
- все gallery items идут в uploads cleanup;
- все gallery items идут в storage cleanup.

Итог:

- gallery на free-retained card purge-ится полностью.

---

## 11) Controlled Smoke Under Gate — фактический результат

Этот smoke реально пройден и подтверждён.

### Step 1 — PASS
**anonymous → register → login → claim recovery → trial**

Подтверждено:

- UI recovery сработал;
- card стала user-owned;
- trial поля появились;
- media paths мигрировали в user-space;
- `פרמיום ניסיון` виден корректно.

### Step 2 — PASS
**ordinary new user → first card create → trial**

Подтверждено:

- normal create-path trial activation работает;
- trial user/card fields появляются;
- create-path parity для `trialEligibilityClosedAt` закрыта.

### Step 3 — PASS
**forced expiry → free fallback**

Подтверждено:

- `billing.status = "free"`
- `billing.plan = "free"`
- `downgradedAt` ставится
- countdown / trial UI исчезают
- редактор не ломается.

### Step 4 — PASS
**public free truth**

Подтверждено:

- public card открывается;
- visitor не видит owner-facing lead paywall;
- premium-owner leakage наружу нет.

### Step 5 — PASS
**retention purge**

Подтверждено:

- `gallery = []`
- `retentionPurgedAt` ставится
- uploads/storage cleanup по gallery отрабатывают
- free-card остаётся рабочей.

### Итог

> **Final Controlled Smoke Under Gate = PASS**

---

## 12) Дополнительный закрытый micro-contour из этого окна

### Premium-lock parity for Services / Business Hours

Был найден реальный UX/product gap:

- на free-плане вкладки `שירותים` и `שעות פעילות` исчезали полностью;
- ожидалось поведение как у Gallery:
  - вкладка остаётся видимой;
  - показывается crown / premium state;
  - внутри панели рендерится locked CTA.

Исправление было bounded editor-only:

- `EditorSidebar.jsx`
- `ServicesPanel.jsx`
- `ServicesPanel.module.css`
- `BusinessHoursPanel.jsx`
- `BusinessHoursPanel.module.css`

Не затронуты:

- backend
- public card rendering
- lifecycle/billing logic
- Gallery implementation
- editorTabs registry
- EditorPanel routing

Результат:

- free user видит `שירותים` и `שעות פעילות`;
- вкладки больше не скрываются;
- premium-lock parity с Gallery выровнена;
- frontend gates PASS;
- manual UI check PASS.

Contour закрыт.

---

## 13) Актуализированные docs / handoff truth

Canonical текущие документы, которые считаются актуальными по последнему зрелому состоянию:

- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-06_Final_Smoke_Passed.md`
- `docs/leads-inbox-architecture.md`
- `docs/runbooks/trial-lifecycle-ssot.md`
- `docs/upload-supabase-contract.md`

Дополнительно:

- текущий current handoff уже обновлён так, чтобы claim-flow transaction atomicity была отражена как **completed**, а не **future/deferred** contour.

Что зафиксировано:

- smoke действительно пройден;
- gallery purge теперь full removal;
- stale anonymous-card trial model убран;
- public LeadForm behavior отражён;
- lifecycle truth приведена в соответствие с кодом;
- claim-flow transaction atomicity отражена как закрытый отдельный reliability contour.

---

## 14) Что intentionally deferred, а не “забыто”

Это важно: ниже не баги текущих закрытых contours, а осознанно отдельные future-work items.

### 14.1 Косметический rename helper-ов в retention purge

Helper names типа `overflow` после purge-all semantics технически уже неидеальны по naming, но поведение правильное.  
Rename — отдельный косметический work item, не текущая задача.

### 14.2 Rollout-readiness / gate-opening observability contour

Отдельным mature следующим направлением остаётся operator/readiness contour:

- operator readiness;
- env truth;
- jobs / schedulers / heartbeats;
- logging / observability;
- monitoring / alerts;
- gate-opening checklist;
- first-hours / day-1 monitoring discipline.

Это не хвост transaction contour. Это отдельный следующий зрелый operational contour.

---

## 15) Что собой проект включает уже сейчас и что ещё должен включать дальше

### Уже включает

- карточки и публичные surface-ы;
- editor/cabinet;
- org/user ownership;
- lead layer;
- premium/free/trial lifecycle;
- admin;
- booking foundation;
- services/business hours;
- analytics / discoverability;
- legal/docs/governance;
- manual DB/index discipline;
- storage/upload contract;
- email verification / reset / claim-related auth flows;
- bounded transaction-based atomicity для claim-flow.

### Должен включать / продолжать развивать

- production-grade rollout discipline;
- operator readiness / monitoring / alerts;
- further auth hardening where still intentional;
- more bounded quality/security passes before or during broader rollout;
- полноценный production playbook / runbook set;
- зрелую operational observability around jobs / lifecycle / readiness.

---

## 16) Следующие зрелые шаги

После текущего окна логично идти не в случайный кодовый фикс, а в один из взрослых путей:

### Вариант A — rollout-readiness / gate-opening audit

Если цель — двигаться к открытию gate, следующий bounded шаг:

- operator / rollout readiness audit;
- env / jobs / logging / monitoring / smoke notes;
- checklists перед открытием gate;
- что должен видеть оператор в первые часы/дни;
- observability contour без смешивания с уже закрытыми claim/lifecycle/transaction scopes.

### Вариант B — новый отдельный bounded contour

Если gate пока не открываем, брать новый контур уже с чистого листа, без смешивания с закрытыми lifecycle/smoke/transaction contours.

Критическое правило:

> не смешивать новый contour с уже закрытым scope и не reopen-ить закрытые решения без сильной доказанной причины.

---

## 17) Практический skeleton prompt для нового окна ChatGPT

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
- Services / Business Hours premium-lock parity fixed in editor
- claim-flow Mongo transaction atomicity implemented and documented

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking / deferred / intentional.

Choose safest mature path over fastest hack.
```

---

## 18) Тактическое напутствие следующему окну GPT

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

## 19) Финальная выжимка в одном абзаце

Cardigo сейчас находится в сильной зрелой точке: это enterprise-minded Israel-first SaaS для цифровых визиток с ручной DB/index governance, сильной архитектурной дисциплиной, закрытым trial/free/premium lifecycle contour, корректным claim/recovery path, выровненной public/free truth, работающим forced expiry/free fallback, корректным retention purge с полной gallery cleanup, выровненным editor premium-lock parity для Services/Business Hours, реализованной claim-flow transaction atomicity через native Mongo transaction, обновлённой docs/handoff truth и полностью пройденным Final Controlled Smoke Under Gate. Следующий GPT должен не “чинить всё подряд”, а идти bounded contours, держать architecture truth, соблюдать enterprise workflow и выбирать safest mature path over fastest hack.
