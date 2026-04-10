# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-25 (contact redesign + analytics workstreams + admin analytics visibility + admin Hebrew cleanup closed)_

---

## 0) Что это за документ

Это новый **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в реальный проектный контекст;
- зафиксировать архитектурную и продуктовую правду;
- сохранить рабочую доктрину enterprise-уровня;
- перечислить, что уже закрыто и что нельзя casually переоткрывать;
- объяснить, как правильно работать с Copilot Agent;
- передать статус последних workstream-ов, закрытых в этом окне;
- задать безопасный путь для следующих bounded-задач.

Это не просто заметки. Это одновременно:

- handoff;
- architecture memo;
- operating doctrine;
- senior-architect playbook;
- краткая инструкция для следующего ChatGPT-окна;
- контрольный документ, чтобы не потерять правила, границы и статус проекта.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по сути это не “просто визитка”.

Cardigo — это одновременно:

- digital business card;
- mini business page;
- sharing layer;
- SEO surface;
- social / WhatsApp / QR entry point;
- lead and click surface;
- self-service editing system;
- analytics layer;
- structured-data layer;
- premium/org/admin growth surface.

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- тексты, UX и default assumptions строятся под израильский рынок;
- международная multi-locale логика не считается текущей базой;
- future internationalization — отдельный workstream, а не текущая норма.

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
- user-facing positioning внутри Cardigo.

### 1.4 Канонический домен

Канонический production domain:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- не смешивать Cardigo и Digitalyty в canonical/source-brand логике.

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
- route-level head/SEO;
- SSoT render chain для public + preview.

Ключевые frontend-узлы:

- `CardRenderer`;
- `TemplateRenderer`;
- `CardLayout`;
- `EditCard`;
- editor surfaces;
- templates registry;
- skins system;
- motion subsystem;
- SEO / JSON-LD surfaces;
- AI panels;
- blog/public marketing surfaces;
- admin panel.

### 2.2 Backend

Стек:

- Node.js;
- Express;
- MongoDB / Mongoose;
- DTO-driven public path generation;
- owner/org security gates;
- anti-enumeration posture;
- manual index governance.

Ключевые backend-контуры:

- auth / registration / invite flows;
- card CRUD + publish logic;
- DTO generation for public/og paths;
- org membership/security;
- analytics ingestion / daily aggregation;
- AI endpoints;
- SEO/structured defaults;
- premium / entitlements / billing direction;
- blog CRUD / public blog APIs / slug continuity;
- admin analytics read-models.

### 2.3 Infra / platform

- Frontend: Netlify;
- Backend: Render;
- Storage: Supabase Storage;
- Email: Mailjet;
- Manual smoke / endpoint verification: **PowerShell + `curl.exe`**;
- governance checks: sanity/gates/build discipline.

---

## 3) Основные поверхности продукта

### 3.1 Public / marketing / SEO surfaces

- `/`
- `/cards`
- `/pricing`
- `/contact`
- `/blog`
- `/blog/:slug`
- `/blog/page/:n`
- `/guides`
- `/privacy`
- `/terms`

### 3.2 Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

### 3.3 Preview surfaces

- `/preview/card/:slug`
- `/preview/c/:orgSlug/:slug`

### 3.4 Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

### 3.5 Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

### 3.6 Admin surface

- `/admin`

### 3.7 Boundary principle

Главное правило:
**никогда не менять границы контуров “на глаз”.**

Сначала:

- доказать boundary;
- понять, к какому контуру относится поверхность;
- только потом менять.

---

## 4) Роль ChatGPT и роль Copilot Agent

### 4.1 Роль ChatGPT

В этом проекте ChatGPT работает как:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**.

Обязанности:

- принимать архитектурные решения;
- защищать SSoT, contracts, invariants и boundaries;
- думать blast radius, безопасностью, масштабируемостью и поддерживаемостью;
- не допускать scope creep;
- формировать bounded prompts для Copilot;
- требовать PROOF и RAW outputs;
- смотреть не только “работает ли”, но и:
  - как это живёт в продукте;
  - как это масштабируется;
  - как это документируется;
  - как это влияет на product truthfulness;
  - как это влияет на security / ops / maintainability.

Дополнительные обязанности, закреплённые в проектной доктрине:

- архитектурное проектирование под scalability / security / performance;
- техконсалтинг по frontend / backend / API / storage / deploy;
- security-minded code review;
- guidance по secure mechanisms (CSRF / XSS / injections / data protection / password-gate classes);
- guidance по CI/CD, monitoring, alerts, release discipline;
- поддержание docs / runbooks / README / change docs / handoff docs.

### 4.2 Роль Copilot Agent

Copilot Agent — **исполнитель, не архитектор**.

Его задача:

- делать read-only audit;
- давать PROOF (`file:line-range`);
- выполнять минимальные и утверждённые правки;
- запускать проверки;
- показывать RAW stdout + EXIT;
- не расширять scope самовольно;
- не делать “заодно поправил”.

---

## 5) Каноническая формула работы

> **Architecture → Audit → Minimal Fix → Verification → Documentation**

Именно в таком порядке.

### Строгий фазовый режим

Для каждой задачи с Copilot:

#### Phase 1 — Read-Only Audit

- никаких изменений;
- только анализ;
- root cause;
- flow map;
- risks;
- minimal change surface;
- PROOF `file:line-range`;
- STOP.

#### Phase 2 — Minimal Fix

- только утверждённый scope;
- минимальная поверхность изменений;
- обычно 1–3 файла, иногда больше только если реально оправдано;
- без рефакторинга “заодно”;
- без форматирования “для красоты”;
- backward compatible, если не утверждено иное;
- STOP.

#### Phase 3 — Verification

- gates / sanity / build / smoke;
- RAW stdout + EXIT;
- ручные smoke через PowerShell `curl.exe`, где релевантно;
- PASS / FAIL / PASS WITH FOLLOW-UP / PARTIAL PASS;
- STOP.

#### Documentation

- после meaningful change;
- truth-aligned;
- без stale statements;
- обновлять только то, что реально нужно для будущей работы.

---

## 6) Обязательные hard constraints для каждого будущего prompt Copilot

Каждый prompt Copilot для Cardigo обязан жить в режиме:

```text
PROJECT MODE: Cardigo enterprise workflow.
Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only EXISTING approved typography tokens from the canonical project SSoT for the relevant scope
  - do NOT invent new token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
```

### Дополнительные project laws

- No git commands;
- No inline styles;
- CSS Modules only;
- Flex only — no grid in styles;
- Mobile-first mandatory.

### Typography law

- font-size only via `var(--fs-*)`;
- только **существующие approved tokens** из соответствующего SSoT scope;
- no invented token names;
- no card-scope leakage into app/public/auth/admin scope;
- `--fs-*` rem-only;
- no px / em / % / vw / vh / clamp / fluid;
- no `calc(non-rem)`.

---

## 7) Frontend governance и boundaries

Перед любой frontend markup/styling задачей опираться на:

- `frontend.instructions.md`;
- `docs/policies/frontend-markup-styling.md`;
- `docs/typography-ssot.md`;
- `docs/policies/typography-mobile-first.md`;
- если задача касается cards:
  - `docs/cards-styling-architecture.md`.

### Нельзя смешивать без доказательства

- app-shell / marketing / admin / auth;
- editor-shell;
- preview wrapper;
- card-boundary.

### Что нельзя трогать casually

- `CardLayout.module.css`;
- CardLayout DOM skeleton;
- templates registry;
- skins;
- preview wrapper styles;
- render chain public + preview.

### Core invariants

- SSoT render chain public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins = token-only;
- preview-only styles только под `[data-preview="phone"]`;
- public / QR / OG URLs только из backend DTO (`publicPath`, `ogPath`);
- org security:
  - anti-enumeration 404;
  - membership-gate до SEO/410;
- sitemap без N+1;
- backend index governance:
  - `autoIndex` / `autoCreate` OFF;
  - manual index scripts only.

---

## 8) Motion subsystem doctrine

Motion subsystem уже существует и верифицирован.

Что уже есть:

- V1 reveal framework;
- V2 scroll-linked framework;
- parameterized V2 local tuning API.

Правила:

- local tuning только через CSS Modules;
- никаких JSX style props;
- единственный допустимый style mutation carve-out:
  - `el.style.setProperty('--scroll-progress', '<numeric 0..1>')` внутри `useScrollProgress`;
- нельзя stack reveal transform + scroll transform + hover transform на одном DOM node;
- motion разрешён только в approved marketing/app-shell sections;
- motion запрещён в card-boundary и preview wrapper.

---

## 9) Что было закрыто до этого окна

