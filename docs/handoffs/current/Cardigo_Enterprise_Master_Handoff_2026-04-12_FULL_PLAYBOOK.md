# Cardigo — Enterprise Master Handoff / Next Chat Full Playbook

_Обновлено: 2026-04-12_

---

## 0) Что это за документ

Это **актуальный master handoff / next-chat playbook** для следующего окна ChatGPT по проекту **Cardigo**.

Цель документа:

- быстро ввести новый чат в **реальную product / architecture / runtime / admin / auth / bundle / tracking truth**;
- передать не только факты, но и **тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, случайного drift и решений “на глаз”;
- сохранить **закрытые контуры закрытыми**;
- зафиксировать, **что уже завершено**, **что intentionally deferred**, и **что логично брать следующим bounded workstream**;
- закрепить роль ChatGPT как **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant / Performance-minded technical lead**;
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
- master status summary;
- instruction set for Copilot-driven execution.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** — это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но фактически Cardigo уже давно не “просто цифровая визитка”.

Текущая продуктовая формула:

> **Cardigo = digital business card + mini business page + sharing layer + SEO layer + analytics layer + self-service editing + operational business layer + booking-ready foundation.**

Проект уже включает или должен включать:

- digital business card;
- public card surface;
- mini business page;
- lead/contact surface;
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
- privacy / consent-aware tracking governance;
- mature admin/operator tooling.

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
- analytics audiences / tracking contours;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Production truth:

**https://cardigo.co.il**

Политика:

- canonical — non-www;
- Cardigo и Digitalyty нельзя смешивать в canonical / OG / sitemap / URL logic / product copy / structured data.

---

## 2) Стек, инфраструктура и runtime truth

### 2.1 Frontend

- React + Vite
- RTL-first
- **CSS Modules only**
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
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
- managed Mongo runtime
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

### 2.5 Runtime / DB truth

Зафиксировано:

- старые данные **осознанно не мигрировались**;
- поднят новый clean production-shaped Mongo cluster как новая baseline truth;
- target DB: **`cardigo_prod`**;
- старый cluster оставлен как rollback/reference;
- local и Render смотрят на новую DB truth;
- manual index governance сохранён.

### 2.6 Auth runtime truth

Важно помнить:

- browser runtime cookie-backed;
- browser auth truth больше **не localStorage-based**;
- browser Authorization header не должен быть переintroduced;
- cookie-auth / proxy / CSRF / CORS contour уже hardened и не должен casually reopen-иться.

---

## 3) Ключевые архитектурные инварианты

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
- в нужных контурах — performance / UX / tracking / admin systems consultant

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
- выбирать **safest mature path**, а не fastest hack.

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
    - font-size only via var(--fs-\*)
    - use only existing approved typography tokens from canonical SSoT
    - do NOT invent token names ad hoc
    - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
    - --fs-\* rem-only
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
- никогда не переходить к следующей задаче, пока в текущей не убраны / не классифицированы все хвосты;
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

## 6) Важные поверхности проекта

### Public / marketing / legal / discoverability

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

### Public card surfaces

- `/card/:slug`
- `/c/:orgSlug/:slug`

### Preview surfaces

- preview routes
- editor preview
- phone-preview wrappers

### Product / cabinet surfaces

- `/dashboard`
- `/inbox`
- `/org/invites`
- `/edit/...`

