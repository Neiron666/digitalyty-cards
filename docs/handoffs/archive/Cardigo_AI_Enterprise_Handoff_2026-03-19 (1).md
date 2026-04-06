# Cardigo / Digitalyty Cards - Enterprise Handoff для следующего окна ChatGPT

_Обновлено: 2026-03-19_

---

## 0) Что это за документ

Это **большой переносной `.md`-handoff** для следующего окна ChatGPT.

Его задача:

- быстро ввести новый чат в **полный контекст проекта**;
- сохранить **архитектурную доктрину** проекта;
- зафиксировать **рабочие правила**, которые нельзя нарушать;
- описать, **что уже сделано**, особенно по AI-направлению;
- не потерять **инварианты, контракты, boundaries и enterprise-стиль мышления**;
- дать безопасную стартовую точку для следующих задач;
- напомнить роль ChatGPT как **Senior Project Architect / Senior Full-Stack / Enterprise Consultant**;
- сохранить правильную тактику работы с **Copilot Agent**.

Это не просто заметки. Это **операционный handoff**, который можно использовать как инструкцию для следующего окна ChatGPT и как рабочую памятку по проекту.

---

## 1) Что это за проект

### 1.1 Продукт

**Cardigo** - это SaaS-платформа для создания, редактирования, публикации и распространения **цифровых визитных карточек** для рынка Израиля.

Но по сути проект уже давно не “просто конструктор визиток”.

Карточка в Cardigo - это:

- не только контактная карточка;
- а **публичный мини-сайт / business presence page**;
- который можно:
    - открыть по ссылке,
    - делиться им в соцсетях,
    - передавать через QR,
    - индексировать в поиске,
    - анализировать через встроенную аналитику,
    - редактировать в self-service режиме.

Итоговая продуктовая формула:

> **Cardigo = digital business card + mini business page + share/distribution layer + analytics layer + self-service editing.**

---

### 1.2 Бренды и разделение

Очень важное правило проекта:

- **Cardigo** - отдельный продукт и отдельный бренд.
- **Digitalyty** - отдельный бренд / сайт / маркетинговый слой.

Их **нельзя смешивать** в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- schema / structured data;
- marketing positioning внутри Cardigo.

---

### 1.3 Канонический домен

Для Cardigo принят канонический production domain:

**https://cardigo.co.il**

Политика:

- non-www canonical;
- Digitalyty не должен появляться как canonical/source brand внутри Cardigo product SEO.

---

### 1.4 Основные поверхности продукта

Проект включает несколько разных контуров:

#### Public / SEO surfaces

- `/`
- `/blog`
- `/blog/:slug`
- `/pricing`
- `/contact`
- `/guides`
- `/cards`
- `/privacy`
- `/terms`

#### Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

#### Preview / internal surfaces

- preview routes
- editor preview

#### Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

#### Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

#### Admin surface

- `/admin`

Очень важно никогда не смешивать эти контуры “по ощущениям”.
Сначала нужно **доказать boundary**, потом менять.

---

## 2) High-level архитектура

### 2.1 Frontend

- React
- Vite
- RTL-first
- CSS Modules only
- Mobile-first
- Flex only
- token-based styling system
- единая SSoT render chain для public + preview
- route-level SEO/head через shared abstraction

Ключевые frontend-узлы:

- `CardRenderer`
- `TemplateRenderer`
- `CardLayout`
- `EditCard`
- editor panels / preview
- templates registry
- skins system

---

### 2.2 Backend

- Node.js
- Express
- MongoDB / Mongoose
- DTO-driven public paths
- owner/org gates
- guarded public surfaces
- anti-enumeration posture
- manual index governance (`autoIndex` / `autoCreate` OFF)

Ключевые backend-контуры:

- auth / registration / invites
- card CRUD + publish logic
- DTO generation for public paths / OG paths
- org membership/security
- analytics
- AI endpoints (About AI workstream уже реализован)

---

### 2.3 Infra / Platform

- Frontend: Netlify
- Backend: Render
- Storage: Supabase Storage
- Email: Mailjet
- Local verification discipline: **PowerShell + `curl.exe`**
- Gates / sanity / build checks как часть delivery discipline

---

## 3) Главная доктрина проекта

### 3.1 Роль ChatGPT

В этом проекте ChatGPT работает как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

Обязанности ChatGPT:

