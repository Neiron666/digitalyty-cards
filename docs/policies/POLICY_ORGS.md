# POLICY_ORGS.md

> **SSoT (Single Source of Truth)** — политика организаций (Organizations) в Cardigo  
> Статус: **v1 (Feb 2026)**  
> Цель: B2B-онбординг “директор + N сотрудников” **без self-serve создания org**, с минимальным blast radius и enterprise-guardrails.

---

## 0) Non-goals (явно НЕ делаем в v1)

- Пользователь (директор) **не может** сам создать Organization без platform admin.
- Мы **не** вводим “директор задаёт пароль сотрудникам”. Пароль всегда задаёт сам пользователь.
- Мы **не** даём org-admin право редактировать чужие карточки “по умолчанию” (только owner карты).
- Мы **не** делаем массовое “импорт сотрудников” как self-serve (позже, если нужно).

---

## 1) Сущности и определения

**Organization (Org)** — компания/бренд, под которым публикуются карточки сотрудников.  
**Membership (OrganizationMember)** — принадлежность User к Org (роль + статус).  
**Org Card** — карточка пользователя в контексте Org, публикуется по `/c/:orgSlug/:slug`.  
**Personal Card** — карточка в personal контексте, публикуется по `/card/:slug`.  
**Seat** — место в организации (в v1 считаем по active memberships; точная формула ниже).

---

## 2) Маршруты и каноника (multi-tenant)

**Public:**

- Personal: `/card/:slug`
- Org: `/c/:orgSlug/:slug`

**OG:**

- Personal: `/og/card/:slug`
- Org: `/og/c/:orgSlug/:slug`

**SSoT правило:**

- Backend возвращает **publicPath** и **ogPath** в публичных DTO.
- Frontend **не угадывает** orgSlug, не “sniff’ит” pathname.
- QR/ссылки строятся строго по `publicPath` (fallback допустим только на personal `/card/:slug` при отсутствии валидного publicPath).

---

## 3) Роли и полномочия (RBAC)

### 3.1 Platform Admin (ты)

Единственный субъект, который может:

- Создавать Organization (slug, name, note).
- Задавать и менять **seatLimit / тариф / биллинг**.
- Назначать Org Owner (директора) и менять ownership (controlled operation).
- Выполнять break-glass операции (см. SECURITY_AUTH_INVITES.md).

### 3.2 Org Owner (директор)

- Управляет участниками org: invites, активация/деактивация membership, роли.
- Управляет org-метаданными (брендинг/описание) — когда появится user-surface.
- **Не** меняет `orgSlug`, seats, биллинг.

### 3.3 Org Admin

- Почти как Owner, но не может передавать ownership.

### 3.4 Member (сотрудник)

- Может редактировать **только свою** org-card.
- Не управляет участниками/инвайтами.

> Любые расширения прав org-admin на чужие карточки — только отдельной фазой (RBAC + audit + “impersonation” дизайн).

---

## 4) Жизненный цикл Organization (Provisioning)

### 4.1 Создание Org (manual только через platform admin)

1. Продажа/договор/оплата (вне кода, процесс).
2. Platform admin создаёт org: `name`, `orgSlug`, `note`, `isActive=true`.
3. Platform admin задаёт `seatLimit=N`.
4. Platform admin назначает Org Owner:
    - Если директор уже зарегистрирован как User → создать membership role=owner/admin.
    - Если директора нет → создать **Owner Invite Link** и передать директору вручную (WhatsApp/CRM/почта).

### 4.2 Почему orgSlug не меняем

`orgSlug` — это **tenant identifier** и часть публичных URL, QR, SEO, шаринга, OG.  
Он должен быть **immutable**, иначе:

- ломаются внешние ссылки и QR,
- усложняется каноникализация и редиректы,
- растёт риск ошибок в multi-tenant маршрутизации и кэшах.

Разрешено только controlled migration платформенным админом (будущее): redirect-карта старый→новый, QA, мониторинг.

### 4.3 Deactivate org (`isActive=false`)

- Отключает публичный доступ к org-страницам и editor-доступ.
- Используется при прекращении оплаты/нарушениях/паузе.

---

## 5) Seats (лимит мест)

### 5.1 Определение seat (v1)

Seat = **active membership** (status=active) в org.  
(Опционально, если invite резервирует seat — seat usage может считаться как active + pendingInvites.)

### 5.2 Enforcement точки

- Create invite: нельзя создавать invite сверх seatLimit (если invite резервирует seat).
- Accept invite: нельзя принять invite сверх seatLimit.
- Reactivate membership: нельзя активировать сверх seatLimit.

### 5.3 Коммерческая политика

- SeatLimit задаётся platform admin.
- Org Owner может видеть usage, но не менять лимит.

---

## 6) Инвайты в Organization (Manual Invite Link)

### 6.1 Принцип (принято)

Org Owner/Admin генерирует **invite link** и отправляет сотруднику **вручную** (WhatsApp/Slack/CRM).  
Email-провайдер для онбординга сотрудников **не требуется**.

### 6.2 Инварианты invite link

- Link одноразовый, с TTL.
- Токен хранится в БД **только как hash**.
- Есть revoke.
- Все действия пишутся в audit log.

### 6.3 Accept flow (высокоуровнево)

- Если пользователь logged-in → accept → membership active/created.
- Если не logged-in → login **или** register → accept.

### 6.4 Кто может приглашать

- Только Org Owner/Admin.
- Platform admin — только break-glass.

---

## 7) Карточки сотрудников в org

### 7.1 Создание org-card

- Идемпотентная операция “моя org card” для пользователя при active membership.
- Карточка связана `userId + orgId`.

### 7.2 Редактирование

- Только owner карты.
- При revoke membership → 404 на org surfaces (anti-enumeration).

### 7.3 Человекочитаемый slug карточки сотрудника (“петя”)

Это **НЕ orgSlug**. Это **card slug** внутри org: `/c/:orgSlug/:cardSlug`.

- Его можно менять (по политике продукта), но с правилами:
    - уникальность в рамках org,
    - reserved слова,
    - (опционально) redirect старого slug → нового,
    - audit изменения slug.

---

## 8) Offboarding (увольнение/удаление доступа)

- Предпочтение: `status=inactive`, а не delete (история/аудит).
- delete допускается только platform admin и только как исключение.

---

## 9) Админ-поверхности (в v1)

- Platform admin UI: `/admin`.
- Org admin UI (директор): отдельная user-surface позже.
    - До этого: controlled tools / минимальный scope (не расширять лишнего).

---

## 10) Guardrails и рабочая тактика (SSoT для Copilot)

- Phase 1 READ-ONLY audit (PROOF file:line) → Phase 2 minimal fix (1–3 файла) → gates/sanities raw output + EXIT.
- No git commands.
- No inline styles — CSS Modules only.
- Skins token-only.
- SSoT render chain (public+preview).
- Templates registry only in `frontend/src/templates/templates.config.js`.
- Preview-only стили только под `[data-preview="phone"]`.
- CardLayout DOM skeleton не менять без миграционной фазы + PROOF.
- Prefer Flex over CSS Grid unless truly needed.

---

## 11) DoD (орг-политика v1)

- Org создаётся только platform admin.
- Директор/HR onboard’ит сотрудников через manual invite links.
- SeatLimit enforced в create/accept/re-activate.
- Membership revoke → 404 на org surfaces (anti-enumeration).
- PublicPath/ogPath SSoT в DTO, QRCodeBlock не угадывает orgSlug.
- Все org-действия имеют аудит.
