# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-24_

---

## 0) Что это за документ

Это обновлённый **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Цель документа:

- быстро ввести новый чат в реальный проектный контекст;
- сохранить архитектурную доктрину и рабочие правила;
- зафиксировать роль ChatGPT как **Senior Project Architect / Senior Full-Stack / Enterprise Consultant**;
- зафиксировать роль Copilot Agent как **исполнителя**, а не архитектора;
- зафиксировать продуктовые и технические инварианты;
- описать, что уже закрыто;
- отдельно зафиксировать свежий большой workstream по **`/pricing`**, который теперь считается **закрытым**;
- дать безопасную стартовую точку для следующих задач;
- сохранить enterprise-тактику работы без scope creep и без архитектурного дрейфа.

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
- AI panels.

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
- org/company surfaces.

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
  - как это продаёт и выглядит на enterprise-уровне.

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

Каждый будущий prompt Copilot для Cardigo должен идти в духе:

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

### 8.2 Нельзя смешивать без доказательства:
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
  - manual index scripts only.

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
- safe pattern:
  - reveal → wrapper;
  - scroll effect → inner;
  - hover/press → глубже при необходимости;
- motion разрешён только в approved marketing/app-shell sections;
- motion запрещён в card-boundary и preview wrapper.

---

## 10) Что уже было зрелым до последних public workstreams

До последних крупных public workstreams проект уже включал:
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
- JSON-LD overwrite confirm modal hardening.

Важно:
мы работаем не в песочнице, а в зрелом проекте с большим количеством защищённых инвариантов.

---

## 11) Большой закрытый AI workstream

### 11.1 FAQ AI v1 — закрыт
Каноника:
- отдельный bounded workstream;
- full only;
- empty-state only;
- генерирует только `faq.items`;
- `faq.title` и `faq.lead` сохраняются;
- read-only preview;
- apply / dismiss;
- bounded output;
- backend empty-only guard;
- anti-duplication на двух уровнях.

### 11.2 Shared AI quota / counter architecture — закрыт
Каноника:
- user-facing общий monthly AI budget across:
  - About / Content AI;
  - FAQ AI;
  - SEO AI;
- free = 10 total;
- premium = 30 total;
- telemetry остаётся per-feature;
- counter unified through shared `AiQuotaHint`;
- docs truth-aligned.

### 11.3 Product truth
- `featureEnabled` остаётся per-feature;
- shared budget не отменяет per-feature flags;
- backend — canonical source of truth.

---

## 12) Закрытый public workstream: `/cards`

### 12.1 Страница `/cards` собрана и закрыта
`/cards` построена как полноценная public marketing/examples page.

Итоговая структура:
1. Hero
2. Showcase
3. Features
4. Final CTA
5. SEO appendix
6. FAQ

### 12.2 `/cards` делалась section-by-section
Работа шла строго по секциям:
- сначала audit;
- потом minimal fix;
- потом verification;
- не переходили к следующей секции, пока текущая не была принята.

### 12.3 Visual language
`/cards` выстроена в едином premium-стиле с Home:
- same public design language;
- same premium section rhythm;
- shared public styling layer;
- alternating dark / light sections;
- без casual drift.

### 12.4 Shared public styling layer
Из Home был извлечён shared public styling слой:
- reusable public section primitives;
- они вынесены в отдельный shared module;
- и задокументированы как канонический reusable public layer.

Это важно:
будущие public pages должны сначала проверять:
1. global tokens;
2. shared public styling layer;
3. page-local CSS only после этого.

### 12.5 `/cards` page — что входит
На странице есть:
- premium hero;
- showcase/examples section;
- features section;
- final CTA;
- SEO appendix;
- FAQ section;
- page-level head/SEO contract;
- FAQPage JSON-LD.

### 12.6 `/cards` SEO/head status
Проверено и подтверждено:
- `SeoHelmet` подключён корректно;
- title / description / canonical / url / image заданы;
- FAQPage JSON-LD присутствует;
- JSON-LD и rendered FAQ truth-aligned;
- временно используется shared Home OG image как допустимый fallback;
- dedicated `/cards` OG deferred и не является blocker.

