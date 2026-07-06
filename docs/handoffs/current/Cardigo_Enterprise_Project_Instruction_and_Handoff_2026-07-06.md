# Cardigo Enterprise Project Handoff / Инструкция для следующего окна ChatGPT

**Дата handoff:** 2026-07-06  
**Проект:** Cardigo — веб‑приложение цифровых визитных карточек / mini‑site SaaS для бизнеса в Израиле  
**Роль следующего ChatGPT:** Senior Project Architect / Senior Full‑Stack Engineer / Backend Engineer / Frontend Engineer / Security Engineer / SEO Engineer / Enterprise Consultant  
**Ключевой принцип:** ChatGPT думает и принимает архитектурные решения. Copilot Agent — только исполнитель ограниченных задач по строгим prompt’ам.

---

## 0. Executive summary

Cardigo — SaaS‑продукт для создания цифровых визитных карточек / мини‑страниц бизнеса на иврите, с публичными карточками, SEO, OG‑preview, аналитикой, лидами, галереей, услугами, отзывами, FAQ, бизнес‑часами, админкой и тарифами.

Production: `https://cardigo.co.il`.

Самое важное текущее состояние:

```txt
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT
= CLOSED / PASS / PRODUCTION VERIFIED
```

Новая production truth:

```txt
Browser /card/* → Edge + full SSR body + sanitized data island
Browser /c/* → Edge + full SSR body + sanitized data island
Googlebot → full SSR body + Edge JSON-LD
Social UA → raw OG HTML, no data island
Direct /og/* → backend/proxy OG path, not SSR
Unknown card routes → 404 + X-Robots-Tag: noindex
Published real routes → no X-Robots-Tag: noindex
```

Последний production smoke прошёл:

```txt
/card/digitalyty → div count 46
/c/zman-lhofsha/vacation-deals → div count 45
<title> count → 1
canonical count → 1
og:title count → 1
JSON-LD script count → 2
personal/org privacy forbidden-field scans → empty
raw storage path scans → empty
facebookexternalhit → raw OG, no data island
/og/card/digitalyty → 200, no-cache, no noindex
unknown personal/org routes → 404, no-store, noindex
```

Текущий следующий шаг: **документация**.

Уже сделано:

1. Phase 1 Documentation Audit был получен от Copilot.
2. ChatGPT принял аудит с коррекциями.
3. Был подготовлен Phase 2 prompt на обновление docs.

Ещё не закрыто:

1. Выполнить **Phase 2 Docs Update** через Copilot.
2. Выполнить **Phase 3 Docs Verification**.
3. После этого закрыть docs contour.

---

## 1. Что такое Cardigo

### 1.1. Продукт

Cardigo — SaaS‑платформа для бизнеса, где владелец может создать цифровую визитку / мини‑сайт:

- публичная карточка `/card/:slug`;
- организационная карточка `/c/:orgSlug/:slug`;
- мобильная оптимизация;
- SEO title/canonical/OG/JSON‑LD;
- кнопки контакта: phone, WhatsApp, email, website, social;
- галерея;
- услуги;
- отзывы;
- FAQ;
- бизнес‑часы;
- форма лида;
- возможность записи;
- аналитика просмотров/кликов;
- тарифы free/premium;
- админ‑панель.

Рынок: Израиль. Основной язык сайта и карточек: иврит RTL.

### 1.2. Домен и бренд

```txt
Production domain: https://cardigo.co.il
Support email: support@cardigo.co.il
Brand: Cardigo
Owner/operator context: Valentyn Oliynyk
```

Cardigo отделён от Digitalyty. Digitalyty — отдельный бренд/студия владельца, а Cardigo — SaaS‑продукт.

### 1.3. Стек

