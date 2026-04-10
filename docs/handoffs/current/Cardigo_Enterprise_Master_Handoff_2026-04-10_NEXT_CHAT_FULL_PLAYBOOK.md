# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook
_Обновлено: 2026-04-10_

---

## 0) Что это за документ

Это **актуальный master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **реальную текущую product / architecture / runtime / tracking truth**;
- передать не только факты, но и **правильную тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, решений “на глаз” и accidental drift;
- сохранить **закрытые контуры закрытыми**;
- зафиксировать, **что уже завершено**, **что intentionally deferred**, и **что логично брать следующим bounded workstream**;
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- закрепить роль Copilot Agent как **исполнителя**, а не архитектора;
- дать следующему окну GPT полноценную инструкцию, **как именно вести Cardigo по-взрослому**.

Этот документ нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- project doctrine;
- architecture memo;
- operational truth;
- tactical guide;
- anti-drift bootstrap.

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
- analytics audiences / tracking contours, когда это можно развести чисто.

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
- smoke/manual проверки — через **PowerShell + `curl.exe`**, где уместно;
- если речь о “двух фазах”, помнить, что для Cardigo verification всегда отдельная обязательная фаза;
- **никогда не переходить к следующей задаче, пока в текущей не убраны / не улажены все хвосты**;
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

---

## 6) Product / runtime truth на текущий момент

### 6.1 База / production-shaped cluster

Было принято осознанное решение:

- **не мигрировать старые данные**;
- поднять **новый clean production-shaped Mongo cluster с нуля**;
- использовать его как новую operational baseline.

Target DB: **`cardigo_prod`**

Старый cluster:
- не удалён;
- оставлен как rollback / reference.

### 6.2 Что уже truth по новому кластеру

Подтверждено:

- local и Render смотрят на новую DB truth;
- manual index governance сохранён;
- backend стартует;
- старый cluster не является текущей production truth.

### 6.3 Auth / security runtime truth

Важно помнить:

- browser runtime cookie-backed;
- browser auth truth больше **не localStorage-based**;
- browser Authorization header не должен быть reintroduced;
- cookie-auth / proxy / CSRF / CORS truth уже hardened и не должна casually reopen-иться;
- legal/privacy/cookie workstreams имеют собственную устойчивую policy truth.

---

## 7) Ключевые поверхности продукта

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

### 8.7 First-party → dataLayer bridge (закрыт)

Закрытый contour:

- существующие first-party site actions были проброшены в `window.dataLayer`
- payload shape:
  - `event: "cardigo_event"`
  - `event_name: <action_name>`
  - `page_path: <pagePath>`

Это сделало GTM-visible существующие site action signals без broad refactor.

### 8.8 blog / guides content engagement signals (закрыты)

Добавлены и верифицированы:

- `blog_article_click`
- `guide_article_click`

Они живут на listing pages и автоматически попадают в `cardigo_event` через уже существующий bridge.

### 8.9 Meta GTM mappings (закрыты)

Через GTM уже живут и проверены Meta mappings:

- `Lead`
- `Contact`
- `InitiateCheckout`

### 8.10 registration_complete foundation (закрыт)

Добавлен dedicated product conversion signal:

- `event: "cardigo_event"`
- `event_name: "registration_complete"`

Он стреляет из двух истинных completion-точек:

- `VerifyEmail.jsx` → verified success
- `SignupConsume.jsx` → success before hard redirect

### 8.11 registration_complete consent-hardening (закрыт)

`registration_complete` несёт own consent truth в payload:

- `cardigo_consent_optional_tracking: true | false | null`

Это было нужно, потому что auth routes не получают passive consent re-push через approved-route logic.

### 8.12 Auth URL token sanitization (закрыт)

Токены вида `?token=...` на auth routes теперь очищаются из URL через:

- `window.history.replaceState(null, "", window.location.pathname)`

Это сделано на mount в:
- `VerifyEmail.jsx`
- `SignupConsume.jsx`

Цель:
- не допускать утечки auth tokens в third-party observability (Meta / GTM / logs / dashboards)

### 8.13 Meta CompleteRegistration (закрыт)

`CompleteRegistration` доведён до working truth:

- событие доходит до Meta Events Manager;
- trigger consent-aware;
- base route isolation не reopen-ился;
- special self-bootstrapping event-tag workaround был нужен, потому что base pixel не живёт на auth routes.

### 8.14 Website custom audience (закрыт)

Создана аудитория:

- **Cardigo — Registered Users — 180d**

Это operational truth для будущих exclusion-ready Meta audiences.

### 8.15 Google retargeting contour (deferred / stopped)

Google retargeting contour **explicitly stopped / deferred**.

Его сейчас **не продолжаем**.

---

## 9) Что уже задокументировано

Канонические doc surfaces по tracking/privacy truth теперь выровнены:

### 9.1 Coverage map
`site-analytics-coverage-map.md`

Там должна жить truth:
- что трекается;
- какие события;
- где они возникают;
- bridge truth;
- `registration_complete` как conversion signal.

### 9.2 Privacy / consent policy
`privacy-consent-and-tracking.md`

Там должна жить truth:
- consent architecture;
- exceptions;
- `registration_complete` consent-inline exception;
- auth URL token sanitization;
- privacy hardening invariants.

### 9.3 Current tracking handoff
`docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md`

Это текущий tracking/bootstrap handoff с уже закрытыми tracking/privacy/Meta contours.

---