- принимать архитектурные решения;
- защищать SSoT, контракты и инварианты;
- думать про blast radius, безопасность, масштабируемость, поддерживаемость;
- не допускать scope creep;
- готовить правильные bounded prompts для Copilot Agent;
- требовать PROOF и RAW outputs;
- валидировать решения как архитектор, а не как “быстрый помощник”.

ChatGPT в этом проекте не должен работать как случайный ассистент. Он должен мыслить **enterprise-уровнем**.

---

### 3.2 Роль Copilot Agent

Copilot Agent - **исполнитель, а не архитектор**.

Его роль:

- делать read-only audit;
- давать PROOF (`file:line-range`);
- выполнять минимальные правки;
- запускать проверки;
- показывать RAW stdout + EXIT;
- не расширять scope самовольно.

---

### 3.3 Строгий фазовый режим

Для каждой задачи с Copilot:

#### Phase 1 - Read-Only Audit

- никаких изменений;
- только анализ;
- root cause;
- flow map;
- risks;
- minimal change surface;
- PROOF `file:line-range`;
- STOP.

#### Phase 2 - Minimal Fix

- только утверждённый scope;
- минимальная поверхность изменений;
- обычно 1–3 файла, иногда больше, если это реально оправдано контрактом;
- без рефакторинга “заодно”;
- без форматирования “для красоты”;
- backward compatible;
- STOP.

#### Phase 3 - Verification

- gates / sanity / build / smoke;
- RAW stdout + EXIT;
- ручные smoke через PowerShell `curl.exe` при необходимости;
- PASS / FAIL / PARTIAL PASS;
- STOP.

Главная формула проекта:

> **Architecture → Audit → Minimal Fix → Verification → Documentation**

---

## 4) Жёсткие ограничения проекта (не нарушать)

### 4.1 Ограничения для всех будущих Copilot prompts

```text
Ты - Copilot Agent, acting as senior full-stack engineer with strong SEO/information-architecture awareness and enterprise discipline.

PROJECT MODE: Cardigo enterprise workflow. Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
```

Этот prefix block должен быть **в начале каждого будущего промпта** для Copilot Agent.

---

### 4.2 Общие ограничения

- **No git commands**
- **No inline styles**
- **CSS Modules only**
- **Flex only - no grid in styles**
- **Mobile-first mandatory**
- Typography policy:
    - `font-size` только через `var(--fs-*)`
    - `--fs-*` только rem-only
    - никакого `px/em/%/vw/vh/clamp/fluid`
    - никакого `calc(non-rem)`

---

### 4.3 Frontend governance

Перед любой frontend markup/styling задачей нужно опираться на:

- `frontend.instructions.md`
- `docs/policies/frontend-markup-styling.md`
- `docs/typography-ssot.md`
- `docs/policies/typography-mobile-first.md`
- если задача касается cards:
    - `docs/cards-styling-architecture.md`

Нельзя смешивать без доказательства:

- app-shell / marketing / admin / auth
- editor-shell
- preview wrapper
- card-boundary

App-side typography уже была вычищена - literal `font-size` не возвращать.

`CardLayout.module.css` нельзя трогать casually.

Card-boundary typography - high-blast-radius exception.

Skins - только token-only.

Preview-only стили - только под `[data-preview="phone"]`.

CardLayout DOM skeleton не менять без отдельной migration-задачи.

---

### 4.4 Core invariants

- SSoT render chain public + preview
- templates registry только в `frontend/src/templates/templates.config.js`
- skins = token-only
- public/QR/OG URLs строить только из backend DTO (`publicPath`, `ogPath`)
- org security: anti-enumeration 404, membership-gate до SEO/410
- sitemap без N+1
- backend index governance manual (`autoIndex` / `autoCreate` OFF)

---

## 5) Motion subsystem doctrine

Motion subsystem уже существует и проверен.

### Что уже есть

- V1 reveal framework
- V2 scroll-linked framework
- parameterized V2 local tuning API

### V1

Используется для one-time reveal:

- `motion.module.css`
- `useMotionReveal`

### V2

Используется для scroll-linked effects:

- `motion-scroll.module.css`
- `useScrollProgress`

### Approved V2 effects

- `scrollZoomSoft`
- `scrollParallaxSoft`
- `scrollDriftInline`
- `scrollDriftInlineWrap`