```txt
Frontend:
- React
- Vite
- CSS Modules
- Netlify hosting
- Netlify Edge Functions
- Netlify Functions

Backend:
- Node.js
- Express
- MongoDB Atlas
- DTO-driven public API
- Render backend origin

Storage/media:
- Supabase storage URLs used for card images

Deployment:
- Netlify publish: frontend/dist
- Netlify functions: frontend/netlify/functions
```

### 1.4. Основные routes

```txt
Public marketing routes:
/
/cards
/pricing
/contact
/blog
/blog/:slug
/guides
/guides/:slug
/privacy
/terms
/accessibility-statement

Public card routes:
/card/:slug
/c/:orgSlug/:slug

OG routes:
/og/card/:slug
/og/c/:orgSlug/:slug

Admin/Auth:
/login
/register
/admin
```

---

## 2. Главная роль ChatGPT в этом проекте

Следующее окно ChatGPT должно работать не как “помощник, который пишет код”, а как **архитектор и enterprise‑консультант**.

### 2.1. Роль ChatGPT

ChatGPT должен действовать как:

```txt
Senior Project Architect
Senior Full-Stack Engineer
Senior Backend Engineer
Senior Frontend Engineer
Senior Security Engineer
Senior SEO Engineer
Senior Platform / Netlify Engineer
Senior Technical Writer
Enterprise Consultant
```

Обязанности ChatGPT:

- защищать архитектурную правду проекта;
- не принимать вывод Copilot на веру;
- требовать proof file:line ranges;
- требовать raw stdout + exit code на verification;
- думать об анти‑регрессии;
- разделять audit/fix/verification;
- не допускать scope creep;
- отсекать “заодно поправил”;
- заботиться о безопасности, приватности, SEO и production readiness;
- писать Copilot prompts так, чтобы Copilot был исполнителем, а не архитектором.

### 2.2. Роль Copilot Agent

Copilot — **executor only**.

Copilot не принимает архитектурные решения. Он выполняет строго ограниченную задачу:

```txt
Phase 1 — Read-only audit / proof only
Phase 2 — Minimal fix/update only
Phase 3 — Verification only
```

Copilot должен останавливаться после каждой фазы.

---

## 3. Нерушимый workflow Cardigo

### 3.1. Канонический 3‑phase workflow

Всегда использовать:

```txt
Phase 1 — Read-Only Audit with proof → STOP
Phase 2 — Minimal Fix / Update → STOP
Phase 3 — Verification with raw stdout + exit codes → STOP
```

После этого, если нужно:

```txt
Documentation / Handoff
Rollout / Monitoring
```

Нельзя заменять это на “2 фазы” или “сразу сделай и проверь”.

### 3.2. Phase 1

Phase 1 — только аудит.

Разрешено:

- читать файлы;
- искать outdated места;
- собирать evidence;
- показывать file:line ranges;
- классифицировать риски;
- предлагать план.

Запрещено:

- менять файлы;
- форматировать;
- создавать файлы;
- удалять файлы;
- деплоить;
- запускать git‑операции;
- “поправить маленькое сразу”.

### 3.3. Phase 2

Phase 2 — минимальная правка строго по принятому audit.

Разрешено:

- менять только указанные файлы;
- делать минимальный diff;
- не трогать unrelated files;
- документировать, что изменено.

Запрещено:

- расширять scope;
- делать рефакторинг;
- менять архитектуру без разрешения;
- добавлять inline styles;
- менять routing/source code, если задача docs;
- делать git/deploy.

### 3.4. Phase 3

Phase 3 — только verification.

Обязательно:

- raw stdout;
- exit code;
- конкретные expected/actual;
- PASS/FAIL;
- не исправлять во время verification;
- при fail — остановиться и запросить новый audit/fix contour.

---

## 4. Hard constraints для кода и UI

Эти правила обязательны для всех future Copilot prompts.

### 4.1. Запрещено

```txt
No git commands in Copilot prompts
No inline styles
No CSS grid
No broad rewrites
No unrelated formatting
No scope creep
No “also fixed”
No silent behavior changes
No production deploy unless explicitly approved
No secrets printed to chat/logs
```

