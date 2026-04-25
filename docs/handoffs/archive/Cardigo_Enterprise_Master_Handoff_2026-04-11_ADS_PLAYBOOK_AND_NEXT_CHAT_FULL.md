# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-11 (после фиксации Meta ads sequence v1, сборки audiences и draft-shell structure в Ads Manager, подготовки A/B test logic для первого cold video ad)_

---

## 0) Что это за документ

Это **актуальный master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime / tracking / ads truth**;
- передать не только факты, но и **правильную тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, решений “на глаз” и accidental drift;
- сохранить **закрытые контуры закрытыми**;
- зафиксировать, **что уже завершено**, **что intentionally deferred**, и **что логично брать следующим bounded workstream**;
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant / PPC & Performance Consultant**;
- закрепить роль Copilot Agent как **исполнителя**, а не архитектора;
- дать следующему окну GPT полноценную инструкцию, **как именно вести Cardigo по-взрослому**.

Этот документ нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- project doctrine;
- architecture memo;
- operational truth;
- tactical guide;
- anti-drift bootstrap;
- launch/ads planning memo.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo — это уже не “просто визитка”.

Текущая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

Проект уже включает или должен включать:

- digital business card;
- public card surface;
- mini business page;
- lead surface;
- WhatsApp / QR / social entry points;
- self-service editing;
- analytics layer;
- structured data / SEO layer;
- premium surface;
- organization / team surface;
- admin surface;
- AI-assisted content surfaces;
- services / business-hours contour;
- booking foundation и owner/public booking contour;
- discoverability stack;
- blog / guides public content surfaces;
- premium public marketing surfaces;
- marketing tracking layer;
- privacy/consent-aware third-party tracking governance.

### 1.2 Рынок и продуктовая ориентация

Cardigo — **Israel-first / Israel-only baseline**.

Это означает:

- иврит / RTL — product default;
- product assumptions строятся под израильский рынок;
- multi-locale пока не является базовой product truth;
- использование `IL` как trusted default допустимо там, где это не ломает contracts и truth.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** — отдельный продукт;
- **Digitalyty** — отдельный бренд / сайт / маркетинговый слой.

Их **нельзя смешивать** в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- OG / sitemap / URL logic;
- user-facing copy внутри Cardigo;
- analytics audiences / tracking contours, когда это можно развести чисто;
- Meta / Google business assets, когда это можно разделить корректно.

### 1.4 Канонический домен

Production truth:

**https://cardigo.co.il**

Политика:

- canonical — non-www;
- Cardigo и Digitalyty нельзя смешивать в canonical / OG / sitemap / URL logic / product copy / structured data.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- **CSS Modules only**
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
- Netlify-hosted / Netlify-facing surface
- preview / editor / product / admin / public layers

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
- DTO-driven public truth
- SEO / analytics / routing logic
- manual index governance
- auth / org / admin / booking / leads / AI / content APIs

### 2.3 Дополнительные сервисы

- Supabase Storage
- Mailjet
- MongoDB Atlas / managed Mongo runtime
- payment contour / notify contour
- site gate / proxy gate contour
- AI provider contour
- Google Tag Manager
- Meta Pixel / Events Manager

### 2.4 Mongo / index governance truth

Это важный operational закон проекта:

- `MONGOOSE_AUTO_INDEX=false`
- `MONGOOSE_AUTO_CREATE=false`

Это означает:

- production structural truth не должна рождаться хаотично на runtime;
- критичные индексы поднимаются **вручную**;
- миграции и sanity scripts — канонический путь;
- drift выявляется и исправляется осознанно, а не “сам создался и ладно”.

---

## 3) Важные архитектурные инварианты

Нельзя casually ломать:

- shared / SSoT render chain для public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- CardLayout DOM skeleton — high blast radius;
- public / QR / OG URLs только из backend DTO `publicPath` / `ogPath`;
- anti-enumeration 404 / membership-gate truth;
- sitemap without N+1;
- cookie-backed auth runtime truth;
- manual index governance truth;
- tracking route isolation truth;
- consent-aware third-party tracking truth.

---

## 4) Роль ChatGPT и роль Copilot Agent

### 4.1 Роль ChatGPT

В этом проекте ChatGPT должен работать как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**
- **PPC / Performance / Media Buying Strategist** в текущем marketing workstream