### Auth / system surfaces

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/signup`
- `/signup-link`
- `/verify-email`
- `/invite`

### Admin

- `/admin`

---

## 7) Уже закрытые и подтверждённые важные контуры до этого окна

Ниже не вся история проекта, а важнейшая operational truth, которую нельзя casually reopen-ить.

### 7.1 Product / content / SEO / public

- premium public `/cards` — закрыт;
- premium public `/pricing` — закрыт;
- `/contact` и admin analytics visibility cleanup — ранее закрыты;
- blog subsystem — закрыт;
- guides subsystem — закрыт;
- privacy / terms / accessibility statement — закрыты;
- deterministic SEO defaults и structured data assist — ранее закрыты;
- centralized robots pre-launch guard — ранее закрыт.

### 7.2 Booking / services / business hours

- services contour закрыт;
- businessHours contour закрыт;
- booking foundation и owner/public booking contours собраны и verified;
- owner inbox / pending counts / header badge contour закрыт.

### 7.3 Tracking / consent / marketing foundation

- GTM + Meta tracking foundation закрыта;
- route isolation hardening закрыт;
- owner card-route consent subsystem закрыт;
- registration_complete foundation и events pipeline собраны;
- audiences и ad structure v1 собраны;
- Google retargeting contour explicitly deferred/stopped.

### 7.4 Auth / reset / security

- reset/forgot flow was reworked earlier into mature ActivePasswordReset/MailJob shape;
- cookie-backed auth truth защищена;
- separate future security/auth modernization contours still possible, but current auth baseline считается зрелой и рабочей.

---

## 8) Что было сделано в этом окне чата — свежая truth

Ниже — самое важное из **последнего рабочего цикла**, что должно быть передано в новый чат.

---

### 8.1 Admin billing convenience contour — CLOSED

#### Задача

Во вкладке admin `כרטיסים` по нажатию на slug нужно было добиться такого же удобства, как во вкладке `משתמשים` по нажатию на email: автоматическая гидрация блока `ניהול חיובים`, без ручного ввода.

#### Что было доказано audit-ом

- billing panel anchored on **`billingUserId`**, а не на slug/cardId;
- cards rows already contained **`ownerSummary.userId`**;
- backend changes не нужны;
- naive parallel path `loadCard + loadUser` мог дать race/order issues.

#### Что было реализовано

- deterministic pending-pin path для clicked card;
- затем дополнительный local hardening против stale `loadUser` responses;
- guarded behavior for anonymous/no-owner path;
- zero backend changes.

#### Итог

- клик по slug во вкладке `כרטיסים` теперь корректно гидрирует billing через существующую user-based truth;
- clicked card selection не теряется;
- users-email flow не сломан;
- contour accepted and closed.

#### Что сознательно не трогали

- `loadCard` stale overwrite / potential right-panel flicker;
- `billingCardPlan` auto-fill;
- admin bundle size (позже закрывался отдельным workstream).

---

### 8.2 Trial-aware admin filtering contour — CLOSED

Это был большой bounded contour с несколькими фазами.

#### Исходная проблема

В админке не было зрелой, согласованной trial-aware semantics:

- trial users/cards не были прозрачно и одинаково видны;
- `משתמשים` и `כרטיסים` жили по разной логике;
- потом всплыла и page-local vs dataset-wide inconsistency в cards tab.

#### Phase A — semantic audit

Было доказано:

**Users tab**

- filters backend-side;
- active trial users раньше попадали в `לא משלמים`.

**Cards tab**

- filters сначала были frontend-side и page-local;
- active trial cards раньше смешивались с `משלמים`.

#### Phase B — mutually exclusive semantics

Зафиксирована canonical admin semantics model:

**משתמשים**

- `הכל`
- `ניסיון`
- `משלמים`
- `לא משלמים`

**כרטיסים**

- `הכל`
- `ניסיון`
- `משלמים`
- `חינם`
- `אנונימי`

#### Phase C — cards semantic hardening

Сделано:

- `ניסיון` выделен отдельно;
- `משלמים` больше не включает trial;
- `משלמים` и `חינם` больше не поглощают anonymous;
- cards cohorts стали mutually exclusive.

#### Phase D — users trial cohort extension

Сделано:

- новый backend `trial` cohort;
- `non-paying` теперь excludes active trial;
- row response shape не расширяли без нужды;
- users semantics стали mutually exclusive.

#### Phase E — cards dataset-wide normalization

После реального runtime mismatch было доказано:

- users tab trial был dataset-wide;
- cards tab trial был page-local;
- это давало structural inconsistency.

Сделано:

- cards cohorts переведены на backend-side / dataset-wide filtering;
- `listCards` получил `cohort`;
- frontend перестал держать второй источник cohort truth;
- pagination и total стали считаться по одному и тому же filter.

#### Итог

Contour полностью закрыт:

- trial now separately visible in both tabs;
- users/card semantics aligned;
- cards filters dataset-wide;
- accepted and closed.

---

### 8.3 Auth validation UX contour — CLOSED

#### Исходная проблема

В `/login` и `/register` браузер показывал native validation popup:

- “Заполните это поле”
- сообщения про minlength и т.д.

Это было непремиально, нестильно, зависело от браузера и не выглядело как controlled enterprise UX.

#### Phase A — foundation

Было доказано:

- `Input.jsx` already had `error` prop infrastructure;
- но auth forms этим не пользовались;
- `/register` содержит и raw checkbox, значит нужен не только input-internal path.

Сделано:

- введён shared **FieldValidationMessage** primitive;
- `Input.jsx` additively enhanced:
    - `useId`
    - `aria-invalid`
    - `aria-describedby`
    - shared validation message rendering
- без создания второго input primitive.

#### Phase B — `/login`

Сделано:

- `noValidate`
- local `fieldErrors`
- local `validate()`
- `Input error={...}` для email/password
- `Notice variant="error"` для server/form-level errors
- semantic `required` сохранён

Потом был маленький hardening:

- `required` вернули после того, как Copilot сначала убрал его из Input calls.

#### Phase C — `/register`

Сделано:

- `noValidate`
- local `fieldErrors`
- local `validate()`
- text fields через `Input error={...}`
- checkbox consent через `FieldValidationMessage` + `aria-describedby`
- `Notice variant="error"` для form/server errors
- `required` / `minLength` сохранены.

#### Итог

Contour закрыт:

- native browser popup исчез;
- controlled field-level UX теперь на `/login` и `/register`;
- checkbox consent тоже вошёл в общую validation presentation system;
- accessibility стала лучше;
- contour accepted and closed.

#### Отложенный follow-up

Отдельно позже был закрыт маленький contour:

- `/login` invalid credentials `"Invalid credentials"` был локально заменён на понятную фразу на иврите по `status === 401`.

Фраза:
**`האימייל או הסיסמה שגויים. נסו שוב.`**

Этот маленький wording contour тоже закрыт.

---

### 8.4 Frontend bundle hardening contour — CLOSED

#### Исходная проблема

Vite build ругался на oversized entry chunk:

- pre-existing `index-*.js` ~523 kB

#### Phase A — route lazy split

Было доказано:

- многие тяжёлые product routes уже lazy;
- auth pages + Dashboard всё ещё eagerly лежали в entry.

Сделано:

- `router.jsx` only
- auth pages + Dashboard переведены на lazy routes
- reused existing `ChunkErrorBoundary + Suspense + RouteFallback` pattern
- `Home` оставлен eager
- warning остался, но entry chunk уменьшился.

#### Phase B — explicit vendor manualChunks extraction

Было доказано:

- следующий правильный шаг — `vite.config.js`, а не дальнейшая route surgery;
- blanket `node_modules -> vendor` rejected;
- нужен explicit allowlist with path-boundary matching.

Сделано:

- один `vendor` chunk
- explicit allowlist:
    - react
    - react-dom
    - react-router-dom
    - react-router
    - scheduler
    - axios
    - react-helmet-async
- path normalization for Windows
- path-boundary matching `/node_modules/<pkg>/`
- lazy-only libs (`qrcode.react`, `react-easy-crop`) intentionally excluded

#### Итог

Результат после verification:

- `index-*.js` упал до **220.83 kB**
- `vendor-*.js` появился ~281.76 kB
- warning `Some chunks are larger than 500 kB` полностью исчез
- lazy route graph intact
- contour accepted and closed

---

## 9) Что сейчас считается свежей актуальной truth по последним workstream-ам

### Admin

- slug click → billing hydrate contour closed
- trial-aware admin filtering fully closed
- users/cards admin semantics aligned
- cards cohorts backend-side dataset-wide

### Auth

- `/login` and `/register` auth validation UX now controlled
- FieldValidationMessage + Input a11y foundation in place
- `/login` invalid credentials wording localized to Hebrew
- other auth pages like forgot/reset/invite still remain a possible future contour for the same validation UX standard

### Frontend performance / bundling

- auth/dashboard routes lazy-loaded
- explicit vendor chunk extracted
- pre-existing 500 kB Vite warning fully resolved
- current bundle state accepted

---

## 10) Что сейчас intentionally deferred / не блокирует текущую acceptance truth

Это важный список — чтобы новый чат не начал “чинить заодно”.

### Admin / billing / cards

- `loadCard` stale overwrite / possible right-panel flicker
- `billingCardPlan` auto-fill
- любые broad admin refactors

### Auth

- расширение нового validation UX contour на:
    - ForgotPassword
    - ResetPassword
    - SignupConsume
    - InviteAccept
- cleanup dead `.error` CSS classes в `Login.module.css` / `Register.module.css`
- общий auth error mapping layer — пока не нужен

### Bundle / performance

- splitting vendor into `vendor-react` / `vendor-utils`
- further eager marketing/legal page lazy split
- Header / EditorTabIcons eager-shell issue
- любые speculative perf changes without proof

### Broader roadmap

- дальнейшее auth/registration hardening
- invalid token / API error handling improvements
- monitoring / CI/CD hardening
- security / scalability / performance testing
- docs/runbooks consolidation

---

## 11) Следующие разумные направления работы после этого handoff

Ниже не “обязательно следующий шаг”, а **bounded mature options**, которые имеют смысл брать после этого окна.

### Option A — Auth UX extension contour

Распространить новый auth validation UX standard на:

- ForgotPassword
- ResetPassword
- InviteAccept
- SignupConsume / related auth surfaces

Как идти:

1. audit exact surfaces
2. minimal fix per page or tiny grouped contour
3. verification
4. closure

### Option B — Auth / API error messaging hardening

Привести другие auth/server messages к понятному user-facing Hebrew wording, без broad i18n overhaul.

Как идти:

1. audit message sources
2. local/shared mapping decision
3. minimal fix
4. verification

### Option C — Optional further frontend performance contour

Только если реально нужно:

- marketing/legal route lazy split
- or more refined vendor split
- only after audit + proof

### Option D — Security / auth hardening

Отдельный bounded contour:

- invalid token handling
- auth API consistency
- safer error normalization
- maybe additional auth edge-case cleanup

### Option E — Documentation / runbooks consolidation

Собрать truth из последних workstream-ов в living docs/runbook style.

---

## 12) Как правильно работать в следующем окне

Ниже — инструкция, которую можно практически вставить в новый чат как bootstrap.

### Краткий bootstrap

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

Никаких изменений до audit.
Никакого acceptance без verification.
Никакого scope creep.
Никаких “заодно поправил”.
Всегда требовать PROOF file:line-range.
Для smoke/manual checks — PowerShell + curl.exe, где уместно.

Текущая truth:
- Cardigo = Israel-first / Israel-only
- canonical domain = https://cardigo.co.il
- Cardigo and Digitalyty must never be mixed
- cookie-backed auth truth preserved
- latest closed contours in this window:
  - admin slug-click -> billing hydrate
  - trial-aware admin filtering fully normalized
  - auth validation UX on /login + /register
  - login invalid credentials Hebrew wording
  - auth/dashboard lazy split
  - explicit vendor manualChunks extraction
  - 500 kB Vite warning resolved
  - premium trial reminder contour (technically closed; compliance contour still open — see §16)
```

