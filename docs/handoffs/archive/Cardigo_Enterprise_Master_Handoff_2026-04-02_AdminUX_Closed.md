# Cardigo - Enterprise Master Handoff / Next Chat Playbook

_Обновлено: 2026-04-02 (auth/security migration closure preserved; admin UX/UI workstream for cards/users/orgs closed and documented)_

---

## 0) Что это за документ

Это **актуальный master handoff** для следующего окна ChatGPT по проекту **Cardigo**.

Его задача:

- быстро ввести новый чат в **текущую project truth**;
- передать не только факты о проекте, но и **правильную тактику работы**;
- закрепить **enterprise-режим мышления**;
- удержать следующий чат от `scope creep`, broad refactor, решений “на глаз” и architectural drift;
- сохранить **закрытые контуры** закрытыми;
- чётко отделить:
    - то, что уже завершено,
    - то, что intentionally deferred,
    - то, что логично брать следующим bounded workstream;
- зафиксировать, что **большая auth/security migration program в текущем scope завершена**;
- зафиксировать, что **свежий admin UX/UI workstream по `/admin` для כרטיסים / משתמשים / ארגונים закрыт полностью**.

Этот файл нужно воспринимать как:

- главный handoff;
- next-chat playbook;
- project doctrine;
- architecture memo;
- operational truth;
- guide для ChatGPT в роли **Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant**;
- guide для работы с **Copilot Agent как с исполнителем**, а не архитектором;
- и как **инструкцию по тому, как дальше работать по-взрослому**.

---

## 1) Что собой представляет проект

### 1.1 Продукт

**Cardigo** - это зрелый Israel-first SaaS-продукт для создания, управления, публикации и распространения **цифровых визитных карточек**.

Но по факту Cardigo - это не “просто визитка”.

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
- structured-data / SEO layer;
- premium surface;
- organization/team surface;
- admin surface;
- AI-assisted content surfaces;
- services / business-hours operational contour;
- booking foundation и owner/public booking contour;
- discoverability stack;
- blog / guides public content surfaces;
- premium public marketing surfaces.

### 1.2 Рынок и продуктовая ориентация

Cardigo - **Israel-first / Israel-only baseline**.

Это означает:

- иврит / RTL - product default;
- product assumptions строятся под Израиль;
- multi-locale пока не является базовой product truth;
- использование `IL` как trusted default допустимо там, где это не ломает contracts и truth.

### 1.3 Бренды и разделение

Критический инвариант:

- **Cardigo** - отдельный продукт;
- **Digitalyty** - отдельный бренд / сайт / маркетинговый слой.

Их нельзя смешивать в:

- canonical;
- SEO;
- public paths;
- naming;
- product logic;
- structured data;
- OG / sitemap / URL logic;
- user-facing copy внутри Cardigo.

### 1.4 Канонический домен

Production truth:

**https://cardigo.co.il**

Политика:

- canonical - non-www;
- Cardigo и Digitalyty не смешивать в canonical / OG / sitemap / URL logic / product copy / structured data.

---

## 2) Текущий стек и инфраструктура

### 2.1 Frontend

- React + Vite
- RTL-first
- **CSS Modules only**
- token-based styling system
- route-level SEO/head
- shared render chain для public + preview
- Netlify hosting / Netlify-facing surface
- preview/editor/product/admin/public layers

### 2.2 Backend

- Node.js + Express
- MongoDB / Mongoose
- backend deploy на Render-подобной схеме
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

### 2.4 Mongo / index governance truth

Это очень важный operational закон проекта:

- `MONGOOSE_AUTO_INDEX=false`
- `MONGOOSE_AUTO_CREATE=false`

Это означает:

- production structural truth не должна рождаться хаотично на runtime;
- критичные индексы поднимаются **вручную**;
- миграции и sanity scripts - канонический путь;
- drift должен выявляться и исправляться осознанно, а не “сам создался и ладно”.

---

## 3) Текущая runtime / DB truth

### 3.1 Что произошло с базой

Было принято осознанное решение:

- **не мигрировать старые данные**;
- поднять **новый clean production-shaped Mongo cluster с нуля**;
- использовать его как новую operational baseline.