До текущего окна уже считались закрытыми и/или принятыми:

- homepage restructuring как premium narrative/conversion funnel;
- route-level SEO/head architecture;
- runtime sitemap generation;
- frontend governance / typography remediation;
- motion framework groundwork;
- image upload canonicalization / hardening;
- org/public security invariants;
- premium / entitlements / billing direction;
- About AI foundation;
- robots UX hardening;
- deterministic SEO defaults;
- business.city exposure in editor;
- deterministic JSON-LD structured assist;
- FAQ AI v1;
- shared AI quota/counter architecture;
- `/cards` premium public page;
- `/pricing` premium public page;
- blog subsystem closure in code + ops + docs;
- governance / hardening cycle 1–9;
- consent truth for account-creation flows.

---

## 10) Что было закрыто в этом окне

### 10.1 `/contact` как premium public page — CLOSED

В этом окне `/contact` был полностью переведён из legacy/drifted состояния в **canonical premium public page**.

Ключевые решения:

- отказ от legacy `Page` wrapper для самой public contact page;
- построение в том же public canon, что Home / `/cards` / `/pricing` / `/blog`;
- section-by-section implementation, без scope creep;
- truth-aligned copy без ложных обещаний;
- отдельная correction-фаза для переизбытка marketing claims.

Итоговая структура `/contact` теперь:

1. **Hero** — тёмная premium hero section;
2. **Value Bridge** — светлая explanatory section с image-top cards;
3. **Contact Section** — полноценная form + contact methods section;
4. **FAQ** — светлая section с корректным contrast + JSON-LD;
5. **Closing CTA** — спокойная финальная dark section.

Страница закрыта как public surface.

### 10.2 `/contact` Netlify form architecture — CLOSED

Для `/contact` была принята и реализована правильная Netlify-compatible архитектура формы:

- hidden static form в `index.html` для Netlify detection;
- visible React form с matching field names;
- honeypot field;
- in-page success state;
- links to `/privacy` and `/terms`;
- local white-input styling on dark section;
- form built without card-token leakage.

Правда по контактам, зафиксированная в page:

- phone display: `054-581-1900`
- tel href: `tel:+972545811900`
- WhatsApp: `https://wa.me/972545811900`
- email: `cardigo.app@gmail.com`
- Facebook: `https://www.facebook.com/cardigo.cards`

Что сознательно **не добавляли**:

- map/address block — потому что не было проверенного адреса/данных;
- phone/Facebook analytics в первом contact analytics pass — это было отдельным decision scope.

### 10.3 `/contact` FAQ JSON-LD — CLOSED

FAQ section на `/contact`:

- использует `CONTACT_FAQ` как SSoT;
- рендерится в UI;
- автоматически передаётся в `SeoHelmet` как `jsonLdItems`;
- использует canonical pattern, уже применённый на других public pages.

Это закрыто.

### 10.4 `/contact` analytics — CLOSED

Для `/contact` был выполнен отдельный bounded analytics workstream.

Принятое решение:

- добавить только **минимально ценные** события;
- не раздувать taxonomy без доказанной пользы.

Что теперь считается на `/contact`:

- `contact_email_click`
- `contact_form_submit`
- `contact_whatsapp_click`

Что сознательно **не добавили**:

- `contact_phone_click`
- `contact_facebook_click`
- tracking closing CTA `/pricing`

### 10.5 Pricing taxonomy drift — CLOSED

Был найден и закрыт P0 bug:

- `pricing_monthly_start`
- `pricing_annual_start`

использовались в `Pricing.jsx`, но отсутствовали в shared taxonomy, из-за чего события **полностью терялись**.

Фикс:

- 1 файл;
- 2 строки;
- additive registration в `SITE_ACTIONS`.

Этот P0 drift закрыт.

### 10.6 `/cards` analytics — CLOSED

Для `/cards` сначала был закрыт minimal analytics Option A:

- `cards_hero_cta`
- `cards_templates_cta`
- `cards_bottom_cta`

Потом отдельно был закрыт showcase analytics follow-up:

- `cards_showcase_card_cta`
- `cards_showcase_view_all_cta`

Что по `/cards` всё ещё сознательно **не считается**:

- hero secondary `/pricing`
- bottom secondary `/pricing`

Их оставили вне scope как navigation/noise surface.

### 10.7 Admin analytics visibility cap fix — CLOSED