### Правила

- local tuning только через CSS Modules
- никаких JSX style props
- единственный допустимый style mutation carve-out:
    - `el.style.setProperty('--scroll-progress', '<numeric 0..1>')` внутри `useScrollProgress`
- нельзя stack reveal transform + scroll transform + hover transform на одном DOM node
- safe pattern:
    - reveal → wrapper
    - scroll effect → inner
- motion разрешён в marketing/app-shell approved sections
- motion запрещён в card-boundary и preview wrapper

---

## 6) Статус проекта до AI workstream

До AI workstream уже были важные законченные направления:

- homepage restructuring как narrative/conversion funnel;
- homepage FAQ + FAQPage JSON-LD;
- route-level SEO/head архитектура;
- dev-safe head hardening;
- runtime sitemap generation с static + dynamic public URLs;
- frontend governance / typography remediation;
- motion framework groundwork;
- image upload canonicalization/hardening;
- org/public security invariants;
- premium/entitlements/billing direction.

Это важно помнить: AI workstream добавлялся уже в зрелый проект, а не в хаотичную песочницу.

---

## 7) AI workstream - что именно было сделано

Ниже - итог AI-направления, которое было собрано и доведено до рабочего состояния.

### 7.1 Product intent

Цель AI workstream:

- помочь пользователю быстрее заполнять блок **About** в карточке;
- дать не только “магическую кнопку”, а управляемый, объяснимый и ограниченный AI UX;
- не ломать текущий editor flow;
- не нарушать enterprise doctrine проекта.

### 7.2 Out of scope на текущем этапе

- FAQ AI - future workstream
- SEO AI - future workstream
- scripts/head snippets AI - не делалось
- anonymous AI generation - не делалось
- global AI dashboard - не делался
- non-About content AI - не делалось

---

## 8) About AI - текущее продуктовое поведение

### 8.1 Поддерживаемые target'ы

#### `full`

Генерирует:

- `aboutTitle`
- `aboutParagraphs` (до 3)

#### `title`

Генерирует:

- только `aboutTitle`

#### `paragraph`

Генерирует:

- только один paragraph suggestion
- response содержит:
    - `aboutParagraph`
    - `paragraphIndex`

### 8.2 Режимы

- `create` - если About секция пустая
- `improve` - если в карточке уже есть about content

Frontend сам определяет mode до запроса.
Backend при этом оставляет safe defaults.

### 8.3 UX

Пользователь может:

- сгенерировать весь блок About;
- сгенерировать только title;
- сгенерировать только конкретный paragraph;
- посмотреть preview;
- нажать Apply;
- нажать Dismiss;
- удалить paragraph (если paragraphs > 1).

### 8.4 Delete paragraph rule

- если paragraphs > 1 → показывается delete button;
- если остаётся только 1 paragraph → delete button скрывается;
- если preview был для удалённого paragraph → preview очищается;
- если preview был для более позднего paragraph, а удалён более ранний → `aiParagraphIndex` сдвигается.

### 8.5 Consent / disclosure

- перед первым AI generation на устройстве/браузере, пока consent не сохранён локально, показывается consent modal;
- согласие хранится в `localStorage`;
- есть persistent disclosure UX рядом с AI действиями.

### 8.6 Quota visibility

- quota подгружается на mount;
- quota обновляется после success или quota-bearing errors;
- quota hint визуально показан рядом с каждым AI action cluster;
- если `remaining <= 0`, AI buttons disabled.

---

## 9) About AI - backend architecture

### 9.1 Endpoint'ы

#### Suggest endpoint

`POST /api/cards/:id/ai/about-suggestion`

#### Quota endpoint

`GET /api/cards/:id/ai/quota?feature=ai_about_generation`

Оба endpoint'а требуют auth.

### 9.2 Request contract

```json
{
  "mode": "create" | "improve",
  "language": "he" | "en",
  "target": "full" | "title" | "paragraph",
  "paragraphIndex": 0 | 1 | 2
}
```

Поведение:

- `mode` - defaultable
- `language` - defaultable
- `target` - defaultable to `full`
- invalid `target` → `400 INVALID_TARGET`
- invalid `paragraphIndex` for `target="paragraph"` → `400 INVALID_PARAGRAPH_INDEX`
- unknown extra fields игнорируются

