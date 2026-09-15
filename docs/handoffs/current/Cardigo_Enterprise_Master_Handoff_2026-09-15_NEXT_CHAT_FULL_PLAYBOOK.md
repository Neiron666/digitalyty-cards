# Cardigo — Enterprise Master Handoff / Project Doctrine / Next-Chat Playbook

**Дата:** 2026-09-15  
**Проект:** Cardigo — SaaS-платформа цифровых визитных карточек / mini-site для бизнеса  
**Canonical production domain:** `https://cardigo.co.il`  
**Базовый рынок:** Israel-first / Israel-focused  
**Базовый UX:** Hebrew / RTL-first, при этом уже поддерживается Russian / LTR mode для публичных карточек  
**Статус документа:** master handoff + инструкция для следующего окна ChatGPT  
**Главная цель:** сохранить архитектурную правду проекта, anti-regression тактику, текущий статус, правила взаимодействия с Copilot и точные следующие шаги без повторного длинного восстановления контекста.

---

# 0. Как использовать этот файл в новом окне ChatGPT

Этот файл нужно воспринимать не как обычный конспект, а как:

- project doctrine;
- architecture baseline;
- anti-regression contract;
- production-readiness playbook;
- текущую project truth;
- operational handoff;
- инструкцию для ChatGPT как Senior Project Architect;
- ограничения для Copilot Agent как исполнителя;
- список уже закрытых контуров;
- список текущих tails / deferred work;
- roadmap следующих действий.

Рекомендуемый стартовый prompt в новом окне:

```text
Мы продолжаем проект Cardigo.

Используй приложенный handoff как текущую project truth.

Работай как:
- Senior Project Architect
- Senior Full-Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior Security Engineer
- Billing / Entitlement Engineer
- SEO / SSR Engineer
- Production Readiness Engineer
- Enterprise Consultant

Copilot Agent — только исполнитель, не архитектор.

Соблюдай Cardigo enterprise workflow:
Architecture / Intent
→ Phase 1 Read-Only Audit with PROOF file:line-range
→ STOP
→ Phase 2 Minimal Fix
→ STOP
→ Phase 3 Verification with RAW stdout + EXIT
→ STOP
→ Documentation / Handoff
→ Controlled Rollout / Production Smoke

Ничего не принимать на веру.
Если картина не доказана — запросить узкий реаудит.
Не открывать широкие аудиты уже закрытых контуров без нового противоречащего proof.

Hard frontend rules:
- No inline styles
- CSS Modules only
- Flex only — NO CSS Grid
- Mobile-first
- font-size only via existing var(--fs-*) tokens
- --fs-* rem-only
- no px/em/%/vw/vh/clamp/fluid font-size
- no calc(non-rem)
- no scope creep
- no broad refactor without proof
- no “заодно поправил”

Текущий активный rollout:
ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH
= CLOSED / PASS / LOCALLY VERIFIED
= NOT YET PRODUCTION VERIFIED

Следующий шаг:
backend-first controlled release, затем frontend, затем production smoke.
```

---

# 1. Что такое Cardigo

Cardigo — не просто генератор визитной карточки.

Архитектурно продукт уже представляет собой SaaS-платформу для малого и среднего бизнеса:

```text
Cardigo
= digital business card
+ mini business page
+ public profile
+ QR/share layer
+ SEO layer
+ SSR / crawler layer
+ owner editor
+ analytics / tracking foundation
+ leads / contact layer
+ booking foundation
+ content/services/gallery/reviews/FAQ
+ billing/subscription
+ receipts/accounting integration
+ organization/team/entitlement layer
+ admin/operator tooling
+ multilingual public-card capability
+ lifecycle / retention / privacy foundations
```

Ключевой принцип:

**Карточка — это реальная публичная business surface, а не декоративный frontend-компонент.**

Поэтому любые изменения затрагивающие:

- canonical;
- public routing;
- public DTO;
- SSR;
- Googlebot;
- social crawler;
- OG;
- JSON-LD;
- billing;
- entitlement;
- organization scope;
- auth;
- editor state;
- payments;
- subscription;
- privacy;

должны рассматриваться как enterprise/high-blast-radius работа.

---

# 2. Product identity и brand boundary

## 2.1. Product truth

- Product: **Cardigo**
- Domain: **https://cardigo.co.il**
- Default language: Hebrew
- Default direction: RTL
- Additional proven public-card language mode: Russian / LTR
- Target: business owners / local businesses / independent professionals

## 2.2. Cardigo ≠ Digitalyty

Cardigo и Digitalyty нельзя смешивать в runtime truth.

Запрещено смешивать в:

- canonical URLs;
- SEO metadata;
- OG;
- structured data;
- sitemap;
- public routes;
- billing documents;
- receipt truth;
- analytics routing;
- tracking audiences;
- UI naming;
- product copy;
- API contracts.

Digitalyty — отдельный бренд / agency context.  
Cardigo — самостоятельный SaaS product.

---

# 3. Роль ChatGPT в проекте

ChatGPT в этом проекте — **архитектор и контролёр качества**, а не просто генератор кода или prompt writer.

Обязательная роль:

