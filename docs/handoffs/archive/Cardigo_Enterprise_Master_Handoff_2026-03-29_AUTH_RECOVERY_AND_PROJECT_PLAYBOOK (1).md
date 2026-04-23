# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-29 (auth recovery runtime cutover, DB readiness applied, cooldown hotfix completed in code, production/runtime triage still open; использовать как главный handoff для нового окна ChatGPT)_

---

## 0) Что это за документ

Это большой **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в реальную product / architecture truth;
- зафиксировать, что уже закрыто и что **нельзя casually reopen-ить**;
- сохранить **рабочую доктрину** проекта и способ мышления в enterprise-режиме;
- объяснить не только **что сделано**, но и **как правильно продолжать дальше**;
- передать новый активный workstream по **auth recovery / forgot-reset** без потери контекста;
- избежать drift между кодом, документами, runtime truth и тем, что должен делать Copilot Agent.

Этот файл одновременно выполняет роли:

- master handoff;
- project brief;
- operating doctrine;
- architecture memo;
- senior-architect playbook;
- инструкция для следующего окна ChatGPT;
- карта закрытых, активных и deferred workstream-ов.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это enterprise-minded SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по факту это не “просто визитка”.

Cardigo включает или должен включать:

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

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- UX, copy и product assumptions строятся под израильский рынок;
- multi-locale пока не является продуктовой базой;
- использование `IL` как trusted default допустимо там, где это не ломает truth и контракты.

### 1.3 Критический инвариант брендов

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

Продакшн-домен Cardigo:

> **https://cardigo.co.il**

Non-www — каноническая truth.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- CSS Modules only
- token-based styling system
- Netlify hosting

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
- backend на Render-подобной схеме деплоя
- proxy gate / route-level guards
- head / SEO / DTO logic на backend truth

### 2.3 Дополнительные сервисы

- Supabase Storage
- Mailjet (почтовый провайдер)
- MongoDB Atlas / совместимый managed Mongo runtime

### 2.4 Важная operational truth

- `autoIndex: false`
- `autoCreate: false`

Это означает:

- **индексы в проде не создаются автоматически** от одной только Mongoose schema;
- все важные индексы должны жить через **migration/index governance**;
- если нужна structural гарантия, она должна быть подтверждена **реальным индексом в БД**, а не только schema metadata.

---

## 3) Роль ChatGPT и роль Copilot Agent

### 3.1 ChatGPT в этом проекте

ChatGPT в проекте должен действовать как:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**.

Это значит:

- защищать архитектурную truth;
- думать про scalability / security / performance / maintainability;
- различать product truth, runtime truth и temporary transition truth;
- минимизировать blast radius;
- не допускать scope creep;
- готовить узкие и безопасные задачи для Copilot Agent;
- требовать PROOF и RAW outputs;
- не принимать решения “на глаз”, если их можно доказать;
- поддерживать документацию и handoff truth.

### 3.2 Copilot Agent в этом проекте

Copilot Agent — **исполнитель**, а не архитектор.

Он должен:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”; 
- не лезть в соседние контуры без доказанной необходимости.

---

## 4) Жёсткая рабочая доктрина проекта

### 4.1 Канонический протокол работы

Всегда сохраняется строгий workflow:

1. **Architecture / Intent clarification**
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких реализаций до аудита.
Никаких acceptance без verification.

### 4.2 Необсуждаемые ограничения для Copilot

Во всех будущих prompts для Copilot Agent по Cardigo:

- **No git commands**
- **No inline styles**
- **CSS Modules only**
- **Flex only — no grid in styles**
- **Mobile-first mandatory**
- typography policy:
  - `font-size` только через `var(--fs-*)`
  - `--fs-*` только rem-based
  - no px/em/%/vw/vh/clamp/fluid
  - no `calc(non-rem)`

### 4.3 Важные архитектурные инварианты

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

### 4.4 Временные файлы и probe artifacts

Отдельный закон проекта:

- если Copilot создаёт `_tmp*` / probe / debug artifact,
- он обязан проверить, нужен ли он,
- и **удалить**, если он больше не нужен.

В репо нельзя оставлять временный мусор.

---

## 5) Как правильно формулировать prompts для Copilot

Правильная формула:

- ясная цель;
- ожидаемое поведение;
- ограничения;
- минимальный file surface;
- что нельзя трогать;
- Deliverable format;
- STOP после нужной фазы.

Правильный тон:

- senior;
- bounded;
- security-aware;
- regression-aware;
- без broad refactor;
- без optimistic assumptions.

---

## 6) Текущая truth по проекту (высокоуровнево)

### 6.1 Закрытые и стабилизированные контуры

Ниже — то, что в целом уже считается закрытым или не должно reopen-иться casually без отдельной причины:

- premium public pages family;
- `/cards` examples page;
- `/pricing` public pricing contour;
- blog subsystem;
- guides subsystem MVP contour;
- governance hardening cycle;
- typography app/editor remediation outside deferred card-boundary zone;
- motion framework foundation + controlled pilot usage;
- FAQ AI bounded v1;
- AI quota / shared budget direction;
- services cycle closed;
- business hours closed;
- booking backend foundation / owner incoming area / IA closed;
- services tab functional repair and UX alignment cycle closed;
- multiple docs and handoff cycles already captured in earlier master handoffs.

### 6.2 Что нельзя reopen-ить casually

Без отдельного bounded scope не надо снова лезть в:

- broad `CardLayout.module.css` cleanup;
- already closed public marketing page workstreams;
- blog subsystem reopen;
- pricing reopen;
- guides reopen;
- closed services / business hours contour;
- broad editor-shell typography rework;
- broad motion retrofits;
- old completed AI scope decisions.

---

## 7) Текущее состояние security / auth / recovery workstream

Это главный активный контур, который был в работе в этом чате и который нужно передать особенно аккуратно.

### 7.1 Что было сделано до текущей точки

Последовательность workstream-а по auth/recovery была такой:

1. **Forgot-password abuse hardening**
   - backend cooldown / anti-enumeration усиливались;
   - frontend countdown UX добавлялся;
   - fail-closed behavior усиливался.

2. **JWT session invalidation after password change/reset**
   - введён `passwordChangedAt`-based freshness check;
   - активные старые JWT после reset/change-password перестают быть валидными;
   - `requireAuth` / `requireAdmin` покрыты новым freshness logic.

3. **Malicious input / XSS / unsafe rendering audits**
   - confirm, что auth input flows не имеют P0/P1 XSS path;
   - был найден и закрыт latent `</script>` issue в JSON-LD path (`SeoHelmet.jsx`).

4. **Backend validation hygiene**
   - tightened contact/email/phone/whatsapp validation in `Card.model.js`;
   - backend/frontend drift для некоторых SEO/contact paths был устранён.

5. **headSnippets governance cleanup**
   - выяснено, что это dormant feature stub;
   - DTO leak был ограничен;
   - затем write surface был заморожен.

6. **PII/logging hardening**
   - убраны лишние email leaks из mail/log paths;
   - error middleware / Sentry privacy posture были tightened.

7. **Forgot timing-hardening design**
   - response floor;
   - decoupling from provider latency;
   - затем дизайн evolved дальше к более enterprise reset-intent / delivery-intent модели.

### 7.2 Итоговое target design, которое было выбрано

Финально была выбрана такая архитектурная truth для recovery domain:

- **one active reset record per user**;
- до `204` сохраняются:
  - durable **reset intent**;
  - durable **delivery intent**;
- usable token создаётся **worker-ом перед delivery**, а не в handler-е;
- `MailJob` хранит только **userId**, не email;
- **no plaintext reset secret at rest**;
- в первой версии **нет blind automatic retry** с новым токеном при ambiguous delivery outcome;
- transition / cleanup делаются отдельно.

### 7.3 Foundation, которое уже было внедрено

В рамках Slice 1 были добавлены и затем подтверждены:

- `ActivePasswordReset.model.js`
- `MailJob.model.js`
- migration script для индексов
- package.json script wiring

### 7.4 DB readiness, которая уже подтверждена

Migration/apply уже был выполнен и проверен.

Подтверждённые индексы:

#### activepasswordresets
- `_id_`
- `userId_1_unique` — unique
- `tokenHash_1_partial_unique` — unique partial
- `expiresAt_1`
- `status_1`
- `usedAt_1`

#### mailjobs
- `_id_`
- `userId_1`
- `status_1_expiresAt_1`
- `expiresAt_1`

То есть **DB structural prerequisites уже готовы**.

### 7.5 Joint Slice 2+3 runtime cutover, который был внедрён в код

Потом был выполнен joint runtime switch:

- `/auth/forgot` теперь пишет в:
  - `ActivePasswordReset`
  - `MailJob`
- `/auth/forgot` **больше не отправляет mail inline**;
- `resetMailWorker.js` был введён и зарегистрирован в `server.js`;
- `/auth/reset` получил **temporary dual-read fallback**:
  - сначала `ActivePasswordReset`
  - потом legacy `PasswordReset`
- `sanity-imports` был расширен.

### 7.6 Дополнительный hotfix после ручной проверки

После ручной проверки были найдены и по коду исправлены ещё 2 бага:

#### Bug 1 — frontend countdown drift
- forgot countdown жил только в `useState`
- после reload фронт врал, что можно слать снова
- hotfix: absolute `cooldownUntil` в localStorage, done/countdown restore после reload
- copy after countdown expiry стала более честной: нейтральная, а не обещающая новый email наверняка