Была закрыта проблема visibility в admin Top Actions:

- backend admin API теперь отдаёт top 25 actions вместо top 10;
- frontend admin UI больше не режет массив повторно через `.slice(0, 10)`.

Это не меняло ingestion/storage/taxonomy, а только улучшило admin visibility.

### 10.8 Admin Hebrew / human-readable cleanup — Batches 1–3 CLOSED

#### Batch 1 — `AdminAnalyticsView.jsx`

Закрыто:

- section titles и helper texts переведены в понятный иврит;
- action label map добавлен локально в файл;
- Top Actions для известных keys теперь показывают human-readable labels;
- fallback на raw machine key сохранён.

#### Batch 2 — `AdminOrganizationsView.jsx`

Закрыто:

- placeholders, labels, table headers, options, seat wording переведены;
- `member/admin` теперь показываются как `חבר/מנהל`;
- `active/suspended` получают human-readable rendering через helper map;
- validation messages приведены к нормальному ивриту.

#### Batch 3 — `Admin.jsx`

Закрыто:

- STR.he dictionary очищен от billing/dev jargon leakage;
- hardcoded `Billing` и runtime explanation rewritten в понятный иврит;
- строки с `Override`, `Billing`, `Provenance`, `Audit`, `Runtime SSoT`, `Force` переведены в нормальный admin-facing язык.

---

## 11) Что уже закрыто как canonical truth после этого окна

На текущий момент считаются закрытыми и не должны casually переоткрываться:

- `/cards` как premium public examples page;
- `/pricing` как premium public pricing page;
- `/contact` как premium public contact page;
- `/contact` Netlify form architecture;
- `/contact` FAQ JSON-LD;
- `/contact` analytics minimal expansion;
- Pricing taxonomy drift;
- `/cards` analytics + showcase analytics;
- admin analytics visibility cap;
- admin Hebrew cleanup Batch 1–3;
- blog subsystem в code + ops + docs;
- governance/hardening cycle 1–9;
- documentation integration по этому циклу.

---

## 12) Что intentionally deferred / не закрыто

Это не забыто. Это **сознательно отложено** и не должно случайно смешиваться с другими fix-пакетами:

- retroactive consent для уже существующих `null`-consent users;
- re-consent flow при future version bump;
- token TTL / cleanup policy;
- stale unverified users cleanup;
- optional index-hygiene cleanup там, где нет correctness риска;
- broad card-boundary typography cleanup;
- legal copy / policy text refinement;
- broad analytics index-hygiene cleanup без trigger;
- optional cleanup orphan key `home_hero_secondary_examples`;
- optional hardening `trackSiteClick` to warn on undefined action earlier;
- optional `/contact` email CTA granularity split;
- optional phone/Facebook tracking on `/contact`.

### Особо важный pending item

**Manual admin verification** ещё не закрыта окончательно.

Уже сделано:

- pipeline audit;
- visibility audit;
- runbook/manual checklist;
- admin UI readability cleanup.

Что ещё надо сделать руками:

- пройти runbook;
- проверить, что новые keys реально появляются / растут;
- если что-то не видно, смотреть `actionCounts` или admin API response.

---

## 13) Analytics truth после этого окна

### Что считается теперь

#### `/contact`

- `contact_email_click`
- `contact_form_submit`
- `contact_whatsapp_click`

#### `/pricing`

- `pricing_trial_start`
- `pricing_premium_upgrade`
- `pricing_monthly_start`
- `pricing_annual_start`
- `contact_email_click` (B2B CTA to contact)

#### `/cards`

- `cards_hero_cta`
- `cards_templates_cta`
- `cards_showcase_card_cta`
- `cards_showcase_view_all_cta`
- `cards_bottom_cta`

### Важная правда про admin analytics

- pipeline end-to-end key-agnostic;
- новые keys должны ingest/store/render without backend changes;
- admin UI historically показывал только top 10, теперь top 25;
- admin UI рендерит **raw keys**, если для них нет локального human-readable mapping;
- в `AdminAnalyticsView.jsx` известные ключи теперь локально переводятся в человеко-понятные подписи.

### Важная правда про `contact_email_click`

Остаётся одна осознанно неразрешённая гранулярность:

`contact_email_click` используется из нескольких placement-ов:

- `/contact` hero;
- `/contact` info block;
- `/contact` closing CTA;
- `/pricing` B2B CTA.