- Senior Project Architect
- Senior Full-Stack Engineer
- Senior Backend Engineer
- Senior Frontend Engineer
- Senior Security Engineer
- Billing / Payment Lifecycle Engineer
- Organization / Entitlement Engineer
- SEO / SSR Engineer
- Production Readiness Engineer
- Enterprise Consultant
- Documentation / Runbook Owner

Основные обязанности ChatGPT:

1. Защищать архитектурную правду.
2. Защищать SSoT.
3. Защищать public/private boundaries.
4. Не принимать Copilot claims без proof.
5. Требовать `file:line-range`.
6. Требовать RAW stdout + EXIT.
7. Не разрешать scope creep.
8. Не допускать “заодно поправил”.
9. Не разрешать refactor ради эстетики перед production.
10. Всегда думать о blast radius.
11. Проверять lifecycle, race/concurrency, rollback, stale state, mixed-scope users.
12. Не путать source implementation с production verification.
13. Разделять:
   - implemented;
   - locally verified;
   - committed;
   - pushed;
   - deployed;
   - production verified.
14. Держать закрытые контуры закрытыми.
15. Открывать повторный audit только при конкретном новом противоречащем proof.

---

# 4. Роль Copilot Agent

Copilot — **executor only**.

Он не должен самостоятельно принимать архитектурные решения, если есть:

- несколько возможных SSoT;
- security implications;
- SEO/crawler implications;
- billing implications;
- public/private DTO implications;
- organization/personal scope ambiguity;
- rollout ordering issues.

Copilot должен:

```text
Audit first
→ prove boundaries
→ STOP

Implement minimal approved scope
→ STOP

Verify exactly
→ raw stdout + exit
→ STOP
```

Он не должен:

- запускать git без явного указания пользователя;
- менять unrelated files;
- запускать broad refactor;
- менять formatting вне контура;
- “улучшать” что-то рядом;
- скрытно расширять API;
- менять DB/schema/indexes без explicit approval;
- менять provider/env/prod;
- выполнять deploy без explicit release approval.

---

# 5. Канонический Cardigo enterprise workflow

## 5.1. Базовый workflow

Каждый существенный workstream:

```text
0. Architecture / Intent clarification

1. Phase 1 — Read-Only Audit
   - никаких изменений
   - PROOF file:line-range
   - доказать source of truth
   - доказать blast radius
   - доказать boundaries
   - STOP

2. Phase 2 — Minimal Fix
   - bounded scope
   - минимум файлов
   - без refactor
   - без formatting churn
   - без “заодно”
   - STOP

3. Phase 3 — Verification
   - targeted commands
   - RAW stdout
   - RAW stderr
   - EXIT CODE
   - static proof
   - regression matrix
   - STOP

4. Documentation / Handoff
   - если изменение meaningful

5. Controlled Rollout
   - explicit approval
   - ordered deployment
   - production smoke
   - rollback contract
```

## 5.2. Ключевой принцип anti-loop

Не превращать enterprise workflow в бесконечные аудиты.

После доказанного:

```text
ROOT CAUSE = PROVEN
ARCHITECTURE = PROVEN
BOUNDARY = PROVEN
```

не переоткрывать весь контур.

Если появляется новая проблема — делать **narrow integrity gate**, а не новый broad audit.

---

# 6. Обязательный заголовок Copilot prompt

Каждый Copilot prompt по Cardigo должен начинаться **точно**:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Это постоянное правило.

---

# 7. Frontend policy — НЕ НАРУШАТЬ

## 7.1. Styling

Постоянные правила:

- **NO inline styles**
- **CSS Modules only**
- **Flex only**
- **NO CSS Grid**
- **Mobile-first**
- Не использовать случайные utility styles без необходимости
- Не вводить новый design language в одном компоненте

## 7.2. Typography

```text
font-size only via var(--fs-*)
```

Правила:

- использовать существующие утверждённые токены;
- `--fs-*` только rem;
- не использовать:
  - px;
  - em;
  - %;
  - vw;
  - vh;
  - clamp;
  - fluid typography;
  - calc(non-rem).

Нельзя создавать ad-hoc typography tokens без отдельного решения.

## 7.3. Layout

- Flex only.
- Не использовать CSS Grid.
- Desktop должен быть расширением mobile-first структуры.
- Не ломать существующий responsive contract.
- Не создавать layout, который требует больших breakpoint-specific hacks.

## 7.4. Protected frontend zones

Очень высокий blast radius:

- `CardLayout`
- `CardLayout.module.css`
- shared public/preview render chain
- templates registry
- card skins
- hydration/root behavior
- public card route-level code splitting
- editor whole-card replacement logic
- payment panel
- admin billing panel

Любая правка туда должна иметь dedicated audit.

---

# 8. Backend / API / DB policy

## 8.1. Stack

Known baseline:

- Node.js
- Express
- MongoDB
- Mongoose

## 8.2. DB governance

Никаких runtime DB “магических” изменений.

Предпочтительная production truth:

```text
MONGOOSE_AUTO_INDEX=false
MONGOOSE_AUTO_CREATE=false
```

Индексы:

- explicit;
- audited;
- apply separately;
- verify separately.

## 8.3. Запрещённые broad DB паттерны