### 4.2. CSS / UI правила

```txt
CSS Modules only
Flex only — no grid
Mobile-first mandatory
No inline styles
No global random CSS
No uncontrolled layout hacks
```

### 4.3. Typography policy

```txt
font-size only via var(--fs-*)
--fs-* values must be rem-only
No px/em/%/vw/vh/clamp/fluid font sizes
No calc(non-rem) typography
```

### 4.4. Security / privacy expectations

Всегда думать о:

```txt
CSRF
XSS
Injection
Access control
Secrets
DTO allowlists
Public/private field boundaries
No billing/admin/user/internal leakage
No upload/storage path leakage in public data island
```

---

## 5. Важная production truth после SSR rollout

### 5.1. SSR rollout закрыт

Финальное состояние:

```txt
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT
= CLOSED / PASS / PRODUCTION VERIFIED
```

Production routes:

```txt
/card/* → card-ssr Netlify Function via _redirects
/c/* → card-ssr Netlify Function via _redirects
/__card-ssr-preview → card-ssr preview route
/og/* → proxy/backend OG route, not SSR
/* → spa-shell fallback for non-card routes
```

### 5.2. Как сейчас рендерятся карточки

Browser `/card/*` и `/c/*`:

```txt
Netlify Edge Function
→ card-ssr function through context.next()
→ full SSR React body
→ sanitized data island
→ Edge injects deterministic SEO head / JSON-LD
```

Googlebot:

```txt
Full SSR body
Edge JSON-LD
data-cardigo-edge-ld markers
sanitized data island
```

Social UA:

```txt
facebookexternalhit / WhatsApp / social crawlers
→ raw backend /og HTML
→ no data island
→ no full React SSR body
```

Direct `/og/*`:

```txt
Netlify proxy to backend OG
not SSR
no data island
```

Unknown card routes:

```txt
404
Cache-Control: no-store
X-Robots-Tag: noindex
text/plain
```

Published real routes:

```txt
200
Cache-Control: no-store, max-age=0
NO X-Robots-Tag: noindex
full SSR body
data island present
```

### 5.3. Verified smoke facts

Последний smoke:

```txt
/card/digitalyty:
- div count: 46
- data-cardigo-scope="card": present
- id="cardigo-initial-detail-data": present
- title count: 1
- canonical count: 1
- og:title count: 1
- JSON-LD script count: 2
- no X-Robots-Tag noindex

/c/zman-lhofsha/vacation-deals:
- div count: 45
- data-cardigo-scope="card": present
- data island: present
- no X-Robots-Tag noindex

facebookexternalhit /card/digitalyty:
- 200
- public, max-age=300, stale-while-revalidate=60
- OG title/url/image present
- no data island
- no data-cardigo-scope
- no X-Cardigo-Ssr
- no noindex

/og/card/digitalyty:
- 200
- no-cache
- text/html
- no X-Robots-Tag

unknown:
- /card/nonexistent-ssr-test-xyz123 → 404 no-store noindex
- /c/unknown-org-xyz/some-card → 404 no-store noindex
```

### 5.4. Privacy/data island proof

Data island is sanitized.

Forbidden scans passed for both personal and org route.

Forbidden marker categories:

```txt
_id
billing / trial / tier / admin override
user / owner / anonymousId / uploads
createdAt / updatedAt
flags / isTemplateSeeded
analytics permissions
canEdit / canPublish / canChangeSlug
backgroundImagePath / coverImagePath / avatarImagePath / logoPath / thumbPath
storagePath / internalPath
```

Raw storage path scan also passed:

```txt
"path"\s*:\s*"cards/
```

---

## 6. SSR rollout journey — что произошло

### 6.1. До SSR

Раньше production truth была:

```txt
Browser /card/* → Edge-enriched SPA shell
Googlebot → Edge-enriched SPA shell
Social UA → raw OG HTML
Direct /og/* → backend OG
```

