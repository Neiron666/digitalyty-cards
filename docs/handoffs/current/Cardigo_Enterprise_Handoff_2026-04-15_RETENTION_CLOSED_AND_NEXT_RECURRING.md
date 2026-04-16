# Cardigo — Enterprise Master Handoff
## Дата: 2026-04-15
## Тема: Полный проектный конспект, закрытие retention/inactivity contour, текущая архитектурная правда и следующий приоритетный workstream

---

## 1) Что это за проект

**Cardigo** — это зрелый Israel-first / Israel-only SaaS для цифровых визитных карточек и мини-бизнес-страниц.

### Каноническая продуктовая формула
Cardigo — это не просто «визитка», а связка из нескольких зрелых слоев:
- цифровая визитная карточка;
- мини-страница бизнеса;
- слой sharing / public link / QR / OG;
- слой SEO / индексации / canonical / JSON-LD;
- слой аналитики;
- self-service редактирование;
- бизнес-операционный слой (услуги, часы работы, заготовка под запись);
- foundation под booking / appointments;
- foundation под premium / billing / recurring monetization.

### Продуктовые истины
- **Cardigo — отдельный продукт.** Нельзя смешивать Cardigo и Digitalyty в canonical, SEO, путях, structured data, naming, user-facing copy, OG и sitemap truth.
- **Канонический домен:** `https://cardigo.co.il`.
- **Ориентация:** Israel-first / Hebrew + RTL / локальный продуктовый и юридический контекст.

---

## 2) Текущий стек и инфраструктура

### Frontend
- React + Vite
- CSS Modules only
- Mobile-first
- **Flex only — no grid**
- Строгая typography policy:
  - только `var(--fs-*)`
  - `--fs-*` только rem-based
  - без px/em/%/vw/vh/clamp/fluid
  - без `calc(non-rem)`
- Нет inline styles
- Preview-only styles только под `[data-preview="phone"]`
- Route-level SEO truth через `SeoHelmet`

### Backend
- Node.js + Express
- MongoDB / Mongoose
- Manual index governance:
  - `MONGOOSE_AUTO_INDEX=false`
  - `MONGOOSE_AUTO_CREATE=false`
- Индексы — только через отдельные migration / scripts, не через auto startup drift

### Infra / сервисы
- Frontend: Netlify
- Backend: Render-подобный runtime
- Storage: Supabase
- Email: Mailjet
- Payments: Tranzila
- Документы / invoices / receipts: планируется / подготавливается через YeshInvoice

### Auth/runtime truths
- Browser auth truth — cookie-backed / httpOnly
- Не возвращаться к localStorage auth для браузера
- Не возвращать browser Authorization header как старую истину
- Dual-mode Bearer support на backend существует только как tooling/backward compatibility layer

---

## 3) Как работать с этим проектом правильно

### Роль ChatGPT в проекте
ChatGPT в этом проекте должен работать как:
- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

Это значит:
- думать архитектурно, а не локально;
- защищать инварианты, blast radius и долгосрочную maintainability;
- принимать зрелые решения по security / scalability / runtime truth / ops;
- не допускать scope creep;
- вести проект так, как его вёл бы сильный сеньор-архитектор, а не “кодогенератор”.

### Роль Copilot Agent
Copilot Agent — **исполнитель**, а не архитектор.
Он не должен самовольно менять границы задачи, принимать продуктовые решения “по месту”, делать refactor «заодно» или открывать закрытые contour-ы.

### Канонический workflow
Всегда работать так:
1. **Architecture / intent clarification**
2. **Phase 1 — Read-Only Audit with PROOF**
3. **Phase 2 — Minimal Fix**
4. **Phase 3 — Verification with RAW stdout + EXIT**
5. **Documentation / Handoff**

### Жёсткие правила для любых будущих prompt-ов Copilot
Обязательно включать:
- `PROJECT MODE: Cardigo enterprise workflow.`
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

### Дополнительные рабочие правила
- Никаких “заодно поправил”
- Никакого scope creep
- Никаких изменений без prior audit
- Boundaries must be proven, not guessed
- Всегда требовать **PROOF file:line-range**
- Для smoke/manual checks — PowerShell + `curl.exe`
- Не давать Copilot exact line numbers как инструкции на редактирование; пусть сначала докажет anchors и сам покажет PROOF
- Закрытые contour-ы не открывать без нового bounded workstream