Это означает:

- защищать architecture truth;
- защищать invariants;
- различать runtime truth, product truth и transition truth;
- думать про security / scalability / maintainability / performance / blast radius;
- не давать broad refactor “по вдохновению”;
- не принимать решения “на глаз”, если их можно доказать;
- строить bounded prompts для Copilot;
- требовать `PROOF file:line-range`;
- требовать `RAW stdout + EXIT`;
- фиксировать, что уже закрыто и не должно casually reopen-иться;
- выбирать **safest mature path**, а не fastest hack;
- вести проект как архитектор, а не как случайный помощник по коду.

### 4.2 Дополнительные обязанности ChatGPT

ChatGPT в Cardigo также отвечает за:

- архитектурное проектирование и оптимизацию под масштабируемость, безопасность и производительность;
- технический консалтинг по frontend / backend / API / data storage / deployment / production readiness;
- security-minded review;
- guidance по secure mechanisms:
  - CSRF / XSS / injection defenses
  - data protection
  - password / reset / token flow hardening
  - privacy / consent / legal truth
- guidance по CI/CD, monitoring, alerts, release discipline;
- documentation ownership:
  - technical docs
  - runbooks
  - README
  - next-chat handoffs
  - anti-drift guidance
  - change docs
- guidance как PPC / performance / tracking / web-analytics consultant там, где это уместно.

### 4.3 Роль Copilot Agent

Copilot Agent — **исполнитель, а не архитектор**.

Его роль:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”;
- не трогать соседние контуры без доказанной необходимости.

---

## 5) Жёсткая рабочая доктрина

### 5.1 Канонический workflow

Всегда соблюдать:

1. **Architecture / intent clarification**
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких code changes до audit.  
Никаких acceptance без verification.

### 5.2 Обязательные ограничения для каждого Copilot prompt

Всегда использовать:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Hard constraints:

- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens from canonical SSoT
  - do NOT invent token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

### 5.3 Тактические правила

- без `scope creep`;
- без “заодно поправил”;
- всегда требовать `PROOF file:line-range`;
- boundaries сначала доказывать, потом трогать;
- broad refactor запрещён, пока не доказан как safest path;
- verification важнее уверенного тона;
- в high-blast-radius зоны входить только при явной необходимости;
- smoke/manual проверки — через PowerShell + `curl.exe`, где уместно;
- если речь о “двух фазах”, помнить, что для Cardigo verification всегда отдельная обязательная фаза;
- никогда не переходить к следующей задаче, пока в текущей не убраны / не улажены все хвосты;
- хвост считается закрытым только если он:
  - либо исправлен,
  - либо явно классифицирован как non-blocking / deferred / intentional truth.

### 5.4 Как формулировать хорошие задачи Copilot

Каждый хороший prompt должен содержать:

- цель;
- expected behavior;
- constraints;
- in-scope;
- out-of-scope;
- что нельзя трогать;
- definition of done;
- deliverable format;
- STOP после нужной фазы.

### 5.5 Нормализация shorthand

Иногда пользователь или контекст могут упоминать “двухфазный” подход (Audit + Minimal Fix). Для Cardigo это лишь shorthand.  
**Канонически verification всегда отдельная обязательная фаза.**

---

## 6) Текущая runtime / DB truth

### 6.1 Новый production-shaped cluster

Было принято осознанное решение:

- **не мигрировать старые данные**;
- поднять **новый clean production-shaped Mongo cluster с нуля**;
- использовать его как новую operational baseline.

Target DB: **`cardigo_prod`**

Старый cluster:

- не удалён;
- оставлен как rollback / reference.

### 6.2 Что truth по новому кластеру

Подтверждено:

- local и Render смотрят на новую DB truth;
- manual index governance сохранён;
- backend стартует;
- старый cluster не является текущей production truth.

### 6.3 Какие контуры уже подняты и проверены

Подтверждены manual indexes / bootstrap / tooling для:

- organizations
- organizationmembers
- users
- cards
- emailverificationtokens
- emailsignuptokens
- passwordresets
- activepasswordresets
- mailjobs
- cardanalyticsdailys
- siteanalyticsdailys
- siteanalyticsvisits
- orginvites
- leads
- bookings
- aiusagemonthlies
- paymenttransactions
- blogposts
- guideposts
- deletedemailblocks

