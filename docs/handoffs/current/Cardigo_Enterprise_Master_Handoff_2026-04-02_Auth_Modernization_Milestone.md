# Cardigo — Enterprise Master Handoff

## 2026-04-02 · Auth Modernization Milestone

---

> **Статус:** Канонический master handoff / next-chat playbook.
> **Дата:** 2 апреля 2026.
> **Supersedes:** Предыдущий handoff `Cardigo_Enterprise_Master_Handoff_2026-04-01_FreshCluster_Cutover_Gated` (внешний).
>
> Предыдущий файл остаётся историческим reference, но актуальная операционная/auth/security правда описана здесь.
> Этот файл — главный документ для передачи в следующее ChatGPT-окно.

---

## 1. Идентичность проекта и инварианты

### 1.1 Продукт

- **Cardigo** — SaaS-платформа цифровых визитных карточек.
- Таргет-рынок: Израиль (Israel-first, Israel-only на текущем этапе).
- Каноническое доменное имя: **https://cardigo.co.il** (non-www).
- **Cardigo и Digitalyty — разные бренды.** Не смешивать в продуктовой логике, URL, SEO, naming, public surfaces.

### 1.2 Роли инструментов

| Инструмент  | Роль                                                                          | Граница                                                            |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **ChatGPT** | Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant | Планирование, аудит, архитектурные решения, handoff                |
| **Copilot** | Executor only                                                                 | Имплементация по конкретным задачам, верификация, фазовый протокол |

### 1.3 Фазовый протокол (обязателен)

Для КАЖДОЙ задачи:

- **Phase 1 — READ-ONLY AUDIT:** Flow map, PROOF file:line, Risk/Gaps, Minimal Change Surface. Никаких изменений кода.
- **Phase 2 — MINIMAL FIX:** Наименьший безопасный changeset, 1–3 файла, backward compatible. Без drive-by refactor.
- **Phase 3 — VERIFICATION:** Raw stdout + EXIT code, static proof, scope-control, final verdict.

### 1.4 Hard constraints (код)

```
- No git commands
- No inline styles (CSS Modules only)
- Flex only — no CSS Grid (hard ban)
- Mobile-first mandatory
- Typography:
  - font-size only via var(--fs-*)
  - --fs-* rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
  - use only existing approved tokens from canonical SSoT
  - do NOT invent new token names
  - do NOT leak card-scope tokens into app/public/auth/admin/site-shell context
```

### 1.5 Архитектурные SSoT-инварианты

- **Templates registry:** исключительно `frontend/src/templates/templates.config.js`.
- **Skins:** только CSS-переменные (`--*`) внутри `.theme` / `.palette*`, без layout/structure/background/url.
- **Preview-only styles:** scope под `[data-preview="phone"] …`, не трогать public typography/tokens.
- **CardLayout DOM skeleton:** не менять без explicit migration phase + PROOF.
- **publicPath / ogPath:** backend = SSoT. Frontend не угадывает, не реконструирует.
- **Anti-enumeration:** non-member/revoked → 404 (policy-driven).
- **Sitemap:** без N+1 queries, без existence leakage.
- **Index governance:** manual only. `autoIndex: false`, `autoCreate: false`. Drift detection через sanity scripts.

---

## 2. Fresh-Cluster / Runtime Truth (baseline)

### Факты (закрытый контур, не переоткрывать)

- Новый чистый Atlas-кластер **cardigo-dev-eu** принят намеренно.
- Target database: **cardigo_prod**.
- Старые данные НЕ мигрированы — это сознательное решение (fresh start).
- Render backend уже переключён на новый кластер.
- Старый кластер (`cards-db`) сохранён как rollback/reference.
- Manual index governance остаётся truth (schema-level автоматика отключена).
- Продакшн пока за gate (SECURITY_TEMP_API_GATE).

### Дисциплина

- Не смешивать fresh-cluster/bootstrap контур с security/auth modernization контуром.
- Не переоткрывать bootstrap contour без явного запроса.

---