Target DB: **`cardigo_prod`**

Старый cluster:

- **не удалён**;
- оставлен как **rollback/reference**.

### 3.2 Что уже truth по новому кластеру

На новом cluster уже подтверждено:

- local и Render работают на новой DB truth;
- manual index governance сохранён;
- backend на Render уже переведён на новый cluster;
- backend успешно стартует;
- старый cluster не используется как current production truth.

Render env truth:

- backend смотрит в новый Mongo cluster;
- `SITE_ANALYTICS_RETENTION_DAYS=365`;
- `SITE_ANALYTICS_VISIT_RETENTION_DAYS=90`;
- `MONGO_URI_OLD` сохранён для rollback.

### 3.3 Какие коллекции/контуры были подняты вручную

Manual indexes / bootstrap tooling были подтверждены для:

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

### 3.4 Какие migration/tooling проблемы уже были закрыты

Уже исправлены:

- scripts, которые не делали `mongoose.disconnect()`;
- bookings migration:
    - `NamespaceNotFound` safe path;
    - замена `process.exit()` на более безопасный lifecycle;
    - фикс `expireAfterSeconds: null` в non-TTL index path;
- leads migration:
    - dry-run/apply mismatch;
    - missing governed indexes;
    - добавлены `idx_leads_mailbox` и `idx_leads_deletedAt_ttl`.

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
- думать про security / scalability / maintainability / blast radius;
- не давать broad refactor “по вдохновению”;
- не принимать решения “на глаз”, если их можно доказать;
- строить bounded prompts для Copilot;
- требовать `PROOF file:line-range`;
- требовать `RAW stdout + EXIT`;
- фиксировать, что уже закрыто и не должно casually reopen-иться;
- выбирать safest mature path, а не fastest hack.

#### Дополнительные обязанности ChatGPT в проекте

Как senior architect / full-stack / enterprise consultant, ChatGPT также отвечает за:

- архитектурное проектирование и улучшение проекта под масштабируемость, безопасность и производительность;
- технический консалтинг по backend, frontend, API architecture, data storage, deployment и production readiness;
- code review и improvement proposals с фокусом на качество, maintainability, clean code principles и design patterns;
- guidance по secure mechanisms:
    - CSRF/XSS/injection defenses,
    - data protection,
    - password / reset / token flow hardening,
    - privacy / consent / legal truth;
- помощь по CI/CD, monitoring, alerts, release discipline;
- поддержку документации:
    - technical docs,
    - runbooks,
    - README,
    - next-chat handoffs,
    - anti-drift guidance.

### 4.2 Роль Copilot Agent

Copilot Agent - **исполнитель**, а не архитектор.

Его роль:

- сначала читать и доказывать;
- потом менять минимально;
- потом верифицировать;
- не расширять scope самостоятельно;
- не делать “заодно поправил”;
- не трогать соседние контуры без доказанной необходимости.

---

## 5) Каноническая рабочая доктрина

### 5.1 Workflow

Всегда соблюдать:

1. **Architecture / intent clarification**
2. **Phase 1 - Read-Only Audit with PROOF**
3. **Phase 2 - Minimal Fix**
4. **Phase 3 - Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

Никаких code changes до audit.  
Никаких acceptance без verification.

### 5.2 Жёсткие ограничения для Copilot prompts

Всегда использовать:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Hard constraints:

- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
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
- broad refactor запрещён, пока он не доказан как safest path;
- verification важнее уверенного тона;
- в high-blast-radius зоны входить только при явной необходимости;
- smoke/manual проверки - через PowerShell + `curl.exe`, где уместно;
- если речь о двух фазах - помнить, что для Cardigo verification всегда отдельная обязательная фаза;
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

## 6) Важные архитектурные инварианты

Нельзя casually ломать:

- SSoT render chain for public + preview;
- templates registry только в `frontend/src/templates/templates.config.js`;
- skins token-only;
- preview-only styles только под `[data-preview="phone"]`;
- CardLayout DOM skeleton;
- CardLayout.module.css (high-blast-radius зона);
- public/QR/OG URLs только из backend DTO `publicPath/ogPath`;
- anti-enumeration 404 / membership-gate truth;
- sitemap без N+1;
- backend index governance только вручную.

