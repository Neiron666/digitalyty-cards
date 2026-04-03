# Cardigo — Enterprise Master Handoff / Email Block Closure

_Дата: 2026-04-03_

---

## 0) Что это за документ

Dated-sibling handoff, закрывающий bounded workstream:

> **"Permanent blocked re-registration after self-delete"**

Предыдущие canonical master handoffs (`2026-04-02`) остаются актуальными для всех контуров, которые они описывают. Этот файл добавляет только новую замкнутую правду.

---

## 1) Проблема

До этого workstream пользователь мог:

1. Зарегистрироваться.
2. Удалить свой аккаунт (self-delete).
3. Сразу же зарегистрироваться заново с тем же email.

Это было нежелательным product/security поведением.

---

## 2) Принятая архитектура

### 2.1 Tombstone-first

При self-delete backend записывает **tombstone** (HMAC-SHA256 хэш email) в коллекцию `deletedemailblocks` **до** начала destructive cascade (удаление карточки, медиа, данных пользователя).

Если cascade падает частично — email всё равно заблокирован (fail-safe).

### 2.2 Blocked re-registration

Все 4 маршрута создания аккаунта проверяют tombstone **до** создания пользователя:

| Маршрут                      | Ответ при blocked email |
| ---------------------------- | ----------------------- |
| `/auth/register`             | `409` (как duplicate)   |
| `/auth/signup-link`          | `204` (silent)          |
| `/auth/signup-consume`       | `400` (neutral)         |
| `/invites/accept` (new-user) | `404` (not-found)       |

### 2.3 Anti-enumeration сохранена

Ответы при blocked email **неотличимы** от других отказов на каждом маршруте. Система не раскрывает факт блокировки через response shape.

### 2.4 UX-уточнения (frontend)

- Предупреждение в форме удаления аккаунта: email не будет доступен для нового аккаунта.
- Finality-сообщение после успешного удаления: "החשבון נמחק. כתובת האימייל לא תהיה זמינה ליצירת חשבון חדש."
- Ошибка регистрации при 409: "לא ניתן ליצור חשבון עם כתובת האימייל הזו."

---

## 3) Что закрыто

- `DeletedEmailBlock` модель + HMAC utility.
- `EMAIL_BLOCK_SECRET` fail-fast при старте сервера.
- Tombstone-first запись в `account.routes.js`.
- Guards на всех 4 маршрутах создания аккаунта.
- Manual unique index на `deletedemailblocks.emailKey` создан в production.
- Frontend UX: предупреждение, finality-сообщение, 409 → Hebrew mapping.
- `api-security.md` обновлён (canonical auth/security truth).
- `copilot-instructions.md` обновлён (`EMAIL_BLOCK_SECRET` в startup invariant).

---

## 4) Что intentionally deferred

| Тема                            | Статус          | Примечание                                                             |
| ------------------------------- | --------------- | ---------------------------------------------------------------------- |
| Admin-delete tombstone          | Deferred        | Отдельное product/architect решение. Не смешивать с self-delete.       |
| Email-block admin UI            | Not planned     | Нет UI для просмотра/снятия блокировок. Отдельный future contour.      |
| Token/auth deeper cleanup       | Out of scope    | Не связано с email-block.                                              |
| Email normalization unification | Known tech debt | 4 independent copies `trim().toLowerCase()`. Не блокирует email-block. |

---

## 5) Operational truth

### 5.1 Environment

- `EMAIL_BLOCK_SECRET` — обязателен при старте (fail-fast). Уже настроен в `.env` (local) и production.

### 5.2 Index governance

- Collection: `deletedemailblocks`
- Index: `emailKey_1` (unique) — создан вручную.
- Manual governance truth сохранена (`autoIndex: false`, `autoCreate: false`).

### 5.3 Файлы, изменённые в этом workstream

**Backend:**

| Файл                                            | Действие                                |
| ----------------------------------------------- | --------------------------------------- |
| `backend/src/models/DeletedEmailBlock.model.js` | NEW                                     |
| `backend/src/utils/emailBlock.util.js`          | NEW                                     |
| `backend/src/server.js`                         | MODIFIED (EMAIL_BLOCK_SECRET fail-fast) |
| `backend/.env.example`                          | MODIFIED                                |
| `backend/src/routes/account.routes.js`          | MODIFIED (tombstone on self-delete)     |
| `backend/src/routes/auth.routes.js`             | MODIFIED (isEmailBlocked guards)        |
| `backend/src/routes/invites.routes.js`          | MODIFIED (isEmailBlocked guard)         |

**Frontend:**

| Файл                                                      | Действие                                      |
| --------------------------------------------------------- | --------------------------------------------- |
| `frontend/src/components/editor/panels/SettingsPanel.jsx` | MODIFIED (warning + finality message + delay) |
| `frontend/src/pages/Register.jsx`                         | MODIFIED (409 → Hebrew mapping)               |

---

## 6) Runtime smoke truth

Подтверждено:

- Self-delete записывает tombstone document в `deletedemailblocks`.
- Re-register с тем же email возвращает `409`.
- Tombstone document содержит `emailKey` (HMAC hash), `formerUserId`, `createdAt`.
- Frontend показывает предупреждение перед удалением и finality-сообщение после.
- Все sanity scripts остались зелёными.
- Frontend build — зелёный.

---

## 7) Carry-forward для следующего чата

```text
Email-block contour (2026-04-03): CLOSED.

После self-delete email permanently blocked от re-registration.
Tombstone: HMAC-SHA256 в deletedemailblocks (EMAIL_BLOCK_SECRET).
Guards: /register, /signup-link, /signup-consume, /invites/accept.
Anti-enumeration: сохранена.
Admin-delete: intentionally NOT included — отдельный future contour.
Index: deletedemailblocks.emailKey unique — manual governance.
Canonical truth: docs/api-security.md §7 "Deleted-email recreation block".
```

---

_Конец handoff. Следующий canonical master handoff должен быть dated-sibling в той же директории._
