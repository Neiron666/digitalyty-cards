
# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-29 (auth recovery runtime truth proved operational; reset validation/error truth fixed and documented; использовать как главный handoff для нового окна ChatGPT)_

---

## 0) Что это за документ

Это большой **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в реальную product / architecture truth;
- сохранить **рабочую доктрину** проекта и способ мышления в enterprise-режиме;
- передать не только **что сделано**, но и **как правильно продолжать дальше**;
- зафиксировать **закрытые**, **активные** и **deferred** workstream-ы;
- удержать новый чат от scope creep, broad refactor и решений “на глаз”;
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить роль Copilot Agent как **исполнителя**, а не архитектора;
- дать готовую стартовую базу для следующего bounded workstream.

Этот файл одновременно выполняет роли:

- master handoff;
- project brief;
- operating doctrine;
- architecture memo;
- senior-architect playbook;
- инструкция для следующего окна ChatGPT;
- сводка текущей truth по проекту;
- тактическая инструкция по работе с Copilot Agent.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это enterprise-minded SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по факту это не “просто визитка”.

Cardigo уже включает или должен включать:

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

- индексы в проде не создаются автоматически от одной только Mongoose schema;
- все важные индексы должны жить через **manual index governance**;
- production-структурную truth нужно подтверждать **реальными индексами в БД**, а не только schema metadata.

---

## 3) Роль ChatGPT и роль Copilot Agent

### 3.1 ChatGPT в этом проекте

ChatGPT в проекте должен действовать как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

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

### 3.2 Дополнительные обязанности ChatGPT

Как senior architect / full-stack / enterprise consultant, ChatGPT в этом проекте также отвечает за:

- архитектурное проектирование и оптимизацию под рост, производительность и безопасность;
- технический консалтинг по frontend / backend / API / storage / deployment;
- security-minded code review;
- guidance по secure mechanisms:
  - password gates,
  - CSRF / XSS / injection defenses,
  - защита данных,
  - auth / token flow hardening;
- guidance по CI/CD, тестам, deploy discipline, monitoring и alerts;
- поддержание docs / runbooks / README / handoff truth;
- помощь в выборе safest path, а не fastest hack.

### 3.3 Copilot Agent в этом проекте

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

### 4.3 Рабочие правила

- без scope creep;
- без “заодно поправил”;
- всегда требовать `PROOF file:line-range`;
- для smoke и ручных проверок использовать **PowerShell + `curl.exe`**;
- не давать изменения без предварительного audit;
- не принимать решения по границам контуров “на глаз” — сначала доказать boundary;
- не давать Copilot точные line numbers как инструкцию на изменение;
- temp `_tmp*` / probe artifacts должны удаляться, если больше не нужны;
- verification важнее уверенного тона.

### 4.4 Практический стандарт постановки задач Copilot

Каждая хорошая задача для Copilot должна содержать:

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

## 5) Важные архитектурные инварианты

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

### 5.1 Frontend / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary — разные контуры, их нельзя смешивать “по чувству”.

### 5.2 Typography law

Typography policy — корпоративный закон:

- `font-size` только через `var(--fs-*)`;
- `--fs-*` только rem-only;
- нельзя `px`, `em`, `%`, `vw`, `vh`, `clamp`, fluid formulas;
- нельзя `calc(non-rem)`;
- responsive typography только через token overrides и rem breakpoints;
- нельзя придумывать новые typography tokens ad hoc.

### 5.3 High-blast-radius зоны

Без отдельного bounded workstream не трогать casually:

- `CardLayout.module.css`
- CardLayout DOM skeleton
- card-boundary typography
- shared render chain
- templates registry
- shared public styling primitives

---

## 6) Что проект уже включает сегодня

### 6.1 Public / marketing / discoverability

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

### 6.2 Editing / admin / product

- editor for digital cards;
- premium/admin/org surfaces;
- blog admin CRUD;
- guides admin CRUD;
- analytics/admin related surfaces;
- owner inbox / booking owner-facing surface.

### 6.3 Content / SEO / structured data

- route-level `SeoHelmet`;
- FAQPage JSON-LD;
- Article / Blog-like detail structured data;
- deterministic SEO logic;
- OG metadata generation;
- sitemap generation;
- structured-data assist flows.

### 6.4 Media

- hero image upload;
- section image upload;
- image canonicalization;
- Supabase storage;
- deletion cleanup lifecycle;
- save-first helper UX in admin.

### 6.5 AI / growth

- About AI;
- FAQ AI;
- SEO AI;
- quota governance;
- premium surface expansion logic.

### 6.6 Operational / business layers

