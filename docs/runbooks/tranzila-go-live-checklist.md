# Tranzila Go‑Live Checklist (Cardigo)

> **Цель:** подключить реальную оплату через Tranzila безопасно и предсказуемо, без “магии” на фронте.  
> **Важный инвариант:** **единственный источник истины** для активации Premium - server‑to‑server notify (`/api/payments/notify`).  
> Redirect на `/pricing?payment=success|fail` - **только UX**, никогда не “активация”.

---

## 0) Что можно проверять сейчас (без подключения Tranzila)

Пока `PAYMENT_PROVIDER=mock`, мы всё равно можем проверить «боевую готовность» по контрактам:

- UI: кнопки **חודשי** и **שנתי** существуют, дергают `createPayment("monthly"|"yearly")`, не ломают UX в dev.
- Backend: `PRICES_AGOROT` корректные, `createPayment` (Tranzila‑провайдер) формирует `sum` как `"39.90"/"399.90"` (shekels string) из agorot.
- Notify bypass: `_redirects` точечный матч `/api/payments/notify` → netlify function `payment-notify.js`.
- Security: `?nt=` token в Netlify function + `x-cardigo-proxy-secret` + backend `x-cardigo-notify-token` (MUST-if-set).
- Ledger: `PaymentTransaction` модель, миграционный скрипт индекса `providerTxnId_1`, idempotency via E11000.
- UX: `/pricing?payment=success|fail` показывает баннер, но **не обещает** “активацию” (только “יתעדכן תוך כמה דקות”).

---

## 1) Где какие env‑переменные должны жить

### Netlify (frontend + functions)

НУЖНО:

- `CARDIGO_NOTIFY_TOKEN` - секрет для `?nt=`
- `CARDIGO_PROXY_SHARED_SECRET` - секрет для origin‑lock (proxy → backend)

НЕ НУЖНО:

- любые `TRANZILA_*` (они **только** на backend / Render)

### Render (backend)

НУЖНО (чекаут / clearing):

- `PAYMENT_PROVIDER` = `mock` (пока разработка) / `tranzila` (только при go-live)
- `CARDIGO_NOTIFY_TOKEN` - **тот же**, что на Netlify
- `CARDIGO_PROXY_SHARED_SECRET` - **тот же**, что на Netlify
- `TRANZILA_TERMINAL` - clearing / DirectNG terminal ID (только для go-live)
- `TRANZILA_SECRET` - реальный секрет подписи (только для go-live)
- `TRANZILA_NOTIFY_URL` - `https://cardigo.co.il/api/payments/notify?nt=<CARDIGO_NOTIFY_TOKEN>`
- `TRANZILA_SUCCESS_URL` - `https://cardigo.co.il/pricing?payment=success`
- `TRANZILA_FAIL_URL` - `https://cardigo.co.il/pricing?payment=fail`

НУЖНО (STO / token / MyBilling — для STO create):

- `TRANZILA_STO_TERMINAL` - token / MyBilling terminal ID (**not** a hosted checkout terminal)
- `TRANZILA_STO_API_URL` - Tranzila `/v2/sto/create` endpoint URL
- `TRANZILA_API_APP_KEY` - Tranzila API v2 public app key (HMAC auth)
- `TRANZILA_API_PRIVATE_KEY` - Tranzila API v2 private key (HMAC key base — **never log**)
- `TRANZILA_STO_CREATE_ENABLED` = `false` (default safe state; `true` only for approved rollout window)

НЕ НУЖНО ещё (future STO notify contour):

- `TRANZILA_STO_NOTIFY_URL` - future STO notify handler URL; not required for STO create
- `CARDIGO_STO_NOTIFY_TOKEN` - future STO notify auth token; not required for STO create

### Local backend (.env локально, не в git)

Рекомендовано:

- держать `PAYMENT_PROVIDER=mock`
- `TRANZILA_*` можно держать как реальные/плейсхолдеры - **не важно**, пока `PAYMENT_PROVIDER=mock`
- `CARDIGO_NOTIFY_TOKEN` - можно выставить (для локальных smoke notify), но это не обязательно для dev.