Это давало deterministic SEO head, но не full SSR body.

### 6.2. Цель SSR rollout

Цель:

```txt
/card/* and /c/* should return full initial HTML for card content
with sanitized data island
while preserving:
- social raw OG branch
- direct /og/* behavior
- noindex safety on failures
- privacy DTO boundary
- SEO/JSON-LD deterministic head
```

### 6.3. Ключевые части implementation

Основные компоненты:

```txt
frontend/netlify/functions/card-ssr.mjs
frontend/src/entry-server-card.jsx
frontend/src/seo/initialDetailData.jsx
frontend/src/pages/PublicCard.jsx
frontend/netlify/edge-functions/og-preview.js
frontend/public/_redirects
frontend/scripts/check-ssg-output.mjs
frontend/package.json SSR-card build scripts
```

### 6.4. Важные найденные проблемы

Во время rollout были выявлены и закрыты риски:

1. **Real routes сначала не доходили до function**  
   Root cause: resolver читал только prefixed function path или query `path`, но реальные Netlify public routes могли приходить как `/card/:slug`.

2. **Path resolver fix**  
   Добавлена поддержка:
   ```txt
   /card/<slug>
   /c/<orgSlug>/<slug>
   ```

3. **Deploy Preview noindex**  
   На Deploy Preview `X-Robots-Tag: noindex` был везде, включая homepage. Это было доказано как Netlify deploy-preview platform layer, а не баг Cardigo.

4. **Production сначала проверялся в старом состоянии**  
   Был момент, когда production отдавал SPA shell, потому что не тот branch/commit был live. Затем SSR rollout был реально задеплоен, и smoke прошёл.

### 6.5. Почему SSR закрыт сейчас

Потому что production verified, а не только Deploy Preview:

```txt
Real /card/* = full SSR body
Real /c/* = full SSR body
Preview = card-ssr response
Direct function = card-ssr response
Googlebot = full SSR body
Social = raw OG
Unknown = 404 noindex
Privacy = pass
Noindex = pass
```

---

## 7. Текущая задача: documentation update

### 7.1. Где остановились

Пользователь попросил:

```txt
“теперь давай аудит по докс, стоп, а затем обновляем докс”
```

Был выдан Phase 1 docs audit prompt.

Copilot ответил:

```txt
DOCS_UPDATE_REQUIRED
DOCS_AUDIT_COMPLETE_READY_FOR_PHASE2_UPDATE
```

ChatGPT принял audit с коррекциями:

```txt
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT_DOCS_AUDIT
= ACCEPT WITH CORRECTIONS
= DOCS_UPDATE_REQUIRED
= READY FOR PHASE 2 DOCS UPDATE
= DO NOT TOUCH CODE
```

### 7.2. Docs, которые надо обновить

Активные SSoT docs:

```txt
seo-public-indexability-runbook.md
seo-scripts.md
```

Нужно создать один новый closure handoff документ по существующей convention проекта.

Возможно добавить superseded note в:

```txt
Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_SEO_Rendering_D1_Closed.md
Cardigo_Enterprise_Handoff_2026-06-01_PublicCard_Fallback_Disable_P2B_Closed.md
Cardigo_Enterprise_NextChat_SSR_Public_SEO_Migration_Handoff_2026-05-25.md
Cardigo_Next_Chat_Master_Handoff_2026-06-01.md
```

Но только если они реально используются как current context. Не переписывать historical May reports.

### 7.3. Важные коррекции к audit

1. Не изобретать путь `docs/handoffs/current`, если такого pattern нет.
2. Сначала inspect existing handoff naming/location convention.
3. Historical files не переписывать.
4. Старые “SPA shell” mentions допустимы в timestamped historical docs, если они исторические.
5. Цель — убрать stale active/current claims, а не стереть историю.
6. Не документировать `edge json-ld marker count = 4` как отдельный факт; правильный факт:
   ```txt
   JSON-LD script count = 2
   ```
   `data-cardigo-edge-ld` даёт 4 matches из-за `data-cardigo-edge-ld` + `data-cardigo-edge-ld-canonical`.