- services;
- business hours;
- booking kernel foundation;
- booking public/owner contour v1.

---

## 7) Что уже закрыто и не должно casually reopen-иться

Ниже — то, что в целом уже считается закрытым или не должно reopen-иться casually без отдельной причины:

- premium public pages family;
- `/cards` examples page;
- `/pricing` public pricing contour;
- `/contact` public page;
- blog subsystem;
- guides subsystem MVP contour;
- governance hardening cycle;
- typography app/editor remediation outside deferred card-boundary zone;
- motion framework foundation + controlled usage;
- FAQ AI bounded v1;
- AI quota / shared budget direction;
- services cycle closed;
- business hours closed;
- booking backend foundation / owner incoming area / IA closed;
- services tab functional repair and UX alignment cycle closed;
- reset validation / error truth fix (текущий цикл);
- docs truth for reset flow updated.

### Что нельзя reopen-ить casually

Без отдельного bounded scope не надо снова лезть в:

- broad `CardLayout.module.css` cleanup;
- already closed public marketing page workstreams;
- blog subsystem reopen;
- pricing reopen;
- guides reopen;
- closed services / business hours contour;
- broad editor-shell typography rework;
- broad motion retrofits;
- old completed AI scope decisions;
- forgot/mail/worker architecture без нового доказанного инцидента.

---

## 8) Самое важное из текущего цикла — auth recovery и reset truth

### 8.1 Какой был исходный инцидент

После auth recovery refactor возникло подозрение, что forgot/reset flow сломан:

- до рефакторинга reset flow работал;
- после refactor письма не приходили;
- оператор не видел новых записей в `activepasswordresets` и `mailjobs`.

Изначально правильная реакция была не винить Mailjet, а доказать runtime truth через:

- HTTP status;
- backend logs;
- APR before/after;
- MailJob before/after;
- проверку правильной БД / runtime.

### 8.2 Архитектурная truth recovery design

В recovery domain была выбрана зрелая модель:

- **one active reset record per user**;
- до `204` сохраняются:
  - durable **reset intent**;
  - durable **delivery intent**;
- usable token создаётся **worker-ом перед delivery**, а не в handler-е;
- `MailJob` хранит только **userId**, не email;
- **no plaintext reset secret at rest**;
- нет blind automatic retry с новым токеном при ambiguous delivery outcome;
- temporary dual-read fallback на `/auth/reset` для legacy compatibility.

### 8.3 Что уже было внедрено

- `ActivePasswordReset.model.js`
- `MailJob.model.js`
- migration/index governance для APR/MailJob
- runtime cutover на новые сущности
- worker registration
- cooldown/countdown hotfixes

### 8.4 Что в итоге доказала живая БД

В этом окне реальная БД truth показала:

- `mailjobs.status = "sent"` и `attempts = 1`
- `activepasswordresets.status = "used"`
- `usedAt` заполнен

Это означает:

- durable write stage был достигнут;
- worker и delivery path отработали;
- reset token был реально использован;
- forgot/mail/worker path в целом operational.

То есть большой runtime-инцидент с hypothesis “не доходит до write stage” **не остался главным активным багом**.

---

## 9) Новый локальный баг, который surfaced и был закрыт

### 9.1 Симптом

Когда пользователь открывал reset-link и вводил слишком короткий пароль вроде `123`, система показывала generic message:

> `לא ניתן לאפס סיסמה. בקשו קישור חדש.`

вместо точной валидационной ошибки.

### 9.2 Почему это было опасно

Это было важно сразу по нескольким причинам:

- UX truth: система врала пользователю о причине проблемы;
- support load: пользователь не понимал, что именно надо исправить;
- был риск, что token может сгорать раньше времени.

### 9.3 Что сначала нужно было доказать

Сначала нужно было доказать две вещи:

1. где именно short-password ошибка превращается в generic link-invalid message;
2. сгорает ли token/APR на short-password failure или нет.

### 9.4 Что audit доказал

Audit показал:

- backend short-password validation срабатывает **до consume token**;
- token **не сгорает** на weak-password validation failure;
- проблема была в **error mapping truth**:
  - backend возвращал слишком общий ответ;
  - frontend flat-catch сваливал разные reset errors в одно generic message.

### 9.5 Какой bounded fix был принят

Был принят узкий fix surface:

- backend `/auth/reset` получил различимый код `WEAK_PASSWORD` для short-password case;
- frontend `ResetPassword.jsx` стал различать:
  - `WEAK_PASSWORD`
  - generic invalid/expired/used token case
- дополнительно клиентский guard на длину пароля остался как UX-слой;
- broader forgot/mail/worker architecture **не reopen-илась**.

