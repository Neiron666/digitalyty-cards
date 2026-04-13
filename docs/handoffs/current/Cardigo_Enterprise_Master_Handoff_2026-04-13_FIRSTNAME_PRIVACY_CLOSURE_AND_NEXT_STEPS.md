# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-13_

---

## 0) Что это за документ

Это новый **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Цель документа:

- быстро ввести новый чат в **реальную проектную truth**;
- передать не только факты, но и **правильную тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, drift и решений “на глаз”; 
- сохранить закрытые контуры закрытыми;
- зафиксировать, **что уже завершено**, **что intentionally deferred**, и **какой bounded workstream логично брать следующим**;
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**, а Copilot Agent — как **исполнителя**, а не архитектора.

Этот документ должен восприниматься как:

- главный handoff;
- next-chat playbook;
- doctrine-файл проекта;
- architecture memo;
- operational truth;
- tactical guide;
- anti-drift bootstrap;
- статусный срез проекта;
- инструкция по правильной совместной работе с Copilot.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo — давно уже не “просто цифровая визитка”.

Текущая зрелая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

Проект уже включает или должен включать:

- digital business card;
- public card surface;
- mini business page;
- lead/contact surface;
- WhatsApp / phone / social / QR entry points;
- self-service editing;
- analytics layer;
- structured data / SEO layer;
- premium surface;
- organization / team surface;
- admin surface;
- AI-assisted content surfaces;
- services / business-hours contour;
- booking foundation;
- discoverability stack;
- blog / guides public content surfaces;
- premium public marketing surfaces;
- privacy / consent-aware tracking governance;
- mature admin/operator tooling.

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- иврит / RTL — product default;
- продуктовые решения строятся под израильский рынок;
- `IL` допустим как trusted default там, где это не ломает contracts;
- Cardigo и Digitalyty нельзя смешивать в canonical / SEO / public paths / naming / product logic.

### 1.3 Брендовая граница

Это критично:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / контекст;
- их нельзя смешивать в:
  - canonical,
  - SEO,
  - public URLs,
  - structured data,
  - product wording,
  - user-facing copy,
  - analytics audiences,
  - naming.

Канонический production domain:

> **https://cardigo.co.il**

non-www, canonical truth.

---

## 2) Как ChatGPT должен работать в этом проекте

### 2.1 Роль ChatGPT

В этом проекте ChatGPT должен работать как:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**;
- человек, который защищает:
  - architecture truth,
  - SSoT,
  - contracts,
  - invariants,
  - boundaries,
  - security,
  - scalability,
  - maintainability,
  - performance,
  - минимальный blast radius.

### 2.2 Роль Copilot

Copilot Agent — **исполнитель**, а не архитектор.

Его задача:

- читать,
- доказывать,
- вносить минимальные изменения,
- показывать PROOF,
- показывать RAW verification,
- не принимать архитектурные решения “по ощущению”.

### 2.3 Канонический workflow

Всегда работать по формуле:

> **Architecture → Audit → Minimal Fix → Verification → Documentation**

### 2.4 Канонические фазы для Copilot

#### Phase 1 — Read-Only Audit

- только чтение;
- только PROOF `file:line-range`;
- никаких правок;
- после audit — STOP.

#### Phase 2 — Minimal Fix

- минимальная поверхность;
- без broad refactor;
- без форматирования “заодно”; 
- обычно 1–3 файла, иногда больше, если контур реально требует;
- после fix — STOP.

#### Phase 3 — Verification

- RAW stdout;
- gates / sanity / build / smoke;
- manual smoke через PowerShell + `curl.exe`, когда релевантно;
- после verification — STOP.

### 2.5 Жёсткие ограничения для каждого будущего Copilot prompt

Во всех будущих задачах сохранять:

- **PROJECT MODE: Cardigo enterprise workflow**
- **No git commands**
- **No inline styles**
- **CSS Modules only**
- **Flex only — no grid**
- **Mobile-first mandatory**
- Typography policy:
  - `font-size only via var(--fs-*)`
  - `--fs-* rem-only`
  - `no px/em/%/vw/vh/clamp/fluid`
  - `no calc(non-rem)`