### 6.1 Frontend / styling governance

- skins token-only;
- никаких structural styles в skins;
- никаких `url()`, background images и layout-решений в token layer;
- app shell, public pages, editor shell, preview wrapper и card boundary - разные контуры, их нельзя смешивать “по чувству”.

### 6.2 Typography law

Typography policy - корпоративный закон:

- `font-size` только через `var(--fs-*)`;
- `--fs-*` только rem-only;
- нельзя `px`, `em`, `%`, `vw`, `vh`, `clamp`, fluid formulas;
- нельзя `calc(non-rem)`;
- responsive typography только через token overrides и rem breakpoints;
- нельзя придумывать новые typography tokens ad hoc.

### 6.3 High-blast-radius зоны

Без отдельного bounded workstream не трогать casually:

- `CardLayout.module.css`
- CardLayout DOM skeleton
- card-boundary typography
- shared render chain
- templates registry
- shared public styling primitives
- global auth transport rules
- proxy/gate assumptions

---

## 7) Что уже было важно закрыто раньше и не должно casually reopen-иться

Считаются закрытыми или не подлежащими casual reopen следующие contour-ы:

- premium public pages family;
- `/cards` examples page;
- `/pricing`;
- `/contact`;
- blog subsystem;
- guides subsystem MVP;
- governance hardening cycle;
- typography remediation вне deferred card-boundary zone;
- motion framework foundation;
- FAQ AI bounded v1;
- AI quota/shared budget direction;
- services cycle;
- business hours contour;
- booking backend foundation / owner incoming area / IA;
- legal/info public family;
- skip link;
- accessibility focus trap Tier 1 + Tier 2;
- fresh-cluster DB/bootstrap contour;
- большой bounded auth/security modernization contour;
- docs + anti-drift closure для этого contour-а.

---

## 8) Большая auth/security migration program - что было сделано

### 8.1 Что было целью

Не “переписать auth ради красоты”, а перевести проект на более зрелую browser/session/security модель, не сломав runtime, tooling, admin, uploads и связанные поверхности.

### 8.2 Что закрыто по факту

#### Browser runtime

- browser runtime переведён на **httpOnly cookie-backed auth**;
- browser auth больше не строится на `localStorage["token"]`;
- browser-side `Authorization` header как primary auth mechanism убран.

#### Response-body token decommission

JWT больше не возвращается в body для browser auth flows:

- `/auth/login`
- `/auth/signup-consume`
- `/invites/accept`

#### Browser localStorage auth truth removal

- auth token больше не живёт в browser localStorage;
- остались только non-auth localStorage keys, которые допустимы:
    - cooldown flags,
    - device/anonymous IDs,
    - AI consent,
    - UX/analytics opt-outs и т.п.

#### Admin regression closure

- `requireAdmin` больше не ломает browser runtime в cookie-backed модели;
- `/admin` снова доступен корректно;
- tabs/users/cards/orgs грузятся;
- non-admin не получает admin access.

#### CSRF contour

Принята и закрыта текущая CSRF truth:

- cookie-auth mutation requests требуют `X-Requested-With: XMLHttpRequest`;
- middleware mounted globally;
- frontend отправляет header централизованно;
- в текущей topology это считается достаточной финальной моделью;
- **не reopen-ить casually** без нового отдельного contour-а.

#### CORS contour

Принята и закрыта текущая CORS truth:

- explicit allowlist from `CORS_ORIGINS`;
- `credentials: true`;
- no wildcard drift;
- no-origin path intentionally allowed for server-to-server / curl / internal tooling;
- proxy/topology проверены и признаны согласованными;
- **не reopen-ить casually** без нового отдельного contour-а.

#### Bearer/tooling decision

Закрыт зрелым decision:

- backend dual-mode middleware intentionally оставлен;
- browser runtime от Bearer уже не зависит;
- Bearer теперь живёт как **controlled internal tooling compatibility layer**;
- сейчас removal **не justified**.

#### Observability / correctness fixes