## 3. Завершённые Auth/Security Modernization Steps

### 3.1 Cookie-backed auth — ACTIVE

Полная миграция на httpOnly cookie auth выполнена и верифицирована.

**Cookie contract:**

| Среда                              | Cookie name           | Secure  | SameSite | HttpOnly | MaxAge |
| ---------------------------------- | --------------------- | ------- | -------- | -------- | ------ |
| Production (`NODE_ENV=production`) | `__Host-cardigo_auth` | `true`  | `lax`    | `true`   | 7 дней |
| Dev / non-production               | `cardigo_auth`        | `false` | `lax`    | `true`   | 7 дней |

IS_PROD определяется через `process.env.NODE_ENV === "production"` в auth.routes.js, invites.routes.js, auth.middleware.js, admin.middleware.js, csrf.middleware.js.

### 3.2 Admin middleware regression — FIXED

- `requireAdmin` ранее использовал header-only extraction (не находил cookie в prod).
- Исправлено: admin middleware имеет cookie-fallback, согласованный с requireAuth.

### 3.3 CSRF hardening (first step) — IMPLEMENTED

- Файл: `backend/src/middlewares/csrf.middleware.js` (NEW, 17 lines).
- Mounted в `app.js` после `cookieParser()`.
- Логика: для мутационных запросов (не GET/HEAD/OPTIONS) при наличии auth cookie — требуется заголовок `X-Requested-With: XMLHttpRequest`, иначе 403.
- Bearer-only / public / webhook / no-cookie потоки не затронуты.
- Frontend: `api.js` отправляет `X-Requested-With: XMLHttpRequest` по умолчанию.

### 3.4 CORS hardening (bounded step) — IMPLEMENTED

- Файл: `backend/src/app.js`.
- Убран permissive fallback `cors(undefined)` (давал `origin: '*'` при отсутствии `CORS_ORIGINS`).
- Теперь: always-explicit `cors({origin(...), credentials: true})`.
- Dev fallback: `["http://localhost:5173"]`.
- No-origin requests (server-to-server, curl, mobile) — пропускаются.

### 3.5 Frontend legacy Bearer/localStorage cleanup — COMPLETED

- `AuthContext.jsx`: удалены 4× `localStorage.removeItem("token")`, 2× `delete api.defaults.headers.common.Authorization`, удалён unused `import api`.
- `account.service.js`: JSDoc обновлён с "Requires valid JWT" на "Requires active session (httpOnly auth cookie)".

### 3.6 Response-body token decommission — FULLY COMPLETED

Все три auth-endpoints decommissioned в правильной последовательности:

| Endpoint                    | Старый body                 | Новый body                     | Cookie    | Статус  |
| --------------------------- | --------------------------- | ------------------------------ | --------- | ------- |
| `POST /auth/login`          | `{ token }`                 | `{ ok: true }`                 | Unchanged | ✅ Done |
| `POST /auth/signup-consume` | `{ token }`                 | `{ ok: true }`                 | Unchanged | ✅ Done |
| `POST /invites/accept`      | `{ token, orgId, orgSlug }` | `{ ok: true, orgId, orgSlug }` | Unchanged | ✅ Done |

Порядок rollout invite-accept:

1. Сначала refactored sanity scripts (sanity-org-access.mjs, sanity-org-membership.mjs) — убрана зависимость от `body.token`.
2. Затем изменён endpoint response.

**Cookie — единственный session carrier для browser runtime.**

### 3.7 Файлы, изменённые в этом цикле