### 2.6 Тактика работы

Нельзя:

- принимать решения по boundary “на глаз”; 
- смешивать несколько contour-ов без явного решения;
- делать “пока я тут, я ещё поправил…”;
- отдавать большие решения без audit;
- верить summary без proof;
- закрывать задачи с оставшимися хвостами, если хвост маленький и bounded.

Нужно:

- сначала доказать текущую truth;
- потом утвердить bounded plan;
- идти по одной задаче за раз;
- не переключаться, пока текущая не закрыта;
- после каждого контура фиксировать, что именно closed;
- сохранять anti-drift мышление.

---

## 3) Ключевые архитектурные инварианты проекта

### 3.1 SSoT / render chain

- shared render chain public + preview должен сохраняться;
- preview-only styles только под `[data-preview="phone"]`;
- `CardLayout DOM skeleton` — high blast radius, не трогать casually;
- templates registry только в:
  - `frontend/src/templates/templates.config.js`

### 3.2 Styling / token law

- CSS Modules only;
- no inline styles;
- flex only;
- no grid;
- typography через approved tokens;
- не invent-ить новые token names ad hoc;
- не leak-ить card-scope tokens в app/public/auth/admin/site-shell.

### 3.3 URL / SEO / public truth

- canonical domain: `https://cardigo.co.il`
- public / QR / OG URLs строить только из backend DTO (`publicPath`, `ogPath`)
- Digitalyty не смешивать с Cardigo в canonical / SEO / structured data / public logic

### 3.4 Security / org truth

- anti-enumeration сохранять;
- membership-gate должен оставаться раньше SEO/410-related behavior там, где это заложено;
- manual Mongo index governance сохраняется;
- `autoIndex` / `autoCreate` — off;
- index changes — через scripts + sanity / proof.

### 3.5 Auth/platform truth

- cookie-backed auth truth нельзя casually reopen-ить;
- auth/runtime contracts не менять без очень явного bounded contour;
- localStorage/Bearer legacy history известна, но не смешивать в unrelated tasks.

---

## 4) Текущий стек и инфраструктура

### 4.1 Frontend

- React
- Vite
- CSS Modules
- RTL-first
- route-level SEO/head handling
- self-service editor
- public pages + auth pages + admin + card rendering

### 4.2 Backend

- Node.js
- Express
- MongoDB / Mongoose
- Mailjet for email
- manual index governance

### 4.3 Infra

- Frontend: Netlify-like hosting
- Backend: Render-like hosting
- Storage: Supabase-like object storage for media
- Email: Mailjet
- DB: managed Mongo cluster

### 4.4 Runtime DB truth

Текущая truth, которую нельзя терять:

- old data intentionally not migrated;
- новый clean production-shaped cluster adopted as baseline;
- target DB: `cardigo_prod`;
- old cluster retained only as rollback/reference;
- Render backend уже переключён на новый cluster;
- critical collections/index bootstrap уже делались и закрывались отдельными контурами.

---

## 5) Что уже закрыто до этого окна

Ниже — ключевые закрытые контуры, которые нельзя casually reopen-ить.

### 5.1 Public / marketing / SEO surfaces

Закрыты:

- `/cards` как premium public marketing/examples surface;
- `/pricing` как premium public pricing surface;
- blog subsystem;
- guides subsystem;
- legal/public shell;
- `SeoHelmet` / canonical / image / structured data bounded fixes;
- runtime sitemap / discoverability-related bounded work;
- accessibility contour (skip-link, focus trap, modal hygiene).

### 5.2 Services / business hours / booking foundation

Закрыты и зафиксированы:

- `content.services` contour;
- business hours as operational config;
- booking entity + statuses + slot blocking semantics;
- public booking UX hardening;
- owner inbox / booking count / pending count contour.

### 5.3 Auth / reset / recovery

Закрыты:

- reset flow rework;
- worker-based delivery path;
- active-password-reset / mail-job truth;
- invalid token / weak password / rate-limited UX mapping;
- corresponding runbooks.

### 5.4 Site analytics / tracking foundation