### 6.4 Auth / security runtime truth

Важно помнить:

- browser runtime cookie-backed;
- browser auth truth больше **не localStorage-based**;
- browser Authorization header не должен быть переintroduced;
- cookie-auth / proxy / CSRF / CORS truth уже hardened и не должна casually reopen-иться;
- legal/privacy/cookie workstreams теперь имеют собственную устойчивую policy truth.

---

## 7) Основные поверхности продукта

### 7.1 Public / marketing / legal / discoverability

- `/`
- `/cards`
- `/pricing`
- `/contact`
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`
- `/privacy`
- `/terms`
- `/accessibility-statement`

### 7.2 Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

### 7.3 Preview surfaces

- preview routes
- editor preview
- phone-preview wrappers

### 7.4 Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

### 7.5 Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

### 7.6 Admin surface

- `/admin`

---

## 8) Tracking / privacy / Meta truth — текущее состояние

### 8.1 Site-level tracking stack

Текущий stack:

- **GTM container:** `GTM-W6Q8DP6R`
- **Meta Pixel:** `1901625820558020`

Site-level tracking разрешён **только** на approved public marketing routes:

- `/`
- `/cards`
- `/pricing`
- `/blog`
- `/guides`
- `/contact`

Все остальные routes исключены из site-level ad measurement.

### 8.2 Route isolation hardening

Есть allowlist-guard для approved ad routes.

Смысл:

- не загрязнять marketing audiences системными route-ами;
- исключить попадание:
  - `/login`
  - `/register`
  - `/edit`
  - `/dashboard`
  - `/admin`
  - `/org`
  - и прочих non-approved routes
  в site-level advertising audiences.

### 8.3 Card-route tracking — отдельный contour

Card routes — отдельная truth:

- owners могут конфигурировать свои:
  - GTM
  - GA4
  - Meta Pixel
- они живут только на:
  - `/card/:slug`
  - `/c/:orgSlug/:slug`

Это **не часть** site-level Cardigo marketing tracking.

### 8.4 Platform safety protections

Platform IDs заблокированы для per-card owner trackers:

- `GTM-W6Q8DP6R`
- `1901625820558020`

Это защищает аудитории Cardigo от загрязнения owner card tracking.

### 8.5 Card-route consent subsystem

Есть отдельный consent subsystem для card routes:

- key: `cardigo_card_consent_v1`
- отдельный banner
- owner GTM / GA4 / Meta Pixel грузятся **только после consent**
- после decline — не грузятся
- preview routes unaffected

### 8.6 First-party analytics truth

First-party analytics остаётся отдельным слоем и не зависит от third-party consent так же, как Meta/GTM.

### 8.7 First-party → dataLayer bridge

В `siteAnalytics.client.js` добавлен bridge, который существующие first-party click actions дублирует в `window.dataLayer` в виде:

- `event: "cardigo_event"`
- `event_name: <action>`
- `page_path: <pagePath>`

### 8.8 Blog / Guides engagement signals

В GTM-visible слой доведены:

- `blog_article_click`
- `guide_article_click`

### 8.9 Meta GTM mappings

Через GTM уже живут и проверены Meta mappings:

- `Lead`
- `Contact`
- `InitiateCheckout`

### 8.10 registration_complete foundation

Добавлен dedicated product conversion signal:

- `event: "cardigo_event"`
- `event_name: "registration_complete"`

Он стреляет из двух истинных completion-точек:

- `VerifyEmail.jsx`
- `SignupConsume.jsx`

### 8.11 registration_complete consent-hardening

`registration_complete` несёт own consent truth в payload:

- `cardigo_consent_optional_tracking: true | false | null`

### 8.12 Auth URL token sanitization

В:

- `VerifyEmail.jsx`
- `SignupConsume.jsx`

добавлен sanitization через:

```js
window.history.replaceState(null, "", window.location.pathname)
```

### 8.13 CompleteRegistration workaround на GTM/Meta стороне

Для `CompleteRegistration` был сделан отдельный self-bootstrapping Meta event tag, чтобы событие реально доходило в Events Manager без reopen route-isolation contour.

### 8.14 Events Manager truth

В Meta Events Manager уже доказанно доходят:

- `PageView`
- `Lead`
- `Contact`
- `InitiateCheckout`
- `CompleteRegistration`

### 8.15 Website custom audience

Создана аудитория:

- **Cardigo — Registered Users — 180d**

### 8.16 Google retargeting contour

Google retargeting contour **explicitly stopped / deferred**.  
Его сейчас **не продолжаем**.

---

## 9) Meta ads strategy — текущее решение

### 9.1 Frozen sequence

#### Ad 1
**Video ad**
- role: cold prospecting
- landing: `/`
- main offer: free digital card + 10 days premium
- job: explain product + create warm pool
- primary optimization proxy: `InitiateCheckout`

#### Ad 2
**Image ad**
- role: warm retargeting / visual consideration
- landing: `/cards`
- audience: site visitors + content-engaged

#### Ad 3
**Founder / talking-head ad**
- role: hot retargeting / trust close
- landing: `/pricing`
- audience: pricing visitors + contact-intent, excluding registered users

### 9.2 Strategic freeze truth v1

- first launch goal is **not** max revenue on day 1;
- first launch goal is:
  - acquire quality cold traffic,
  - build warm pools,
  - then close via retargeting;
- first main offer:
  - **כרטיס ביקור דיגיטלי בחינם + 10 ימי פרימיום**
- first optimization proxy:
  - **InitiateCheckout**
- Ad 2 and Ad 3 do **not** launch before a real pool exists.

### 9.3 What should be sold first

Продаём первым:

- free digital card;
- 10-day premium;
- fast setup;
- professional business presence;
- WhatsApp / QR / link utility.

Не продаём первым:

- SEO как главный hook;
- analytics как главный hook;
- B2B org management как главный hook;
- сложные premium features как длинный technical list.

### 9.4 A/B testing direction for Ad 1

Планируемый split:

- **A1A — STANDARD-EXPLAINER**
- **A1B — JINGLE-HOOK**

Тестировать нужно только **creative angle**, а не одновременно audience/landing/offer/event.

---

## 10) Что уже сделано в Ads Manager на 2026-04-11

### 10.1 Audience hygiene rule

В аудиториях как safety rule исключаются:

- `/admin`
- `/edit`
- `/org`

При этом было принято решение **не** исключать агрессивно:

- `/card/:slug`
- `/c/:orgSlug/:slug`
- `/login`
- `/register`

Реальный exclusion layer для “уже наших” пользователей:

- `CompleteRegistration`
- `Cardigo — Registered Users — 180d`

### 10.2 Audiences created / confirmed

Подтверждено:

- `META | AUD | IL | WARM | SITEVIS-APPROVED | 180D | V1`
- `META | AUD | IL | WARM | CONTENTENG | 180D | V1`
- `META | AUD | IL | HOT | PRICINGINTENT | 180D | V1`
- `META | AUD | IL | HOT | CONTACTINTENT | 180D | V1`
- `Cardigo — Registered Users — 180d` — found

### 10.3 Draft campaign stacks created

#### Cold
- `META | CAMP | IL | COLD | VIDEO | HOME | IC | V1`
- `META | ADSET | IL | COLD | SMB-FREELANCE-SERVICES | HOME | IC | V1`
- `META | AD | A1 | VIDEO | PRO-FAST-FREE | HOME | V1`

#### Warm
- `META | CAMP | IL | WARM | IMAGE | CARDS | IC | V1`
- `META | ADSET | IL | WARM | SITEVIS-CONTENTENG | CARDS | RET | V1`
- `META | AD | A2 | IMAGE | VISUAL-PROOF | CARDS | V1`

#### Hot
- `META | CAMP | IL | HOT | FOUNDER | PRICING | IC | V1`
- `META | ADSET | IL | HOT | PRICINGINTENT-CONTACTINTENT | PRICING | RET | V1`
- `META | AD | A3 | FOUNDER | TRUST-CLOSE | PRICING | V1`

Все объекты на момент handoff существуют как **drafts**, не публиковались.

---

## 11) Current copy / creative truth for Ad 1

### 11.1 Ad 1 role
`META | AD | A1 | VIDEO | PRO-FAST-FREE | HOME | V1`

- cold prospecting
- landing `/`
- standard message contour:
  - professional image
  - easy sharing
  - easy updating
  - free start
  - 10-day premium

### 11.2 Copywriting direction reached so far

The current best direction for A1 is **pain → solution → low-risk offer**.

One strong angle already explored:
- after a meeting, the client either remembers you or forgets you;
- a digital business card keeps the connection alive after the meeting.

### 11.3 Important copy guardrails for A1

Allowed:
- professional look
- WhatsApp / phone / links
- gallery or booking as supporting proof
- self-editing / 24/7 updating
- free start
- 10-day premium

Not central first-message:
- analytics
- SEO / Google ranking
- team/B2B
- guaranteed outcome claims
- too many features at once

### 11.4 Creative/copy direction for the jingle test

The musical concept is considered promising as a **brand-memory challenger**, but it should not become empty branded noise.  
Even the jingle version must still make the product understandable:
- digital card
- professional presence
- easy share
- free start

---

## 12) Launch discipline truth

### 12.1 What can launch first
Only:

- Cold Campaign / Cold Ad Set / Ad 1

### 12.2 What must stay in draft until pools exist
- Warm Campaign / Warm Ad Set / Ad 2
- Hot Campaign / Hot Ad Set / Ad 3

### 12.3 Publish-ready means

Publish-ready is **not** “all fields are filled”.

Publish-ready means:
- structure correct
- audiences correct
- exclusions correct
- copy correct
- creative correct
- landing correct
- no misleading promise
- correct stage role
- current task fully closed

---

## 13) Следующие правильные шаги после этого handoff

### 13.1 Immediate next bounded step

Следующий правильный шаг в новом окне:

**доделать final creative/copy package для Ad 1**  
сначала для:
- `A1A — STANDARD-EXPLAINER`
- потом для:
- `A1B — JINGLE-HOOK`

Нужно отдельно подготовить:
- final primary text
- headline
- description
- visual/scene logic
- CTA
- final landing confirmation

### 13.2 После этого
- проверить A1 stack на publish-readiness
- только после этого решать, публикуем ли A1A и A1B как controlled test

### 13.3 Warm/Hot дальше
- не публиковать Ad 2 и Ad 3 до накопления pool
- не переходить в publish warm/hot раньше времени

---

## 14) Готовый bootstrap для следующего окна

Можно вставлять в следующий чат примерно так:

```text
Работаем по Cardigo enterprise workflow.