---

## 2) Go‑Live checklist (до переключения PAYMENT_PROVIDER=tranzila)

### A) Документация и SSoT

- [ ] `docs/runbooks/billing-flow-ssot.md` актуален (цены, фичи, ACK policy).
- [ ] Этот чек‑лист добавлен в repo: `docs/runbooks/tranzila-go-live-checklist.md`.
- [ ] В `billing-flow-ssot.md` есть ссылка на этот чек‑лист (1 строка в начале/конце).

### B) Netlify

- [ ] `CARDIGO_NOTIFY_TOKEN` задан и **совпадает** с backend.
- [ ] `CARDIGO_PROXY_SHARED_SECRET` задан и **совпадает** с backend.
- [ ] `_redirects` содержит строку **перед** `/api/*`:
    - `/api/payments/notify  /.netlify/functions/payment-notify  200`
- [ ] `payment-notify.js` деплоится и отвечает:
    - `POST /api/payments/notify` → **403** (нет nt)
    - `POST /api/payments/notify?nt=WRONG` → **403**
    - `POST /api/payments/notify?nt=<REAL>` → **не** 401 gate (должно попадать в функцию)

### C) Render (backend) - подготовка (ещё без включения)

- [ ] `TRANZILA_TERMINAL` заполнен реальным значением.
- [ ] `TRANZILA_SECRET` заполнен реальным значением.
- [ ] `TRANZILA_NOTIFY_URL` ровно совпадает по формату с Tranzila notify URL (включая `?nt=`).
- [ ] `TRANZILA_SUCCESS_URL` / `TRANZILA_FAIL_URL` выставлены.
- [ ] `CARDIGO_NOTIFY_TOKEN` / `CARDIGO_PROXY_SHARED_SECRET` совпадают с Netlify.
- [ ] Пока `PAYMENT_PROVIDER=mock` (мы не включаем прод‑оплату случайно).

### D) Mongo index governance

- [ ] Прогнан dry‑run миграции:
    - `cd backend`
    - `node scripts/migrate-paymenttransaction-indexes.mjs`
- [ ] Затем apply в нужной среде (когда будешь готов):
    - `node scripts/migrate-paymenttransaction-indexes.mjs --apply`
- [ ] Убедиться, что `providerTxnId_1` существует и `unique: true`.

### E) UX на /pricing (обязательно)

- [ ] `https://cardigo.co.il/pricing?payment=success` показывает success‑баннер.
- [ ] `https://cardigo.co.il/pricing?payment=fail` показывает error‑баннер.
- [ ] Текст НЕ обещает “активацию”, а говорит “יתעדכן תוך כמה דקות”.

---

## 3) Активация (сам момент подключения Tranzila)

**Единственное изменение‑переключатель:**

- [ ] Render: поменять `PAYMENT_PROVIDER` с `mock` на `tranzila`.

**Ожидаемое поведение:**

- backend стартует (иначе fail‑fast скажет, каких `TRANZILA_*` не хватает)
- `POST /api/payments/create` начинает возвращать **https://...tranzila...** URL

---

## 4) Smoke после активации

### A) Notify edge (prod)

- [ ] `POST https://cardigo.co.il/api/payments/notify` → 403
- [ ] `POST https://cardigo.co.il/api/payments/notify?nt=WRONG` → 403
- [ ] `POST https://cardigo.co.il/api/payments/notify?nt=<REAL>` с пустым `{}` → обычно 200 `"OK"` (anti‑oracle), но главное - не падение функции.

### B) E2E реальная транзакция

- [ ] В editor нажать **חודשי** (минимальный риск) → Tranzila checkout.
- [ ] После оплаты редирект на `/pricing?payment=success`.
- [ ] Проверить в Mongo:
    - `PaymentTransaction` создан (providerTxnId уникален)
    - user subscription обновлён
    - card billing обновлён

---

## 5) Rollback (если что-то пошло не так)