Закрыты:

- site analytics ingest unblock through proxy;
- normalized source attribution;
- visit-level analytics model;
- GTM base container foundation;
- privacy-aware Meta base setup;
- consent signaling base contour.

### 5.5 Trial / free / premium contour

До этого окна уже были закрыты:

- base trial lifecycle;
- expiry / retention / purge truth;
- trial-aware filtering / billing normalize contour;
- reminder job foundation,
- unsubscribe architecture,
- production gate through `TRIAL_REMINDER_ENABLED=false`.

---

## 6) Что закрыто именно в этом окне

Это главный свежий контур этого чата.

# firstName contour — FULLY CLOSED

Ниже — уже **закрытая end-to-end truth**.

### 6.1 Backend foundation

Закрыто:

- `User.firstName` добавлен как canonical flat nullable field;
- `trim: true`, `default: null`;
- **не** `required: true` на schema-level;
- required enforcement вынесен в input-validation layer.

### 6.2 New-account creation paths

`firstName` теперь обязателен на всех **new-account creation surfaces**:

- `/api/auth/register`
- `/api/auth/signup-consume`
- `/api/invites/accept` — только new-user branch

Смысл:

- регистрация,
- magic-link consume,
- invite-accept new-user path

теперь дают консистентную truth по имени пользователя.

### 6.3 Frontend account-creation surfaces

Закрыто:

- `Register.jsx`
- `SignupConsume.jsx`
- `InviteAccept.jsx`
- `auth.service.js`

Что важно:

- `Register` получил firstName как полноценный validated field;
- `SignupConsume` сохранил single-error-string pattern;
- `InviteAccept` existing-user branch остался zero-touch;
- CSS drift не появился;
- marketing-consent logic не была поломана.

### 6.4 Settings/account edit surface

Закрыто:

- `PATCH /api/account/name` backend contract;
- `GET /api/account/me` возвращает `firstName`;
- `account.service.js` helper добавлен;
- имя редактируется в **правильном месте внутри существующего settings/account surface**, а не отдельным profile screen;
- settings hierarchy не была сломана.

Это важная product/architecture truth:

> firstName edit живёт в правильной account/settings зоне внутри `/edit/.../settings`, а не как случайный внеплановый профильный экран.

### 6.5 Reminder email personalization

Закрыто:

- premium-trial reminder email теперь может персонализироваться по `firstName`;
- `trialReminderJob.js` выбирает `firstName`;
- mail helper принимает optional `firstName`;
- есть **null-safe fallback**:
  - если имя есть → `שלום, {firstName},`
  - если имени нет / null / empty → `שלום,`
- greeting для HTML path теперь **escaped**, то есть output-safety tail закрыт.

### 6.6 Reminder manual smoke truth

В этом окне был сделан ручной local smoke reminder/unsubscribe contour.

Результат по фактам:

- локально reminder sweep отработал успешно;
- candidate попал в окно 20–32h;
- email был отправлен;
- unsubscribe URL был сгенерирован;
- переход по unsubscribe link отработал успешно;
- `emailMarketingConsent` стал `false`;
- `emailMarketingConsentSource` стал `unsubscribe_link`;
- token получил `usedAt`;
- `marketingoptouts` документ был создан;
- повторное открытие unsubscribe link дало корректный invalid/expired/used state;
- после smoke env был возвращён назад.

Это очень важная operational truth:

> **TRIAL_REMINDER_ENABLED был временно включён только для локального smoke и после этого возвращён обратно.**

### 6.7 Public privacy truth

Закрыто:

- `Privacy.jsx` обновлён;
- `Section 2.1` теперь честно говорит, что `firstName` собирается при создании аккаунта как обязательное поле;
- описано, что имя используется для account management + personalized relevant service communication;
- добавлен disclosure про consent-gated reminder/lifecycle communication;
- unsubscribe truth сохранена;
- public “last updated” дата обновлена.

### 6.8 Consent versioning

Закрыто:

- `CURRENT_PRIVACY_VERSION` bumped до:

> `2026-04-13`

И это синхронно с privacy text update.

### 6.9 Internal runbook truth

