# Cardigo — Enterprise Master Handoff / Next Chat Playbook
_Обновлено: 2026-03-26 (guides subsystem MVP complete, admin upload UX clarified, delete lifecycle runtime-verified)_

---

## 0) Что это за документ

Это канонический **master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Задача документа:

- быстро ввести новый чат в реальный проектный контекст;
- сохранить продуктовую, архитектурную и operational truth;
- зафиксировать рабочую доктрину enterprise-уровня;
- перечислить, что уже закрыто и что нельзя casually переоткрывать;
- передать последний статус по blog / contact / pricing / governance / guides;
- объяснить, как правильно работать с Copilot Agent без дрейфа, лишнего рефакторинга и без “заодно поправил”;-
- задать безопасный путь для следующих bounded workstream-ов.

Это не просто заметки. Это одновременно:

- handoff;
- architecture memo;
- operating doctrine;
- senior-architect playbook;
- контрольный документ для следующего окна ChatGPT;
- инструкция по тому, **как** работать над проектом, а не только **что** в нём есть.

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
- premium / org / admin / AI growth surface.

Итоговая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing.**

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- продукт ориентирован на иврит и RTL;
- тексты, UX и default assumptions строятся под израильский рынок;
- multi-locale и internationalization не считаются текущей базой;
- country default для product assumptions допустимо считать **IL**, если это не нарушает контрактов.

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
- Cardigo и Digitalyty не смешивать в source-of-truth для каноникалов, OG, sitemap, URL logic и product copy.

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
- premium public pages family.

### 2.2 Backend

Стек:

- Node.js;
- Express;
- MongoDB / Mongoose;
- Supabase Storage;
- admin/public route split;
- manual index governance.

Ключевые backend-контуры:

- cards / public cards / org cards;
- auth / registration / onboarding;
- payments foundation;
- AI endpoints;
- analytics aggregates;
- blog subsystem;
- guides subsystem;
- sitemap / OG routes / discoverability.

### 2.3 Инфраструктурные и operational принципы

- manual index governance;
- anti-drift verification;
- add-only wiring в shared файлах;
- avoid high-blast-radius edits без доказательства boundary;
- proofs file:line-range обязательны для утверждений Copilot;
- smoke/manual checks выполнять через PowerShell + `curl.exe`, когда это реально возможно.

---

## 3) Жёсткая рабочая доктрина проекта

### 3.1 Роль ChatGPT

В этом проекте ChatGPT — не просто помощник, а:

- **Senior Project Architect**;
- **Senior Full-Stack Engineer**;
- **Enterprise Consultant**.

Задачи ChatGPT:

- проектирование и оптимизация архитектуры;
- защита SSoT, контрактов, границ и инвариантов;
- выбор безопасного порядка работ;
- аудит и анализ blast radius;
- security-minded review;
- подготовка bounded prompts для Copilot Agent;
- проверка PROOF / RAW outputs / runtime truth;
- контроль за тем, чтобы не было scope creep;
- поддержание enterprise-уровня мышления в проекте.

### 3.2 Роль Copilot Agent

Copilot Agent — **исполнитель**, а не архитектор.

Его роль:

- читать код и давать audit с PROOF;
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

Любое упоминание “двух фаз” считать лишь shorthand. Канонически verification всегда отдельная обязательная фаза.

### 3.4 Непереговорные ограничения для каждого Copilot prompt

Всегда использовать этот режим:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Всегда держать жёсткие ограничения:

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
- без “заодно поправил”;-
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

- SSoT render chain для public + preview обязателен;
- templates registry только в `frontend/src/templates/templates.config.js`;
- preview-only styles только под `[data-preview="phone"]`;
- `CardLayout` DOM skeleton и `CardLayout.module.css` — high-blast-radius зона, не трогать casually;
- public/QR/OG URLs должны строиться из backend truth (`publicPath`, `ogPath`), не угадываться на фронте.

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
- не придумывать новые typography tokens ad hoc.