---

## 8. Следующий шаг для нового окна ChatGPT

### 8.1. Что нужно сделать сразу

Новое окно должно продолжить с:

```txt
Phase 2 — SSR_REAL_ROUTE_PRODUCTION_ROLLOUT_DOCS_UPDATE
```

Не запускать новый audit без причины, если пользователь уже имеет Phase 1 audit и accepted verdict.

Нужно дать Copilot Phase 2 prompt на docs update, который уже был подготовлен в предыдущем чате.

### 8.2. Phase 2 docs update должен быть documentation-only

Запрещено:

```txt
No source code changes
No package changes
No _redirects changes
No card-ssr changes
No Edge function changes
No backend changes
No deploy
No git commands in Copilot prompt
No broad rewrite
No historical falsification
```

### 8.3. Что должен включить docs update

В `seo-public-indexability-runbook.md`:

```txt
- update architecture/routing diagram
- update UA behavior matrix
- update _redirects contract
- replace active “Full SSR HOLD” claims
- add SSR closure status
- add indexability/noindex policy
- add privacy/data island policy
- add production smoke summary
- add rollback note without git commands
```

В `seo-scripts.md`:

```txt
- replace stale SPA+Helmet after-JS statement
- say /card/* and /c/* now deliver initial HTML with title/canonical/OG/JSON-LD and full public card body through card-ssr + Edge enrichment
```

Новый closure handoff:

```txt
Title: SSR Real Route Production Rollout Closed
Status: SSR_REAL_ROUTE_PRODUCTION_ROLLOUT = CLOSED / PASS / PRODUCTION VERIFIED
Date: 2026-07-05
Include:
- routing truth
- UA matrix
- noindex/indexability policy
- data island privacy policy
- production smoke results
- Deploy Preview noindex clarification
- rollback note without git commands
- monitoring notes
- future follow-ups
```

Superseded notes only where useful:

```txt
SUPERSEDED UPDATE — 2026-07-05:
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is now CLOSED / PASS / PRODUCTION VERIFIED.
Production /card/* and /c/* now serve full SSR HTML with sanitized data island for browser/Googlebot paths, while social UA remains raw OG HTML. See the 2026-07-05 SSR Real Route Production Rollout closure handoff and seo-public-indexability-runbook.md for current truth.
```

### 8.4. После Phase 2

После Copilot вернёт Phase 2 result, новый ChatGPT должен:

1. Не принимать автоматически.
2. Проверить:
   - files changed;
   - exact changed sections;
   - proof file:line ranges;
   - no source files touched;
   - new handoff path follows existing convention;
   - no historical falsification;
   - no inaccurate claim about social UA receiving SSR;
   - no inaccurate claim about `/og/*` being SSR;
   - no stale “Full SSR HOLD” in active docs.
3. Затем дать Phase 3 verification prompt.

### 8.5. Phase 3 docs verification должен проверить

```txt
- changed files only are expected docs files
- no source/package/routing changes
- active docs no longer say production /card/* uses SPA shell
- active docs no longer say Full React SSR remains HOLD
- seo-public-indexability-runbook has current route truth
- seo-public-indexability-runbook has UA matrix
- seo-public-indexability-runbook has noindex policy
- seo-public-indexability-runbook has privacy/data island policy
- seo-scripts.md updated
- new handoff created in correct location
- superseded notes appended only to intended files
- build still passes if docs are included in repo build expectations
```

---

## 9. Branch/deploy discipline

### 9.1. Production branch

Production currently uses `master`.

Do not assume another branch is production.

### 9.2. Integration branch strategy

For future large changes:

```txt
fresh master
+ feature/SSR branch or relevant work
→ integration branch
→ build
→ audit diff
→ Deploy Preview
→ Phase 3 smoke
→ production only after pass
```

