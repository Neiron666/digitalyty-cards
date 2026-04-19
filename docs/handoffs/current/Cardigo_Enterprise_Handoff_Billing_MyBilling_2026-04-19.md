# Cardigo / Digitalyty Cards — Enterprise Handoff & Working Instructions

**Дата:** 2026-04-19  
**Цель файла:** передать следующий сессии ChatGPT полный контекст проекта, текущего workstream, принятых архитектурных решений, строгих правил работы с Copilot Agent и ближайших следующих шагов.  
**Важно:** файл намеренно не содержит секретов, приватных ключей, токенов, паролей, notify-token, TranzilaTK или реальных credential values.

---

## 0. Короткое резюме для нового окна ChatGPT

Проект — **Cardigo**, Israel-first SaaS для цифровых визитных карточек и мини-бизнес-страниц. Это не просто “визитка”, а система для малого бизнеса: карточка, публичная страница, SEO, лиды, аналитика, галерея, услуги, часы работы, booking foundation, AI content, trial/premium/free lifecycle, admin visibility, legal/compliance, tracking/consent, billing/payment roadmap.

В текущем workstream мы занимаемся **Tranzila billing / My Billing / recurring payments**. Уже закрыты важные части:

- DirectNG first-payment redirect работает через `testcards` clearing terminal.
- Return bridge для `/pricing?payment=success/fail` работает.
- Notify trust adaptation закрыт: DirectNG notify больше не блокируется из-за отсутствия legacy signature.
- Successful first payment обновляет `User`, `Card`, `PaymentTransaction`.
- `TranzilaTK` успешно приходит в notify, вырезается из audit payload и сохраняется отдельно в `User.tranzilaToken`.
- `/edit/card/settings` после оплаты корректно показывает billing данные.
- Stale copy про “upgrade to premium” в future-link note исправлена.
- Подготовлен probe script для STO create: `backend/scripts/probe-tranzila-sto-create.mjs`.
- MyBilling module был подключён у Tranzila, но **STO API auth всё ещё возвращает `401 Unauthorized`** на `POST https://api.tranzila.com/v2/sto/create`, включая все протестированные HMAC/nonce/username варианты.

Главный текущий блокер: **нужно получить от Tranzila точную auth formula / подтверждение активации API keys для `v2/sto/create` на token terminal.** До этого **не писать runtime STO create implementation**.

---

## 1. Роль ChatGPT в проекте

ChatGPT в этом проекте должен работать не как “помощник для мелких правок”, а как:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**
- **Security-focused reviewer**
- **Billing / payments architecture advisor**
- **Документационный владелец по техническим handoff/runbook материалам**

Главная задача ChatGPT — защищать архитектуру, контракты, SSoT, безопасность, масштабируемость и maintainability. Copilot Agent — исполнитель, не архитектор. Copilot нельзя давать свободу “улучшать всё подряд”. Каждая задача должна быть строго ограничена.

Рабочая формула:

```text
Architecture / Intent clarification
→ Phase 1 Read-Only Audit with PROOF
→ STOP
→ Phase 2 Minimal Fix
→ STOP
→ Phase 3 Verification with RAW stdout + EXIT
→ STOP
→ Documentation / Handoff
```

Нельзя перескакивать на следующую задачу, пока текущая не закрыта полностью, включая хвосты, verification и ручные operator actions.

---

## 2. Абсолютные правила для Copilot Agent

Каждый будущий промпт Copilot Agent по Cardigo должен начинаться примерно так:

```text
Ты — Copilot Agent, acting as senior full-stack engineer with strong payment/security architecture awareness and enterprise discipline.
PROJECT MODE: Cardigo enterprise workflow.
```

Для planning/legal/product задач можно менять роль, но сохранять senior enterprise framing, например:

```text
Ты — Copilot PLAN, acting as senior product/legal-architecture engineer with strong frontend/public-surface awareness and enterprise discipline.
PROJECT MODE: Cardigo enterprise workflow.
```

### Hard constraints всегда в каждом Copilot prompt

```text
Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy:
  - font-size only via var(--fs-*)
  - use only approved canonical typography tokens
  - --fs-* values rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)
  - do not leak card-scope tokens into app/public/auth/admin/site-shell context
```

### Workflow constraints всегда