### 4.4 Security / org / public truth

- anti-enumeration 404;
- membership-gate до SEO/410 на org surfaces;
- sitemap без N+1 дрейфа;
- manual index governance: `autoIndex/autoCreate` нельзя считать production truth.

---

## 5) Что уже закрыто и не должно casually переоткрываться

Ниже — зафиксированная закрытая правда проекта.

### 5.1 Premium public pages family

Приняты и закрыты как premium public surfaces:

- Home `/`
- `/cards`
- `/pricing`
- `/contact`
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`

Важно: это не значит, что на них никогда нельзя входить. Это значит:

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

Blog не должен рефакториться в “generic content engine” без очень сильного архитектурного основания.

### 5.3 Contact / pricing / governance workstreams

Закрыты и приняты:

- pricing public page;
- contact redesign;
- analytics/admin visibility related work;
- governance + hardening cycle 1–9;
- blog docs updates.

### 5.4 Broad card-boundary typography cleanup

Широкая типографическая чистка card-boundary намеренно **не** должна трогаться casually. Это high-blast-radius область.

---

## 6) Что именно было сделано в этом окне чата

Ниже — свежий handoff по последнему большому workstream.

### 6.1 Новый subsystem `/guides` построен как parallel bounded clone

Ключевое архитектурное решение:

- **не** рефакторить blog в общий движок;
- **не** трогать blog как accepted subsystem;
- строить `/guides` как **parallel bounded clone / parallel guides subsystem**.

Это было принципиально правильно, потому что:

- уменьшило blast radius;
- сохранило blog untouched;
- позволило повторить proven pattern;
- избежало speculative abstraction.

### 6.2 Backend foundation для guides закрыт

Подняты отдельные guides-контуры:

- отдельная модель / collection (`guideposts`);
- отдельный config SSoT;
- отдельные public routes;
- отдельный admin controller;
- отдельный public controller;
- отдельный migration script для индексов;
- отдельный storage namespace `guides/...`;
- `guideHero` / `guideSectionImage` image policy profiles.

### 6.3 Index governance для guides закрыт правильно

Для guides индексы были добавлены по enterprise-схеме:

- dry-run;
- apply;
- post-check / idempotent verification.

Это важно: индексы не “надеются” на Mongoose autoIndex, а проходят через явный governance path.

### 6.4 Исправлен shared image policy bug

Был найден и исправлен общий баг в `imagePolicy`:

- profile resolver lowercased kind;
- часть camelCase profile keys была недостижима;
- из-за этого section images могли тихо падать в default profile.

Исправление было сделано в shared truth-layer и было принято, потому что:

- баг был реальным;
- guides его унаследовал;
- фикс был минимальный;
- это не был “левый рефактор”.

### 6.5 Admin guides frontend закрыт

Сделан admin contour для guides по образцу blog:

- `AdminGuidesView.jsx`;
- `AdminGuidesView.module.css`;
- additive wiring в `Admin.jsx`;
- additive functions в `admin.service.js`;
- полная parity с blog admin CRUD.

### 6.6 Public guides surface закрыт

Сделаны:

- `Guides.jsx`;
- `Guides.module.css`;
- `GuidePost.jsx`;
- `GuidePost.module.css`;
- router wiring:
  - `/guides`
  - `/guides/page/:pageNum`
  - `/guides/:slug`
- `SeoHelmet`;
- FAQ JSON-LD на listing;
- `Article + BreadcrumbList` JSON-LD на detail;
- `/og/guides/:slug`;
- sitemap integration.

### 6.7 Naming / drift audit по guides закрыт

Был сделан отдельный verification closure, который доказал:

- нет stray `/blog/...` leakage в public copy;
- нет неправильных blog paths в guides SEO/canonical/JSON-LD/sitemap logic;
- временный reuse blog hero asset допускается только как временный content reuse.

### 6.8 Upload UX bug найден и исправлен правильно

Была обнаружена проблема в admin upload UX и для blog, и для guides.

Суть:

- upload button была disabled по `selectedBusy || !selectedId`;
- file input и alt field оставались активны;
- пользователь выбирал файл, но upload button оставалась мёртвой;
- click не доходил до handler guard;
- понятной ошибки не было.

Первый фикс “сделать кнопку кликабельной” был отклонён и откатан как неправильный.

Правильное решение:

- оставить кнопки disabled;
- добавить ясный helper text на иврите:
  - для blog: `כדי להעלות תמונה צריך קודם לשמור את הפוסט.`
  - для guides: `כדי להעלות תמונה צריך קודם לשמור את המדריך.`

Это закрыто и принято.

### 6.9 Delete truth для blog + guides закрыт runtime-проверкой

Был сделан не только read-only audit, но и настоящий runtime smoke по delete lifecycle.

Подтверждено для **blog** и **guides**:

1. create temp entity;
2. upload hero image;
3. upload section image;
4. publish;
5. public API = `200`;
6. OG route = `200`;
7. sitemap содержит slug;
8. delete;
9. public API = `404`;
10. OG route = `404`;
11. sitemap больше не содержит slug;
12. storage objects после delete больше недоступны.

Итог:

- delete lifecycle принят как runtime-verified;
- blog и guides ведут себя симметрично;
- DB + public surfaces + discoverability + storage cleanup подтверждены.

---

## 7) Текущее состояние guides subsystem

### 7.1 Статус

**Guides subsystem = MVP-complete with blog-parity contour**

Это означает, что сейчас guides включает:

- backend foundation;
- admin CRUD;
- public list page;
- public detail page;
- OG route;
- sitemap integration;
- SEO / JSON-LD;
- media upload flow;
- delete lifecycle;
- UX helper для save-first перед upload.

### 7.2 Что ещё допустимо считать временным

Есть допустимые временные компромиссы:

- временный reuse hero/source asset от blog допускался как temporary content-level reuse;
- позже это можно заменить guides-specific asset без архитектурной ломки.

Если уже вручную заменены оставшиеся blog fallback paths на guides paths — отлично, просто считать это отдельным micro-follow-up, уже закрытым вручную.

---

## 8) Как правильно работать в следующем окне

### 8.1 Стартовая позиция нового чата

Следующее окно ChatGPT должно сразу принять как truth:

- проект живёт в enterprise-mode;
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant;
- Copilot = executor;
- все prompts идут фазами;
- все claims требуют PROOF;
- guides subsystem уже существует и закрыт на уровне MVP parity;
- blog и guides — parallel bounded subsystems, не один shared generic engine.

### 8.2 Как формулировать задачи

Любую новую задачу формулировать так:

1. какая цель;
2. какой ожидаемый результат;
3. какие ограничения;
4. какой контур запрещено трогать;
5. что является Definition of Done;
6. что нужно доказать, прежде чем что-то менять.

### 8.3 Как не ломать проект

Нельзя:

- лезть в shared files “потому что так удобнее”;
- трогать `globals.css` и public shared layer без доказанного system-level drift;
- превращать bounded clone в generic abstraction “на перспективу”;
- делать cleanup/refactor вне scope;
- думать, что успешный build = правильное решение;
- принимать code summary без post-change PROOF.

### 8.4 Как принимать или не принимать работу Copilot

Принимать только то, что:

- прошло audit с PROOF;
- имеет минимальный blast radius;
- прошло verification;
- не ломает accepted subsystems;
- не тащит scope creep;
- truthfully подтверждено runtime, если речь о lifecycle / API / delete / upload.

Если что-то пахнет “слишком удобно”, это надо перепроверять.

---

## 9) Практический шаблон хорошего Copilot prompt

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

## 10) Что проект уже включает

На текущий момент Cardigo включает следующие зрелые поверхности:

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

### Editing / admin

- editor for digital cards;
- premium/admin/org surfaces;
- blog admin CRUD;
- guides admin CRUD;
- analytics/admin related surfaces.

### Content / SEO / structured data

- route-level `SeoHelmet`;
- FAQPage JSON-LD;
- Article / Blog-like detail structured data;
- deterministic SEO logic;
- OG metadata generation;
- sitemap generation.

### Media

- hero image upload;
- section image upload;
- image canonicalization;
- Supabase storage;
- deletion cleanup lifecycle;
- save-first helper UX in admin.

### AI / growth

- AI about generation;
- AI FAQ;
- AI SEO;
- quota governance;
- premium surface expansion logic.

---

## 11) Что проект ещё должен включать / куда логично двигаться дальше

Ниже — не хаотичный wishlist, а зрелые следующие направления.

### 11.1 Контентное заполнение и живой smoke по guides

Самый естественный следующий продуктовый шаг после guides MVP:

- создать реальные guides через админку;
- опубликовать;
- проверить реальный живой public flow с настоящим контентом;
- проверить UX listing/detail не только на пустом dataset.

### 11.2 Документация / runbooks

Стоит зафиксировать guides subsystem в docs/handoff truth отдельно:

- что за модель;
- какие маршруты;
- как устроен upload;
- как устроен delete;
- где границы между blog и guides;
- что нельзя рефакторить без основания.

### 11.3 Auth / registration / error hardening

Roadmap, который уже давно считается правильным:

- улучшение auth/registration flows;
- hardening invalid token / invalid input paths;
- дальнейшая защита API;
- data-protection improvements.

### 11.4 CI/CD / monitoring / prod-hardening

До полноценного production maturity всегда важны:

- tests baseline;
- monitoring / alerts;
- release discipline;
- env/runtime truth checks;
- storage / payment / AI operational runbooks.

### 11.5 Performance / security / scale follow-up

После стабилизации продукта:

- security testing;
- stress / scalability testing;
- performance profiling;
- storage/orphan monitoring;
- runtime drift detection.

---

## 12) Что делать не стоит

Не делать:

- “давайте объединим blog и guides в generic content engine прямо сейчас”;
- broad frontend cleanup без конкретного business / architecture reason;
- random edits в `globals.css`;
- заход в `CardLayout.module.css` без migration-level основания;
- speculation-driven refactors;
- acceptance без runtime verification там, где она нужна;
- confusing same-step mixing of unrelated scopes.

Если задача кажется большой, её надо дробить на bounded steps, а не расширять одним промптом полпроекта.

---

## 13) Краткая инструкция для следующего окна ChatGPT

Если этот документ загружен в новый чат, следующий ChatGPT должен работать так:

1. Принять проектную правду и ограничения как закон.
2. Не переоткрывать закрытые workstreams без причины.
3. Сначала определить правильный contour задачи.
4. Дать bounded Phase 1 audit prompt для Copilot.
5. После ответа Copilot самому провести architect review.
6. Только потом выдавать Phase 2.
7. После реализации требовать verification closure.
8. При необходимости делать extra verification-only micro-step, а не притворяться, что доказательства уже достаточны.

Ключевой принцип:

> **Не скорость важнее всего, а зрелость решения и доказанная truth.**

---

## 14) Сверхкраткая сводка статуса на сейчас

Если нужно передать проект в 10 строках:

- Cardigo — Israel-first SaaS для digital business cards.
- Canonical domain: `https://cardigo.co.il`.
- ChatGPT = Senior Architect / Full-Stack / Enterprise Consultant.
- Copilot = executor, работает строго фазами.
- No git commands. No inline styles. CSS Modules only. Flex only. Mobile-first.
- Typography: only approved `var(--fs-*)` tokens, rem-only, no px/clamp/vw/etc.
- Blog subsystem закрыт и принят.
- Guides subsystem построен как parallel bounded clone и закрыт на уровне MVP parity.
- Admin upload UX для blog/guides исправлен через save-first helper text.
- Delete lifecycle для blog/guides runtime-verified end-to-end.

---

## 15) Последнее напутствие

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