---

## 4) Высокорисковые архитектурные инварианты, которые нельзя ломать

### Product / branding
- Cardigo и Digitalyty не смешивать нигде
- Canonical / SEO / public path / naming / schema / OG / sitemap должны оставаться чистыми

### Frontend / render chain
- SSoT render chain для public + preview защищён
- templates registry только в `frontend/src/templates/templates.config.js`
- skins — token-only
- preview-only styles только под `[data-preview="phone"]`
- `CardLayout.module.css` и DOM skeleton у CardLayout — high-blast-radius зона

### Backend / data / URLs
- public/QR/OG URLs только из backend DTO (`publicPath` / `ogPath`)
- anti-enumeration и membership-gate истины уже выстроены
- sitemap без N+1
- индексы не auto-create, только вручную через scripts / migrations

### Security / auth
- browser auth остаётся cookie-based
- не откатываться к старой localStorage / browser bearer истине
- CSRF/CORS/hardening контур уже закрыт, не трогать без отдельного bounded workstream

---

## 5) Что уже закрыто по проекту в широком смысле

Ниже не всё до последнего маленького косметического tail, а именно **закрытые крупные и значимые contour-ы**, которые нельзя открывать случайно.

### Public / marketing / SEO / legal
- `/cards` закрыт как premium public marketing/examples page
- `/pricing` закрыт как premium public pricing page
- blog subsystem закрыт
- guides subsystem закрыт
- legal/info pages закрыты:
  - `/privacy`
  - `/terms`
  - `/accessibility-statement`
- route-level SEO truth выстроен через `SeoHelmet`
- FAQ / FAQPage JSON-LD и другие structured data contour-ы закрыты
- install/PWA/installability contour закрыт
- global noindex prelaunch guard был осознанной правдой на своём этапе

### Accessibility
- skip link
- focus trap для drawer / modals / crop / unsaved confirm и related UI
- базовый accessibility contour закрыт на зрелом уровне для текущего этапа

### Analytics / tracking
- site analytics track contour закрыт
- GTM / privacy-aware Meta Pixel base contour закрыт
- owner / card-route tracking governance выстроен
- broader event mapping остаётся отдельным contour-ом по необходимости

### Business / services / booking foundation
- services contour закрыт
- businessHours contour закрыт
- booking kernel и inbox foundation построены
- pending count / header badge / owner-side retrieval truths выстроены

### Auth / registration / recovery — значимые closed truths
- крупный auth/security migration contour в текущем scope считается закрытым
- reset/forgot runtime rework закрыт в своей области
- `lastLoginAt` contour закрыт
- email/password browser auth не должен возвращаться к localStorage truth
- self-delete tombstone finality contour закрыт

### Booking cascade gap
- booking orphan gap закрыт
- `cardDeleteCascade.js` теперь учитывает Booking
- sanity на cascade была пройдена

---

## 6) Отдельно: что было сделано в этом окне чата и почему это важно

Главный workstream этого окна — **retention / inactivity cleanup contour**.

### Что именно было построено

#### 6.1. `lastLoginAt` readiness contour — закрыт
Добавлено и verified:
- поле `lastLoginAt` в `User`
- stamp на 3 auth paths:
  - login
  - signup-consume
  - invite-accept
- migration script для sparse index
- package.json entries
- dry-run / apply scripts для индекса
- smoke / negative-smoke truth разобрана

Это стало базой для зрелого inactivity classification.

#### 6.2. Booking cascade gap — закрыт
Был найден и закрыт gap, при котором delete cascade не удалял bookings.
Теперь cascade удаляет:
- leads
- analytics
- bookings

Это важно, потому что любой account/card deletion contour без этого оставлял бы orphan data.

#### 6.3. Policy / legal / runbook contour для retention — закрыт
Были созданы / выровнены:
- `POLICY_RETENTION_V1.md`
- `account-inactivity-deletion.md`
- legal text readiness
- дальнейшая alignment truth

#### 6.4. Dry-run classification contour — закрыт
Создан read-only script классификации retention buckets.
Он умеет безопасно считать bucket-ы без destructive actions.