### 12.7 `/cards` robots policy
Принято стратегическое решение:
- **не** добавлять локальный `robots` в `/cards`;
- использовать централизованную pre-launch policy;
- ordinary pages наследуют robots из `index.html`;
- page-level `robots` — только для intentional overrides.

### 12.8 `/cards` navigation fix
Был обнаружен SPA scroll issue:
- `<Link to="/">` из `/cards` вёл на Home без скролла к началу.

Исправление:
- добавлен глобальный route-scroll policy;
- через `ScrollToTop` в `Layout`;
- с явным исключением для `/edit...`;
- standalone public card / preview routes не затронуты.

### 12.9 `/cards` current verdict
`/cards` считается:
- собранной;
- принятой;
- premium-consistent;
- truth-aligned;
- закрытой как public marketing page.

---

## 13) Централизованная pre-launch robots policy

### 13.1 Текущее проектное решение
Проект уже имеет централизованный pre-launch noindex policy:

- `index.html`
- глобальный `<meta name="robots" content="noindex, nofollow">`

Это и есть главный pre-launch kill switch.

### 13.2 Как это работает
- ordinary pages ничего локально не задают;
- они наследуют robots policy по умолчанию;
- `SeoHelmet robots` используется только для intentional override cases.

### 13.3 Что важно помнить
Когда проект пойдёт в launch-phase:
- global robots meta из `index.html` нужно снять;
- затем оставить только осознанные per-page overrides там, где действительно нужно.

---

## 14) Typography governance — текущее состояние

### 14.1 Что было сделано
Проведён большой typography cleanup:
- app/editor/auth/blog scopes очищены;
- misleading legacy signals убраны;
- dead aliases и stale residues очищены.

### 14.2 Что подтверждено
После cleanup:
- весь **non-deferred typography debt закрыт**;
- app/editor/auth/blog scopes очищены;
- misleading legacy signals cleaned;
- check:typography шумит только там, где и ожидалось.

### 14.3 Что осталось и почему
Остался только **осознанно deferred card-boundary слой**:
- card-scope fallbacks;
- некоторые legacy residues в card-boundary;
- это **нормально** и не является текущим quick-fix target.

### 14.4 Важное архитектурное решение
**Дальше в `CardLayout.module.css` и broad card-scope cleanup сейчас не лезем.**

Причина:
- нет реальной пользовательской поломки;
- audit показал риск regression в card-boundary;
- чистить “ради чистоты” без отдельного card-typography workstream — неправильный путь.

### 14.5 Что считается текущей границей
Сейчас typography/workstream остановлен в правильной точке:
- non-deferred debt cleaned;
- dead weight cleaned;
- card-boundary оставлен как deferred safe zone.

---

## 15) Большой закрытый public workstream: `/pricing`

Это **самый свежий и важный контекст** для следующего окна.

### 15.1 Общий статус
`/pricing` теперь считается:
- **собранной**;
- **принятой**;
- **premium public page**;
- **production-ready по архитектуре и контенту**;
- закрытой без P0/P1 замечаний.

### 15.2 Что было важно стратегически
Изначально `/pricing` была слабой и drifted относительно Home и `/cards`.

В ходе workstream было принято решение:
- не ремонтировать legacy pricing по мелочам;
- а **собрать её как новую premium public page**, оставаясь внутри того же public canon.

### 15.3 Канон `/pricing`
Страница строилась с опорой на:
- `frontend/src/styles/globals.css`;
- `frontend/src/styles/public-sections.module.css`;
- route-level `SeoHelmet`;
- dark/light premium cadence;
- section-by-section delivery discipline.

### 15.4 Что было выброшено
Из `/pricing` были удалены и больше не считаются каноникой:
- старый drifted visual language;
- legacy Page-wrapper dependency для самой pricing page;
- экспериментальные motion demo-блоки;
- неудачные перегруженные варианты feature-heavy pricing UX;
- лишние placeholder-секции, которые ничего не добавляли.

### 15.5 Что было подтверждено по product truth
Во время pricing workstream дополнительно зафиксировано:
- **business hours** — пока **не shipping**, в pricing не обещать;
- **business services / offerings** — пока **не shipping end-to-end**, в pricing не обещать;
- **AI helper** — shipping и допустим в pricing copy;
- **analytics** — shipping premium capability, допустим в pricing copy;
- `Basic בלי אנליטיקה` — **не рекомендован и не принят**;
- `חברות וארגונים` — **реальное shipping направление**, но не self-serve pricing card.