Были закрыты узкие foundation gaps:

- structured logging для CSRF rejections;
- structured logging для CORS rejections;
- `Vary` correctness для `/auth/me`: `Authorization, Cookie`.

#### Startup/runtime validation hardening

Закрыты важные env/runtime gaps:

- `JWT_SECRET` теперь fail-fast на startup;
- `CARDIGO_PROXY_SHARED_SECRET` теперь fail-fast на startup в production;
- `.env.example` поджат в безопасную сторону для relevant env;
- misconfiguration переведена из fail-open/fail-late в fail-fast.

### 8.3 Что именно теперь считается auth/security truth

- browser runtime = cookie-backed;
- browser auth truth больше не localStorage-based;
- browser Authorization header не должен возвращаться в browser flows;
- `/register` не выдаёт auth cookie/session, а возвращает `{ registered: true, isVerified: false }`;
- `/login`, `/auth/signup-consume`, `/invites/accept` ставят auth cookie и больше не отдают body JWT для browser flows;
- `/auth/me` работает cookie-backed для browser и Bearer still accepted для tooling;
- dual-mode backend middleware остаётся intentional.

### 8.4 Что не нужно делать в следующем окне

Нельзя:

- заново открывать закрытые auth/body-token contours без причины;
- casually трогать backend dual-mode Bearer;
- смешивать gate/public-launch тему с auth modernization;
- возвращать localStorage как auth truth;
- возвращать JWT в response body “на всякий случай”;
- делать broad auth rewrite без audit;
- открывать refresh-token redesign без отдельного contour-а.

---

## 9) Свежий закрытый workstream: Admin UX/UI hardening for כרטיסים / משתמשים / ארגונים

### 9.1 Почему этот workstream был нужен

В admin surface были несколько UX/UI truth-gap’ов:

- `כרטיסים` и `משתמשים` скрыто жили на implicit first-25 fetch без честного pagination UX;
- `כרטיסים` была default-open;
- в `משתמשים` не было поиска;
- списки могли визуально расти и вести себя не очень честно/удобно на длинных наборах данных;
- не было удобной сегментации пользователей и карт по нужным cohort’ам;
- во вкладке `ארגונים` на desktop была локальная layout/contrast проблема.

### 9.2 Что было важно сделать правильно

Ключевой принцип: **не путать “снять скрытый лимит” с “грузить всё разом”**.

Правильное enterprise-решение здесь было таким:

- не врать админу про полноту данных;
- не грузить весь набор без ограничений;
- не раздувать DOM;
- не ломать mobile-first UX вложенными scroll-хакaми;
- а перейти к **явному pagination contract** там, где раньше был скрытый implicit first-page cap.

### 9.3 Что закрыто по `כרטיסים`

#### Pagination / honest totals

Во вкладке `כרטיסים`:

- скрытый implicit first-25 behavior заменён на **explicit pagination model**;
- используются честные page/limit/total semantics;
- `Next` / `Prev` работают по total-aware логике;
- counts больше не врут про глобальную выборку;
- `כרטיסים` стала default-closed.

#### Search semantics

Cards search **не переводили на backend** в этом scope.

Текущая truth:

- cards text search остаётся **page-local**;
- это честно обозначается в UI через wording уровня `בעמוד`;
- глобальный total при этом не выдаётся за total search results.

#### Cards cohort segmentation

Во вкладке `כרטיסים` принят **card-based**, а не owner-based подход.

Это было осознанное и правильное решение, потому что:

- один пользователь может иметь несколько карточек;
- одна карта может быть effectively paid, а другая free;
- значит для этого скоупа важнее truth самой карты, а не владельца.

Текущие cards cohorts:

- `all`
- `paid`
- `free`
- `anonymous`

Принятая truth:

- `paid` → `effectiveBilling.isPaid === true`
- `free` → `effectiveBilling.isPaid !== true && ownerSummary.type !== "anonymous"`
- `anonymous` → `ownerSummary.type === "anonymous"`

Это **page-local cohort filter**, и это допустимо, потому что:

- cards search already page-local;
- cohort filter честно помечен как page-local (`בעמוד`);
- backend contour не пришлось расширять;
- не пришлось дублировать resolveBilling logic в Mongo queries.

### 9.4 Что закрыто по `משתמשים`

#### Search

Во вкладке `משתמשים` добавлен **backend-driven search**, а не page-local fake filter.

Важная truth:

- input draft state и applied backend query **разделены**;
- typing сам по себе не меняет backend query;
- search submit-driven;
- Enter / חפש применяют query;
- pagination под активным поиском живёт на applied query;
- refresh под активным поиском живёт на applied query;
- clear детерминированно сбрасывает query и возвращает page 1.

#### Users cohort segmentation

Во вкладке `משתמשים` сделана честная сегментация:

- `all`
- `paying`
- `non-paying`

Именно **без anonymous**, потому что:

- anonymous - это card-level concept;
- а не User-record truth.

Принятая user truth:

- `paying` → `subscription.status === "active"`
- `non-paying` → `subscription.status !== "active"`

Почему именно так:

- `plan` без `active` недостаточен;
- `adminTier` - это override/entitlement, а не факт оплаты;
- subscription status - safest truthful signal для users cohort.

Users search + pagination + cohort работают на одном backend contract и на честном backend total.

### 9.5 Что закрыто по `ארגונים`

#### Layout / overflow bug on desktop

Во вкладке `ארגונים` был локальный desktop bug:

- внутренний layout переходил в row на viewport breakpoint;
- но view жил внутри half-width admin rail;
- из-за этого панели ужимались в узкую область;
- появлялся horizontal overflow.

Правильное решение:

- fix сделали **локально** в `AdminOrganizationsView.module.css`;
- inner layout оставили безопасно column-only;
- убрали старый overflow source;
- `Admin.jsx` и admin shell не трогали.

#### Contrast bug

Там же были legacy light-theme значения вроде `rgba(0,0,0,...)` на тёмном admin background.

Исправлено локально:

- meta/helper/empty-state text;
- borders;
- hover/detail surfaces;
- `select` / `selectInline` приведены к theme-safe виду;
- shared `Input/Button` не трогались.

### 9.6 Что важно помнить про этот admin workstream

Это **не** был backend/index workstream.

Что intentionally не открывали:

- глобальный backend-driven cards search redesign;
- owner-based cards segmentation;
- anonymous users cohort;
- новые индексы ради “на всякий случай”;
- shared shell redesign;
- broad admin IA refactor.

### 9.7 Текущее admin truth после closure

В пределах текущего скоупа admin now has:

- honest pagination in `כרטיסים` and `משתמשים`;
- `כרטיסים` default-closed;
- backend-driven users search;
- users cohorts (`all / paying / non-paying`);
- cards cohorts (`all / paid / free / anonymous`) with page-local honest labeling;
- orgs desktop layout/contrast fixed locally;
- no unauthorized drift into users/cards/orgs/backend/shared primitives beyond approved scope.

---

## 10) Что intentionally остаётся открытым / deferred

Это критично. Следующий чат не должен casually смешивать это с уже закрытыми контурами.

### 10.1 Gate / public launch strategy

Production всё ещё **behind gate**.

Это отдельный contour:

- когда снимать gate;
- как снимать;
- как делать public launch safely.

### 10.2 Refresh-token architecture

Refresh-token contour **не делался**.

Это отдельный contour и только по отдельному audit/decision.

### 10.3 Broader auth redesign

Не было:

- full session-store redesign;
- refresh-token redesign;
- broader auth rewrite;
- full revocation architecture.

Это не нужно примешивать задним числом к уже закрытому bounded contour-у.

### 10.4 CARDIGO_NOTIFY_TOKEN / payment-notify contour

Это **отдельный будущий contour**, а не хвост текущей migration program.

Сейчас правильная truth такая:

- если Tranzila фактически ещё не подключена и notify path ещё не real production truth,
  **не надо harden-ить это “на будущее” просто ради движения**;
- payment notify audit брать только как **новый отдельный bounded workstream**, когда интеграция станет реальной или близкой к go-live.

### 10.5 Non-blocking notes, которые сознательно не трогали в этом scope