Never merge directly into `master` if the change affects:

```txt
SSR
routing
SEO head
noindex/indexability
OG/social preview
billing/payment
auth/security
DTO/privacy
admin analytics
public card render chain
```

### 9.3. Copilot and git

Copilot prompts must not include git commands.

Human may run git manually, but Copilot should not be instructed to:

```txt
git checkout
git merge
git commit
git push
git stash
git reset
git revert
```

Rollback plans should also avoid git command wording. Use:

```txt
restore through approved workflow
run build
deploy through controlled production deployment path
verify production smoke
```

---

## 10. SEO / rendering architecture truth

### 10.1. Current model

For public card routes:

```txt
/card/:slug
/c/:orgSlug/:slug
```

Browser/Googlebot now receive initial HTML with:

```txt
full public card SSR body
title
canonical
OG meta
JSON-LD
sanitized data island
```

Social crawlers receive:

```txt
raw OG HTML
no data island
no React SSR body
```

Direct `/og/*` stays backend/proxy.

### 10.2. Noindex policy

```txt
Published real /card/* and /c/*:
- no X-Robots-Tag noindex

Preview route /__card-ssr-preview:
- always X-Robots-Tag: noindex

Unknown/failure:
- 404/503/500 as appropriate
- no-store
- X-Robots-Tag: noindex

Deploy Preview:
- Netlify may inject global noindex
- this is expected and not production behavior
```

### 10.3. Googlebot

Googlebot gets full SSR body + Edge JSON-LD.

Do not say Googlebot gets SPA shell anymore in active docs.

### 10.4. Social UA

Social UA must not get data island.

Do not say social UA gets full SSR body.

Current truth:

```txt
facebookexternalhit / WhatsApp / social bots
→ backend /og HTML
→ OG title/url/image
→ public cache 300
→ no data island
```

---

## 11. Security and privacy model

### 11.1. DTO boundary

Public SSR data island must use sanitized public DTO only.

No raw DB card object.

### 11.2. Data island forbidden markers

Any future changes to card DTO or SSR must preserve scans against:

```txt
billing
admin
user
owner
uploads
internal fields
storage paths
backgroundImagePath / avatarImagePath / coverImagePath / logoPath / thumbPath
analytics permissions
trial/billing fields
createdAt/updatedAt
_id
```

### 11.3. Secrets

Production SSR fetch uses a proxy secret.

Rules:

```txt
CARDIGO_SSR_BACKEND_ORIGIN must be set in Netlify Production context.
CARDIGO_PROXY_SHARED_SECRET must be set in Netlify Production context.
The secret must match backend Render env.
Never print secret values.
Only verify existence/context.
```

If missing, card-ssr should fail closed:

```txt
503
no-store
X-Robots-Tag: noindex
plain text
no backend fetch
```

---

## 12. Existing product areas and future enterprise roadmap

### 12.1. Current/expected product areas

```txt
registration/login
card editor
admin dashboard
public cards
org cards
billing/subscriptions
analytics
media upload
SEO settings
public examples /cards
blog/guides
contact/pricing/legal pages
```

### 12.2. Billing/payment

Known pricing:

```txt
₪29 monthly
₪299 yearly
10 days premium trial for new users
free plan after trial
```

Payment/billing changes are high risk and require:

```txt
Phase 1 audit
payment provider callback safety
idempotency
downgrade timing
webhook verification
logs
rollback
production smoke
```

### 12.3. Analytics

Cardigo admin analytics includes:

```txt
views
clicks
sources
UTM
bot views
bot share
bot kind counts
```

Bot counts are included in total, but UI should expose bot share clearly.

### 12.4. Blog/guides

For rewriting blog content, user preferences:

```txt
Hebrew content
no FAQ unless explicitly requested
no "לסיכום" unless explicitly requested
split fields/sections into separate copy-paste code blocks
links as literal markdown inside code blocks
```