#### 6.5. B1 contour — закрыт
B1 = unverified / zero-value accounts.

Закрыто:
- legal disclosure for B1
- consent/versioning alignment
- cleanup script
- package.json entries
- verification
- production execution

#### 6.6. B2 contour — полностью закрыт
B2 = verified / no-card / 90 days inactivity / warning-first / 14-day grace.

Закрыто:
- legal disclosure for B2
- runbook alignment for B2
- warning infrastructure core
  - User fields:
    - `b2WarningClaimedAt`
    - `b2WarningSentAt`
    - `b2GraceUntil`
  - `sendDeletionWarningEmailMailjetBestEffort(...)`
- B2 warn pass
- B2 cleanup pass
- verification
- production execution

#### 6.7. Production rollout path for B1/B2 — уже прогнан
Были реально выполнены на production:
- `sanity:imports`
- `retention:b1:dry-run`
- `retention:b1:apply`
- `retention:b2:warn:dry-run`
- `retention:b2:warn:apply`
- `retention:b2:cleanup:dry-run`
- `retention:b2:cleanup:apply`

Результат:
- `sanity_ok: true`
- `errorCount: 0`
- zero-candidate / zero-delete / zero-warn path отработал clean

Важно понимать честно:
- **production operational path доказан**
- но **non-zero real-user path пока ещё не был exercised**, потому что реальных кандидатов на момент запуска не было

Это не blocker. Для текущего этапа этого достаточно, чтобы считать B1/B2 contour operationally closed.

#### 6.8. Post-rollout runbook alignment — закрыт
Runbook был выровнен под факт, что production scripts уже реально прогнаны.

---

## 7) Итоговая truth по retention / inactivity cleanup

### Что закрыто полностью
- B1
- B2
- classification
- legal readiness
- runbook alignment
- production execution path

### Что намеренно НЕ входит в closure текущего scope
- **B3** — free / draft-only / 180 days / warning-first
- **B4** — published free dormancy policy

Это отдельные будущие workstream-ы.

### Что нельзя случайно сломать дальше
- `lastLoginAt` как activity signal
- B1/B2 scripts
- runbook/status truth
- no tombstone for inactivity cleanup
- preserve PaymentTransaction records
- keep-account path для B2 через login/resume, без лишних token flows в V1

---

## 8) Текущая зрелая проектная картина после закрытия retention contour

Проект уже имеет серьёзную зрелость в следующих слоях:
- public/SEO/legal/discoverability
- auth/security baseline
- analytics/tracking baseline
- services/business-hours/booking foundation
- retention foundation
- documented operator truth

То есть теперь дальше уже логично идти в **монетизацию и subscription runtime truth**, а не снова ковырять retention.

---

## 9) Что ещё должен включать проект дальше

Ниже — не всё подряд, а именно взрослый roadmap после текущего закрытия.

### Приоритет №1 — Recurring billing / Tranzila token recurring / YeshInvoice
Это сейчас самый логичный следующий enterprise workstream.

Нужно построить и закрыть:
- token-based recurring billing truth;
- renewal lifecycle для monthly / yearly;
- failed charge semantics;
- past_due / grace / cancel / expire state machine;
- operator/support truth;
- issuance invoice/receipt через YeshInvoice;
- document ids / refs / share/send truth;
- bounded backend-first implementation без scope creep.

### Приоритет №2 — Email verification required before access
Это уже закреплённое требование перед зрелым production truth.

Нужно обеспечить:
- регистрация не даёт доступ без verified email;
- login/access блокируется до verification;
- cookie-based browser auth truth сохраняется;
- contour делается отдельным bounded auth/product workstream.

### Приоритет №3 — B3 retention
После recurring/auth contour-ов:
- verified/free/draft-only
- 180-day inactivity
- warning-first
- cleanup path

### Приоритет №4 — ops automation / scheduling / monitoring
Позже:
- решать manual-only или recurring scheduler;
- heartbeat / alerts / run health;
- production ops maturity.

---

## 10) Что сейчас является следующим workstream-ом

### Рекомендуемый следующий workstream
**Recurring billing / Tranzila token billing + YeshInvoice**