### 15.6 Принятое business решение по `חברות וארגונים`
Для компаний/организаций принято не делать сейчас self-serve org signup как обычную регистрацию.

Вместо этого:
- **sales-assisted / founder-led motion**;
- CTA на связь / предложение;
- без публичной жёсткой org price matrix;
- без раннего открытия полного self-serve B2B onboarding.

Это признано более зрелым путём на текущем этапе.

### 15.7 Принятое решение по pricing architecture
Финальная pricing-архитектура:
1. Hero
2. Pricing plans section
3. `חברות וארגונים` featured enterprise card внутри pricing layer
4. Annual-value editorial section
5. Final CTA section
6. FAQ section

### 15.8 Hero section
Hero был перестроен так, чтобы:
- давать сильное первое впечатление;
- позиционировать страницу;
- не смешивать в hero роль выбора плана;
- использовать product visual, а не pricing summary в hero;
- держать тот же premium язык, что Home и `/cards`.

### 15.9 Pricing plans section
Принята следующая модель:
- 3 self-serve cards:
  - ניסיון חינמי
  - פרימיום חודשי
  - פרימיום שנתי
- тёмные premium cards;
- grouped accordions внутри карточек;
- no grid;
- mobile-first rail below 48rem;
- desktop 3-up row на 48rem+;
- annual visually featured.

### 15.10 Почему grouped accordions, а не длинные row-by-row feature toggles
Было доказано, что длинные per-row accordions внутри cards создают:
- слишком длинные mobile sections;
- слабый scan rhythm;
- CTA displacement.

Поэтому была принята grouped model:
- fewer, larger accordion groups;
- clear grouping;
- cleaner mobile UX.

### 15.11 Mobile rail
Для mobile pricing cards был принят **showcaseRail-like** паттерн:
- page-local only;
- без зависимости от `Cards.module.css`;
- с явным next-card peek;
- desktop untouched.

Важный practical lesson:
- pricing-specific mobile rail fixes не должны уходить в `PublicCardPage.module.css` или `globals.css`;
- pricing-specific visual bugs решаются **локально в `Pricing.module.css`**, а не глобальным scope bleed.

### 15.12 `חברות וארגונים` block
Итоговая правильная форма:
- не 4-я обычная pricing-card;
- не full-width баннер;
- а **centered featured enterprise card**;
- внутри той же light pricing section;
- sales-led CTA;
- отдельная B2B семантика;
- не смешивать её с self-serve plan logic.

### 15.13 Annual-value section
Была создана отдельная тёмная editorial section:
- заголовок по центру;
- image;
- SEO-friendly editorial text;
- internal link на Home через `Cardigo`;
- CTA на free-trial;
- цель — объяснить, почему бизнесам выгоден annual plan.

Эта секция заменяет слабую “guidance ради guidance” и реально добавляет новый смысл.

### 15.14 Final CTA section
Финальный light-layer closing block:
- центрированный heading;
- image;
- intro text с internal link на Home через `Cardigo`;
- checklist of business value;
- один CTA на free trial / card creation flow.

Эта секция была признана правильным closing block.

### 15.15 FAQ section
FAQ стала последней секцией страницы.

Принято:
- 10 pricing-specific вопросов;
- SEO-friendly, но без keyword stuffing;
- внутренние ссылки на Home через `Cardigo` ровно в нескольких местах, а не везде;
- использовать существующий shared FAQ visual pattern;
- удалить нижний placeholder `מוכנים להתחיל?` полностью.

### 15.16 Что важно помнить по `/pricing`
`/pricing` сейчас считается **закрытой**.

Это значит:
- не открывать её заново без сильной причины;
- не устраивать broad redesign поверх уже принятой страницы;
- мелкие P2 polish допустимы позже, но сейчас не являются workstream trigger.

### 15.17 Optional P2, которые были сознательно оставлены как non-blocking
Остались только мелкие non-blocking polish моменты:
- `חינמי` vs `חינם` consistency;
- `:active` states на части CTA;
- pricing-specific OG asset вместо generic home OG fallback.

Это **не причины** переоткрывать `/pricing`.

---

## 16) Что нельзя делать