Это **не проблемы, требующие срочного движения**, а либо intentional truth, либо отдельные future micro-contours:

- `CARDIGO_NOTIFY_TOKEN` - отдельный будущий payment/webhook contour;
- Bearer tooling contract - intentional;
- non-auth localStorage keys - допустимы;
- no-origin CORS path - intentional truth;
- logout without full revocation - accepted stateless truth;
- `app.js` stale comment - отдельный micro-fix, если вообще будет иметь смысл;
- `AUTH_COOKIE_NAME` dedup - optional tech-debt note, не security issue;
- `admin.middleware.js` `Vary` consistency - optional low-priority note.

---

## 11) Что НЕ нужно делать в следующем окне

Нельзя:

- заново открывать закрытые auth/body-token contours без причины;
- casually трогать backend dual-mode Bearer;
- смешивать gate/public-launch тему с auth modernization;
- возвращать localStorage как auth truth;
- возвращать JWT в response body “на всякий случай”;
- делать broad auth rewrite без audit;
- ломать manual index governance;
- массово чистить DB/index/runtime/CSRF/CORS всё одним батчем;
- открывать сразу refresh-token redesign без отдельного contour-а;
- “улучшать безопасность” только ради ощущения движения, если реального blocking residual нет;
- reopen-ить закрытый admin UX workstream без новой доказанной проблемы.

---

## 12) Что считать завершённым milestone

В текущем scope **завершены**:

### 12.1 Auth/security modernization milestone

Включая:

- browser auth migration;
- response-body token decommission;
- browser localStorage auth removal;
- admin regression closure;
- CSRF decision and closure;
- CORS decision and closure;
- Bearer/tooling decision closure;
- startup/runtime validation hardening;
- docs + anti-drift closure.

### 12.2 Admin UX/UI hardening milestone

Включая:

- honest pagination for cards/users;
- cards default-closed;
- backend-driven users search;
- users honest cohort segmentation;
- cards card-based page-local cohort segmentation;
- orgs local layout/contrast fix;
- full verification + anti-drift + build/gates.

---

## 13) Что логично делать дальше

Следующий шаг должен быть **новым отдельным contour-ом**, а не хвостом старого.

Правильная логика:

### Вариант A - остановиться и считать этот круг закрытым

Это зрелый вариант. Не обязательно открывать новый contour немедленно.

### Вариант B - выбрать новый bounded workstream

Если нужен следующий contour, выбирать его нужно **по реальной приоритетности**, а не потому что “надо что-то ещё покрутить”.

Потенциально логичные направления:

- новый bounded payment/webhook contour - только если интеграция реально близка;
- bounded launch/gate strategy contour;
- новый product/admin contour только при реальном UX truth-gap;
- bounded security/perf/monitoring/CI-CD contour, если это подтверждено реальной стадией вывода в production.

### Что не стоит делать

- переводить tooling Bearer на cookies “чтобы завершить круг”;
- удалять legacy просто ради симметрии;
- открывать новый hardening без доказанного blocking residual;
- reopen-ить admin UX contour только ради косметики.

---

## 14) Как должен работать следующий чат GPT

Следующий чат должен помнить:

- ChatGPT здесь - архитектор, не code monkey;
- Copilot - исполнитель;
- всё делается bounded contours;
- сначала доказать truth;
- потом minimal fix;
- потом verification;
- потом handoff/documentation;
- не переходить к следующему contour-у, пока текущий не закрыт по хвостам;
- не invent-ить новые задачи, если реального blocking residual нет.

---

## 15) Ready-to-paste bootstrap для нового окна ChatGPT