#### Bug 2 — active APR could be silently replaced
- `active APR` suppress логика была ограничена 3-minute updatedAt window
- из-за этого старый валидный reset link мог silently invalidироваться более новым `/forgot`
- hotfix: `active APR` suppress теперь идёт **на всём remaining validity window**, без `updatedAt` gate
- pending-delivery self-heal semantics сохранены отдельно

### 7.7 Что verification подтвердил

По коду и sanity/build verification было подтверждено:

- new cutover логически собран корректно;
- cooldown semantics после hotfix соответствуют выбранному дизайну;
- no plaintext token at rest;
- worker существует и запущен через server bootstrap;
- dual-read fallback на `/auth/reset` есть;
- frontend countdown persistence есть;
- temp artifacts cleaned.

### 7.8 Но: production/runtime truth пока НЕ закрыта

Это главное.

Несмотря на code-level verification, в реальной ручной проверке surfaced проблема:

- email сейчас **не приходит**;
- пользователь сообщил, что **до рефакторинга всё работало нормально**;
- при ручной проверке **не наблюдалось новых записей** в:
  - `activepasswordresets`
  - `mailjobs`

Это критично.

#### Значение этого факта

Если не появляются новые APR/MailJob docs, значит проблема, скорее всего, **происходит до worker и до Mailjet**.

То есть на текущий момент **нельзя честно утверждать, что проблема точно в provider**.

Правильная текущая интерпретация:

- либо `/auth/forgot` выходит через один из ранних `204` branches до write-path;
- либо проверяется не та БД / не то окружение;
- либо активный runtime не тот, который предполагается;
- либо write path уходит в `intent write failed` и silently suppress-ится.

Mailjet/provider — downstream гипотеза, но **не первая** при таком симптоме.

---

## 8) Текущий незакрытый production issue по recovery flow

### 8.1 Симптом

Сейчас незакрытая truth такая:

- до рефакторинга forgot/reset работали;
- после runtime cutover и hotfix-ов ручная проверка показала, что email не приходит;
- при этом явно новых APR/MailJob docs оператор не увидел.

### 8.2 Что это НЕ доказывает

Это **не доказывает**, что root cause — Mailjet.

### 8.3 Что сейчас нужно доказать

Нужно провести **one-request operator proof** для `/auth/forgot` и определить, по какому пути он уходит:

- early silent 204 branch;
- suppression branch;
- fail-closed cooldown catch;
- write-fail catch;
- wrong DB / wrong environment;
- stale deployment / old runtime;
- либо уже потом provider layer.

### 8.4 Ключевая операторская truth

Сейчас нужно смотреть не “пришло ли письмо”, а сначала:

1. какой **HTTP status** вернулся;
2. что было в **backend logs** в момент одного контролируемого `/forgot`;
3. что было **до и после** по `APR` / `MailJob` для конкретного `userId`;
4. в какой именно **Mongo DB / runtime env** смотрит оператор.

### 8.5 Важное замечание

`findOneAndReplace({ userId }, ...)` может **заменить существующий APR in-place**, а не создать новый `_id`.

Поэтому операторская формулировка “не появляется новой записи” может быть misleading.

Нужно смотреть не только на insert intuition, а на:

- существующий APR по userId;
- `status`;
- `updatedAt`;
- `expiresAt`;
- `usedAt`;
- MailJob presence/status.

---

## 9) Текущее состояние recovery workstream — честный статус

### Что уже truth

- docs / architecture direction выбрана;
- foundation модели и индексы существуют;
- runtime code переключён;
- hotfix for countdown + cooldown applied in code;
- code-level verification passed.

### Что ЕЩЁ НЕ truth

- production/runtime recovery path не подтверждён end-to-end;
- проблема доставки/создания новых recovery records не локализована окончательно;
- workstream нельзя считать окончательно закрытым.

### Честный статус

> **Auth recovery workstream is code-advanced but runtime-unproven.**
>
> Architectural direction is accepted.
> Database primitives are applied.
> Runtime code is switched.
> But live/operator truth is still open and needs branch-level diagnosis.

---

## 10) Что должен сделать следующий чат первым делом

### Не делать сразу

Следующий чат **не должен сразу писать новый код** и **не должен сразу винить Mailjet**.

### Правильный первый шаг

Следующий чат должен сделать **узкий runtime/operator diagnosis** на одну контролируемую попытку `/forgot`.

### Цель

Определить точно:

- достигает ли `/auth/forgot` durable write path вообще;
- в какой environment/DB пишет runtime;
- какой именно ранний branch или catch-path срабатывает;
- нужен ли code fix, env fix, provider fix или operator fix.

---

## 11) Правильный следующий порядок действий

### Шаг 1 — One-request operator proof

Нужен один контролируемый `/forgot` запрос по точно существующему пользователю.

Перед запросом:

- определить `userId` в **той БД, куда реально подключён backend**;
- сделать snapshot:
  - APR по `userId`
  - MailJob по `userId`
  - relevant backend logs tail

После **одного** `/forgot`:

- посмотреть response status;
- посмотреть backend logs;
- снова посмотреть APR / MailJob по этому `userId`;
- сравнить изменение `status/updatedAt/expiresAt`, а не только “появилась ли новая строка”.

### Шаг 2 — Разделить три класса причин

После этого следующий чат должен быстро отличить:

1. **wrong DB / wrong environment**
2. **early-return / suppress / catch branch**
3. **write path reached but downstream delivery/provider issue**

### Шаг 3 — Только после этого принимать решение

Только после доказанного branch-а решать:

- нужен ли ещё один backend hotfix;
- нужен ли env fix;
- нужен ли Mailjet/provider intervention;
- или проблема вообще в operator observation / wrong DB.

---

## 12) Что должен делать следующий чат как Senior Architect

Следующий чат должен:

- не паниковать;
- не переписывать recovery flow заново;
- не плодить новые workstream-ы до branch proof;
- жёстко отделять:
  - code truth,
  - DB truth,
  - runtime truth,
  - operator observation,
  - provider truth.

Формула следующего чата:

> **Сначала доказать, где именно обрывается `/auth/forgot`, и только потом менять код или инфраструктуру.**

---

## 13) Что уже можно считать константами для нового чата

Новый чат может считать константами:

- ChatGPT = senior architect;
- Copilot = executor;
- работать только фазами;
- no git;
- no inline styles;
- CSS Modules only;
- Flex only;
- Mobile-first;
- verification обязательна;
- temp files must be cleaned;
- brand separation Cardigo vs Digitalyty must remain;
- DB readiness for APR/MailJob indexes already exists;
- runtime auth recovery code switched, but live truth still open.

---

## 14) Практическая заготовка для следующего окна ChatGPT

Новый чат должен стартовать примерно с такой мысли:

- проект большой, зрелый и уже имеет множество закрытых bounded контуров;
- текущий незакрытый high-priority issue — **runtime diagnosis of `/auth/forgot`** after auth recovery cutover;
- не надо reopen-ить старые закрытые страницы/SEO/typography/services/booking scopes;
- нужно добить recovery runtime truth аккуратно и доказательно.

---

## 15) Краткий список того, что уже было особенно важно в этом чате

Чтобы новый чат не потерял главное:

- target design для password reset был существенно переработан до enterprise-модели;
- foundation models и DB indexes уже созданы и применены;
- worker-driven token generation выбран сознательно, чтобы не хранить raw token at rest;
- dual-read fallback на `/auth/reset` есть и должен оставаться временно;
- countdown drift и active APR cooldown flaw уже hotfixed в коде;
- но live truth ещё не доказана;
- последнее правильное действие перед новыми правками — **one-request runtime proof**.

---

## 16) Final guidance

Если новый чат хочет “работать правильно”, он должен помнить:

- не путать успешную code verification с successful production truth;
- не путать provider failure с pre-write handler exit;
- не путать “нет новой записи” с “не было write”, пока не проверен in-place replace;
- не расширять scope без необходимости;
- не делать broad refactor там, где нужен branch-level proof;
- мыслить как senior architect, а не как eager patcher.

Главная установка для следующего окна:

> **Думай enterprise-уровнем. Сначала доказательство branch truth. Потом — минимальный fix ровно в нужной точке.**

---

## 17) Что ещё проект должен включать дальше (roadmap верхнего уровня)

Не как immediate task, а как стратегическая рамка:

- дальнейшее hardening auth / registration / token flows;
- production-grade monitoring / alerting around critical auth/recovery paths;
- cleanup legacy recovery fallback после подтверждённого окна;
- continued CI/CD maturity;
- performance / stress / security testing;
- deeper operator runbooks;
- future booking/product hardening;
- team-readable documentation and onboarding truth.

Но **сейчас** immediate next step — не roadmap, а **операционно доказать `/forgot` runtime path**.

---

## 18) Итог одним абзацем

Cardigo — зрелый Israel-first SaaS для digital business cards с широкой product surface и жёсткой enterprise-доктриной работы. Большая часть проекта уже имеет устойчивую truth и множество закрытых bounded контуров. В этом чате была проведена серьёзная переработка auth recovery architecture: введены новые модели, индексы, worker-driven delivery, временный dual-read fallback, а также hotfix для countdown persistence и active APR suppression semantics. Кодовая и DB readiness уже достигнуты, но production/runtime truth recovery path пока не закрыта: нужно доказать, достигает ли `/auth/forgot` durable write path в реальной среде и по какому branch-у он уходит. Следующий чат должен работать как senior architect: не переписывать вслепую, не винить провайдера раньше времени, а провести один строгий операторский proof и только после этого принимать следующий bounded engineering decision.