Это зрелое следующее направление, потому что:
- retention уже закрыт;
- legal/runtime discipline подтянута;
- дальше основной бизнесовый backbone — монетизация и подписочный цикл.

### Как его надо начинать
Не implementation сразу.

Сначала — только **Phase 1 audit**:
- first payment architecture;
- token persistence truth;
- subscription/payment models;
- webhook/callback/provider surfaces;
- missing recurring capabilities;
- worker/scheduler surfaces;
- YeshInvoice integration truth;
- docs/support truth.

Только потом уже строить bounded implementation contours.

---

## 11) Пример правильной тактики на следующий чат

В следующем окне ChatGPT нужно продолжать так же строго:

1. Не просить сразу «сделай всё» implementation.
2. Сначала дать **audit-only prompt**.
3. После audit собрать architect-level plan.
4. Разбить его на малые bounded contours.
5. Идти contour за contour-ом, не перепрыгивая.
6. Не смешивать recurring billing с auth или с unrelated UI.

### Формула действий
- Сначала audit
- Потом minimal bounded implementation
- Потом verification
- Потом docs/handoff truth

---

## 12) Что нужно помнить для всех будущих prompt-ов

### Обязательная дисциплина
- Copilot сначала читает и доказывает
- потом меняет минимально
- потом показывает verification
- потом фиксируется новая truth

### Нельзя допускать
- broad refactor без запроса
- заодно-фиксы
- casual line-level assumptions
- смешение контуров
- открытие закрытых тем без bounded scope

### Особенно важно по frontend
- никаких inline styles
- только CSS Modules
- только flex
- mobile-first
- typography только через `var(--fs-*)`

### Особенно важно по backend
- никаких скрытых auto-index drift
- миграции и индексы только осознанно
- scripts / workers / cleanup-поведение — только bounded, observable, documented

---

## 13) Краткий operational handoff summary для следующего окна

### Текущая truth
- Retention scope B1/B2 полностью закрыт
- Production execution path уже проверен
- Runbook alignment уже обновлён
- Следующий workstream — recurring billing + YeshInvoice

### Не тратить время снова на
- B1/B2 redesign
- спор о retention policy уже закрытого contour-а
- попытки «улучшить заодно» cleanup scripts
- reopening booking cascade / lastLoginAt / legal alignment

### Что делать в новом окне сразу
Попросить ChatGPT:
- начать **Phase 1 read-only audit** по recurring billing contour
- думать как senior architect
- не писать код до audit
- сохранить bounded scope: recurring billing + invoice/receipt lifecycle only

---

## 14) Итоговая формула зрелой работы над Cardigo

Cardigo надо вести как enterprise-продукт:
- защищать инварианты;
- не смешивать workstreams;
- сначала доказывать, потом менять;
- фиксировать truth в runbooks / docs;
- не ломать закрытые contour-ы;
- двигаться не хаотично, а по архитектурному плану.

Правильная последовательность на этом этапе:
1. закрыли retention foundation;
2. идём в recurring billing;
3. затем email-verification-before-access;
4. затем B3 / ops automation / monitoring maturity.

---

## 15) Короткий ready-to-use handoff для следующего чата

Можно вставить следующую мысль как старт следующего окна:

> Cardigo — Israel-first SaaS для цифровых визиток и мини-бизнес-страниц. У проекта уже закрыты крупные contour-ы public/SEO/legal/auth baseline/analytics/services-booking foundation и полностью закрыт retention scope для B1/B2, включая legal text, runbooks, scripts, verification и production execution path. Работаем строго по enterprise workflow: сначала read-only audit с PROOF, потом minimal fix, потом verification, потом docs/handoff. Copilot — исполнитель, ChatGPT — senior architect. Не допускать scope creep. Не трогать закрытые contour-ы без нового bounded workstream. Следующий workstream: recurring billing / Tranzila token recurring + YeshInvoice invoice/receipt lifecycle. No git commands. No inline styles. CSS Modules only. Flex only. Mobile-first. Typography только через var(--fs-*), rem-only.

---

## 16) Финальный статус на момент этого handoff

**Retention / inactivity cleanup scope — FULLY CLOSED**

Следующий разумный приоритет:
**Recurring billing / Tranzila token recurring / YeshInvoice**