### 9.6 Как это было проверено

Реально подтверждено:

- при пароле `123` пользователь получает точное сообщение о минимальной длине;
- после short-password failure reset-link **не сгорает**;
- повторный заход по той же ссылке продолжает работать;
- good password path остался рабочим.

### 9.7 Маленький follow-up tail, который тоже был закрыт

После этого был найден ещё один UX tail:

- `429 /reset` всё ещё маппился в слишком общий текст про “запросите новую ссылку”.

Audit показал, что backend уже даёт код `RATE_LIMITED`, и никакой backend fix не нужен.  
Был принят ещё один **micro-fix** в одном файле (`ResetPassword.jsx`):

- `WEAK_PASSWORD` → точное сообщение про минимальную длину;
- `RATE_LIMITED` → точное retry-later message;
- else → generic request-new-link message.

Итоговая reset UI truth теперь такая:

- **WEAK_PASSWORD** → точный min-length message
- **RATE_LIMITED** → точный retry-later message
- **generic request-new-link** → invalid / expired / used token cases

### 9.8 Что обновлено в документации

Truth по reset flow была занесена в docs:

- `api-security.md`
- `auth-forgot-reset-runbook.md`

Там зафиксировано, что:

- weak-password attempt **не consume-ит token**;
- `WEAK_PASSWORD` и `RATE_LIMITED` различаются;
- generic link-invalid message остаётся только для соответствующих token-invalid cases.

---

## 10) Важные тактические уроки из этого окна

### 10.1 Не спорить с БД и runtime truth

Сначала recovery incident выглядел как проблема write path.  
Но потом живая БД показала, что:

- MailJob sent
- APR used

То есть реальная truth была уже другой.  
Главный урок:

> **Не продолжать архитектурную гипотезу, когда БД уже дала более сильный факт.**

### 10.2 Не винить provider раньше времени

Mailjet нельзя считать root cause, пока не доказано, что flow дошёл до write stage.  
Это правило остаётся константой и на будущее.

### 10.3 Даже правильный fix нельзя пропихивать с нарушением фаз

Copilot один раз нарушил phase discipline и самовольно пошёл из audit в fix без approval.  
Хотя fix оказался по сути правильным, это **не должно стать новой нормой**.

### 10.4 Секреты не должны попадать в docs/handoff

В этом окне было допущено нежелательное попадание proxy secret в вывод Copilot.  
Это не должно отражаться в project docs.  
Если секрет когда-либо был засвечен в чате/логах/выводе, это **операционное**, а не документируемое действие.

### 10.5 Иногда правильный fix — это один `else if`

Не каждый баг требует architecture reopen.  
Иногда зрелое решение — это:

- сначала доказать точку проблемы;
- потом поменять один branch в одном файле;
- и не трогать остальную систему.

---

## 11) Что остаётся сделать дальше

Это не immediate emergency, а нормальная next-step рамка.

### 11.1 Auth / security / ops

Логичные следующие направления:

- дальнейший hardening auth / registration / token flows;
- API error handling;
- monitoring / alerts / CI discipline;
- production readiness and observability;
- deeper operator runbooks.

### 11.2 Product / business

- booking follow-up bounded workstreams;
- дальнейшее развитие admin / analytics maturity;
- более живое наполнение guides/blog;
- product clarity around premium/admin/org surfaces.

### 11.3 Documentation / truth maintenance

- держать handoff truth synced;
- не накапливать stale docs;
- обновлять docs только после meaningful and verified changes;
- не размазывать архитектурную truth по историческим handoff-файлам.

### 11.4 Что проект ещё должен включать в будущем

Как enterprise guidance:

- billing clarity;
- premium entitlements;
- org/admin maturity;
- monitoring/alerts;
- security hardening;
- performance readiness;
- stress testing;
- better ops/runbooks;
- clearer support/debug documentation;
- bounded, truth-aligned AI growth;
- product clarity around what is AI-assisted and what is deterministic.

---

## 12) Практическая формула для следующего окна

Если переносишь проект в новое окно ChatGPT, ключевая установка должна быть такой:

- **ChatGPT — архитектор**
- **Copilot — исполнитель**
- **думать enterprise-grade**
- **держать SSoT, инварианты и blast radius в голове**
- **не делать broad cleanup**
- **резать scope**
- **уважать protocol**
- **не жертвовать архитектурой ради скорости**

---

## 13) Готовый стартовый блок для нового окна ChatGPT

Скопируй-вставь это в начало нового окна:

> Ты — Senior Project Architect / Senior Full-Stack / Enterprise Consultant для Cardigo.  
> Мы работаем enterprise-grade. Copilot — исполнитель.  
> Работаем строго фазами: Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP; Phase 2 Minimal Fix (1–3 файла, без рефакторинга/форматирования, backward compatible) → STOP; Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP.  
> Ограничения Copilot: No git commands. No inline styles. CSS Modules only. Flex only — no grid in styles. Mobile-first mandatory. Typography policy: font-size только через var(--fs-*), --fs-* rem-only, без px/em/%/vw/vh/clamp/fluid и calc(non-rem).  
> Инварианты: SSoT render chain public+preview; templates registry только frontend/src/templates/templates.config.js; skins token-only; preview-only стили только [data-preview="phone"]; CardLayout DOM skeleton не менять; public/QR/OG только из backend DTO publicPath/ogPath; org security anti-enumeration 404 и membership-gate до SEO; sitemap без N+1; backend index governance autoIndex off, drift via sanity, manual index scripts only.  
> Cardigo — Israel-first / Israel-only. Cardigo и Digitalyty не смешивать.  
> Закрытые bounded contours без причины не reopen-ить: pricing, contact, cards, blog, guides, services, business hours, booking foundation, broad card-boundary typography.  
> Последний закрытый workstream: auth recovery runtime truth operational; reset validation/error truth fixed and documented. Weak-password does not consume token. UI now distinguishes WEAK_PASSWORD / RATE_LIMITED / generic invalid-link cases.  
> Тактическое правило: сначала доказать runtime/code truth, потом минимальный fix, потом verification, потом docs.  
> Сейчас задача: <вставь текущую bounded задачу>.

---

## 14) Краткий список durable truth / docs, где живёт правда

### Governance / hardening cycle

- `docs/governance-hardening-cycle-2026-03.md`

### Frontend / styling / typography governance

- `frontend.instructions.md`
- `docs/policies/frontend-markup-styling.md`
- `docs/typography-ssot.md`
- `docs/policies/typography-mobile-first.md`
- `docs/cards-styling-architecture.md`

### Security / auth / consent-related truth

- `api-security.md`
- `auth-registration-consent.md`
- `auth-signup-token-runbook.md`
- `auth-forgot-reset-runbook.md`

### Blog / SEO / OG

- `docs_blog_seo_og_runbook.md`

### General ops / registry truth

- `README.md`

### Booking canonical docs

- `docs/bookings-inbox-architecture.md`
- `bookings-indexes-ops.md`

---

## 15) Что нельзя делать

Нельзя:

- быстро чинить без audit;
- смешивать boundaries;
- ломать архитектуру ради скорости;
- позволять Copilot делать “заодно поправил”;
- возвращать inline styles / grid / invented typography tokens;
- трогать `CardLayout` casually;
- придумывать новые `--fs-*` names;
- документировать stale truth как current truth;
- делать broad cleanup “ради чистоты” без реального business / UX / ops обоснования;
- переоткрывать закрытые `/pricing`, `/cards`, `/contact`, blog subsystem или governance-closed steps без сильной причины;
- смешивать архитектурную truth, ops truth и temporary incident notes в один хаотичный документ.

---

## 16) Финальное напутствие

Проект зрелый.  
Это не место для «быстренько что-то подправить».

Правильный подход здесь:

- не спешить;
- не расползаться по scope;
- не смешивать архитектурные уровни;
- не ломать boundaries ради удобства;
- всегда сначала доказывать;
- потом чинить минимально;
- потом проверять;
- потом документировать.

### Главное правило проекта

Не искать самый быстрый путь.  
Искать самый безопасный, зрелый и enterprise-правильный путь.

### Главное правило роли ChatGPT

ChatGPT здесь не «просто помощник по коду».  
ChatGPT здесь — **архитектор проекта**, который защищает:

- систему;
- продуктовую правду;
- техническую правду;
- границы;
- качество решений;
- долгосрочную поддерживаемость.

### Итоговая выжимка в одном абзаце

Cardigo — зрелый Israel-first SaaS для digital business cards с широкой product surface и жёсткой enterprise-доктриной. Проект уже имеет множество закрытых bounded контуров: premium public pages, blog/guides, governance, services, business hours, booking foundation, AI workstreams. В этом окне была окончательно доказана operational truth recovery path, а затем закрыт reset validation/error truth workstream: weak-password больше не сжигает token, UI различает weak-password, rate-limit и invalid-link cases, docs truth обновлена. Следующий чат должен продолжать работать как senior architect: не переписывать вслепую, не расширять scope, сначала доказывать runtime/code truth, потом делать минимальный fix, потом verification и только потом документацию.