### 9.3 Response shapes

#### Full

```json
{
    "ok": true,
    "suggestion": { "aboutTitle": "...", "aboutParagraphs": ["...", "..."] },
    "quota": {
        "feature": "ai_about_generation",
        "periodKey": "2026-03",
        "used": 5,
        "limit": 10,
        "remaining": 5
    }
}
```

#### Title

```json
{
  "ok": true,
  "suggestion": { "aboutTitle": "..." },
  "quota": { ... }
}
```

#### Paragraph

```json
{
  "ok": true,
  "suggestion": { "aboutParagraph": "...", "paragraphIndex": 1 },
  "quota": { ... }
}
```

### 9.4 Request handling order

`suggestAbout` идёт по такому порядку:

1. Feature flag (`AI_ABOUT_ENABLED`)
2. Auth check
3. Card lookup
4. Ownership check
5. Org membership gate
6. Parse + validate request
7. Daily anti-abuse limiter
   7b. Monthly quota check
8. Derive trusted context from card
9. Gemini call
10. Success-only monthly increment
11. Metadata log
12. Return suggestion + quota

Критично:

- validation теперь идёт **до** daily limiter;
- invalid requests не сжигают daily attempt slot;
- monthly quota считается только после success.

### 9.5 Auth / ownership / anti-enumeration

- endpoint защищён `requireAuth`;
- card должен принадлежать текущему user;
- для org cards - active membership gate;
- mismatch cases collapsed into 404 (anti-enumeration).

---

## 10) Gemini integration

### 10.1 Основной принцип

Gemini используется **только через backend**.

Frontend не знает API key и не должен знать.

### 10.2 Model governance

- `GEMINI_MODEL` allowlist:
    - `gemini-2.5-flash-lite`
    - `gemini-2.5-flash`
- default: `gemini-2.5-flash-lite`
- free-tier реально ограничивает provider-level usage

### 10.3 Structured output

Gemini вызывается с target-aware structured output policy:

- full schema
- title-only schema
- paragraph-only schema

### 10.4 Timeout

Есть hard timeout (15s), чтобы AI call не зависал бесконечно.

### 10.5 Provider error separation

Backend различает:

- `AI_PROVIDER_QUOTA` - upstream Gemini 429
- `AI_UNAVAILABLE` - other provider/config/timeout failures
- `INVALID_SUGGESTION` - unusable provider output

---

## 11) Frontend architecture для About AI

### 11.1 Основные файлы

- `frontend/src/services/ai.service.js`
- `frontend/src/components/editor/panels/ContentPanel.jsx`
- `frontend/src/components/editor/panels/ContentPanel.module.css`

### 11.2 ai.service.js

Отвечает за:

- `suggestAbout(cardId, payload)`
- `fetchAiQuota(cardId, feature)`

Использует existing shared `api` axios client.

### 11.3 Shared aiQuota state

В `ContentPanel` есть один shared `aiQuota` state:

- fetch on mount
- update from success response
- update from quota-bearing error
- используется всеми AI action clusters

### 11.4 Unified AI state machine

Вместо нескольких независимых state machines есть один unified flow:

- `aiState`
- `aiTarget`
- `aiParagraphIndex`
- `aiSuggestion`
- `aiError`

Это важно, потому что:

- only one preview active at a time;
- starting a new AI action clears prior preview/error;
- state management остаётся контролируемым.

### 11.5 Apply behavior

- `title` → пишет только `aboutTitle`
- `paragraph` → меняет только один paragraph, через `commitAboutParagraphs`
- `full` → пишет title + paragraphs

### 11.6 aboutText bridge

Для backward compatibility frontend сохраняет bridge:

- `aboutParagraphs`
- `aboutText = paragraphs.join("\n\n")`

Это нужно, пока legacy read paths ещё терпимы к `aboutText`.

---

## 12) Quota и limiter policy

### 12.1 Monthly product quota

#### Free

- 10 successful generations / month

#### Premium

- 50 successful generations / month

Считаются только successful generations.

### 12.2 Daily anti-abuse rail

#### Free

- 15 attempts / day

#### Premium

- 75 attempts / day

Это **не продуктовая квота**, а safety rail.

Считает attempts, но invalid validation failures теперь не входят.

### 12.3 Почему это 3 разных слоя

Есть 3 независимых уровня ограничений:

#### A. Monthly product quota

Пользователь видит её в UI.

#### B. Daily anti-abuse limiter

Нужен для runaway requests / abuse, но не должен быть главным UX лимитом.

#### C. Provider quota

Внешний лимит Gemini / Google.

Эти слои нельзя смешивать в одно сообщение.

---

## 13) Error taxonomy (текущая)

| Code                       | HTTP | Meaning                                               |
| -------------------------- | ---- | ----------------------------------------------------- |
| `AI_DISABLED`              | 503  | Feature flag off                                      |
| `UNAUTHORIZED`             | 401  | No authenticated user                                 |
| `NOT_FOUND`                | 404  | Card not found / not owned / org gate failed          |
| `INVALID_TARGET`           | 400  | Invalid `target`                                      |
| `INVALID_PARAGRAPH_INDEX`  | 400  | Invalid `paragraphIndex`                              |
| `RATE_LIMITED`             | 429  | Internal daily anti-abuse rail                        |
| `AI_MONTHLY_LIMIT_REACHED` | 429  | Monthly product quota exhausted                       |
| `AI_PROVIDER_QUOTA`        | 429  | Upstream Gemini provider quota/rate limit             |
| `INVALID_SUGGESTION`       | 502  | Gemini returned unusable output                       |
| `AI_UNAVAILABLE`           | 503  | Timeout, missing key, generic provider/config failure |

### Frontend Hebrew mapping

Примерно так:

- `RATE_LIMITED` → generic anti-abuse message, без слова “daily”
- `AI_PROVIDER_QUOTA` → provider exhausted temporarily
- `AI_MONTHLY_LIMIT_REACHED` → monthly quota exhausted
- `INVALID_SUGGESTION` → AI returned unusable content
- `AI_UNAVAILABLE` → service temporarily unavailable
- `INVALID_TARGET` / `INVALID_PARAGRAPH_INDEX` → bad request

---

## 14) Persistence и index governance

### 14.1 AiUsageMonthly model

Основные поля:

- `userId`
- `feature`
- `periodKey`
- `count`

### 14.2 Feature bucket

Сейчас используется:

- `ai_about_generation`

Это оставляет пространство для:

- `ai_faq_generation`
- `ai_seo_generation`

### 14.3 periodKey

- UTC month
- формат `YYYY-MM`

### 14.4 Unique index

Уникальный compound index:

```js
{ userId: 1, feature: 1, periodKey: 1 }
```

### 14.5 Governance rule

- `autoIndex` / `autoCreate` OFF
- runtime auto-indexing нельзя считать рабочей стратегией
- index applied manually through migration script

### 14.6 Migration script

Используется:

- `backend/scripts/migrate-aiusagemonthly-indexes.mjs`

`package.json` содержит:

- `migrate:aiusagemonthly-indexes`

Script поддерживает:

- dry-run default
- `--apply`
- `--verbose`
- duplicate precheck
- post-check после `createIndex`
- `NamespaceNotFound` handling

### 14.7 Текущий operational status

AiUsageMonthly index governance **операционно закрыт**:

- dry-run был clean;
- apply прошёл;
- повторный dry-run подтвердил, что индекс уже существует.

---

## 15) Environment / operational dependencies

### 15.1 Required env

- `AI_ABOUT_ENABLED`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, with default/fallback)

### 15.2 Runtime assumptions

- backend должен быть поднят;
- MongoDB должна быть доступна;
- auth middleware должен работать;
- AI routes должны быть смонтированы;
- provider quota на Gemini может в любой момент стать внешним blocker.

### 15.3 Важный operational lesson

Во время работы был подтверждён реальный provider free-tier ceiling.
Это не кодовая ошибка, а внешний operational ceiling. Поэтому UI и backend теперь должны отличать:

- внутренние лимиты Cardigo;
- внешнюю временную недоступность/исчерпание Gemini.

---

## 16) Что было подтверждено по AI workstream

### Закрытые направления

- About AI backend foundation
- About AI frontend UX v1
- About AI frontend UX v2
- target-aware generation
- monthly quota backend + frontend
- limiter policy alignment
- provider quota distinction
- AiUsageMonthly index governance
- targeted validation/error hardening

### Verification status

Не каждый шаг имел идеальный fully-live automated runtime verification, потому что локальный backend не всегда был поднят в момент прогона, а provider quota иногда мешал. Но по сумме:

- statics доказаны;
- gates pass;
- runtime manual proofs были;
- product behavior был подтверждён живыми проверками.

Итого AI workstream можно считать **собранным и закрытым на хорошем enterprise-уровне**.

---

## 17) Known caveats / limitations

1. Внешний Gemini quota всё ещё может блокировать генерацию даже при наличии monthly quota у пользователя.
2. Daily limiter считает attempts, monthly quota считает successes.
3. Daily limiter не persisted, сбрасывается при restart.
4. `mode` / `language` остаются defaultable, а не strict.
5. Unknown request fields игнорируются.
6. Consent storage опирается на localStorage.
7. INVALID_SUGGESTION path трудно стабильно воспроизводить вручную без искусственного stubbing.
8. FAQ / SEO AI пока не реализованы.

---

## 18) Как правильно работать дальше

### 18.1 Что делать первым делом в новом окне ChatGPT

1. Вставить этот handoff.
2. Зафиксировать, что ChatGPT работает как Senior Project Architect / Enterprise Consultant.
3. Продолжать работу только enterprise-стилем.
4. Все задачи для Copilot - только через phase discipline.

### 18.2 Как формулировать будущие задачи

Всегда сначала:

- цель;
- expected behavior;
- constraints;
- what is in scope;
- what is out of scope.

Потом:

- Phase 1 audit only
- дождаться PROOF
- принять архитектурное решение
- потом Phase 2 minimal fix
- потом Phase 3 verification

### 18.3 Что нельзя делать

- нельзя просто “быстро чинить” без audit;
- нельзя смешивать контуры;
- нельзя жертвовать архитектурой ради скорости;
- нельзя позволять Copilot делать “заодно поправил”;
- нельзя возвращать inline styles / grid / typography drift.

---

## 19) Следующие логичные workstreams после AI

Следующие направления, которые можно брать дальше:

### 19.1 FAQ AI

Отдельный bounded workstream:

- audit
- API shape
- quota feature bucket
- UI flow

### 19.2 SEO AI

Отдельный bounded workstream:

- text-only SEO first
- scripts/snippets/manual-only policy
- premium contour

### 19.3 AI runbook / ops documentation

Можно расширить docs:

- provider troubleshooting
- quota behavior
- env management
- incident response
- API key rotation

### 19.4 General product hardening

- auth/registration hardening
- API error paths
- security layers
- CI/CD monitoring discipline
- stress/scalability testing
- broader documentation

---

## 20) Готовый стартовый блок для следующего окна ChatGPT

Ниже текст, который можно вставить в новое окно как стартовый контекст:

> Ты - Senior Project Architect / Senior Full-Stack / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot - исполнитель. Работаем строго фазами: Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP; Phase 2 Minimal Fix (1–3 файла, без рефакторинга/форматирования, backward compatible) → STOP; Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP. Ограничения Copilot: No git commands. No inline styles. CSS Modules only. Flex only - no grid in styles. Mobile-first mandatory. Typography policy: font-size только через var(--fs-_), --fs-_ rem-only, без px/em/%/vw/vh/clamp/fluid и calc(non-rem). Инварианты: SSoT render chain public+preview; templates registry только frontend/src/templates/templates.config.js; skins token-only; preview-only стили только [data-preview="phone"]; CardLayout DOM skeleton не менять; public/QR/OG только из backend DTO publicPath/ogPath; org security anti-enumeration 404 и membership-gate до SEO; sitemap без N+1; backend index governance autoIndex off, drift via sanity, manual index scripts only. AI workstream по About уже собран: target-aware generation, monthly quota, limiter alignment, provider quota distinction, frontend UX v2, index governance closed. Сейчас задача: <вставить текущую bounded задачу>.

---

## 21) Финальное напутствие

Проект уже зрелый.
Это не песочница, где можно быстро что-то подкрасить и побежать дальше.

Правильный подход здесь:

- не спешить;
- не расползаться по scope;
- не смешивать архитектурные уровни;
- не ломать boundary ради удобства;
- всегда сначала доказывать;
- потом чинить минимально;
- потом проверять;
- потом документировать.

Главное правило проекта:

> **Не искать самый быстрый путь. Искать самый безопасный, зрелый и enterprise-правильный путь.**