| Файл                                         | Контур                                                   |
| -------------------------------------------- | -------------------------------------------------------- |
| `backend/src/middlewares/csrf.middleware.js` | CSRF hardening (NEW)                                     |
| `backend/src/app.js`                         | CSRF mount + CORS hardening                              |
| `frontend/src/services/api.js`               | X-Requested-With header                                  |
| `frontend/src/context/AuthContext.jsx`       | Legacy Bearer cleanup                                    |
| `frontend/src/services/account.service.js`   | JSDoc fix                                                |
| `backend/src/routes/auth.routes.js`          | Login + signup-consume `{ok:true}`                       |
| `frontend/src/pages/SignupConsume.jsx`       | Success check `res?.data?.ok`                            |
| `backend/scripts/sanity-org-access.mjs`      | User.findOne + signToken (body.token dependency removed) |
| `backend/scripts/sanity-org-membership.mjs`  | hasOk + simplified check (body.token dependency removed) |
| `backend/src/routes/invites.routes.js`       | Invite-accept `{ok:true, orgId, orgSlug}`                |

---

## 4. Index / Data-Governance Truth

### Card index debt — CLOSED

- Критический named index `orgId_1_user_1` восстановлен.
- `sanity:card-index-drift` и `sanity:org-access` зелёные.
- Ранее отсутствовавшие unnamed card indexes теперь присутствуют:
    - `tenantKey_1`
    - `orgId_1`
    - `status_1`
    - `trialDeleteAt_1`
    - `adminTier_1`
- Активная коллекция `cards` имеет ожидаемый практический набор индексов для текущего контура.

### Index governance — без изменений

- `autoIndex: false`, `autoCreate: false`.
- Drift detection через sanity scripts.
- Миграции — manual only.

---

## 5. Verification Summary

### Admin UI smoke (completed)

- `/admin` показывает ניהול / בלוג / מדריכים / אנליטיקה.
- Users/cards/orgs загружаются.
- Logout removes admin access.
- Non-admin не получает admin access.

### Sanity scripts (all green across completed steps)

| Sanity                         | Последний EXIT |
| ------------------------------ | -------------- |
| `sanity:org-access`            | 0              |
| `sanity:org-membership`        | 0              |
| `sanity:ownership-consistency` | 0              |
| `sanity:imports`               | 0              |
| `sanity:slug-policy`           | 0              |

### Frontend build

- `npm run build` — EXIT: 0, 339 modules, built successfully.

---

## 6. Intentionally Open / Deferred

Следующие пункты НЕ являются автоматически следующей имплементацией. Не смешивать их произвольно.

| Item                                | Статус           | Примечание                                                       |
| ----------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Gate / public-launch strategy       | Отдельный контур | Не привязан к auth modernization                                 |
| Refresh-token architecture          | Out of scope     | Не реализовывать без отдельного решения                          |
| Broader auth redesign               | Out of scope     | Не открывать без отдельного решения                              |
| Backend dual-mode Bearer middleware | Intentional      | Существует для sanity/tooling совместимости. НЕ удалять случайно |
| DB bootstrap / runtime contour      | CLOSED           | Не переоткрывать                                                 |
| Old cluster data migration          | Not planned      | Fresh start — сознательное решение                               |

**ВАЖНО:**

- Не удалять backend Bearer support случайно — sanity scripts используют Bearer через `signToken` + `Authorization` header.
- Не переоткрывать закрытые DB/bootstrap/runtime контуры без явного запроса.

---

## 7. Recommended Next Bounded Contour

### Аудит/решение: dual-mode Bearer middleware

**Это НЕ немедленная имплементация.** Это следующий вероятный bounded architectural decision contour.

**Вопрос:** Должен ли backend dual-mode Bearer support (`requireAuth`, `optionalAuth`, `requireAdmin` — header-first + cookie-fallback) остаться как intentional tooling compatibility layer, или его следует decommission в отдельном workstream?

**Контекст:**

- Browser runtime уже полностью cookie-only.
- Sanity scripts используют Bearer через `signToken()` + `Authorization` header.
- Dual-mode middleware не вредит runtime и не создаёт security risk при текущей конфигурации (CSRF guard защищает cookie-auth мутации).
- Это NOT urgent runtime debt.

**Рекомендуемый подход:**

1. Phase 1 audit: map все Bearer usage sites в sanity scripts.
2. Определить: переводить scripts на cookie-auth или оставить Bearer как tooling-only path.
3. Если решение — decommission: отдельный bounded workstream (scripts refactor → middleware simplification).
4. Если решение — оставить: задокументировать как intentional architecture decision.

