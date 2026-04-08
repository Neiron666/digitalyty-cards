# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-24 (blog subsystem code + docs closed)_

---

## 0) Что это за документ

Это большой **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Цель документа:

- быстро ввести новый чат в реальный проектный контекст;
- сохранить архитектурную доктрину и рабочую тактику;
- зафиксировать роль ChatGPT как **Senior Project Architect / Senior Full-Stack / Enterprise Consultant**;
- зафиксировать роль Copilot Agent как **исполнителя**, а не архитектора;
- зафиксировать продуктовые и технические инварианты;
- сохранить закрытые решения, чтобы не переоткрывать их без причины;
- дать безопасную стартовую точку для следующих задач;
- удержать проект в enterprise-режиме без scope creep и без архитектурного дрейфа.

Это не просто заметки. Это:

- handoff;
- governance memo;
- architecture playbook;
- operating doctrine;
- next-chat bootstrap;
- инструкция по правильной работе над проектом.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по сути это не “просто визитка”.

Карточка в Cardigo — это одновременно:

- публичная мини-страница бизнеса;
- страница для шаринга;
- поверхность для WhatsApp / QR / соцсетей;
- SEO-страница;
- точка сбора лидов и переходов;
- self-service editor;
- analytics layer;
- structured-data layer;
- premium / org / AI expansion surface.

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- копирайтинг, UX и default assumptions строятся под израильский рынок;
- продукт не должен по умолчанию проектироваться как международная multi-locale платформа;
- future internationalization — отдельный workstream, а не текущая база.

### 1.3 Бренды и разделение

Критически важный инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

Их **нельзя смешивать** в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- user-facing positioning внутри Cardigo.

### 1.4 Канонический домен

Канонический production domain Cardigo:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- не смешивать Cardigo и Digitalyty в canonical/source-brand логике.

---

## 2) Основные поверхности продукта

### 2.1 Public / marketing / SEO surfaces

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

### 2.2 Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

### 2.3 Preview surfaces

- `/preview/card/:slug`
- `/preview/c/:orgSlug/:slug`

### 2.4 Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

### 2.5 Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

### 2.6 Admin surface

- `/admin`

### 2.7 Boundary principle

Главное правило:
**никогда не менять границы контуров “на глаз”.**

Сначала:

- доказать boundary;
- понять, к какому контуру относится поверхность;
- только потом менять.

---

## 3) High-level архитектура

### 3.1 Frontend

Стек:

- React;
- Vite;
- RTL-first;
- CSS Modules only;
- Mobile-first;
- Flex only;
- token-based styling;
- SSoT render chain для public + preview;
- route-level SEO/head через shared abstractions.

Ключевые frontend-узлы:

- `CardRenderer`;
- `TemplateRenderer`;
- `CardLayout`;
- `EditCard`;
- editor surfaces;
- templates registry;
- skins system;
- shared public styling layer;
- motion subsystem;
- SEO / JSON-LD surfaces;
- AI panels;
- blog public surfaces.

### 3.2 Backend

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
- analytics;
- AI endpoints;
- SEO/structured defaults;
- premium / entitlement direction;
- org/company surfaces;
- blog CRUD / public blog APIs / slug continuity.

### 3.3 Infra / platform

- Frontend: Netlify;
- Backend: Render;
- Storage: Supabase Storage;
- Email: Mailjet;
- Smoke/manual verification: **PowerShell + `curl.exe`**;
- gates / sanity / build checks — обязательная часть delivery discipline.

---

## 4) Роль ChatGPT и роль Copilot

### 4.1 Роль ChatGPT

В этом проекте ChatGPT работает как:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**.

Обязанности:

- принимать архитектурные решения;
- защищать SSoT, contracts, invariants, boundaries;
- мыслить blast radius, безопасностью, масштабируемостью и поддерживаемостью;
- не допускать scope creep;
- формировать bounded prompts для Copilot;
- требовать PROOF и RAW outputs;
- смотреть не только “работает ли”, но и:
  - как это живёт в продукте;
  - как это масштабируется;
  - как это документируется;
  - как это влияет на product truthfulness;
  - как это влияет на security / ops / maintainability.

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

---

## 6) Строгий фазовый режим

Для каждой задачи с Copilot:

### Phase 1 — Read-Only Audit

- никаких изменений;
- только анализ;
- root cause;
- flow map;
- risks;
- minimal change surface;
- PROOF `file:line-range`;
- STOP.

### Phase 2 — Minimal Fix

- только утверждённый scope;
- минимальная поверхность изменений;
- обычно 1–3 файла, иногда больше, если это реально оправдано;
- без рефакторинга “заодно”;
- без форматирования “для красоты”;
- backward compatible, если явно не утверждено иное;
- STOP.