- [ ] Render: вернуть `PAYMENT_PROVIDER=mock`.
- [ ] Ничего не ломается: notify остаётся защищённым, ledger записи остаются для форензики.

---

## 6) Частые причины проблем (коротко)

- `PAYMENT_PROVIDER=tranzila`, но забыли `TRANZILA_SECRET` → fail‑fast остановит сервер (правильно).
- `CARDIGO_NOTIFY_TOKEN` не совпадает Netlify vs Render → notify будет отбрасываться на одном из уровней.
- `_redirects` правило стоит ниже `/api/*` → Tranzila попадает в gate proxy и не может пройти.
- В Tranzila dashboard notify URL без `?nt=` → Netlify function вернёт 403.

---

## 7) STO Recurring Schedule — Pre-Production Checklist

> **SSoT:** `docs/runbooks/billing-flow-ssot.md` §14.
> Этот раздел — операторский чеклист только.

### Pre-flight (до включения STO create)

- [ ] Подтвердить dual terminal model: `TRANZILA_TERMINAL` ≠ `TRANZILA_STO_TERMINAL` (разные терминалы).
- [ ] Подтвердить, что STO vars на Render заполнены (не `_TODO_`):
    - `TRANZILA_STO_TERMINAL`
    - `TRANZILA_STO_API_URL`
    - `TRANZILA_API_APP_KEY`
    - `TRANZILA_API_PRIVATE_KEY`
- [ ] `TRANZILA_STO_CREATE_ENABLED=false` на Render перед началом тестового окна.
- [ ] Выбрать тестового пользователя с `tranzilaSto.status=null` и `tranzilaToken` есть (чистое состояние). Не использовать пользователя с `tranzilaSto.status="created"` без явного сброса DB state.

### Controlled enable procedure (тестовое окно)

1. Убедиться, что выбранный тестовый пользователь прошёл pre-flight sanity (нет existing STO, есть token).
2. Выставить `TRANZILA_STO_CREATE_ENABLED=true` на Render.
3. Провести тестовую оплату через выбранного пользователя.
4. Проверить в Mongo: `user.tranzilaSto.status === "created"` и `stoId` ненулевой.
5. Проверить в Tranzila portal: STO создан.
6. **Немедленно** выставить `TRANZILA_STO_CREATE_ENABLED=false` на Render.
7. Деактивировать тестовые STO в Tranzila portal.

### Rollback

- [ ] Render: выставить `TRANZILA_STO_CREATE_ENABLED=false`.
- Первый платёж уже завершён и не откатывается — STO create является post-fulfillment non-blocking операцией.

### Portal cleanup (после тестового окна)

- [ ] Деактивировать / отменить все тестовые STO в Tranzila `testcardstok` portal.
- [ ] Не оставлять активные тестовые STOs — это создаёт будущие recurring charges.

### Production blockers (до production STO rollout)

- [ ] STO notify handler (Tranzila recurring charge webhook) — **не реализован**.
- [ ] Failed-STO retry/recovery script или job — **не реализован**.
- [ ] Cancellation/deactivation runbook и/или script — **не реализован**.
- [ ] Non-sensitive structured observability — **не реализована**.
- [ ] Gated startup validation при `TRANZILA_STO_CREATE_ENABLED=true` — **не реализована**.
- [ ] Production terminal cutover (замена sandbox terminal vars на production values) — **не выполнен**.
- [ ] Handshake / `thtk` amount locking — отдельный будущий контур.
- [ ] YeshInvoice / קבלה — явно отложен (см. `billing-flow-ssot.md` §9).

### Частые ошибки при STO

- Использование пользователя с уже созданным STO → Guard A в `createTranzilaStoForUser` тихо пропустит операцию. Всегда проверять `tranzilaSto.status` перед тестом.
- Повторное использование тестовых пользователей без проверки DB state → Guard A скроет операцию. См. pre-flight чеклист выше.
- `TRANZILA_STO_CREATE_ENABLED=true` не выставлен на Render (но выставлен локально в `.env`) → STO create молча пропускается на Render.