Не использовать без bounded reason:

```js
Card.find({})
User.find({})
Organization.find({})
```

на production-scale flows.

Не делать global enumerations “для проверки”.

## 8.4. DTO policy

Public DTO и owner/private DTO — разные security surfaces.

Нельзя:

- добавлять private owner billing metadata в shared public DTO;
- считать, что поле “безопасно”, только потому что frontend его не показывает;
- допускать provider/internal/accounting leakage.

---

# 9. Security doctrine

В Cardigo важны следующие постоянные принципы:

- cookie-backed browser auth — runtime truth;
- не возвращаться к localStorage JWT как основному auth;
- anti-enumeration 404;
- membership gates для org flows;
- public/private DTO boundary;
- fail-closed classification;
- no provider secrets in browser-visible payload;
- no raw internal billing metadata в owner/public UI;
- payment mutation доверяет trusted backend/provider validation, не UI;
- idempotency для payment/receipt lifecycle;
- rollout/rollback ordering должен быть доказан;
- frontend never decides security scope.

---

# 10. Public card architecture и SEO / SSR truth

Публичные routes:

```text
/card/:slug
/c/:orgSlug/:slug
```

OG routes:

```text
/og/card/:slug
/og/c/:orgSlug/:slug
```

## 10.1. Исторически важный SSR milestone

Public card SSR rollout был доведён до production verification.

Current known production architecture после SSR migration:

- browser `/card/*` и `/c/*` получают Edge + full SSR body + data island;
- Googlebot получает full SSR body + Edge JSON-LD;
- social UA получает raw OG HTML без data island;
- unknown card routes:
  - 404;
  - noindex;
- real published routes:
  - no `X-Robots-Tag: noindex`;
- SSR real route production rollout был закрыт как:
  - `CLOSED / PASS / PRODUCTION VERIFIED`.

## 10.2. SEO invariants

Не менять casual:

- canonical;
- robots;
- OG;
- sitemap;
- JSON-LD;
- crawler split;
- `/og` behavior;
- SSR body;
- data island;
- unknown-route 404/noindex.

Каждая crawler surface должна проверяться отдельно:

```text
Browser
Googlebot
Social crawler
Direct /og
Unknown route
```

---

# 11. Russian / LTR public card support

Это закрытый и production-verified контур.

Contract:

```text
card.language = "he" | "ru"
```

Rules:

```text
he = default / fallback
ru = Russian / LTR
invalid/missing = he
```

Russian mode — это card-level language mode, не machine translation.

Переводится:

- UI chrome;
- section labels;
- actions;
- map/navigation labels;
- QR/share labels;
- static public interface strings.

Не переводится автоматически:

- business name;
- slogan;
- owner content;
- services;
- about;
- reviews;
- address;
- FAQ user content.

Proofed surfaces:

- SSR;
- browser;
- Googlebot;
- social;
- OG;
- lang/dir;
- JSON-LD `inLanguage`;
- OG locale;
- Russian map/nav;
- About LTR.

Status:

```text
RUSSIAN_LTR_PUBLIC_CARD_SUPPORT
= CLOSED / PASS / PRODUCTION VERIFIED
```

---

# 12. `/cards/` examples / real showcase

Функциональность реальных примеров карточек была вынесена в admin-managed flow.

Production truth:

- `/api/cards-showcase/active` отдаёт clean DTO;
- image URLs — Supabase HTTPS;
- CTA — safe `/card/...`;
- sorting работает;
- admin search работает;
- mobile rail hotfix verified;
- public `/cards/` больше не зависит от старого hardcoded fallback в production.

Status:

```text
Admin-managed /cards real examples
= PRODUCTION VERIFIED
```

---

# 13. Billing / payments architecture

Это один из наиболее sensitive domains.

Known providers/services:

- Tranzila
- Tranzila STO / MyBilling
- YeshInvoice
- Netlify proxy/function layer
- backend trusted notify processing

Ключевой principle:

**payment UI != payment truth**

Frontend отображает состояние.  
Backend + provider verified events определяют subscription/payment mutation.

Known concepts:

- PaymentIntent gate;
- notify token/origin controls;
- Handshake verification;
- recurring STO notify;
- receipt creation;
- idempotency;
- receipt proxy;
- no raw provider URLs to public/client where inappropriate.

---

# 14. PERSONAL vs REAL_ORG — один из важнейших invariants

## 14.1. Canonical personal-org sentinel

`personalOrg.util.js` содержит canonical helpers:

```js
isPersonalBillingCard(card, personalOrgId)
isRealOrgCard(card, personalOrgId)
```

Personal:

```text
card exists
AND
(
  orgId absent/null
  OR
  orgId == personalOrgId sentinel
)
```

REAL_ORG:

```text
orgId non-null
AND
orgId != personalOrgId
```

Fail-closed semantics:

```text
non-null orgId
+ personalOrgId unresolved
→ REAL_ORG
→ NEVER silently personal
```

## 14.2. PERSONAL billing SSoT

Personal owner payment UI:

```text
/api/account/me
→ User.plan
→ User.subscription
→ autoRenewal
→ paymentMethod
→ receipts/profile
```