---

## 8. Ready-to-Paste Bootstrap для следующего ChatGPT-окна

```text
Ты — Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant
для проекта Cardigo (Israel-first SaaS, цифровые визитные карточки).

CANONICAL HANDOFF: docs/handoffs/Cardigo_Enterprise_Master_Handoff_2026-04-02_Auth_Modernization_Milestone.md

Текущая правда:
- Каноническое имя: https://cardigo.co.il (non-www)
- Monorepo: frontend/ (React+Vite), backend/ (Node/Express+Mongo), uploads Supabase
- Fresh Atlas cluster cardigo-dev-eu → DB cardigo_prod. Данные со старого кластера не мигрировались (fresh start).
- Render backend уже на новом кластере. Production за gate (SECURITY_TEMP_API_GATE).
- Manual index governance: autoIndex:false, autoCreate:false. Card index debt закрыт.

Auth / Security (завершённый milestone):
- Cookie-backed auth ACTIVE (httpOnly, Secure in prod, SameSite=lax).
  prod: __Host-cardigo_auth, dev: cardigo_auth.
- CSRF first-step: csrfGuard middleware — X-Requested-With: XMLHttpRequest для cookie-auth мутаций.
- CORS: always-explicit whitelist, dev fallback ["http://localhost:5173"], no permissive fallback.
- Response-body tokens ПОЛНОСТЬЮ УДАЛЕНЫ: login, signup-consume, invite-accept — все возвращают { ok: true }.
- Frontend: zero legacy Bearer/localStorage residue. Cookie — единственный session carrier.
- Backend dual-mode Bearer middleware INTENTIONALLY EXISTS для tooling/sanity scripts compatibility.

Hard constraints:
- No git commands (Copilot)
- No inline styles — CSS Modules only
- Flex only — no CSS Grid (hard ban)
- Mobile-first
- Typography: var(--fs-*) rem-only, no px/em/%/vw/clamp/fluid/calc(non-rem)
- Skins = token-only (no structure/layout/background)
- Templates registry SSoT: frontend/src/templates/templates.config.js
- publicPath/ogPath: backend SSoT, frontend не угадывает
- Anti-enumeration: non-member/revoked → 404
- Index governance: manual only, drift detection via sanity scripts

Фазовый протокол:
- Phase 1: READ-ONLY AUDIT (flow map, PROOF, risk/gaps)
- Phase 2: MINIMAL FIX (1-3 files, backward compatible)
- Phase 3: VERIFICATION (raw stdout+EXIT, static proof, scope-control, verdict)

Copilot = executor only. ChatGPT = architect/planner.
Cardigo ≠ Digitalyty (разные бренды, не смешивать).

Следующий bounded contour: audit/decision dual-mode Bearer middleware.
Не смешивать с closed contours.
```

---

## 9. Closing Guidance — как продолжать безопасно

1. **Не смешивать контуры.** Каждый workstream — bounded. Fresh-cluster, auth modernization, gate/launch, billing — отдельные контуры. Не «заодно».

2. **Prove first, fix minimally, verify, then document.** Фазовый протокол — не бюрократия, а защита от регрессий. Каждая фаза обязательна.

3. **Blast-radius discipline.** Предпочитать 1–3 файла. Не делать drive-by refactors. Не менять то, что не запрошено.

4. **Safest mature path > fastest hack.** Если есть выбор между быстрым hack и зрелым bounded решением — выбирать зрелое.

5. **PROOF standard.** Для каждого важного утверждения — file:line. Для «not found» — repo-wide search с видимым exit code.

6. **Санитарные скрипты — truth gate.** Все sanity scripts должны быть зелёными после каждого meaningful change. Не утверждать зелёность без запуска.

7. **Не удалять то, что непонятно.** Если файл/код/config выглядит неиспользуемым, но это не доказано — не удалять. Сначала PROOF.

---

_Конец handoff. Следующий canonical master handoff должен быть dated-sibling в той же директории._