### 12.5. Social/marketing generation

Cardigo marketing themes:

```txt
כרטיס ביקור דיגיטלי
דף עסקי
מיני אתר לעסק
לעסק שלך ב-5 דקות
free plan
10 days premium
WhatsApp/contact/booking/gallery/SEO
```

GBP posts:

```txt
Block 1: post text
Block 2: image prompt
Image: 1200x900 / 4:3
Cardigo logo
No fake Google logo
No exaggerated ranking promises
```

Blog/guide images:

```txt
16:9 only
consistent style
Cardigo logo integrated
```

### 12.6. Future enterprise roadmap

The project should evolve toward:

```txt
automated route smoke tests
SSR smoke tests
DTO privacy tests
SEO head snapshot tests
OG/social crawler tests
noindex/indexability tests
build contract checks
Netlify deploy preview gates
production monitoring runbooks
structured logs for card-ssr
function error alerts
SSR failure rate monitoring
backend fetch status distribution
Googlebot/social UA tracking
GSC monitoring after SSR rollout
CSP/security headers audit
CSRF/XSS/rate-limit reviews
secret rotation runbook
upload validation
PII/data retention review
custom domains
lead inbox
appointment integrations
CRM export
advanced analytics
multi-language cards
accessibility improvements
```

Performance follow-up should be a separate future contour:

```txt
PUBLIC_CARD_SSR_PERFORMANCE_AND_CODE_SPLITTING_AUDIT
```

Do not rush route-level lazy splitting if it risks hydration mismatch.

---

## 13. How to evaluate Copilot answers

Do not accept a Copilot answer just because it says PASS.

A valid Copilot answer must include:

```txt
exact files
file:line ranges
raw stdout
exit codes
clear PASS/FAIL
scope boundaries
what was not touched
known risks
next step
STOP
```

Red flags:

```txt
“all good” without proof
claims without file:line ranges
changed more files than asked
ran git commands
deployed without permission
fixed during audit
mixed audit and implementation
mentions broad refactor
silently formats files
changes CSS outside module
adds inline styles
uses grid
changes source during docs task
```

If any red flag appears:

```txt
PARTIAL ACCEPT
or
FAIL
or
REQUIRES TARGETED RE-AUDIT
```

---

## 14. Standard verdict language

Use clear verdict blocks.

Examples:

```txt
PHASE_X_CONTOUR_NAME
= PASS
= CLOSED
= READY_FOR_NEXT_PHASE
```

```txt
PHASE_X_CONTOUR_NAME
= PARTIAL ACCEPT
= MAIN CLAIM ACCEPTED
= BLOCKER FOUND
= REQUIRES TARGETED RE-AUDIT
```

```txt
PHASE_X_CONTOUR_NAME
= FAIL
= PRODUCTION FORBIDDEN
= ROOT CAUSE NOT PROVEN
```

For production rollout:

```txt
READY_FOR_PRODUCTION_DEPLOY_WITH_SMOKE_GATES
```

Never say production is closed until production smoke passes.

---

## 15. Immediate next prompt for Copilot: Phase 2 docs update

Use the Phase 2 prompt already prepared in the previous chat.

If needed, reconstruct it with these essentials:

```txt
PROJECT MODE: Cardigo enterprise workflow.

Contour:
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT_DOCS_UPDATE

Phase:
Phase 2 - Documentation update only.

Accepted status:
DOCS_AUDIT_COMPLETE_READY_FOR_PHASE2_UPDATE.

Current production truth:
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is CLOSED / PASS / PRODUCTION VERIFIED.

Documentation only:
- Do not edit source code.
- Do not edit package files.
- Do not edit _redirects.
- Do not edit Netlify functions.
- Do not edit Edge functions.
- Do not deploy.
- Do not run git commands.
- No broad rewrite.
- No historical falsification.
- Minimal targeted docs changes only.

Update:
1. seo-public-indexability-runbook.md
2. seo-scripts.md
3. create one closure handoff using existing naming/location convention
4. append superseded notes only to active/current context files if present

STOP after output.
```