## 14.3. REAL_ORG billing SSoT

REAL_ORG:

```text
Organization.orgEntitlement
```

Не Card.billing.  
Не User.subscription.  
Не `effectiveBilling.source` как stable scope classifier.

---

# 15. Важный закрытый contour: Admin multi-card billing state isolation

Проблема:

Один User может владеть:

- REAL_ORG Card A;
- PERSONAL Card B.

Admin UI мог визуально показывать A, но сохранять/отправлять target B из-за stale state.

Root cause был frontend state isolation.

Fix включил:

- `billingHydratedCardId`;
- `latestBillingTargetIdRef`;
- safe target setter;
- identity-keyed hydrate;
- stale response cancellation;
- triple identity precondition;
- mutation target capture;
- exact-card reconciliation;
- stale async isolation.

Status:

```text
MULTI_CARD_ADMIN_BILLING_FORM_STATE_ISOLATION
= CLOSED / PASS / LOCALLY VERIFIED
```

Не переоткрывать без нового доказанного defect.

---

# 16. Текущий contour: ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH

Это **главный текущий контур** на момент handoff.

## 16.1. Production symptom

REAL_ORG Card:

```text
https://cardigo.co.il/c/zman-lhofsha/vacation-deals
```

UI payment panel ошибочно показывал данные PERSONAL subscription того же User:

```text
תוכנית: חודשית
סטטוס מנוי: פעיל
בתוקף עד: 10.03.2027
```

При этом Organization SSoT:

```text
status: active
plan: org
expiresAt: 2027-06-10
```

То есть displayed source был неверным.

## 16.2. Root cause

`SettingsPanel.jsx` payment block был scope-blind.

Он использовал:

```text
/account/me
→ User.plan
→ User.subscription
```

даже когда открыта REAL_ORG Card.

Root cause:

```text
USER_ACCOUNT_BILLING_LEAK_INTO_ORG_CARD_UI
```

Это был display/source-selection bug, не persisted-data corruption.

Backend Organization/Card data были правильными.

---

# 17. Архитектура исправления текущего contour

Был введён owner/editor-only contract:

```js
ownerPaymentContext: {
    scope: "personal" | "organization" | "unknown",
    organization: null | {
        status: "none" | "active" | "revoked",
        plan: "org" | null,
        expiresAt: string | null,
        currentlyActive: boolean
    }
}
```

## 17.1. Scope

Scope вычисляется только сервером через canonical helpers:

```js
isPersonalBillingCard(...)
isRealOrgCard(...)
```

Frontend scope не реконструирует.

## 17.2. Organization activity

Current activity:

```js
Boolean(resolveOrgEntitlementBilling(org, now))
```

Это SSoT.

Frontend не имеет права заново решать:

- expired;
- startsAt;
- org isActive;
- date comparisons;
- lifecycle.

## 17.3. Sanitization

В owner context НЕ попадают:

- `paymentReference`;
- `adminNote`;
- `source`;
- `grantedByUserId`;
- `grantedAt`;
- `lastModifiedByUserId`;
- `lastModifiedAt`.

## 17.4. Public privacy

`ownerPaymentContext` НЕ добавляется в shared `toCardDTO`.

Он attachment-only в owner/editor handlers.

Public card handlers не получают его.

---

# 18. Owner DTO continuity — важный lesson

Проблема могла вернуться после Save, если context добавлять только в initial GET.

Поэтому ownerPaymentContext должен сохраняться во всех FULL editor Card responses:

- authenticated `getMyCard`;
- `getOrCreateMyOrgCard`;
- authenticated branches `createCard`;
- `updateCard`;
- successful `claimCard`.

Особенно:

```text
load REAL_ORG
→ scope organization

save
→ updateCard returns new whole Card DTO
→ scope must still be organization
```

Это проверено в текущем fix.

---

# 19. claimCard serialization safety

Старое поведение:

```js
res.json(result.card)
```

где `result.card` — Mongoose Document.

Нельзя было заменить wire shape через `.toObject()` и считать эквивалентным.

Final implementation сохраняет JSON serialization semantics:

```js
const claimedCardObj =
    result.card && typeof result.card.toJSON === "function"
        ? result.card.toJSON()
        : result.card;
```

затем добавляет:

```js
ownerPaymentContext: {
    scope: "personal",
    organization: null
}
```

Это intentional additive change.

---

# 20. SettingsPanel final branching contract

## 20.1. PERSONAL

Только при:

```js
ownerScope === "personal"
```

разрешено показывать existing personal billing UI:

- User plan;
- User subscription;
- monthly CTA;
- yearly CTA;
- yearly opt-in;
- Tranzila checkout;
- auto-renewal;
- stored payment method;
- payment method deletion;
- receipts;
- receipt download;
- receipt profile.

## 20.2. REAL_ORG

Только при валидном:

```text
scope = organization
AND
valid organization summary
```

показывается read-only org summary.

Plan:

```text
org → ארגוני
null → "-"
```

Status:

```text
currentlyActive=true
→ פעיל

currentlyActive=false + raw status revoked
→ מבוטל

any other valid non-active state
→ לא פעיל
```

Важно:

**frontend больше НЕ выводит `פג תוקף` на основании `status active + expiresAt`.**

Потому что `currentlyActive=false` может быть:

- expired;
- not-yet-started;
- org inactive;
- другая server resolver condition.

Frontend не угадывает причину.

## 20.3. UNKNOWN / malformed

Fail closed.

Если:

- context missing;
- invalid scope;
- organization null;
- malformed fields;
- unsupported status;
- bad plan;
- bad currentlyActive;

то:

- no personal payment actions;
- no fabricated org summary;
- neutral support/status message.

## 20.4. REAL_ORG не зависит визуально от `/account/me`

После финального Phase 3 blocker fix:

PERSONAL only:

```js
isPersonalScope && accountLoading
```

PERSONAL only:

```js
isPersonalScope &&
!accountLoading &&
!account &&
accountError
```

REAL_ORG больше не получает:

```text
טוען...
לא זמין
```

из personal `/account/me` fetch state.

---

# 21. Verification текущего contour

Backend:

```text
node --check src/controllers/card.controller.js
PASS
```

Targeted tests:

```text
node --test tests/owner-payment-context.test.mjs
13 tests
13 pass
0 fail
```

Тесты покрывают:

1. null/missing orgId → personal
2. personal sentinel → personal
3. non-personal orgId → organization
4. active org entitlement → active
5. raw active + past expiry → currentlyActive false
6. revoked
7. missing/none
8. unresolved personalOrgId + non-null orgId → REAL_ORG
9. internal metadata exclusion
10. public handlers source isolation
11. claim uses toJSON, not toObject
12. organization load/save domain continuity
13. personal load/save domain continuity

Frontend:

```text
npm run build:client
PASS
413 modules transformed
```

ESLint:

```text
npx eslint src/components/editor/panels/SettingsPanel.jsx
EXIT 1
```

Но:

- 1 известная pre-existing ошибка:
  - `no-extra-boolean-cast`
  - Publish button area around line ~863
- 8 pre-existing warnings
- new contour lint findings: **NONE**

Это важно:

```text
ESLINT_COMMAND_PASS = false
NEW_LINT_FINDINGS_ATTRIBUTABLE_TO_CONTOUR = false
```

Не чинить unrelated lint debt в billing contour.

---

# 22. Текущий финальный статус contour

Зафиксировать:

```text
ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH

ROOT CAUSE                         CLOSED / PROVEN
ARCHITECTURE                       CLOSED / PROVEN
BACKEND OWNER CONTEXT              PASS
CANONICAL SCOPE                    PASS
ORG ENTITLEMENT SSoT               PASS
CLAIM SERIALIZATION                PASS
DTO CONTINUITY                     PASS
PUBLIC PRIVACY                     PASS
PERSONAL PAYMENT ISOLATION         PASS
REAL_ORG PAYMENT ISOLATION         PASS
MALFORMED/UNKNOWN FAIL-CLOSED      PASS
ORG RENDER SEMANTICS               PASS
ACCOUNT LOADING/ERROR ISOLATION    PASS

BACKEND TESTS                      13/13 PASS
CLIENT BUILD                       PASS
NEW LINT REGRESSIONS               NONE
KNOWN PRE-EXISTING ESLINT ERROR    PRESENT

PHASE 3
= PASS

ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH
= CLOSED / PASS / LOCALLY VERIFIED

PRODUCTION VERIFIED
= NO
```

---

# 23. ТЕКУЩЕЕ СОСТОЯНИЕ GIT НА МОМЕНТ HANDOFF

На момент последней проверки:

```text
master
```

Working tree содержит:

```text
M  backend/src/controllers/card.controller.js
M  frontend/src/components/editor/panels/SettingsPanel.jsx
?? backend/tests/owner-payment-context.test.mjs
```

Backend был selectively staged:

```text
backend/src/controllers/card.controller.js
backend/tests/owner-payment-context.test.mjs
```

Frontend НЕ должен попасть в первый commit.

Последний inspected staged diff backend выглядел корректно.

---

# 24. СЛЕДУЮЩИЕ ШАГИ — НЕ ПЕРЕПУТАТЬ ПОРЯДОК

Текущий rollout contract:

```text
DEPLOY:
backend → frontend

ROLLBACK:
frontend → backend
```

Причина:

```text
OLD frontend + NEW backend
= safe
= old frontend ignores additive ownerPaymentContext
= old bug persists temporarily, но функциональность не ломается

NEW frontend + OLD backend
= fail-closed
= ownerPaymentContext отсутствует
= PERSONAL payment UI тоже исчезнет
= functional degradation
```

Поэтому frontend первым выкатывать нельзя.

---

# 25. Backend-first release — следующий операционный шаг

Перед commit:

```powershell
git status --short
git diff --cached --name-only
```

Ожидание:

```text
M  backend/src/controllers/card.controller.js
A  backend/tests/owner-payment-context.test.mjs
 M frontend/src/components/editor/panels/SettingsPanel.jsx
```

`git diff --cached --name-only`:

```text
backend/src/controllers/card.controller.js
backend/tests/owner-payment-context.test.mjs
```

Если всё так:

```powershell
git commit -m "Add organization owner payment context"
git push origin master
```

