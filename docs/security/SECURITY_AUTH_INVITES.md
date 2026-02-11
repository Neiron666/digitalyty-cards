# SECURITY_AUTH_INVITES.md

> **SSoT (Single Source of Truth)** — безопасность, auth, invites, восстановление доступа (Cardigo)  
> Статус: **v1 (Feb 2026)**  
> Цель: enterprise-качество безопасности при минимальном blast radius и без self-serve org creation.

---

## 0) Текущее состояние (snapshot из аудита)

- Auth endpoints: register/login/me.
- Нет email verification, нет password reset.
- JWT хранится в localStorage, Authorization ставится через `api.defaults`.
- CORS включён без allowlist.
- Error middleware возвращает `err.message` клиенту.
- Email normalization непоследовательна: auth использует raw email, admin-lookup нормализует.

---

## 1) Threat model (коротко)

Защищаемся от:

- Account takeover (credential stuffing, reuse паролей).
- User/email enumeration.
- Token theft (invite/reset).
- Cross-tenant data access (org isolation).
- XSS → кража JWT из localStorage (P2: переход на httpOnly cookies).
- Abuse: brute force, invite/reset spamming.

---

## 2) Каноническая политика Email (P0)

### 2.1 Нормализация (SSoT)

**Единое правило:** `emailNormalized = email.trim().toLowerCase()`

### 2.2 Хранение и уникальность

Рекомендуем:

- `emailNormalized` (обязательно) — unique + index, lookup только по нему
- `emailOriginal` (опционально) — только для UI/отображения

> Это P0 перед любыми invites/reset/verify — иначе будут edge-cases и дубли.

---

## 3) Регистрация и подтверждение email (для personal/solo пользователей)

### 3.1 Цель

Enterprise-flow:

- регистрация,
- подтверждение email,
- resend verification,
- anti-enumeration,
- rate limits,
- безопасные токены (hash storage).

### 3.2 Поля в User

- `emailVerifiedAt: Date | null`
- `emailVerificationTokenHash: string | null`
- `emailVerificationExpiresAt: Date | null`

### 3.3 Endpoints (контракт, high-level)

- `POST /auth/register`
    - создаёт user со `emailVerifiedAt=null`
    - генерирует verify token (random bytes), сохраняет hash+expiresAt
    - отправляет email (через провайдера)
    - **ответ одинаковый** (anti-enum)
- `POST /auth/verify-email`
    - token → hash → lookup → verify → clear fields
- `POST /auth/resend-verification`
    - одинаковый ответ всегда, при необходимости шлёт новый токен

### 3.4 Гейтинг функционала (продуктовая политика)

- редактировать можно сразу,
- **публиковать/шарить** — только после `emailVerifiedAt != null`.

---

## 4) Organization invites (Manual Invite Link, без email-провайдера)

### 4.1 Принцип (принято)

Сотрудников onboard’им через manual invite links (директор/HR отправляет ссылку вручную).

### 4.2 Модель данных OrgInvite (предложение)

`OrganizationInvite`

- `orgId`
- `invitedEmailNormalized`
- `role` (member/admin)
- `status` (pending/accepted/revoked/expired)
- `tokenHash`
- `expiresAt`
- `usedAt`
- `createdByUserId`
- timestamps

Индексы:

- unique “один активный invite” на org+email (pending)
- index по `expiresAt` (по политике)
- (опционально) TTL cleanup, но только если безопасно и контролируемо

### 4.3 Токены invite (security)

- `crypto.randomBytes(32)` → base64url
- хранить **только SHA-256 hash**
- TTL: 1–7 дней
- Single-use + revoke + audit
- accept должен быть idempotent и безопасен к повторным запросам

### 4.4 Seats enforcement (важно)

Рекомендация: pending invite **резервирует seat** (иначе можно “обойти” лимит, нагенерив 100 инвайтов при лимите 10).

---

## 5) Восстановление пароля (password recovery) — через email

### 5.1 Принятое решение

- Онбординг сотрудников: manual invite link (без email провайдера).
- Восстановление пароля: **через transactional email провайдера**.

### 5.2 Важная ремарка по “email от Render”

Render — это хостинг. Для писем нужен именно **email-провайдер** (transactional).  
Практически лучше использовать **HTTP API** провайдера (не SMTP), чтобы не зависеть от ограничений инфраструктуры.

### 5.3 Поля reset

- `passwordResetTokenHash`
- `passwordResetExpiresAt`
- `passwordResetUsedAt`

### 5.4 Endpoints

- `POST /auth/forgot-password` (anti-enum: одинаковый ответ)
- `POST /auth/reset-password` (token + newPassword)

Дополнительно (B2B):

- `POST /orgs/:orgSlug/users/:userId/reset-link`
    - генерирует reset link для сотрудника,
    - только при active membership и роли admin/owner,
    - строго с аудитом.

### 5.5 Recovery Codes (опционально, но enterprise-полезно)

- 10 одноразовых кодов, показываем 1 раз, храним хэши.
- Флоу: email + recoveryCode + newPassword.
- Подходит как запасной канал восстановления без SMS.

---

## 6) Email provider (transactional) — старт “бесплатно”

### 6.1 Требования

- HTTP API
- DKIM/SPF/DMARC
- Free tier для старта

### 6.2 Рекомендация для начала

- **Resend** — обычно самый быстрый старт (есть free tier; лимиты меняются со временем). :contentReference[oaicite:0]{index=0}
- **Mailgun** — тоже имеет бесплатные лимиты/планы, но условия зависят от региона/типа аккаунта. :contentReference[oaicite:1]{index=1}

> Я бы стартовал с **Resend** (проще интеграция и меньше операционной боли), а когда дойдёшь до масштаба/комплаенса — можно переехать на SES.

---

## 7) Rate limiting (обязательно)

Минимум:

- register/resend: per-IP + per-emailNormalized
- login: per-IP + per-emailNormalized + backoff
- forgot-password: per-IP + per-emailNormalized
- invite create/accept: per-org + per-emailNormalized + per-IP

---

## 8) CORS / Security headers / CSP

- CORS allowlist через ENV (P0/P1).
- Helmet (P1).
- CSP (P2), особенно если JWT в localStorage.

---

## 9) Error handling (P0)

- В prod не отдаём сырые `err.message`.
- Отдаём: `{ code, message }` (message безопасный), детали — в server logs.

---

## 10) Audit logging (enterprise readiness)

Логируем:

- org events (create/activate/deactivate, seatLimit changes)
- membership events (add/remove/role/status)
- invite events (create/revoke/accept/expire)
- auth reset events (requested/issued/consumed; без токенов)
- billing/seats changes

Расширяем `targetType`: `user`, `card`, `org`, `org_member`, `invite`, `auth`.

---

## 11) План внедрения (phased, теоретический)

### P0 (без этого нельзя двигаться)

1. Email normalization единообразно (write+lookup).
2. Error handling: убрать утечку err.message.
3. CORS allowlist через ENV.
4. Rate limit на auth.

### P1 (орг-инвайты + восстановление)

5. OrgInvite модель + endpoints create/list/revoke/accept.
6. SeatLimit в Org + enforcement.
7. Password reset через email provider (forgot/reset).
8. Audit расширить на org/invite/reset.

### P2 (укрепление)

9. httpOnly cookies + CSRF.
10. Helmet + CSP.
11. Redis rate limiter (multi-instance).
12. MFA/Passkeys (по запросу enterprise клиентов).