```text
Phase 1 — Read-Only Audit with PROOF (file:line-range) → STOP.
Phase 2 — Minimal Fix only after approval → STOP.
Phase 3 — Verification with raw stdout + EXIT codes → STOP.

No scope creep.
No “заодно поправил”.
No refactor unless explicitly approved.
No formatting-only churn.
Minimal blast radius.
Do not touch unrelated files.
Do not change contracts by assumption.
Do not weaken security gates without proof.
```

### Для Windows / manual smoke

- Использовать PowerShell-compatible commands.
- Для endpoint smoke — `curl.exe`, не Unix `curl` assumptions.
- Multi-line PowerShell commands use backtick `` ` `` not `\`.
- Не давать user Linux line continuation для Windows.

---

## 3. Project identity / product truth

**Product:** Cardigo  
**Canonical domain:** `https://cardigo.co.il` non-www  
**Market:** Israel-first / Israel-only baseline, Hebrew / RTL-first  
**Brand separation:** Cardigo и Digitalyty нельзя смешивать в canonical, SEO, public paths, naming, product logic, structured data, OG, sitemap, URL logic или user-facing copy.

Cardigo включает:

- digital business card
- public personal card route: `/card/:slug`
- org card route: `/c/:orgSlug/:slug`
- editor/dashboard
- settings/account/billing preferences
- public marketing pages: `/`, `/cards`, `/pricing`, `/contact`, `/blog`, `/guides`
- admin panel
- blog subsystem
- guides subsystem
- media/gallery pipeline
- services/business hours/FAQ/booking foundation
- leads/inbox
- analytics/entitlements
- trial/free/premium lifecycle
- Tranzila billing direction
- Mailjet emails
- legal/compliance pages
- tracking/consent stack

---

## 4. Core architecture invariants

### Frontend invariants

- React + Vite.
- CSS Modules only.
- No inline styles.
- Flex only — no CSS Grid.
- Mobile-first.
- RTL/Hebrew-first UX.
- Typography only via approved `var(--fs-*)` tokens.
- No arbitrary literal font sizes.
- Preview-only styles only under `[data-preview="phone"]`.
- Do not casually touch `CardLayout.module.css` or CardLayout DOM skeleton.
- Public/preview render chain should remain SSoT.
- templates registry only at `frontend/src/templates/templates.config.js`.

### Backend invariants

- Node.js + Express + MongoDB/Mongoose.
- Manual index governance:
  - `MONGOOSE_AUTO_INDEX=false`
  - `MONGOOSE_AUTO_CREATE=false`
- DTO-driven public truth.
- Public/QR/OG URLs must come from backend DTO fields like `publicPath` / `ogPath`; no frontend guessing.
- Org security: anti-enumeration 404 + membership gate before SEO/410 decisions.
- Sitemap without N+1.
- Browser auth is cookie/httpOnly based; do not reintroduce browser localStorage token auth or Authorization header for browser flow.

### Payment / billing invariants

- Payment success must not auto-publish a card.
- `card.status` is publication truth: `draft` vs `published`.
- Billing status controls entitlements, not publication state.
- First payment notify must write ledger before fulfillment.
- Idempotency must be preserved via provider transaction id / unique index.
- Sensitive payment data must not be logged or persisted in allowlisted audit payload.
- `TranzilaTK` must never be exposed in DTO/API response/logs.

---

## 5. Current billing workstream — completed path

### 5.1 Original issue

Initially `/pricing` paid CTA redirected logged-in users to `/register`. Root cause: `Pricing.jsx` used hardcoded `<Link to="/register">` for monthly/yearly CTAs and did not branch by auth state.

Closed fix:

- `Pricing.jsx` now checks `isAuthenticated`.
- Logged-out user still goes to `/register`.
- Logged-in user calls `createPayment(plan)`.
- Absolute URL redirects via `window.location.assign()`.
- Relative mock URL navigates internally.
- Existing `?payment=fail` FlashBanner reused on error.

No backend changes were needed for this CTA fix.

### 5.2 Old Tranzila endpoint was dead

Old endpoint:

```text
https://secure5.tranzila.com/cgi-bin/tranzila71.cgi
```

This produced Not Found. Tranzila new DirectNG endpoint is:

```text
https://directng.tranzila.com/{terminalname}/iframenew.php
```

Closed fix:

- `tranzila.js` changed to `checkoutBase: "https://directng.tranzila.com"`.
- `createPayment()` builds URL path with terminal name.
- `terminal=` query param removed from outgoing checkout URL.
- URL params renamed:
  - `notify_url` → `notify_url_address`
  - `success_url` → `success_url_address`
  - `fail_url` → `fail_url_address`
- `tranmode=AK` was added initially for token capture. Runtime showed DirectNG echoes `tranmode: "A"`, but still returns `TranzilaTK`, so the notify trust gate later stopped relying on `tranmode`.
- Outbound legacy `signature` removed from checkout URL.

### 5.3 Terminal discovery

Important runtime discovery:

- `testcardstok` token terminal does **not** serve DirectNG hosted checkout page. It produced Tranzila “page not found” style error.
- `testcards` clearing terminal **does** serve hosted checkout and successful payment.
- Therefore current working architecture is:

```text
testcards = clearing / first-payment hosted checkout terminal
testcardstok = token / MyBilling STO terminal
```

Production equivalent is expected to be dual-terminal too, but exact production clearing terminal must be verified. Do not assume `fxpcardigotok` can do hosted checkout if it is token-only.

### 5.4 Return bridge fixed Netlify 404 after success

After successful Tranzila payment, browser came back to:

```text
https://cardigo.co.il/pricing?payment=success
```

but Netlify showed 404. Root cause: DirectNG returns via POST/form-style browser return, and Netlify SPA catch-all does not handle POST to arbitrary route.

Closed fix:

- Added Netlify function:

```text
frontend/netlify/functions/payment-return.js
```

- Added `_redirects` rule before `/api/*` proxy:

```text
/api/payments/return  /.netlify/functions/payment-return  200
```

- Env changed:

```env
TRANZILA_SUCCESS_URL=https://cardigo.co.il/api/payments/return?status=success
TRANZILA_FAIL_URL=https://cardigo.co.il/api/payments/return?status=fail
```

`payment-return.js`:

- accepts GET/POST;
- reads only query `status`;
- does not read/log body;
- does not call backend;
- returns 302/303 style redirect to clean SPA GET:
  - `/pricing?payment=success`
  - `/pricing?payment=fail`
- uses no env vars.

Verified: after payment, green success FlashBanner appears on `/pricing?payment=success`.

### 5.5 Notify trust adaptation fixed fulfillment

DirectNG notify payload does **not** include legacy `signature`. Initial code expected legacy signature and always set:

```text
sigOk=false
isPaid=false
failReason="bad_signature"
```

Closed adaptation:

- Legacy signature path preserved if signature exists.
- DirectNG path uses correlated runtime-proven trust fields:
  - `Response === "000"`
  - valid `userId` from `udf1`
  - valid plan from `udf2`
  - `sum` matches canonical `PRICES_AGOROT[plan]`
  - `supplier` matches active clearing `TRANZILA_CONFIG.terminal`
  - `currency === "1"`
  - `index` present
- `tranmode` removed from blocking gate because runtime showed Tranzila echoes `tranmode: "A"`, even when URL included `AK`. It is not stable as trust signal.

Verified successful payment after fix:

- `[batch0-probe]` showed:
  - `hasLegacySignature: false`
  - `directNgTrustOk: true`
  - `trustOk: true`
  - `hasToken: true`
- `PaymentTransaction.status = "paid"`
- `failReason = null`
- `User.plan = "monthly"`
- `User.subscription.status = "active"`
- `User.subscription.provider = "tranzila"`
- `User.subscription.expiresAt` set.
- `User.tranzilaToken` populated.
- `Card.plan = "monthly"`
- `Card.billing.status = "active"`
- `Card.billing.paidUntil` set.

### 5.6 Sensitive payload handling

`TranzilaTK` originally was at risk of being persisted in `PaymentTransaction.payloadAllowlisted`. Closed fix:

- Added lowercase `"tranzilatk"` to `STRIP_KEYS` because allowlist checks `k.toLowerCase()`.
- Extracted `capturedToken = data.TranzilaTK ?? null` before allowlist.
- Persisted only to `User.tranzilaToken` on paid path.
- Probe logs only booleans/key names, not token values.

Existing `STRIP_KEYS` also strips fields like:

- `ccno`
- `expmonth`
- `expyear`
- `cvv` variants
- `cred_type` etc.

Verify after any payment that `payloadAllowlisted` does **not** contain:

```text
TranzilaTK
tranzilatk
ccno
expmonth
expyear
cvv
```

### 5.7 Settings page after payment

After payment, `/edit/card/settings` now correctly shows:

- card billing paid until date;
- account first name/email;
- payment plan monthly/yearly;
- subscription status active;
- provider Tranzila;
- communication preferences.

A stale note said:

```text
יהפוך לציבורי אחרי הרשמה + שדרוג לפרמיום
```

That was wrong because payment does not auto-publish and publish is allowed by plan truth.

Closed fix in `SettingsPanel.jsx`:

- authenticated branch:

```text
הקישור יהפוך לציבורי לאחר פרסום הכרטיס.
```

- unauthenticated branch:

```text
הקישור יהפוך לציבורי אחרי הרשמה ופרסום הכרטיס.
```

No backend changes.

---

## 6. Current Tranzila / MyBilling state

### 6.1 Current working first-payment setup

Active test setup:

```env
PAYMENT_PROVIDER=tranzila
TRANZILA_TERMINAL=testcards
TRANZILA_SECRET=<testcards PW/secret, redacted>
TRANZILA_NOTIFY_URL=https://cardigo.co.il/api/payments/notify?nt=<redacted>
TRANZILA_SUCCESS_URL=https://cardigo.co.il/api/payments/return?status=success
TRANZILA_FAIL_URL=https://cardigo.co.il/api/payments/return?status=fail
```

Do not include actual tokens/secrets in prompts or docs.

### 6.2 STO / MyBilling env prep

Prepared / intended STO env keys:

```env
TRANZILA_STO_TERMINAL=testcardstok
TRANZILA_STO_API_URL=https://api.tranzila.com/v2/sto/create
TRANZILA_API_APP_KEY=<public API key, redacted>
TRANZILA_API_PRIVATE_KEY=<private API key, redacted>
TRANZILA_PW=<terminal PW/secret, redacted, currently questionable naming>
TRANZILA_STO_NOTIFY_URL=_TODO_
CARDIGO_STO_NOTIFY_TOKEN=_TODO_
```

Important naming note:

- `TRANZILA_API_APP_KEY` = `מפתח (API) ציבורי`
- `TRANZILA_API_PRIVATE_KEY` = `מפתח (API) פרטי`
- `שם משתמש (API)` exists and value is `testcards` according to user-provided Tranzila data.
- `TRANZILA_PW` may be terminal PW, but v2 STO docs did not clearly require it in request body/headers.
- Consider future rename to `TRANZILA_STO_PW` only if runtime implementation requires it. Do not rename now without a bounded migration/env plan.

### 6.3 MyBilling module status

User reports Tranzila connected the needed MyBilling module. However:

- `testcardstok` MyBilling UI/settings in test terminals may not be fully accessible.
- MyBilling UI was available only in live token mode earlier.
- Even after module activation, `POST /v2/sto/create` still returns `401 Unauthorized` for all tested variants.

### 6.4 Current STO API blocker

Probe script:

```text
backend/scripts/probe-tranzila-sto-create.mjs
```

Purpose:

- Fetch `user.tranzilaToken` from Mongo.
- Build STO create request to Tranzila.
- Test HMAC auth variants.
- Print raw HTTP status/body.
- Redact secrets.
- Make no DB writes.
- No runtime app code changes.

Observed result across all tested variants:

```json
HTTP 401
{"code":401,"message":"Unauthorized"}
```

Tested dimensions include:

- current colon formula;
- order swap formula;
- UUID nonce;
- no-colon formulas;
- base64 digest;
- literal provider wording interpretations;
- username in header;
- username in body;
- username in both.

All still `401`.

Conclusion: we are blocked at **API authentication level**, before token portability or body schema can be validated.

---

## 7. Tranzila docs facts gathered from user-provided docs

Important docs excerpts / facts:

### 7.1 STO API authentication

Headers required:

```text
X-tranzila-api-app-key
X-tranzila-api-request-time
X-tranzila-api-nonce
X-tranzila-api-access-token
```

Docs say:

- request time = Unix milliseconds from Jan 1 1970.
- nonce = 40 bytes unique random string generated by random bytes function.
- access token = `hash_hmac` using sha256 “on application key with secret + request-time + nonce”.

This wording is ambiguous. It might mean:

```php
hash_hmac('sha256', appKey, secret + requestTime + nonce)
```