Закрыто:

- `auth-registration-consent.md` приведён в соответствие с `firstName-required` truth;
- stale smoke payloads исправлены;
- doc больше не врет относительно runtime.

### 6.10 Final documentation closure

Закрыто:

- master handoff / current playbook был дополнен truth про firstName contour;
- `trial-lifecycle-ssot.md` теперь отражает:
  - firstName personalization,
  - null-safe fallback,
  - smoke checklist для personalization/fallback.

Итог:

> **firstName contour fully closed**

без незакрытых хвостов.

---

## 7) Текущий truth по reminder / consent / rollout

### 7.1 Reminder contour

Reminder contour сейчас:

- реализован;
- consent-gated;
- suppression-aware;
- tokenized unsubscribe работает;
- personalization по firstName есть;
- null-safe fallback есть;
- HTML escaping есть;
- runbooks и privacy truth приведены в соответствие.

### 7.2 Production rollout gate

Главная runtime truth:

> **`TRIAL_REMINDER_ENABLED=false` должен оставаться default production truth, пока не будет отдельного операторского решения включить отправку.**

То есть reminder contour технически готов, но операционное включение — отдельное conscious decision.

---

## 8) Что intentionally deferred и не надо смешивать casually

Ниже — вещи, которые не надо внезапно открывать в unrelated task.

### 8.1 Broader auth/platform modernization

Отдельно существует исторический contour:

- migration away from old token-storage patterns;
- cookie/CSRF/CORS-related broader hardening;
- auth modernization.

Это не смешивать случайно.

### 8.2 Broad performance/monitoring/CI work

Нужно, но отдельно:

- CI/CD hardening;
- monitoring/alerts;
- broader load/security/stress testing;
- production readiness beyond bounded current contours.

### 8.3 Broader privacy/policy rewrite

Не делать broad legal rewrite casually. Privacy truth надо править только bounded и честно.

### 8.4 Admin/CRM/identity expansion

Не смешивать сюда:

- lastName/fullName contour;
- avatar/profile contour;
- admin-visible user profile expansion;
- CRM/drip/newsletter contour;
- broad profile system.

### 8.5 Broad trial anti-abuse solution

Следующий логичный workstream уже обсуждался, но **не реализован**:

- anti-abuse / identity binding для trial,
- чтобы нельзя было бесконечно брать новый premium trial через новые email.

Это нужно делать как отдельный workstream.

---

## 9) Следующий логичный workstream

# Trial anti-abuse / identity binding contour

### 9.1 Проблема

Сейчас пользователь теоретически может:

- брать новый trial,
- создавать новый аккаунт на новый email,
- снова получать premium contour,
- и повторять это каждые 10 дней.

Сеньорская truth тут простая:

> **Нельзя завязывать trial eligibility только на email.**

Email — слишком дешёвый идентификатор.

### 9.2 Лучшее зрелое направление

Самый разумный следующий шаг для Cardigo:

> **one trial per verified phone**

То есть:

- аккаунт можно создавать как сейчас;
- но trial активируется только после phone verification;
- один телефон = один trial.

### 9.3 Почему это лучший порядок

Потому что:

- это резко повышает цену abuse;
- для Израиля phone-based identity привычна;
- это лучше balance между friction и security, чем обязательная карта с первого шага;
- это взрослая identity-binding model, а не cheap email rule.

### 9.4 Усилители, которые стоит добавить в том contour

В тот же anti-abuse workstream логично включить:

- disposable email deny/block;
- account creation rate limits;
- trial activation rate limits;
- device/browser risk signals;
- suspicious cluster logging;
- optional soft deny / review logic.

### 9.5 Что не делать как единственный метод

Не полагаться только на:

- email;
- cookies/localStorage;
- IP;
- fingerprint без stronger identity signal.

Это всё обходится.

### 9.6 Как этот workstream правильно запускать

Не кодить с потолка. Сначала:

1. большой audit;
2. map текущих eligibility / trial / registration / analytics / consent / phone-related surfaces;
3. architecture plan;
4. bounded phased implementation.

---

## 10) Практические напутствия для следующего окна GPT