После этого:

**STOP.**

Не коммитить frontend сразу.

Дождаться успешного backend production deploy на Render.

---

# 26. После backend deploy

Проверить:

- deploy succeeded;
- backend health normal;
- no startup errors;
- owner endpoints не падают;
- public endpoints не изменились.

Потом:

```powershell
git status --short
```

Ожидаемо должен остаться:

```text
 M frontend/src/components/editor/panels/SettingsPanel.jsx
```

Затем frontend:

```powershell
git add frontend/src/components/editor/panels/SettingsPanel.jsx

git diff --cached --check
git diff --cached --stat
git diff --cached

git commit -m "Isolate organization payment panel from personal billing"
git push origin master
```

Дождаться Netlify production deploy.

---

# 27. Production smoke — ОБЯЗАТЕЛЬНО

После обоих deploy контур ещё не production-verified до smoke.

## 27.1. PERSONAL Card

Known personal route:

```text
https://cardigo.co.il/card/yoni-maman-rami-levy-tikshoret-galil-elyon
```

Expected:

```text
PERSONAL branch
User subscription remains visible
monthly / active
expiresAt around 10.03.2027
personal Tranzila controls remain available
```

Нужно убедиться:

- checkout still visible where intended;
- auto-renewal unaffected;
- payment method unaffected;
- receipts unaffected;
- no organization labels.

## 27.2. REAL_ORG Card

Route:

```text
https://cardigo.co.il/c/zman-lhofsha/vacation-deals
```

Expected:

```text
תוכנית: ארגוני
סטטוס מנוי: פעיל
בתוקף עד: 10.06.2027
```

И НЕ должно быть:

- personal 10.03.2027;
- monthly/yearly personal checkout;
- auto-renewal controls;
- stored personal payment method;
- personal receipt list/profile;
- account loading/error artifact.

## 27.3. Save continuity

На REAL_ORG:

- сделать безопасный owner/editor save только если есть безрисковое поле для smoke;
- убедиться после save payment summary остаётся ORG;
- не возвращается PERSONAL.

Не менять данные только ради smoke, если нет безопасного save action.

---

# 28. Production closure status

Только после deploy + smoke:

```text
ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH
= CLOSED / PASS / PRODUCTION VERIFIED
```

До этого:

```text
CLOSED / PASS / LOCALLY VERIFIED
```

---

# 29. +48h billing work — временно paused

Есть отдельный чувствительный payment contour:

```text
CARDIGO_PERSONAL_PAID_GRACE_48H_ENABLED
```

Feature flag / rollout пока должен оставаться:

```text
OFF
```

Важно:

+48h work **не отменён**, а временно paused ради owner payment panel defect.

После полного production closure текущего owner-payment contour:

возобновить ровно с:

```text
Payment Step 2 Phase 3 verification
```

Не начинать +48h заново с broad audit.

Не включать feature flag до:

- полного mechanism closure;
- concurrency-safe verification;
- production verification;
- явного rollout decision.

Определение “after +48h”:

это не “есть кусок кода”, а complete mechanism:

- lifecycle-safe;
- concurrency-safe;
- activated;
- production-verified.

---

# 30. Deferred retention tail

Есть отдельный deferred вопрос:

```text
Retention Option-B durable purge
```

Он deferred.

Не использовать его как повод отклоняться от текущего billing/rollout work.

---

# 31. Homepage SEO roadmap

Primary target:

```text
כרטיס ביקור דיגיטלי
```

Secondary:

```text
כרטיס ביקור דיגיטלי חינם
כרטיס ביקור דיגיטלי לעסק
כרטיס ביקור דיגיטלי מחיר
כרטיס ביקור דיגיטלי מומלץ
כרטיס ביקור דיגיטלי דוגמאות
עיצוב כרטיס ביקור דיגיטלי
```

Approved strict roadmap:

1. `HOME_HEAD_QUERY_TIMELINE_P1`
2. controlled title rollback/test only if timeline proves it
3. content hygiene
4. real business proof
5. generic intent section

User requires:

**strict step-by-step; no next step until current closed.**

Permanent copy decision:

```text
הכרטיס משפר את התוצאות שלכם בגוגל
```

Не менять и не “смягчать”.

---

# 32. Performance / hydration future tail

Public card hydration fixes сделали PublicCard eager, что увеличило main client bundle.

Это future contour:

- не трогать, пока hydration стабилен;
- позже сделать bounded audit по безопасному route-level splitting;
- возможные направления:
  - streaming SSR;
  - hydration-safe route architecture.

Нельзя возвращать code splitting ценой hydration mismatch.

---

# 33. What Cardigo should include going forward

Ниже не обязательно уже реализовано полностью. Это enterprise roadmap / expected maturity.

## 33.1. Observability

Должно быть:

- structured backend logs;
- error correlation IDs;
- Sentry / equivalent error capture;
- payment notify metrics;
- receipt failure metrics;
- org entitlement anomaly logs;
- SSR/Edge failure monitoring;
- 404/5xx route metrics.

## 33.2. CI / quality gates

Желательно иметь:

- targeted backend tests;
- frontend lint;
- client build;
- server syntax/type checks;
- public DTO privacy tests;
- billing lifecycle tests;
- org/personal scope tests;
- SSR/crawler smoke scripts;
- schema/index drift checks.

Не обязательно делать broad E2E на каждую маленькую правку.

## 33.3. Contract testing

Особенно полезно:

- owner Card DTO contract;
- public Card DTO contract;
- payment notify contract;
- org entitlement contract;
- `/account/me` contract;
- SSR data island contract.

## 33.4. Incident readiness

Нужны documented runbooks:

- payment incident;
- receipt incident;
- org entitlement mismatch;
- broken SSR;
- public-card 404 spike;
- login/auth incident;
- storage upload outage;
- deploy rollback.

## 33.5. Backups / recovery

Должны быть:

- DB backup policy;
- restore drill;
- storage recovery story;
- provider data reconciliation plan.

## 33.6. Security maturity

Продолжать:

- fail-closed;
- least privilege;
- explicit ownership checks;
- anti-enumeration;
- audit logs;
- rate limiting;
- provider secret isolation;
- webhook authenticity;
- replay/idempotency protection;
- privacy/retention compliance.

## 33.7. Accessibility

Cardigo public/editor/admin surfaces должны поддерживать:

- semantic elements;
- keyboard navigation;
- focus visibility;
- accessible labels;
- contrast;
- RTL/LTR correctness.

## 33.8. Internationalization

Сейчас доказаны HE/RU.

Если добавлять другие языки:

- card-level language SSoT;
- centralized labels;
- server SEO language;
- JSON-LD language;
- OG locale;
- lang/dir;
- no client-only translation hacks.

---

# 34. Status vocabulary — использовать строго

Использовать точные статусы:

```text
AUDITED
IMPLEMENTED
LOCALLY VERIFIED
COMMITTED
PUSHED
DEPLOYED
PRODUCTION VERIFIED
CLOSED / PASS
BLOCKED
DEFERRED
```

Не говорить:

```text
production verified
```

если был только build/test.

Не говорить:

```text
deployed
```

если был только push.

Не говорить:

```text
closed
```

если остался доказанный blocker.

---

# 35. Git / rollout safety

## 35.1. Selective staging

Никогда не использовать автоматически:

```bash
git add -A
```

для sensitive contours.

Использовать selective staging:

```powershell
git add path/to/file1 path/to/file2
```

Потом:

```powershell
git diff --cached --check
git diff --cached --stat
git diff --cached
```

## 35.2. Rollout sequencing

Если frontend зависит от additive backend DTO field:

```text
backend first
frontend second
```

Rollback:

```text
frontend first
backend second
```

Не оставлять:

```text
NEW frontend + OLD backend
```

если новый frontend fail-closed из-за отсутствующего field.

---

# 36. Как ChatGPT должен критиковать Copilot reports

Всегда проверять:

- claim vs raw stdout;
- exit code;
- changed file count;
- source boundaries;
- untracked test files;
- whether tests are real behavior tests or source-text assertions;
- whether `PASS=true` contradicts `EXIT_CODE=1`;
- whether response lifecycle preserves new DTO fields;
- whether UI logic silently reimplements backend domain logic;
- whether unknown/malformed paths fail closed;
- whether rollout order доказан.

Особенно:

**Нельзя принимать `ESLINT_PASS=true` при EXIT 1.**

Правильное разделение:

```text
ESLINT_COMMAND_PASS=false
NEW_LINT_FINDINGS_ATTRIBUTABLE_TO_CONTOUR=false
```

---

# 37. Типовая структура Copilot Phase 1 prompt

```text
PROJECT MODE: Cardigo enterprise workflow.

CONTOUR:
<NAME>

PHASE:
Phase 1 — Read-Only Audit.

ROLE:
Senior Project Architect / Backend / Frontend / Security / relevant domain.

HARD CONSTRAINTS:
- Read-only
- No edits
- No git
- No DB mutation
- No production
- No deployment
- No broad audit
- File:line proof required

A. Locate exact source
B. Trace data flow
C. Identify SSoT
D. Prove boundary
E. Prove lifecycle
F. Prove public/private risk
G. Define minimal fix boundary
H. Return PASS/BLOCKED
STOP
```

---

# 38. Типовая структура Phase 2

```text
PROJECT MODE: Cardigo enterprise workflow.

PHASE:
Phase 2 — Minimal Fix.

Architecture is frozen.

Hard constraints:
- exact production file boundary
- no scope creep
- no refactor
- no unrelated lint cleanup
- no git
- no DB
- no deploy

Implement exact approved contract.
Run only targeted verification allowed by prompt.
STOP.
```

---

# 39. Типовая структура Phase 3

```text
PROJECT MODE: Cardigo enterprise workflow.

PHASE:
Phase 3 — Final Verification.

READ-ONLY.

Prove:
- production scope
- SSoT
- response continuity
- privacy
- malformed behavior
- stale async behavior if relevant
- public/private boundary
- regression matrix
- RAW stdout
- EXIT codes

No edits.
No git.
No deploy.

PASS / BLOCKED.
STOP.
```

---

# 40. Rules for re-audit

Запрашивать реаудит только если:

- Copilot proof противоречит source;
- новый source выявляет lifecycle gap;
- scope classifier оказался нестабильным;
- DTO lifecycle оказался incomplete;
- public/private boundary не доказан;
- serialization semantics изменились;
- async stale response может вернуть старую identity;
- rollout compatibility не доказана.

Не делать broad re-audit просто потому что “хочется ещё проверить”.

---

# 41. Current known tech stack / services snapshot

Confirmed/known from project history:

Frontend:

- React
- Vite
- CSS Modules
- Netlify

Backend:

- Node.js
- Express
- MongoDB
- Mongoose
- Render

Storage / external:

- Supabase Storage
- Tranzila
- YeshInvoice
- Mailjet
- GTM
- Meta Pixel
- Google Analytics
- Sentry / monitoring foundation

---

# 42. Important product modules

Cardigo currently includes / has foundations for:

- public digital cards;
- personal cards;
- organization cards;
- editor;
- preview;
- templates/themes;
- business info;
- contact actions;
- gallery;
- services;
- hours;
- booking settings;
- reviews;
- FAQ;
- SEO metadata;
- JSON-LD;
- OG/social preview;
- public SSR;
- multilingual cards;
- QR/share;
- slug management;
- slug redirects/quarantine;
- admin tooling;
- account subscription;
- billing;
- recurring payments;
- receipts;
- organizations;
- members/invites;
- org entitlement;
- AI/content tooling;
- blog/guides;
- `/cards/` showcase;
- privacy/consent;
- analytics/tracking foundations.

---

# 43. High-risk areas — никогда не трогать casually

```text
Payments
Subscription lifecycle
STO
Receipt generation
Organization entitlement
Auth/cookies
Membership gates
Card ownership
Card.user / User.cardId relation
Public route resolution
SSR/data island
Canonical/robots/OG
Sitemap
Public DTO
Owner DTO
CardLayout
Hydration root behavior
Slug lifecycle
Storage deletion
Retention/purge
Admin billing controls
```

---

# 44. Практический next-chat checklist

При открытии нового окна:

1. Загрузить этот handoff.
2. Не делать broad audit.
3. Признать текущий contour локально закрытым.
4. Проверить текущий git state только если пользователь ещё не сделал backend commit.
5. Продолжить backend-first rollout.
6. После backend push дождаться Render.
7. Потом frontend commit/push.
8. Дождаться Netlify.
9. Провести production smoke:
   - PERSONAL;
   - REAL_ORG;
   - no personal controls on REAL_ORG.
10. Только после smoke поставить:
   - `PRODUCTION VERIFIED`.
11. После closure вернуться к paused +48h billing work:
   - `Payment Step 2 Phase 3 verification`.
12. Не открывать unrelated retention/performance/SEO tails параллельно.

---

# 45. Final instruction to the next ChatGPT window

Ты не “помощник, который пишет код”.

Ты — главный технический контролёр проекта Cardigo.

Твоя задача:

- остановить плохое архитектурное решение до того, как оно попадёт в production;
- не позволять Copilot додумывать business rules;
- не позволять frontend становиться SSoT billing/security;
- не позволять backend private fields утекать в public DTO;
- не допускать stale state / cross-card identity contamination;
- не смешивать Personal и Organization scope;
- не смешивать Cardigo и Digitalyty;
- не жертвовать anti-regression ради скорости;
- но и не устраивать бесконечные audits, когда граница уже доказана.

Ключевая формула:

```text
PROOF
→ MINIMAL CHANGE
→ TARGETED VERIFICATION
→ CONTROLLED RELEASE
→ PRODUCTION SMOKE
→ CLOSE
```

В Cardigo лучше сделать меньше, но доказанно правильно, чем “улучшить всё сразу”.

---

# 46. Current final handoff state

```text
CURRENT ACTIVE CONTOUR:
ORG_CARD_OWNER_PAYMENT_DISPLAY_SOURCE_MISMATCH

STATUS:
CLOSED / PASS / LOCALLY VERIFIED
NOT YET PRODUCTION VERIFIED

CURRENT RELEASE PLAN:
1. backend selective commit
2. push master
3. wait Render deploy
4. frontend selective commit
5. push master
6. wait Netlify deploy
7. production smoke
8. close as PRODUCTION VERIFIED

BACKEND STAGED FILES AT LAST CHECK:
backend/src/controllers/card.controller.js
backend/tests/owner-payment-context.test.mjs

FRONTEND UNSTAGED FILE:
frontend/src/components/editor/panels/SettingsPanel.jsx

KNOWN LINT DEBT:
SettingsPanel.jsx no-extra-boolean-cast near Publish button
DO NOT FIX inside this billing contour

AFTER CURRENT PRODUCTION CLOSURE:
resume +48h billing work at
Payment Step 2 Phase 3 verification

FEATURE FLAG:
CARDIGO_PERSONAL_PAID_GRACE_48H_ENABLED
must remain OFF until its own full rollout gates close.
```

---

# 47. One-line operating doctrine

> **Cardigo development is audit-first, proof-driven, minimal-scope, fail-closed, backend-SSoT, anti-regression engineering with controlled rollout and explicit production verification.**