or:

```php
hash_hmac('sha256', appKey + requestTime + nonce, secret)
```

or some delimiter/encoding variant. We tested many interpretations and all returned 401.

### 7.2 DirectNG checkout

New URL:

```text
https://directng.tranzila.com/terminalname/iframenew.php
```

Old URL:

```text
https://direct.tranzila.com/terminalname/iframenew.php
```

Supported params include:

```text
sum
currency
tranmode
success_url_address
fail_url_address
notify_url_address
contact
company
email
address
city
zip
pdesc
json_purchase_data
```

For Cardigo current first-payment redirect, GET works. Production-grade iframe/POST can be deferred.

### 7.3 MyBilling recurring notify payload example

STO notification example includes:

```json
{
  "supplier": "myterminal",
  "sto_external_id": "352885",
  "sum": "59.00",
  "currency": "ILS",
  "Response": "000",
  "ConfirmationCode": "0000000",
  "TranzilaTK": "X543c4c9214a1882312",
  "index": "2359",
  "Tempref": "27680001",
  "expdate": "0426",
  "tranmode": "A1705",
  "contact": "Customer Name",
  "email": "customer@example.com"
}
```

This proves future STO notify payload differs from first-payment DirectNG notify.

Architecture decision:

- STO renewal notify must have **separate route/handler**.
- Do not reuse first-payment `/api/payments/notify` handler.
- Do not weaken first-payment `supplierOk` to accept token terminal.

---

## 8. Current manual Tranzila support message

The next correct action is to contact Tranzila support. Use this exact Hebrew message:

```text
שלום,

אנחנו מפתחים אינטגרציה ל-My Billing / STO API דרך:

POST https://api.tranzila.com/v2/sto/create

הטרמינל: testcardstok

My Billing כבר הופעל אצלנו, אך כל קריאה ל-endpoint מחזירה:

HTTP 401
{"code":401,"message":"Unauthorized"}

אנחנו שולחים את הכותרות הבאות:

X-tranzila-api-app-key
X-tranzila-api-request-time
X-tranzila-api-nonce
X-tranzila-api-access-token
Content-Type: application/json
Accept: application/json

request-time נשלח בפורמט milliseconds Unix timestamp, לדוגמה 1713272831000.

nonce נשלח כ-40 bytes random שמקודדים ל-hex, כלומר 80 תווים.

ניסינו כמה נוסחאות HMAC שונות, כולל:

1. HMAC-SHA256 עם:
   data = appKey + ":" + nonce + ":" + requestTime
   key = privateKey

2. data = appKey + ":" + requestTime + ":" + nonce
   key = privateKey

3. data = appKey + requestTime + nonce
   key = privateKey

4. data = appKey
   key = privateKey + requestTime + nonce

ניסינו גם hex וגם base64 digest.

בנוסף ניסינו לשלוח את שם המשתמש API:
testcards

גם כ-header, גם בתוך body, וגם בשניהם יחד — עדיין 401.

נשמח לאישור מדויק:

1. האם ה-public API key וה-private API key שקיבלנו פעילים ומאושרים עבור:
   POST https://api.tranzila.com/v2/sto/create
   על הטרמינל testcardstok?

2. מה הנוסחה המדויקת לחישוב:
   X-tranzila-api-access-token

   נא לציין בצורה חד משמעית:
   - מה ה-data שעליו מחשבים HMAC
   - מה ה-key של ה-HMAC
   - האם יש מפריד בין השדות, ואם כן איזה
   - האם request-time לפני nonce או nonce לפני request-time
   - האם ה-digest צריך להיות hex או base64

3. מה בדיוק הפורמט הצפוי של X-tranzila-api-nonce?
   האם 40 bytes כ-hex string זה נכון, או שצריך לשלוח raw/base64/UUID?

4. האם צריך לשלוח API username בנוסף ל-headers?
   אם כן:
   - באיזה header בדיוק?
   - או באיזה field בתוך body?
   - מה שם השדה המדויק?

5. האם TRANZILA_PW / סיסמת PW של הטרמינל נדרשת ב-v2/sto/create?
   אם כן, באיזה שם field/header?

6. האם TranzilaTK שנוצר בעסקת DirectNG רגילה בטרמינל testcards יכול לשמש ליצירת STO בטרמינל testcardstok?
   או שה-token חייב להיווצר ישירות דרך אותו טרמינל STO?

תודה.
```