### Phase 3 — Verification

- gates / sanity / build / smoke;
- RAW stdout + EXIT;
- ручные smoke через PowerShell `curl.exe`, где релевантно;
- PASS / FAIL / PARTIAL PASS / PASS WITH FOLLOW-UP;
- STOP.

### Documentation

- после meaningful change;
- truth-aligned;
- без stale statements;
- обновлять только то, что реально нужно для будущей работы.

---

## 7) Обязательные hard constraints для каждого будущего промпта Copilot

Каждый будущий prompt Copilot для Cardigo должен начинаться в духе:

```text
Ты — Copilot Agent, acting as senior full-stack engineer with strong SEO/information-architecture awareness and enterprise discipline.

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

## 8) Frontend governance и boundaries

### 8.1 Перед любой frontend markup/styling задачей опираться на:

- `frontend.instructions.md`;
- `docs/policies/frontend-markup-styling.md`;
- `docs/typography-ssot.md`;
- `docs/policies/typography-mobile-first.md`;
- если задача касается cards:
  - `docs/cards-styling-architecture.md`.

### 8.2 Нельзя смешивать без доказательства

- app-shell / marketing / admin / auth;
- editor-shell;
- preview wrapper;
- card-boundary.

### 8.3 Что нельзя трогать casually

- `CardLayout.module.css`;
- CardLayout DOM skeleton;
- templates registry;
- skins;
- preview wrapper styles;
- render chain public + preview.

### 8.4 Core invariants

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
  - manual index scripts only;
  - drift / governance должны проверяться осознанно, а не “надеяться на Mongoose”.

---

## 9) Motion subsystem doctrine

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

## 10) Что уже было зрелым до последних public/blog workstreams

До последних public/blog workstreams проект уже включал:

- homepage restructuring как narrative/conversion funnel;
- homepage FAQ + FAQPage JSON-LD;
- route-level SEO/head architecture;
- runtime sitemap generation;
- frontend governance / typography remediation;
- motion framework groundwork;
- image upload canonicalization / hardening;
- org/public security invariants;
- premium / entitlements / billing direction;
- About AI foundation;
- SEO editor UX restructuring;
- robots UX hardening;
- deterministic SEO defaults;
- business.city exposure in editor;
- JSON-LD deterministic structured assist;
- JSON-LD UX hardening;
- JSON-LD overwrite confirm modal hardening;
- FAQ AI v1;
- shared AI quota/counter architecture.

Важно:
мы работаем не в песочнице, а в зрелом проекте с большим количеством защищённых инвариантов.

---

## 11) Большой закрытый public workstream: `/cards`

### 11.1 Страница `/cards` собрана и закрыта

`/cards` построена как полноценная public marketing/examples page.

Итоговая структура:

1. Hero
2. Showcase
3. Features
4. Final CTA
5. SEO appendix
6. FAQ

### 11.2 `/cards` SEO/head status

Подтверждено:

- `SeoHelmet` подключён корректно;
- title / description / canonical / url / image заданы;
- FAQPage JSON-LD присутствует;
- JSON-LD и rendered FAQ truth-aligned;
- временно используется shared Home OG image как допустимый fallback;
- dedicated `/cards` OG deferred и не является blocker.

### 11.3 `/cards` current verdict

`/cards` считается:

- собранной;
- принятой;
- premium-consistent;
- truth-aligned;
- закрытой как public marketing page.

---

## 12) Большой закрытый public workstream: `/pricing`

### 12.1 Общий статус

`/pricing` теперь считается:

- **собранной**;
- **принятой**;
- **premium public page**;
- **production-ready по архитектуре и контенту**;
- закрытой без P0/P1 замечаний.

### 12.2 Финальная pricing-архитектура

1. Hero
2. Pricing plans section
3. `חברות וארגונים` featured enterprise card внутри pricing layer
4. Annual-value editorial section
5. Final CTA section
6. FAQ section

### 12.3 Product truth, зафиксированная в pricing

- `business hours` — пока не shipping, в pricing не обещать;
- `business services / offerings` — пока не shipping end-to-end, в pricing не обещать;
- `AI helper` — shipping и допустим в pricing copy;
- `analytics` — shipping premium capability, допустим в pricing copy;
- `Basic בלי אנליטיקה` — не рекомендован и не принят;
- `חברות וארגונים` — реальное shipping направление, но не self-serve pricing card.

### 12.4 `/pricing` current verdict

`/pricing` сейчас считается **закрытой**.

Это значит:

- не открывать её заново без сильной причины;
- не устраивать broad redesign поверх уже принятой страницы;
- мелкие P2 polish допустимы позже, но сейчас не являются workstream trigger.

---

## 13) Полностью закрытый blog subsystem

Это самый важный новый блок относительно старых handoff-документов.

### 13.1 `/blog` list page

`/blog` теперь закрыта как полноценная premium public page.

Что закрыто:

- custom premium hero;
- shared public section shells;
- listing heading + intro;
- FAQ closing section;
- richer list-page `SeoHelmet`;
- visible cover fallback на карточках списка;
- page remains inside public/site-shell contour.

### 13.2 `/blog/:slug` single post page

`/blog/:slug` теперь закрыта как полноценная public article surface.

Что закрыто:

- удалён generic `<Page />` dependency;
- собственный `<main data-page="site">`;
- корректная heading hierarchy (`h1 = post title`);
- visible hero fallback;
- `og:type="article"`;
- JSON-LD fallback image;
- page-level light wrapper / background bleed fix;
- accepted article shell without reopening broader site-shell styling.

### 13.3 Blog discoverability / SEO / IA

Закрыто:

- URL-driven archive pagination:
  - `/blog/page/:n`
- page 1 canonical = `/blog`
- invalid / non-numeric / zero / negative archive params normalize to `/blog`
- out-of-range archive params normalize to last valid archive page
- archive pages enumerated in sitemap
- `/blog` added to shared footer as second persistent crawlable site-shell path
- related posts V1 added on `/blog/:slug`

### 13.4 Related posts V1

Принята минимальная mature версия:

- frontend-only;
- источник данных: existing public blog list API;
- fetch: `/api/blog?page=1&limit=4`;
- current post excluded client-side;
- render up to 3 posts;
- compact teasers only:
  - thumbnail
  - title
  - link
- no date;
- no excerpt;
- no CTA;
- placement:
  - after author card
  - before back link;
- existing blog fallback asset reused for teaser thumbnails.

### 13.5 Section illustration images V1

Закрыта bounded V1-модель:

- одна optional image на одну section;
- image stored as structured section subdocument;
- admin supports:
  - upload
  - replace
  - remove
- delete-post cleanup includes section images;
- remove does not resurrect on later update;
- body stays plain text;
- no WYSIWYG;
- no raw HTML;
- no caption;
- no placement enum;
- no galleries;
- section images are **body-only presentation** and **do not affect OG / JSON-LD**.

### 13.6 Blog hero / cover fallbacks

Закрыто:

- list card visible fallback;
- single post visible hero fallback;
- same existing blog fallback asset reused;
- metadata fallback remained intact.

### 13.7 Slug continuity / alias foundation

Это одна из главных закрытых зрелых тем.

Что принято:

- `previousSlugs`;
- `firstPublishedAt`;
- alias history начинается **только после первой публикации**;
- draft slug churn до первой публикации не засоряет alias history;
- current slug remains canonical;
- old public slug resolves to current canonical post;
- frontend SPA делает replace-navigation на canonical `/blog/${post.slug}` при alias hit;
- sitemap remains current-only;
- canonical remains current-only;
- aliases do not emit in sitemap.

### 13.8 BlogPost index governance

Полностью закрыто:

Expected live BlogPost indexes:

- `_id_`
- `slug_1`
- `status_1_publishedAt_-1`
- `previousSlugs_1`

Что сделано:

- bounded migration script `migrate:blogpost-indexes`;
- dry-run/apply discipline;
- duplicate safety precheck for unique `slug_1`;
- `previousSlugs_1` live;
- `slug_1` live;
- `status_1_publishedAt_-1` live;
- script cleanly exits;
- re-run idempotent.

### 13.9 Documentation for blog subsystem

Закрыто:

Primary canonical truth now lives in:

- **`docs_blog_seo_og_runbook.md`**

Secondary references updated:

- `README.md` — BlogPost index migration registry entry;
- `site-analytics-coverage-map.md` — `/blog/:slug` tracking row.

### 13.10 Blog subsystem final verdict

**Blog subsystem is closed in code, operations, and documentation.**

Это означает:

- не открывать блог заново без конкретного реального business / UX / bug trigger;
- не устраивать broad redesign “ради улучшения”;
- новые blog-задачи брать только bounded и доказательно.

---

## 14) Документы и SSoT, которые теперь особенно важны

### Durable truth / runbooks

- `docs_blog_seo_og_runbook.md` — canonical truth for blog subsystem
- `README.md` — short registry / operational pointers
- `site-analytics-coverage-map.md` — tracking coverage truth

### Blog code SSoT

- `BlogPost.model.js`
- `blog.controller.js`
- `adminBlog.controller.js`
- `Blog.jsx`
- `BlogPost.jsx`
- `migrate-blogpost-indexes.mjs`
- `blog.js` config constants

### General project SSoT / governance

- `frontend.instructions.md`
- `docs/policies/frontend-markup-styling.md`
- `docs/typography-ssot.md`
- `docs/policies/typography-mobile-first.md`
- `docs/cards-styling-architecture.md` (only for card tasks)
- `README.md` index governance section

---

## 15) Что не делать

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
- переоткрывать `/pricing`, `/cards` или blog subsystem без сильной причины.

---

## 16) Как правильно формулировать задачи для Copilot

Каждый хороший prompt сначала фиксирует:

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

Если задача styling/public-page heavy:

- сначала определить section role;
- потом доказать boundary;
- потом проверить shared public layer;
- только потом писать page-local CSS.

Если задача data/index/auth/security heavy:

- сначала проверить model / query / live behavior / drift;
- потом только bounded migration / fix;
- потом verification с raw outputs.

---

## 17) Тактика работы, которая считается правильной

Правильная тактика проекта:

- думать как архитектор, а не как быстрый fixer;
- смотреть на product truthfulness;
- смотреть на UX для обычного пользователя;
- не подменять правильную архитектуру временными костылями;
- учитывать enterprise-будущее, но не over-engineerить;
- делать incremental delivery без разрушения boundaries.

### Базовое правило

Не искать самый быстрый путь.  
Искать самый безопасный, зрелый и enterprise-правильный путь.

### Практический tactical lesson из последних workstreams

Если проблема реально bounded — чинить её **в самом узком корректном слое**:
- не в global styles, если хватает page-local wrapper;
- не в backend, если issue purely visible frontend;
- не в UI, если проблема в DB/DTO merge;
- не в docs по всему репо, если truth можно уложить в один canonical runbook + short cross-ref.

---

## 18) Что логично делать дальше

После закрытия blog subsystem логичные следующие направления такие.

### 18.1 User / auth / registration drift audit

Первый сильный кандидат:
- users / registration / auth identity
- live unique indexes
- token models
- recovery flows
- invite/signup/verify-email flows

### 18.2 Token security models

Проверить:

- password reset;
- signup / verify-email;
- invite / signup-link;
- TTL / single-active semantics;
- lookup indexes.

### 18.3 Payment / transaction / billing governance

Проверить:

- `PaymentTransaction`;
- unique provider transaction ids;
- idempotency;
- status / createdAt lookup indexes;
- receipts/invoice related models.

### 18.4 Core card/public model governance

Проверить:

- live indexes;
- slug/path uniqueness;
- public published-list queries;
- sitemap-supporting query shapes.

### 18.5 Org / membership / invite governance

Проверить:

- org invite tokens;
- membership lookup indexes;
- org public route / public slug safety.

### 18.6 Leads / inbox / analytics governance

Проверить live drift и cleanup correctness для:
- leads / inbox
- analytics / monthly aggregates
- counters / summary models

---

## 19) Что проект ещё должен включать и усиливать дальше

Проект уже большой, но enterprise-мышление требует смотреть дальше.

Что продолжать усиливать:

- auth hardening;
- registration and token safety;
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

Текущий важный operational status:
- /cards page завершена и принята как premium public marketing/examples page
- /pricing page завершена и принята как premium public pricing page
- blog subsystem закрыт в code + ops + docs
- blog durable truth lives in docs_blog_seo_og_runbook.md
- centralized pre-launch robots policy lives in index.html
- весь non-deferred typography debt cleaned
- broad card-boundary cleanup deferred intentionally
- CardLayout.module.css нельзя трогать casually

Важно по blog subsystem:
- /blog premium page closed
- /blog/:slug shell hardening closed
- section images V1 closed
- related-posts V1 closed
- footer /blog hardening closed
- slug continuity / aliases closed
- BlogPost index governance closed
- do not reopen blog without strong reason

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

Если совсем коротко, то сегодня Cardigo — это:

- mature Israel-first SaaS for digital business cards;
- с сильной frontend governance;
- с защищёнными backend/security invariants;
- со structured SEO/JSON-LD layer;
- с About AI, FAQ AI v1 и shared AI quota architecture;
- с закрытой `/cards` examples page;
- с закрытой `/pricing` premium pricing page;
- с полностью закрытым blog subsystem;
- с централизованной pre-launch robots policy;
- с manual index governance discipline;
- с enterprise workflow:
  - audit → minimal fix → verification → docs.

Статус текущего большого public/blog цикла:
**закрыт на хорошем enterprise-уровне.**