Нельзя:
- быстро чинить без audit;
- смешивать boundaries;
- ломать архитектуру ради скорости;
- позволять Copilot делать “заодно поправил”;
- возвращать inline styles / grid / invented typography tokens;
- трогать CardLayout casually;
- придумывать новые `--fs-*` names;
- документировать stale truth как current truth;
- делать broad card-scope cleanup без отдельного доказательного audit;
- открывать снова закрытую `/pricing` без реального P0/P1 business case.

---

## 17) Как правильно формулировать задачи для Copilot

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

Если задача styling/public-page heavy:
- сначала определить section role;
- потом доказать boundary;
- потом проверить shared public layer;
- только потом писать page-local CSS.

---

## 18) Тактика работы, которая считается правильной

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

### Важный tactical lesson из pricing workstream
Если секция не добавляет нового смысла, а повторяет уже существующий — **лучше удалить её**, чем держать “секцию ради секции”.

Это было доказано на pricing.

---

## 19) Что логично делать дальше

После закрытия `/pricing` логичные следующие направления такие.

### 19.1 Следующая public page / marketing surface
Теперь логично взять следующий public surface и так же собирать его:
- section-by-section;
- через public canon;
- с опорой на shared layer;
- без drift.

### 19.2 Auth / registration hardening
Это по-прежнему сильный backend/security workstream:
- улучшать auth/registration;
- улучшать token / API error handling;
- продолжать harden security posture;
- двигать проект в сторону enterprise-ready onboarding.

### 19.3 Ops / production readiness
- monitoring / alerts;
- CI/CD baseline;
- release discipline;
- stress/performance/security testing;
- runbooks.

### 19.4 SEO / OG asset polish
Отдельный low-risk workstream может быть посвящён:
- dedicated OG assets для ключевых public pages;
- fine SEO polish;
- truth-aligned page-specific media.

### 19.5 Card-boundary typography only if really needed
Это **не обязательный следующий шаг**.
Возвращаться туда стоит только:
- если появится реальный bug;
- или будет отдельный workstream по card typography / card renderer hardening.

---

## 20) Что проект ещё должен включать и усиливать дальше

Проект уже большой, но enterprise-мышление требует смотреть дальше.

### Что продолжать усиливать:
- billing clarity;
- premium entitlements;
- org/admin maturity;
- monitoring/alerts;
- security hardening;
- performance readiness;
- stress testing;
- better ops/runbooks;
- clearer support/debug documentation;
- bounded truth-aligned AI growth;
- product clarity around what is AI-assisted and what is deterministic.

### Что важно по org/company направлению
Следующий B2B рост лучше строить так:
- sales-led / contact-led onboarding сначала;
- collecting real demand before self-serve org signup;
- volume discounts — только после реальных кейсов и лучше в связке с годовым коммитментом;
- не выкатывать prematurely public org pricing matrix без validated demand.

---

## 21) Готовый стартовый блок для нового окна ChatGPT

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
- centralized pre-launch robots policy lives in index.html
- весь non-deferred typography debt cleaned
- broad card-boundary cleanup deferred intentionally
- CardLayout.module.css нельзя трогать casually

Важно по /pricing:
- hero accepted
- pricing cards accepted
- grouped accordions accepted
- mobile rail accepted
- B2B featured enterprise card accepted
- annual editorial section accepted
- final CTA accepted
- FAQ accepted
- do not reopen /pricing without strong reason

Следующая задача: <вставить bounded задачу>.
```

---

## 22) Финальное напутствие

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

## 23) Короткая итоговая выжимка

Если совсем коротко, то сегодня Cardigo — это:

- mature Israel-first SaaS for digital business cards;
- с сильной frontend governance;
- с защищёнными backend/security invariants;
- со structured SEO/JSON-LD layer;
- с About AI, FAQ AI v1 и SEO AI;
- с unified shared AI budget:
  - free = 10
  - premium = 30
- с закрытой `/cards` examples page;
- с закрытой `/pricing` premium pricing page;
- с централизованной pre-launch robots policy;
- с очищенным non-deferred typography debt;
- с enterprise workflow:
  - audit → minimal fix → verification → docs.

Статус текущего большого public цикла:
**закрыт на хорошем enterprise-уровне.**