Do not continue STO runtime implementation until Tranzila answers this.

---

## 9. What NOT to do next

Do **not**:

- run production/live STO probe casually;
- switch to live token terminal and “refund later” as a workaround;
- implement runtime STO create while auth is 401;
- add more random HMAC variants endlessly;
- expose API keys / private key / PW / TranzilaTK in logs;
- store card expiry/token in `payloadAllowlisted`;
- reuse first-payment notify handler for STO renewal notify;
- weaken `supplierOk` for first-payment notify;
- merge billing work with unrelated UI/settings cleanup;
- start YeshInvoice / receipts until STO create is understood;
- open paid expiry/annual reminder jobs until recurring lifecycle is designed.

Why not live probe now:

- live token terminal may create real standing orders;
- cancellation/refund flow is not implemented;
- YeshInvoice/receipt handling is not ready;
- audit/recovery runbooks are not ready;
- support/backoffice cancellation flow is not verified.

---

## 10. What to do next — strict order

### Step 1 — Freeze code changes for STO auth

Current probe did its job: it proved we are blocked at Tranzila API auth. No new runtime code.

### Step 2 — Contact Tranzila support

Use the Hebrew message above. Required answers:

1. Are public/private API keys active for `POST /v2/sto/create` on `testcardstok`?
2. Exact HMAC formula:
   - HMAC key
   - HMAC message/data
   - field order
   - delimiter or no delimiter
   - hex/base64
3. Exact nonce format.
4. Is API username required? If yes, exact header/body field name.
5. Is terminal PW required? If yes, exact field/header.
6. Can `TranzilaTK` captured on `testcards` be used by `testcardstok` STO API?

### Step 3 — Update probe only after support answer

Bounded contour:

```text
Task: Update probe-tranzila-sto-create.mjs with provider-confirmed auth formula.
Scope: probe script only.
No runtime code.
No env changes unless exact new var is required.
```

Run one probe. Expected progression:

- If auth is fixed and token accepted: response should move from `401` to either success or a payload/body validation/token portability error.
- If `401` persists with confirmed formula: support/credential activation still wrong.

### Step 4 — Resolve U1 token portability

U1 = master gate:

```text
Can TranzilaTK captured via testcards clearing terminal be used to create STO under testcardstok token terminal?
```

Possible outcomes:

#### Outcome A — accepted

Proceed to STO create runtime architecture.

#### Outcome B — rejected due token terminal mismatch

Need redesign. Options may include:

- create recurring directly through DirectNG recur params on clearing terminal;
- token capture flow on terminal with MyBilling capability;
- separate tokenization/update-card flow;
- Tranzila-supported migration/association between terminals.

Do not guess; require provider proof.

#### Outcome C — body schema errors

Then update probe body only until STO create success payload is understood.

### Step 5 — Only after successful probe: design STO create implementation

Future Batch 1-main should include:

- new service function for STO create;
- persist STO id/reference, likely `User.tranzilaSTOId` or equivalent;
- clear idempotency strategy;
- no direct UI exposure of token;
- maybe one-time post-payment STO create hook after successful first payment;
- failure handling that does not break paid first-payment state;
- documentation/runbook.

But this is blocked until auth + token portability are resolved.

---

## 11. Future billing roadmap after STO auth is solved

### Batch 1 — STO create runtime

Possible files, not yet approved:

- `backend/src/services/payment/tranzila.provider.js` or a new STO service module.
- `backend/src/config/tranzila.js` if additional confirmed config needed.
- `backend/src/models/User.model.js` for `tranzilaSTOId`, maybe `tranzilaTokenExpiry`, `autoRenew`, etc.
- startup validation only when code actually requires STO vars.
- docs/runbook.

Rules:

- minimal change surface;
- no renewal notify yet;
- no YeshInvoice yet;
- no jobs yet;
- no frontend unless needed.

### Batch 2 — STO renewal notify

Must be separate.

Needs:

- `TRANZILA_STO_NOTIFY_URL`
- `CARDIGO_STO_NOTIFY_TOKEN`
- new Netlify function / route:

```text
/api/payments/sto-notify
```

- separate backend handler, not current first-payment `handleNotify`.
- trust model based on STO payload:
  - `sto_external_id`
  - `supplier`
  - `sum`
  - `currency: ILS`
  - `Response`
  - `index`
  - maybe `TranzilaTK`