```text
Ты - Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant для Cardigo. Работаем enterprise-grade. Copilot - исполнитель.

Работаем строго фазами:
Phase 1 Read-Only Audit с PROOF (file:line-range) → STOP;
Phase 2 Minimal Fix (узко, без рефакторинга и без scope creep) → STOP;
Phase 3 Verification (gates/sanity/build/smoke с RAW stdout + EXIT) → STOP;
затем Documentation/Handoff.

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only - no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only existing approved typography tokens from canonical SSoT
  - do NOT invent token names ad hoc
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

Project truth:
- Cardigo = Israel-first / Israel-only
- canonical domain = https://cardigo.co.il
- Cardigo and Digitalyty must not be mixed
- templates registry only in frontend/src/templates/templates.config.js
- skins token-only
- preview-only styles only under [data-preview="phone"]
- CardLayout DOM skeleton is high-blast-radius
- public/QR/OG URLs only from backend DTO publicPath/ogPath
- anti-enumeration 404 / membership-gate truth
- sitemap without N+1
- backend index governance is manual

DB/runtime truth:
- new clean production-shaped cluster is adopted intentionally
- old data was not migrated by design
- target DB = cardigo_prod
- Render backend already works on the new cluster
- old cluster retained only as rollback/reference
- production still behind gate
- do NOT mix DB/bootstrap contour with auth/security modernization contour

Auth/security truth:
- browser runtime is cookie-backed
- browser auth truth is no longer localStorage-based
- browser Authorization header must not be reintroduced
- login / signup-consume / invite-accept do not return JWT body tokens for browser flows
- /register does NOT issue auth cookie/session; it returns { registered: true, isVerified: false }
- backend dual-mode middleware remains intentional for tooling/internal compatibility
- CSRF contract:
  - cookie-auth mutation requests require X-Requested-With: XMLHttpRequest
- CORS contract:
  - explicit allowlist from CORS_ORIGINS
  - credentials: true
  - no wildcard drift
- startup env validation contract:
  - JWT_SECRET required at startup
  - CARDIGO_PROXY_SHARED_SECRET required at startup in production only

Closed admin UX truth:
- cards/users now use explicit honest pagination instead of hidden implicit first-25 cap
- cards tab is default-closed
- users search is backend-driven, submit-driven, with draft/applied split
- users cohorts = all / paying / non-paying (no anonymous users)
- cards cohorts = all / paid / free / anonymous, page-local and honestly labeled as page-local
- orgs desktop layout/contrast fix is closed via local CSS-only fix
- do NOT reopen this admin UX workstream casually without a newly proven bug

Working rule:
Do not move to the next task until all tails in the current one are either fixed or explicitly classified as non-blocking/deferred/intentional.

Choose safest mature path over fastest hack.
```

---

## 16) Заключительное напутствие

Проект находится в хорошей зрелой точке.

Это уже не ситуация “всё сломано и надо срочно чинить что угодно”.

Сейчас наоборот:

- много критичных контуров закрыто;
- runtime truth стабилизирована;
- auth/security modernization дошла до серьёзного milestone;
- docs truth и anti-drift layer закрыты;
- admin UX/UI contour тоже приведён в честное и зрелое состояние;
- и потому главный риск дальше - не отсутствие фичи, а **неосторожное смешивание контуров** и “улучшения ради улучшений”.

### Главное правило продолжения

Не пытаться “добить до идеала всё сразу”.

Правильный путь:

- отделять contour от contour;
- сначала доказывать;
- потом чинить минимально;
- потом верифицировать;
- потом обновлять handoff truth.

### Главная роль ChatGPT

ChatGPT здесь не “помогатор по коду”.

ChatGPT здесь - **архитектор**, который:

- защищает invariants;
- держит discipline;
- следит за blast radius;
- не даёт проекту скатиться в хаотичные патчи;
- не создаёт новые задачи там, где mature decision - это остановиться.

### Главный итог текущего milestone

Cardigo теперь живёт на новой operational DB truth, прошёл большой bounded auth/security modernization milestone и дополнительно закрыл важный admin UX/UI hardening contour:

- browser auth уже cookie-backed;
- response-body JWT gone;
- browser localStorage auth truth removed;
- CSRF contour intentionally closed;
- CORS contour intentionally closed;
- admin/runtime regressions устранены;
- critical structural debt устранён;
- startup env validation поджата;
- docs + anti-drift closure завершён;
- admin lists/search/cohort/layout truth приведены в честное и удобное состояние;
- и проект готов продолжать развитие уже **не из режима “чинить что угодно”, а из режима “открывать новые bounded contours только по реальной необходимости”**.