Значит admin не может показать, **какой именно email CTA** был нажат. Это не баг ingestion. Это вопрос taxonomy granularity. Делать split только отдельным future workstream.

---

## 14) Durable truth / docs / файлы, где живёт правда

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

### Blog / SEO / OG

- `docs_blog_seo_og_runbook.md`

### General ops / registry truth

- `README.md`

### Полезный latest handoff до этого окна

- `Cardigo_Enterprise_Master_Handoff_2026-03-25_GOVERNANCE_CYCLE_CLOSED.md`

Текущий документ — это новый слой поверх него, уже с закрытым `/contact`, analytics и admin cleanup.

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
- смешивать admin copy cleanup с analytics ingestion fixes в один unbounded pass.

---

## 16) Как правильно формулировать задачи для Copilot

Каждый хороший prompt должен сначала фиксировать:

- цель;
- expected behavior;
- constraints;
- in scope;
- out of scope;
- что именно нельзя менять.

Потом:

- Phase 1 audit only;
- дождаться PROOF;
- утвердить архитектурное решение;
- потом Phase 2 minimal fix;
- потом Phase 3 verification;
- потом docs при необходимости.

### Tactical lessons, доказанные в этом окне

#### Если проблема визуальная — не надо сразу менять shared primitives

Пример: FAQ на `/contact` был белым на белом. Правильный fix был:

- не трогать `public-sections.module.css`;
- добавить локальные light-FAQ override classes.

#### Если проблема visibility — не надо сразу менять taxonomy

Пример: `cards_templates_cta` не всплывал в Top Actions. Сначала выяснили, что:

- ingestion/storage работает;
- проблема в top-N visibility cap.

После этого сделали admin-only visibility fix.

#### Если нужна точность — надо отличать visibility problem от granularity problem

Пример: `contact_email_click` не различает placement-ы. Это не visibility issue и не ingestion bug. Это granularity/taxonomy issue.

#### Если проблема реально bounded — чинить в самом узком корректном слое

- не в global styles, если хватает page-local wrapper;
- не в backend, если issue purely visible frontend;
- не в UI, если проблема в DB/DTO/index/governance;
- не в 5 файлах, если хватает 1–2.

---

## 17) Тактика работы, которая считается правильной

Правильная тактика проекта:

- думать как архитектор, а не как быстрый fixer;
- смотреть на product truthfulness;
- смотреть на UX для обычного пользователя и админа;
- не подменять правильную архитектуру временными костылями;
- учитывать enterprise-будущее, но не over-engineerить;
- делать incremental delivery без разрушения boundaries.

### Базовое правило

Не искать самый быстрый путь.  
Искать самый безопасный, зрелый и enterprise-правильный путь.

### Что хорошо сработало в этом окне

- section-by-section rebuilding `/contact`;
- выделение analytics в отдельные bounded workstreams;
- разделение visibility fixes и taxonomy fixes;
- отдельный admin copy cleanup после stabilizing analytics picture;
- строгая остановка Copilot при scope breach.

### Что было важно остановить

Copilot однажды самовольно полез расширять shared analytics taxonomy внутри `/contact` visual task. Это было корректно остановлено как **scope breach**. После этого analytics были вынесены в отдельные workstreams. Это правильный паттерн на будущее.

---

## 18) Следующие логичные шаги

### Priority 1 — закончить manual admin verification

Нужно руками прогнать уже подготовленный verification runbook:

Проверять как минимум:

- `contact_form_submit`
- `contact_whatsapp_click`
- `contact_email_click`
- `pricing_monthly_start`
- `pricing_annual_start`
- `cards_hero_cta`
- `cards_templates_cta`
- `cards_showcase_card_cta`
- `cards_showcase_view_all_cta`
- `cards_bottom_cta`

И проверять:

1. frontend fire;
2. backend/storage ingestion;
3. admin UI visibility.

Если чего-то не видно в Top Actions:

- помнить про ranking view;
- смотреть `actionCounts` или admin API response.

### Priority 2 — решить, нужен ли `contact_email_click` granularity split

Открывать только если реально нужна точная конкретика по placement-ам.

Возможный будущий split:

- contact hero email;
- contact info email;
- contact closing email;
- pricing B2B contact email.

Но делать это только как отдельный bounded analytics workstream.

### Priority 3 — optional analytics hardening

Если потом понадобится:

- orphan key cleanup (`home_hero_secondary_examples`);
- better undefined-action warning in analytics client;
- optional `/contact` phone/Facebook tracking.

### Priority 4 — дальше по продукту

После закрытия этих хвостов можно снова двигаться либо в:

- auth / registration UX hardening;
- premium/org/admin maturity;
- support/admin tools;
- AI/SEO/product growth directions;
- production readiness / monitoring / performance testing.

---

## 19) Что проект ещё должен включать и усиливать дальше

Проект уже зрелый, но enterprise-мышление требует смотреть дальше.

Что продолжать усиливать:

- auth hardening;
- registration and token safety;
- consent/compliance clarity;
- billing clarity;
- premium entitlements;
- org/admin maturity;
- monitoring/alerts;
- CI/CD baseline;
- security hardening;
- performance readiness;
- stress testing;
- better ops/runbooks;
- clearer support/debug documentation;
- bounded truth-aligned AI growth;
- data/index governance across critical collections;
- production-readiness discipline before full launch.

---

## 20) Готовый стартовый блок для нового окна ChatGPT

Ниже текст, который можно вставить в новое окно как bootstrap-контекст:

```text
Ты — Senior Project Architect / Senior Full-Stack / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot — исполнитель. Работаем строго фазами: Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP; Phase 2 Minimal Fix (только утверждённый scope, без рефакторинга/форматирования, backward compatible) → STOP; Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP; затем Documentation при необходимости.

Обязательные ограничения Copilot:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid in styles
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - only existing approved typography tokens from the canonical project SSoT for the relevant scope
  - do NOT invent new token names
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Главные инварианты:
- SSoT render chain public+preview
- templates registry только frontend/src/templates/templates.config.js
- skins token-only
- preview-only стили только [data-preview="phone"]
- CardLayout DOM skeleton не менять casually
- public/QR/OG только из backend DTO publicPath/ogPath
- org security anti-enumeration 404 и membership-gate до SEO
- sitemap без N+1
- backend index governance autoIndex/autoCreate OFF, manual index scripts only
- Cardigo и Digitalyty не смешивать
- Cardigo = Israel-first / Israel-only

Текущий важный status:
- /cards = closed premium examples page
- /pricing = closed premium pricing page
- /contact = closed premium contact page with Netlify form + FAQ JSON-LD
- blog subsystem = closed
- governance/hardening cycle 1–9 = closed
- /contact analytics = closed
- Pricing taxonomy drift = closed
- /cards analytics + showcase analytics = closed
- admin Top Actions visibility cap fix = closed
- admin Hebrew cleanup Batch 1–3 = closed

Незакрытые хвосты:
- manual admin analytics verification still needs to be executed and confirmed end-to-end
- contact_email_click granularity split is optional/deferred
- orphan key / analytics client warning hardening are deferred

Важно:
- email ownership truth ≠ consent truth
- visibility problem ≠ taxonomy granularity problem
- новый workstream всегда открывать bounded и доказательно, без scope creep

Следующая задача: <вставить bounded задачу>.
```

---

## 21) Финальное напутствие

Проект зрелый.  
Это не место для “быстренько что-то подправить”.

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

ChatGPT здесь не “просто помощник по коду”.  
ChatGPT здесь — **архитектор проекта**, который защищает:

- систему;
- продуктовую правду;
- техническую правду;
- границы;
- качество решений;
- долгосрочную поддерживаемость.

---

## 22) Короткая итоговая выжимка

Если совсем коротко, то сейчас Cardigo — это:

- mature Israel-first SaaS for digital business cards;
- с сильной frontend governance;
- с защищёнными backend/security invariants;
- со structured SEO/JSON-LD layer;
- с About AI, FAQ AI v1 и shared AI quota architecture;
- с закрытой `/cards` examples page;
- с закрытой `/pricing` page;
- с закрытой `/contact` page;
- с полностью закрытым blog subsystem;
- с закрытым governance/hardening cycle 1–9;
- с закрытым `/contact` analytics;
- с закрытым Pricing analytics drift;
- с закрытым `/cards` analytics;
- с закрытым admin visibility fix;
- с закрытым admin Hebrew cleanup Batch 1–3;
- с canonical workflow:
  - audit → minimal fix → verification → docs.

Самый важный незакрытый operational шаг после этого окна:

> **ручная проверка в admin panel, что события реально видны, читаются и интерпретируются корректно.**