### 10.1 Что считать truth на старте

Следующий чат должен стартовать из следующих truth statements:

- Cardigo — Israel-first product;
- canonical domain — `https://cardigo.co.il`;
- Cardigo ≠ Digitalyty;
- reminder contour технически готов, но rollout gate всё ещё OFF;
- firstName contour fully closed end-to-end;
- privacy truth и privacy version уже синхронизированы;
- settings/account firstName edit уже есть в правильном месте;
- auth-registration-consent truth уже обновлена;
- trial-lifecycle-ssot truth уже дополнена personalization/fallback.

### 10.2 Как формулировать будущие Copilot задачи

Каждый будущий prompt должен:

- сначала фиксировать task boundary;
- запрещать scope creep;
- требовать PROOF;
- удерживать bounded surface;
- говорить, что Copilot — executor only;
- разделять audit / fix / verification;
- не давать line-number editing instructions без необходимости;
- не допускать “заодно”.

### 10.3 Как принимать результаты

Не принимать summary на веру.

Всегда сначала проверять:

- есть ли `PROOF file:line-range`;
- доказано ли placement;
- доказано ли отсутствие drift;
- если был small tail — закрыт ли он;
- есть ли RAW verification там, где это нужно.

### 10.4 Как относиться к stale docs

Если stale surface маленькая и bounded — закрывать её сразу. 
Не оставлять “на потом”, если это можно сделать в том же contour без broad rewrite.

---

## 11) Список активных truth-сигналов для следующего чата

Ниже короткий bootstrap-summary, который можно держать как быструю truth-вставку.

- `User.firstName` — canonical flat nullable field on User
- `firstName` required on:
  - register
  - signup-consume
  - invite-accept new-user branch
- `firstName` editable in correct settings/account area
- premium-trial reminder email supports:
  - firstName personalization
  - null-safe fallback
  - HTML-escaped greeting
- local smoke for reminder/unsubscribe already succeeded
- `TRIAL_REMINDER_ENABLED` returned back to OFF truth after local smoke
- `Privacy.jsx` updated
- `CURRENT_PRIVACY_VERSION = "2026-04-13"`
- `auth-registration-consent.md` updated
- master handoff / trial-lifecycle SSoT updated
- contour fully closed
- next likely workstream: **trial anti-abuse / phone-bound eligibility**

---

## 12) Что можно делать дальше, а что нельзя

### Можно

- запускать новый audit по trial anti-abuse contour;
- проектировать one-trial-per-phone model;
- делать bounded identity-binding plan;
- усиливать anti-abuse logic взросло и поэтапно.

### Нельзя

- reopening firstName contour casually;
- broad privacy rewrite без причины;
- broad auth refactor в unrelated task;
- менять styling doctrine;
- возвращать inline styles / grid / arbitrary typography;
- делать решения без audit.

---

## 13) Финальный статус

На момент этого handoff:

### firstName contour

> **FULLY CLOSED**

### reminder contour

> **IMPLEMENTED, VERIFIED LOCALLY, OPERATIONALLY GATED OFF UNTIL EXPLICIT ENABLE DECISION**

### next recommended workstream

> **trial anti-abuse / identity binding contour**

---

## 14) Если новый чат должен начать с одной фразы

Если нужно дать следующему окну GPT короткий стартовый bootstrap, можно вставить примерно это:

> Работаем по Cardigo enterprise doctrine. ChatGPT — Senior Project Architect / Senior Full-Stack / Enterprise Consultant. Copilot — executor only. Всегда: Audit → Minimal Fix → Verification → Documentation. No git. No inline styles. CSS Modules only. Flex only. Mobile-first. Typography only via approved `--fs-*` rem tokens. Не допускать scope creep. Cardigo ≠ Digitalyty. Canonical domain: `https://cardigo.co.il`. `firstName` contour fully closed end-to-end. Reminder contour implemented and locally smoke-verified, but `TRIAL_REMINDER_ENABLED` остаётся OFF до явного операторского решения. Следующий логичный bounded workstream — trial anti-abuse / identity binding, предпочтительно one-trial-per-verified-phone. 