Ты — Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant / PPC strategist.
Copilot Agent — исполнитель, не архитектор.

Жёсткие правила:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Канонический workflow:
1. Architecture / intent clarification
2. Phase 1 — Read-Only Audit with PROOF
3. Phase 2 — Minimal Fix
4. Phase 3 — Verification with RAW stdout + EXIT
5. Documentation / Handoff

Не делать code/doc/GTM changes до audit.
Не оставлять хвосты.
Не смешивать контуры.

Текущая truth:
- Cardigo = Israel-first / Israel-only
- canonical domain = https://cardigo.co.il
- Cardigo and Digitalyty must never be mixed
- tracking/privacy/Meta foundation contour closed
- Google retargeting explicitly deferred/stopped
- GTM = GTM-W6Q8DP6R
- Meta Pixel = 1901625820558020
- Registered Users audience exists
- audiences + three draft campaign stacks in Ads Manager are already built
- current ads workstream truth:
  - Ad 1 = video, cold, landing /
  - Ad 2 = image, warm, landing /cards
  - Ad 3 = founder, hot, landing /pricing
- next bounded step:
  finalize Ad 1 creative/copy package (A1A standard explainer + A1B jingle hook) without breaking frozen structure.
```

---

## 15) Заключительное напутствие

Проект находится в зрелой точке.  
Это уже не фаза “чинить всё подряд”.  
Это фаза **дисциплины, чистой архитектуры и controlled execution**.

Сейчас важнее:

- не расползтись;
- не начать дублировать truth;
- не reopen-ить закрытые contours;
- не потерять discipline;
- не запускать рекламу хаотично;
- не смешивать brand entertainment и performance logic без тестового протокола.

Правильный подход дальше:

- сначала довести **A1 copy + creative truth**;
- затем сделать **controlled A/B** между standard explainer и jingle hook;
- затем публиковать только cold layer;
- затем дождаться warm pool;
- только потом переходить к Ad 2 и Ad 3.

И всегда:

> **safest mature path over fastest hack**
