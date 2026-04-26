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
- `CARDIGO_STO_NOTIFY_TOKEN` - `?snk=` token для `payment-sto-notify.js`. **Обязательно** в production. Должно совпадать с Render. Никогда не логировать, не коммитить.

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

НУЖНО (для iframe checkout mode — требуется только при `mode="iframe"`):

- `PAYMENT_INTENT_ENABLED` = `true` — включает PaymentIntent snapshot/reconciliation path. Устанавливать только когда iframe checkout намеренно включён и протестирован. **Anti-drift:** не оставлять включённым для production terminal rollout без E2E smoke. Sandbox-proven 2026-04-25 (`testcards`).
- `TRANZILA_IFRAME_SUCCESS_URL` = `https://cardigo.co.il/api/payments/return?status=success&target=iframe`
- `TRANZILA_IFRAME_FAIL_URL` = `https://cardigo.co.il/api/payments/return?status=fail&target=iframe`

**Anti-drift notes (iframe return URLs):**

- `TRANZILA_IFRAME_*_URL` **обязательно** включают `&target=iframe`. Удаление этого суффикса молча регрессирует iframe relay в `/pricing` (неправильный destination).
- Никогда не указывать `TRANZILA_IFRAME_*_URL` напрямую на `/payment/iframe-return`. Этот SPA-роут обрабатывает только GET; Tranzila делает POST form-submit. `/api/payments/return` — Netlify function bridge, единственный корректный target.
- External `TRANZILA_SUCCESS_URL` / `TRANZILA_FAIL_URL` — для внешнего full-window flow; **НЕ добавлять `&target=iframe` к ним**.

НУЖНО (STO / token / MyBilling — для STO create):

- `TRANZILA_STO_TERMINAL` - token / MyBilling terminal ID (**not** a hosted checkout terminal)
- `TRANZILA_STO_API_URL` - Tranzila `/v2/sto/create` endpoint URL
- `TRANZILA_API_APP_KEY` - Tranzila API v2 public app key (HMAC auth)
- `TRANZILA_API_PRIVATE_KEY` - Tranzila API v2 private key (HMAC key base — **never log**)
- `TRANZILA_STO_CREATE_ENABLED` = `false` (default safe state; `true` only for approved rollout window)

НУЖНО (для STO recurring notify):

- `TRANZILA_STO_NOTIFY_URL` - operator/reference value only; not read at runtime. Portal URL pattern: `https://cardigo.co.il/api/payments/sto-notify?snk=<STO_NOTIFY_TOKEN>`. Никогда не вставлять реальный токен в док.
- `CARDIGO_STO_NOTIFY_TOKEN` - **Обязательно** в production на Render (backend fail-closed 503 если отсутствует). Должно совпадать с Netlify. Никогда не логировать, не коммитить.

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

### C) Iframe checkout sandbox smoke

> Выполнять при `PAYMENT_INTENT_ENABLED=true`, `PAYMENT_PROVIDER=tranzila`, `TRANZILA_TERMINAL=testcards` (sandbox). Требуется чистый тестовый пользователь (нет активной подписки, нет pending PI).

- [ ] Войти под тестовым пользователем.
- [ ] Открыть `/payment/checkout?plan=monthly`.
- [ ] Заполнить receipt profile (name, email обязательны).
- [ ] Продолжить до summary → проверить план и цену.
- [ ] Продолжить до payment → iframe рендерится с Tranzila DirectNG.
- [ ] Завершить оплату тестовой картой (sandbox terminal).
- [ ] Убедиться, что success UX показывается в parent frame (без полной переадресации страницы).
- [ ] Убедиться, что navigate → `/edit/card/settings` после клика на кнопку успеха.
- [ ] Проверить в Mongo: `PaymentIntent.status === "completed"`.
- [ ] Проверить в Mongo: `PaymentTransaction.status === "paid"`, `providerTxnId` присутствует.
- [ ] Проверить в Mongo: `Receipt.status === "created"`, `shareStatus === "sent"`.
- [ ] Проверить в Mongo: `Receipt.recipientSnapshot.source === "paymentIntent"`.
- [ ] Убедиться, что receipt email доставлен (проверить inbox тестового email-адреса).
- [ ] Убедиться, что квитанция отображается и скачивается в `/edit/card/settings → קבלות`.
- [ ] Убедиться, что нет активных `status:"pending"` PI для того же пользователя/плана/mode после завершения.

### D) Anti-regression checks (iframe relay)