---

## 13) Практические напутствия следующему окну GPT

### 13.1 Не терять discipline

Сейчас проект в такой фазе, где гораздо опаснее:

- открыть лишний contour,
- размазать ответственность,
- сделать broad refactor ради “красоты”,
  чем оставить аккуратно отложенный хвост до отдельной bounded задачи.

### 13.2 Не смешивать контуры

Если новая задача касается:

- auth,
- admin,
- bundle/performance,
- marketing pages,
- tracking,
  это не значит, что всё это надо трогать в одной итерации.

Работать только так:

- один contour,
- одна boundary,
- один audit,
- один minimal fix,
- одна verification phase.

### 13.3 Всегда проверять, где source of truth

Особенно в Cardigo часто есть разные уровни truth:

- user-level vs card-level;
- backend read-model vs frontend filter;
- DTO-computed truth vs raw Mongo truth;
- lifecycle truth vs admin UX truth.

Нельзя смешивать их “на глаз”.

### 13.4 Предпочитать additive changes

Лучший Cardigo-фикс почти всегда:

- меньше файлов,
- меньше blast radius,
- reuse existing truth,
- no new abstraction unless proven.

### 13.5 Не бояться deferred list

Deferred — это не “проблему забыли”.  
Это зрелый инструмент удержания проекта в правильных границах.