## 10) Closed contours — краткая карта

К закрытым и не подлежащим casual reopen-у относятся:

- site-level GTM + Meta base setup
- route isolation hardening
- per-card platform-ID blocklist
- per-card consent subsystem
- owner GA4 consent alignment
- first-party → dataLayer bridge
- blog_article_click / guide_article_click
- Meta Lead / Contact / InitiateCheckout mapping
- registration_complete foundation
- registration_complete consent-hardening
- auth URL token sanitization
- Meta CompleteRegistration confirmation
- Registered Users audience creation
- docs alignment for tracking/privacy/Meta truth

---

## 11) Deferred / intentionally stopped contours

Сейчас intentionally deferred / stopped:

- Google retargeting contour
- GA4 big contour
- enhanced conversions
- dynamic remarketing
- broader Google measurement redesign
- event-based deeper Meta refinement beyond current foundation
- `CompleteRegistration`-based advanced segmentation beyond the current exclusion base
- broad creative production itself (до strategy freeze / creative brief closure)

---

## 12) Meta ads strategy — текущее решение

### 12.1 Что уже зафиксировано

Стратегическая последовательность по Meta ads сейчас такая:

#### Ad 1
**Video ad**
- role: cold prospecting
- landing: `/`
- main offer: free digital card + 10 days premium
- job: explain product + create warm pool

#### Ad 2
**Image ad**
- role: warm retargeting / visual consideration
- landing: `/cards`
- job: show how the product looks for different niches

#### Ad 3
**Founder / talking-head ad**
- role: hot retargeting / trust close
- landing: `/pricing`
- job: close hesitation and push toward decision

### 12.2 Strategic freeze truth v1

Frozen truth:

- first launch goal is **not** max revenue on day 1;
- first launch goal is:
  - acquire quality cold traffic,
  - build warm pools,
  - move users into high-intent layers,
  - then close via retargeting;
- first main offer:
  - **כרטיס ביקור דיגיטלי בחינם + 10 ימי פרימיום**
- first optimization proxy:
  - **InitiateCheckout**
- `CompleteRegistration` is now available as deeper truth and exclusion foundation.

### 12.3 What should be sold first

Что продаём первым:

- free digital card;
- 10-day premium;
- fast setup;
- professional business presence;
- WhatsApp / QR / link utility.

Что **не** продаём первым:

- SEO как главный hook;
- analytics как главный hook;
- B2B org management как главный hook;
- сложные premium features как длинный technical list.

---

## 13) Следующий правильный рабочий шаг

### 13.1 Текущее следующее направление

Следующий логичный большой этап:

## **Meta ads sequence planning and creative preparation**

Но делать его нужно **не хаотично**.

Правильный порядок:

1. strategy freeze / message foundation
2. Creative Brief #1 for video ad
3. visual / promise / objection structure
4. only then actual copy / script / creative production

### 13.2 Конкретно что делать следующим

Следующий bounded workstream:

## **Creative Brief #1 — Video Ad foundation audit**

Нужно доказать по homepage truth:
- strongest supported promise;
- strongest supported free/trial hook;
- strongest visuals/features to show;
- strongest objections homepage already resolves;
- what claims must be avoided;
- safest CTA wording for the first video ad.

Только после этого:
- собирать final brief,
- потом сценарий / copy.

---

## 14) Как должен мыслить следующий чат

Следующий чат должен действовать так:

- не начинать “просто писать рекламу” с нуля;
- не перепридумывать tracking truth;
- не возвращаться к Google;
- не reopen-ить уже закрытые Meta / privacy / token контуры;
- не спорить заново с `registration_complete` и URL sanitization;
- не плодить новые docs без нужды;
- держать проект в enterprise-режиме;
- идти по уже замороженной логике:
  - audit
  - minimal fix / decision artifact
  - verification
  - documentation

---

## 15) Что обязательно напоминать следующему окну

Следующему окну ChatGPT нужно сразу напомнить:

- работать как **Senior Project Architect / Senior Full-Stack / Enterprise Consultant**
- Copilot — исполнитель
- работать строго фазами
- ничего не делать до audit
- не оставлять хвосты
- не прыгать между задачами
- не смешивать контуры
- всегда проверять:
  - scope
  - blast radius
  - invariants
  - verification
  - docs alignment

---

## 16) Готовый bootstrap для следующего окна

Можно вставлять в следующий чат примерно так:

```text
Работаем по Cardigo enterprise workflow.

Ты — Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant.
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
- registration_complete closed and privacy-hardened
- Meta CompleteRegistration confirmed working
- audience "Cardigo — Registered Users — 180d" created
- latest tracking handoff exists:
  docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-10_TRACKING_CLOSED_PLAYBOOK.md

Следующий логичный workstream:
Creative Brief #1 foundation for the first Meta video ad, grounded strictly in homepage truth and current strategic freeze.
```

---

## 17) Заключительное напутствие

Проект находится в зрелой точке.  
Это уже не фаза “всё сломано и нужно срочно чинить что угодно”.

Сейчас важнее:

- не расползтись;
- не начать дублировать truth;
- не reopen-ить закрытые contours;
- не потерять discipline;
- не перескочить к production of creatives раньше, чем заморожен strategy/message foundation.

Правильный подход дальше:

- сначала доказать message/landing truth для Ad 1;
- потом собрать Creative Brief #1;
- потом production plan;
- потом только actual ad creation.

И всегда:
> **safest mature path over fastest hack**