Must not weaken first-payment notify handler.

### Batch 3 — YeshInvoice / receipts

Only after payment lifecycle is stable.

Needs:

- `YESHINVOICE_BASE_URL`
- `YESHINVOICE_SECRET_KEY`
- `YESHINVOICE_USER_KEY`
- `Receipt` model if using existing `PaymentTransaction.receiptId` ref.
- createDocument → persist → shareDocument strategy.
- customer email send policy.

### Batch 4 — Annual reminder / renewal reminder

Only after recurring schedule exists.

Transactional email, not marketing gated.

### Batch 5 — Paid expiry failsafe

Only after STO notify is implemented.

Job should downgrade to `past_due` / free only after careful grace logic. Existing `retentionPurge` may use `downgradedAt`, so be cautious.

---

## 12. Current test user / test state

Test user used in current flow:

```text
support@cardigo.co.il
```

Test card slug:

```text
/card/16g0yrgjcsy3
```

Do not include actual passwords/tokens.

Known successful state after payment:

- user plan monthly;
- subscription active;
- provider Tranzila;
- expiresAt set around one month after payment;
- `tranzilaToken` populated but redacted in docs;
- card billing active;
- paidUntil set;
- settings page shows billing/account data.

Current sandbox prices were temporarily lowered:

```text
monthly = ₪5.00
yearly = ₪50.00
```

These are temporary test prices. Before production, restore real prices and verify all trust gates / amount matching.

---

## 13. Important caution about prices

The notify trust gate uses `PRICES_AGOROT` from canonical plans config. Since test prices were changed to ₪5 / ₪50, `sumOk` passes only because runtime price matched config.

Before production:

- restore correct prices;
- verify pricing page copy;
- verify backend `PRICES_AGOROT`;
- verify amount trust gate;
- run one sandbox/prod-preflight with correct amount only when safe.

---

## 14. Known cleanup contours, not now

These are deferred and must not be mixed into STO auth:

1. Remove `[batch0-probe]` from `tranzila.provider.js` after billing flow no longer needs it.
2. Fix/align any stale docs such as billing SSoT naming drift.
3. Rename `TRANZILA_PW` to `TRANZILA_STO_PW` only if provider confirms it is STO-specific and runtime uses it.
4. Add terminal field to `PaymentTransaction` for audit/support, if needed, as separate schema contour.
5. Consider DirectNG POST/iframe integration later for better UX and less query exposure.
6. Add Handshake later if needed for amount locking. Do not enable Tranzila Handshake in portal before implementation; docs say once enabled, all transactions must include valid `thtk`.
7. Fix dead locked publish block if still relevant, separately.

---

## 15. Current status table

| Contour | Status | Notes |
|---|---:|---|
| Pricing CTA logged-in payment redirect | Closed | One-file frontend fix |
| DirectNG endpoint migration | Closed | Backend checkout URL fixed |
| Return bridge | Closed | Netlify function + `_redirects` |
| DirectNG notify trust adaptation | Closed | Fulfillment now works |
| Token capture / STRIP_KEYS | Closed | Token captured, not logged/audit persisted |
| Settings billing display | Verified | `/edit/card/settings` shows data |
| Future-link stale copy | Closed | No premium false note |
| Dual-terminal config prep | Closed | STO fields added/prepared |
| STO probe script | Built | Read-only diagnostic, no DB writes |
| MyBilling module activation | Reported done | Still `401` |
| STO API auth | Blocked | Needs Tranzila exact formula/activation confirmation |
| STO create runtime | Not started | Blocked by auth/U1 |
| STO renewal notify | Not started | Future separate route/handler |
| YeshInvoice | Not started | Future after billing lifecycle |
| Billing jobs | Not started | Future after recurring lifecycle |

---

## 16. Template for next Copilot prompt — Tranzila support answer received

Use only after Tranzila answers exact auth formula.