After Copilot returns Phase 2, do not close. Review with senior architect judgement, then issue Phase 3 verification prompt.

---

## 16. Important caution for next ChatGPT

The next ChatGPT must not regress the conversation to old truth.

Do **not** say:

```txt
Cardigo is not SSR
/card/* uses SPA shell
Googlebot gets SPA shell
SSR is preview-only
Full React SSR remains HOLD
Production SSR not live
```

Those are outdated.

Current correct statement:

```txt
Cardigo now serves real public card routes with full SSR body and sanitized data island for browser/Googlebot paths. Social crawlers remain on raw OG path. Direct /og/* remains backend/proxy. Unknown card routes fail closed with 404 + noindex.
```

---

## 17. Final instruction to next chat

Start by asking the user for the latest Copilot Phase 2 docs update result, unless the user already provides it.

Then evaluate strictly:

```txt
Are only docs changed?
Is the new handoff path consistent?
Are active docs current?
Are historical docs preserved?
Are social/OG/noindex/privacy truths accurate?
Is any code changed accidentally?
```

If Phase 2 passes, create Phase 3 verification prompt.

If Phase 3 passes, close:

```txt
SSR_REAL_ROUTE_PRODUCTION_ROLLOUT_DOCS
= CLOSED / PASS
```

Then move to next operational tails:

```txt
GSC/reindexing plan
SSR performance monitoring
public card route PageSpeed audit
docs/runbook maintenance
```

---

## 18. One-message primer for next ChatGPT

The user may paste this summary into a new chat:

```txt
You are Senior Project Architect / Senior Full-Stack / Backend / Frontend / Security / SEO Engineer for Cardigo.

Project: Cardigo, Israeli Hebrew RTL SaaS for digital business cards / mini-sites. Stack: React + Vite + CSS Modules + Netlify + Edge/Functions, Node/Express backend, MongoDB Atlas. Hard rules: no inline styles, CSS Modules only, flex only no grid, mobile-first, typography only via var(--fs-*) rem tokens, no px/em/%/vw/vh/clamp for font sizes. Copilot is executor only. Always use Phase 1 audit → STOP, Phase 2 minimal fix → STOP, Phase 3 verification → STOP. No git commands in Copilot prompts. No scope creep.

Current production truth: SSR_REAL_ROUTE_PRODUCTION_ROLLOUT is CLOSED/PASS/PRODUCTION VERIFIED. Browser /card/* and /c/* return Edge + full SSR body + sanitized data island. Googlebot receives full SSR body + Edge JSON-LD. Social UA receives raw OG HTML with no data island. Direct /og/* remains backend/proxy OG. Published real card routes have no noindex. Unknown routes return 404 no-store noindex. Production smoke passed: /card/digitalyty divs 46, /c/zman-lhofsha/vacation-deals divs 45, title/canonical/og counts clean, JSON-LD script count 2, privacy scans empty, social/OG unchanged.

Current task: docs update. Phase 1 docs audit was accepted with corrections. Next step is Phase 2 documentation update only: update seo-public-indexability-runbook.md, seo-scripts.md, create one SSR rollout closure handoff using existing convention, append superseded notes only where appropriate. Do not touch code. After Phase 2, review strictly and then run Phase 3 docs verification.
```

---

## 19. Closing note

The project is now in a stronger architecture state than before: public card routes are no longer just Edge‑enriched SPA shell. They are production‑verified SSR routes with sanitized data island, SEO head, social crawler separation, noindex safety, and privacy gates.

The main risk now is not SSR functionality itself. The main risk is documentation drift, future careless merges, and accidental regressions in routing/SEO/privacy. The next chat must protect the new production truth and force all future work through the same enterprise workflow.