- [ ] `POST /api/payments/return?status=success&target=iframe` → `303 /payment/iframe-return?status=success`.
- [ ] `POST /api/payments/return?status=success` (без target) → `303 /pricing?payment=success`.
- [ ] `POST /api/payments/return?status=fail&target=iframe` → `303 /payment/iframe-return?status=fail`.
- [ ] `POST /api/payments/return?status=fail` (без target) → `303 /pricing?payment=fail`.

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

- [x] ~~STO notify handler~~ — **ПОЛНОСТЬЮ ЗАКРЫТ (5.8a–5.8f.9).** `handleStoNotify` имплементирован; Netlify `payment-sto-notify.js` + backend `POST /api/payments/sto-notify` деплоены с token gates и safe observability logs (5.8f.LOG.1). **Реальный provider-generated Tranzila My Billing webhook получен и полностью верифицирован 2026-04-22** (`valik@cardigo.co.il`, contour 5.8f.9, classification: `REAL_TRANZILA_STO_NOTIFY_E2E_SUCCESS_FULLY_VERIFIED`). Portal URL сконфигурирован для терминала `testcardstok`. Ledger baseline: `sto_recurring_notify_count=6`, `sto_prefix_txn_count=6`.
- [ ] ⚠️ **Price gate** — `PRICES_AGOROT` должно совпадать с суммой, на которую созданы STO-расписания. **Текущее значение: `500/500` (sandbox — intentional, operator decision, активно во время разработки).** Production: `3990/39990`. Менять НЕЛЬЗЯ пока активны sandbox STO-расписания — несовпадение вызовет `amount_mismatch` на каждом recurring notify. Восстановить production цены в отдельном pre-production contour, **после** отмены/деактивации всех активных sandbox STO-расписаний (valik, neiron test accounts).
- [x] ~~Failed-STO retry/recovery script или job~~ — **РЕАЛИЗОВАНО (5.12.H):** `backend/scripts/sto-retry-failed.mjs` — dry-run default, single-target (`--email`/`--user-id`), production-terminal block (`/^fxp/i` requires `--allow-prod`).
- [x] ~~Cancellation/deactivation runbook~~ — **ПОЛНОСТЬЮ РЕАЛИЗОВАНО (5.6 + 5.9a.1/5.9a.2).** Пользователь может отменить будущее STO-списание через product UI: `POST /api/account/cancel-renewal` (SettingsPanel billing section, requireAuth, provider-first через `cancelTranzilaStoForUser`, idempotent, `cancellationSource: "self_service"`). Premium остаётся активным до `subscription.expiresAt` / `Card.billing.paidUntil` — немедленного downgrade нет. Operator script `sto-cancel.mjs` также существует для admin path. Admin UI/button остаётся deferred и не является блокером. Production terminal cutover и прочие gates — отдельные задачи.
- [x] ~~Non-sensitive structured observability (STO create)~~ — **РЕАЛИЗОВАНО (5.12.H):** `logStoCreateOutcome()` в `tranzila.provider.js:733–769`, wired в `handleNotify()` L1020–1029.
- [x] ~~Gated startup validation при `TRANZILA_STO_CREATE_ENABLED=true`~~ — **РЕАЛИЗОВАНО (5.11):** `backend/src/services/payment/index.js` — fail-fast на отсутствующих STO create vars при `TRANZILA_STO_CREATE_ENABLED=true`.
- [ ] Production terminal cutover (замена sandbox terminal vars на production values) — не выполнен.
- [ ] Handshake / `thtk` amount locking — отдельный будущий контур.
- [x] ~~YeshInvoice / קבלה~~ — **ИМПЛЕМЕНТИРОВАНО И SANDBOX-PROVEN (2026-04-24).** `yeshinvoice.service.js`, `Receipt.model.js`, fire-and-forget hooks in `tranzila.provider.js` completed and sandbox-verified. Pre-production gates G6 (production terminal cutover) and G7 (production lifecycle proof) still open. Production rollout NOT STARTED. See `billing-flow-ssot.md §9` and `§16`.
    > **Sandbox proof caveats (2026-04-24):** Public relay smoke requires Render warm-up — allow 30–60s before retry. `SANDBOX-STO-002` is a reserved failed attempt (Render cold-start + Netlify 9s timeout). Do not reuse this ID. `PRICES_AGOROT` must remain `500/500` until all active sandbox STO schedules are cancelled.

### Частые ошибки при STO

- Использование пользователя с уже созданным STO → Guard A в `createTranzilaStoForUser` тихо пропустит операцию. Всегда проверять `tranzilaSto.status` перед тестом.
- Повторное использование тестовых пользователей без проверки DB state → Guard A скроет операцию. См. pre-flight чеклист выше.
- `TRANZILA_STO_CREATE_ENABLED=true` не выставлен на Render (но выставлен локально в `.env`) → STO create молча пропускается на Render.