```text
Ты — Copilot Agent, acting as senior backend/payment integration engineer with strong security discipline and enterprise blast-radius control.
PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy unchanged, though this is backend/script-only

Context:
We are in the Cardigo Tranzila/MyBilling STO workstream.
First-payment DirectNG flow is closed and working.
Return bridge is closed.
DirectNG notify trust adaptation is closed.
User/Card billing activation works.
User.tranzilaToken is captured and stored safely.
Current blocker: probe to POST https://api.tranzila.com/v2/sto/create returns 401 for all prior variants.
Tranzila support has now provided the exact auth formula below:
[PASTE SUPPORT ANSWER HERE]

Task:
Phase 1 only — read-only audit.
Inspect backend/scripts/probe-tranzila-sto-create.mjs and relevant config only.
Compare current probe auth harness with provider-confirmed formula.
Provide PROOF file:line-range.
Do not edit files.
STOP after audit.

Scope:
- backend/scripts/probe-tranzila-sto-create.mjs
- backend/src/config/tranzila.js only if needed for config read
- no runtime app files
- no frontend
- no .env changes unless only naming is discussed, not edited

Output:
1. Exact mismatch between current probe and provider-confirmed formula.
2. Minimal Phase 2 plan to update probe only.
3. Verification commands.
4. Anti-regression policy.
STOP.
```

---

## 17. Template for Copilot prompt — if probe auth succeeds

Use only after a non-401 response.

```text
Ты — Copilot PLAN, acting as senior payment architecture engineer with enterprise risk discipline.
PROJECT MODE: Cardigo enterprise workflow.

We got a non-401 response from Tranzila STO create probe.
Raw response redacted:
[PASTE RAW STATUS/BODY, WITHOUT SECRETS]

Task:
Phase 1 read-only audit only.
Determine whether U1 is resolved:
- Does STO API accept TranzilaTK captured on testcards for testcardstok STO create?
- Is response success, validation error, token portability error, or body schema error?
- What is the minimal next bounded contour?

Do not edit files.
Do not implement runtime STO.
Provide PROOF from probe output and current code lines.
STOP.
```

---

## 18. Template for Copilot prompt — future STO runtime implementation

Use only after auth formula is confirmed and probe demonstrates successful STO create.

```text
Ты — Copilot Agent, acting as senior backend/payment lifecycle engineer with enterprise security discipline.
PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography policy unchanged

Context:
Cardigo first-payment DirectNG is closed.
STO create probe succeeded with provider-confirmed auth.
U1 token portability is resolved.
Now we need Phase 1 audit for minimal runtime STO create integration.

Task:
Phase 1 read-only audit only.
Find exact existing fulfillment point after successful first payment.
Find current User schema fields.
Find config validation surfaces.
Find PaymentTransaction ledger constraints.
Propose minimal implementation that creates STO only after successful paid first-payment and stores STO id/reference.

Out of scope:
- STO renewal notify
- YeshInvoice
- paid expiry jobs
- annual reminders
- frontend UX changes
- production rollout

Do not edit files.
Provide PROOF file:line-range.
STOP.
```

---

## 19. Enterprise mindset reminders

- “Working” is not enough. We need observable, auditable, safe, rollback-aware behavior.
- Payment systems require ledger-first, idempotency, redaction, and explicit trust boundaries.
- Do not rely on browser success redirect as proof of payment. Notify/ledger is truth.
- Do not trust provider docs blindly when runtime contradicts them; preserve evidence.
- Do not use live/prod payment terminal as a debugging sandbox unless there is a signed-off rollback/cancel/refund procedure.
- Every manual operator action must be described as “what / where / exact value / why / how to verify”.
- Keep Cardigo and Digitalyty separate.
- Keep first-payment and recurring renewal as separate bounded systems.

---

## 20. Immediate next action for the new chat

The next ChatGPT should do this:

1. Ask whether Tranzila support has answered the auth questions.
2. If yes, use the “support answer received” prompt template and create a Phase 1 audit prompt for Copilot.
3. If no, do not continue code. Help polish the support message or guide the user through Tranzila portal/API key verification.
4. Do not suggest live production testing as a shortcut.
5. Do not open `/edit/card/settings` issue again; it was verified after successful payment and should not be mixed into STO auth.

---

## 21. Final current verdict

The current workstream is in a strong enterprise state up to first payment:

```text
Pricing CTA → payment create → DirectNG checkout → payment success return bridge → notify → trust gate → ledger → user/card billing activation → settings display
```

This path is working.

The remaining hard blocker is specifically:

```text
STO/MyBilling API authentication to POST /v2/sto/create returns 401.
```

No runtime recurring billing implementation should be written until Tranzila confirms the exact authentication contract and the probe receives a non-401 response.