---

## 14) Самое важное коротко

Если следующий чат прочитает только один раздел, пусть это будет этот.

### Что за проект

Cardigo — зрелый Israel-first SaaS для цифровых визиток, мини-бизнес-страниц, SEO, аналитики, self-service editing и booking-ready operational layer.

### Как в нём работать

Только enterprise-style:

- audit first
- minimal fix
- verification mandatory
- no scope creep
- no “заодно”
- protect invariants

### Что уже закрыто в этом окне

- admin slug click → billing hydrate
- trial-aware admin filtering
- auth validation UX on `/login` and `/register`
- `/login` invalid credentials Hebrew wording
- auth/dashboard lazy route split
- explicit vendor manualChunks extraction
- 500k Vite warning gone
- **premium trial reminder contour — technically implemented, smoke-tested, governed index applied** (see §16)

### Что нельзя ломать

- Cardigo/Digitalyty boundary
- canonical domain truth
- cookie auth truth
- DTO/public path truth
- template registry truth
- token-only skins
- preview-only styling boundaries
- manual index governance
- closed contours

### Что делать дальше

Выбирать следующий bounded contour и снова идти:
**Audit → Minimal Fix → Verification → Handoff**

---

## 15) Заключение

Проект сейчас в хорошей зрелой форме.  
Последний цикл дал не просто локальные фиксы, а **несколько системных улучшений**:

- admin UX стал взрослее;
- trial semantics в админке стали согласованными;
- auth UX стал controlled и профессиональным;
- bundle graph стал чище и стабильнее;
- warning по oversized chunk ушёл;
- pre-expiry reminder email contour встроен в lifecycle;
- при этом discipline не потеряна.

---

## 16) Premium Trial Reminder Contour — Status Block

### Техническое состояние

| Аспект                                                                   | Статус                  |
| ------------------------------------------------------------------------ | ----------------------- |
| Standalone reminder job (`trialReminderJob.js`)                          | ✅ Implemented          |
| User model fields (`trialReminderClaimedAt`, `trialReminderSentAt`)      | ✅ Implemented          |
| Multipart email (TextPart + HTMLPart, CTA → /pricing)                    | ✅ Implemented          |
| Governed compound index (`trialReminderSentAt_1_trialEndsAt_1` on users) | ✅ Applied (2026-04-12) |
| Job registered in server.js (5th job, 75 s stagger)                      | ✅ Implemented          |
| Daytime send guard (09:00–18:00 Asia/Jerusalem)                          | ✅ Implemented          |
| Claim/send idempotency (atomic claim → sentAt stamp)                     | ✅ Implemented          |
| Smoke test                                                               | ✅ Passed (2026-04-12)  |

### Принятые структурные tradeoffs

- **At-least-once delivery:** в окне между Mailjet 2xx и записью `trialReminderSentAt` падение процесса может привести к повторной отправке. Принято — такое же поведение у всех остальных mail functions. Закрытие требует outbox-contour.

### Compliance boundary — OPEN

> **Этот контур технически работает. Он НЕ одобрен для широкой рассылки на весь user base.**

Отсутствует:

- явный чекбокс согласия на marketing/lifecycle email (при регистрации или в профиле);
- ссылка на отписку (unsubscribe) в теле письма;
- механизм opt-out / список подавления.

До закрытия bounded compliance / marketing-consent contour — это **controlled lifecycle email** в ограниченном деплое. Массовая активация для всей базы пользователей требует сначала закрыть этот contour.

### Следующий bounded contour (если нужно двигаться вперёд)

Compliance / marketing-consent contour:

1. Дизайн и согласование механизма opt-in / unsubscribe
2. Реализация (поле на User, unsubscribe link в email, возможно suppression list)
3. Verification
4. Closure

Runbook: `docs/runbooks/trial-lifecycle-ssot.md` §13.9

Правильный подход дальше:

> **safest mature path over fastest hack**

И всегда помнить:

- сначала доказать truth,
- потом менять минимально,
- потом верифицировать жёстко,
- и только после этого считать contour закрытым.
