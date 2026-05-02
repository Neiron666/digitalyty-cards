# Cardigo — Enterprise Project Handoff / Master Context

**Date:** 2026-05-02  
**Purpose:** передать следующему окну ChatGPT полный контекст проекта Cardigo, текущие архитектурные истины, закрытые контуры, рабочие правила, ограничения, доказанную billing/payment-реальность и ближайшие следующие шаги.  
**Audience:** ChatGPT в роли Senior Project Architect / Senior Full-Stack Engineer / Senior Backend Engineer / Senior Frontend Engineer / Payment Lifecycle Engineer / Security Engineer / Enterprise Consultant.

---

## 0. Как читать этот документ

Этот файл — не просто конспект. Это operational handoff и инструкция для следующего окна ChatGPT. Его нужно использовать как рабочий baseline перед любыми дальнейшими задачами по проекту Cardigo.

Главный принцип: **Copilot Agent — исполнитель, ChatGPT — архитектор и контролёр качества.** Любая задача должна идти через audit-first подход, минимальный blast radius, доказательства, проверку и документацию.

Если следующий ChatGPT не знает, что делать, он должен сначала прочитать этот файл, затем уточнить текущий bounded workstream, затем сформировать Phase 1 Read-Only Audit prompt для Copilot. Нельзя сразу давать Copilot реализацию без предварительного аудита.

---

## 1. Что такое Cardigo

**Cardigo** — Israel-first / Israel-only SaaS-платформа для цифровых визитных карточек и мини-страниц бизнеса.

Продукт включает:

- цифровую бизнес-карточку / мини-страницу бизнеса;
- публичный профиль по ссылке и QR;
- SEO / OG / JSON-LD / canonical surface;
- first-party analytics;
- self-service editor;
- лиды / contact surface;
- бесплатный / trial / premium lifecycle;
- booking/business operations foundation;
- organization/team surface;
- admin/operator tooling;
- AI-assisted content;
- payments / receipts / billing foundation;
- tracking/consent governance.

### Каноническая продуктовая истина

- **Canonical production domain:** `https://cardigo.co.il` non-www.
- **Product geography:** Israel-first / Israel-only.
- **UX baseline:** Hebrew/RTL-first.
- **Brand separation:** Cardigo и Digitalyty не смешивать.

Запрещено смешивать Cardigo и Digitalyty в:

- canonical URLs;
- SEO;
- public paths;
- OG/sitemap logic;
- structured data;
- product naming;
- user-facing copy;
- payment/receipt docs;
- analytics audiences;
- tracking contours;
- route logic.

---

## 2. Роль ChatGPT в проекте

ChatGPT должен действовать как:

- Senior Project Architect;
- Senior Backend Engineer;
- Senior Frontend Engineer;
- Senior Full-Stack Engineer;
- Payment Lifecycle Engineer;
- Security Engineer;
- Production Readiness Engineer;
- Enterprise Consultant;
- Technical Documentation Owner.

Это означает:

- защищать архитектурную правду, SSoT, контракты, invariants и runtime boundaries;
- думать о безопасности, maintainability, scalability, observability и production readiness;
- не принимать решения “на глаз”, а требовать proof;
- не давать Copilot широкие refactor-задачи без необходимости;
- не расширять scope “заодно”;
- контролировать, что изменения минимальны и регрессионно безопасны;
- после каждого meaningful change требовать gates/sanity/smoke + RAW output + EXIT;
- документировать значимые изменения.

---

## 3. Canonical workflow проекта

### Общий цикл работы

1. **Architecture / Intent** — формулируем цель, риски, границы, ожидаемое поведение.
2. **Phase 1 — Read-Only Audit** — Copilot только читает файлы, возвращает PROOF `file:line-range`, STOP.
3. **Phase 2 — Minimal Fix** — Copilot делает минимальное изменение, обычно 1–3 файла, без refactor/formatting, STOP.
4. **Phase 3 — Verification** — Copilot запускает gates/sanity/smoke, даёт RAW stdout + EXIT, STOP.
5. **Documentation / Handoff** — фиксируем изменённую truth в docs/runbooks/handoff.
6. **Rollout / Monitoring** — когда уместно, планируем deploy, smoke, rollback и monitoring.

### Строгое правило

Даже если где-то в старых заметках написано “2 phases”, это только shorthand. Канонически всегда:

```txt
Phase 1 — Read-Only Audit with PROOF -> STOP
Phase 2 — Minimal Fix -> STOP
Phase 3 — Verification with RAW stdout + EXIT -> STOP
```

Нельзя прыгать сразу к Phase 2 без принятого Phase 1 audit.

---

## 4. Hard constraints для каждого Copilot prompt

Каждый Copilot prompt по Cardigo должен начинаться с:

```txt
PROJECT MODE: Cardigo enterprise workflow.
```

И должен включать hard constraints:

```txt
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
```

Дополнительные правила:

- No scope creep.
- No “заодно поправил”.
- No refactor unless explicitly approved.
- No formatting churn outside targeted sections.
- No exact line-number editing instructions без предварительного proof anchors.
- Boundaries must be proven, not guessed.
- Use PowerShell + `curl.exe` for endpoint smoke/manual checks where relevant.
- Never leak secrets, raw tokens, card data, raw provider IDs.
- All payment/billing docs should prefer booleans: `tokenPresent=true`, `stoIdPresent=true`, `providerTxnIdPresent=true`, `thtkHashPresent=true`.

---

## 5. Frontend architecture policy

### Styling

- CSS Modules only.
- No inline styles.
- Flex only, no CSS Grid.
- Mobile-first mandatory.
- Token-based styling.
- Typography via `var(--fs-*)` only.
- `--fs-*` tokens must be rem-only.
- No px/em/%/vw/vh/clamp/fluid/calc(non-rem) for font-size.

### Card/render boundaries

Protected invariants:

- Shared render chain for public + preview is protected.
- Templates registry only in `frontend/src/templates/templates.config.js`.
- Skins are token-only.
- Preview-only styles only under `[data-preview="phone"]`.
- `CardLayout` DOM skeleton and `CardLayout.module.css` are high-blast-radius. Do not touch casually.
- Public/QR/OG URLs only from backend DTO fields `publicPath/ogPath`. Do not compute in frontend.

### Important frontend truth from recent work

`IframeReturnPage` top-level fallback is CLOSED/PASS:

- Previously Tranzila top-level redirect could stick on `/payment/iframe-return?status=success`.
- Now top-level fallback works:
  - `status=success` → `/edit/card/settings`;
  - `status=fail` → `/pricing?payment=fail`;
  - unknown status → `/pricing?payment=fail`.
- Full sandbox payment redirect after success was verified.

---

## 6. Backend / API / security baseline

### Backend stack

- Node.js + Express.
- MongoDB Atlas via Mongoose.
- Manual index governance:
  - `MONGOOSE_AUTO_INDEX=false`
  - `MONGOOSE_AUTO_CREATE=false`
- Indexes via explicit scripts/migrations only.

### Auth/runtime truth

- Browser auth is cookie-backed.
- Do not reintroduce localStorage-based auth.
- Do not casually reintroduce browser Authorization header auth.
- Cookie-auth / proxy / CSRF / CORS truth is hardened and should not be reopened without dedicated audit.

### Org security

- Anti-enumeration 404 required.
- Membership-gate before SEO/410 on org surfaces.

### Sitemap / DB governance

- Sitemap must avoid N+1.
- Backend index governance remains manual with drift checks/sanity.

---

## 7. Payment / Billing architecture overview

Payment/billing is currently one of the most sensitive and mature contours in Cardigo.

### Providers and services

- Tranzila DirectNG for hosted checkout.
- Tranzila MyBilling / STO for recurring billing.
- YeshInvoice for receipts.
- Netlify functions proxy notify/return paths.
- Render backend processes final trusted mutations.

### Critical separation

There are separate paths:

1. **First payment notify**
   - Route: `/api/payments/notify`
   - Uses `CARDIGO_NOTIFY_TOKEN`
   - Uses PaymentIntent gate
   - Uses Handshake V2 / thtk verification
   - Can create STO if `TRANZILA_STO_CREATE_ENABLED=true`
   - Can create YeshInvoice receipt

2. **STO recurring notify**
   - Route: `/api/payments/sto-notify`
   - Uses `CARDIGO_STO_NOTIFY_TOKEN`
   - Does **not** use PaymentIntent
   - Does **not** use Handshake V2
   - Does **not** use `paymentIntentId`
   - Uses `sto_external_id` / STO correlation
   - Creates recurring PaymentTransaction with `idempotencyNote="sto_recurring_notify"`
   - Extends user subscription and card billing
   - Creates recurring YeshInvoice receipt

This separation is now proven by real sandbox E2E.

---

## 8. Current payment env/runtime posture

Sandbox/prod-shaped test posture used in the completed contour:

```txt
PAYMENT_PROVIDER=tranzila
TRANZILA_TERMINAL=testcards
TRANZILA_STO_TERMINAL=testcardstok
PAYMENT_INTENT_ENABLED=true
TRANZILA_NOTIFY_DELIVERY_MODE=portal
TRANZILA_HANDSHAKE_ENABLED=true
YESH_INVOICE_ENABLED=true
```

Important:

- `TRANZILA_NOTIFY_DELIVERY_MODE=portal` prevents `notify_url_address` from being embedded in browser-visible checkout URL.
- `CARDIGO_NOTIFY_TOKEN` is a routing/origin guard, not payment-authenticity proof by itself.
- `CARDIGO_STO_NOTIFY_TOKEN` is separate from `CARDIGO_NOTIFY_TOKEN`.
- Raw token values must never be documented.

---

## 9. First-payment notify hardening — CLOSED / PASS

### Original issue

A P0 security issue was found:

- In embedded notify mode, `notify_url_address` could appear in the browser-visible checkout URL.
- If `CARDIGO_NOTIFY_TOKEN` leaked, a forged notify could potentially satisfy old DirectNG trust checks because DirectNG did not provide an outbound HMAC signature.

### Hardened solution

Closed with layered controls:

- `TRANZILA_NOTIFY_DELIVERY_MODE=portal` omits `notify_url_address` from checkout URL.
- Static notify URL configured in Tranzila portal.
- PaymentIntent strict atomic gate required.
- PaymentIntent lifecycle now includes `consuming`.
- `/notify` is fail-closed when `CARDIGO_NOTIFY_TOKEN` is missing.
- Startup anti-drift guards require:
  - `PAYMENT_INTENT_ENABLED=true`
  - `CARDIGO_NOTIFY_TOKEN`
  - `TRANZILA_NOTIFY_DELIVERY_MODE=portal`
  when `PAYMENT_PROVIDER=tranzila`.
- PaymentIntent indexes verified correct in `cardigo_prod`.

### Anti-drift note

Do not reintroduce `notify_url_address` into the checkout URL in portal mode.

---

## 10. Tranzila Handshake V2 — CLOSED / PASS

### Implemented truth

Handshake V2 is now implemented and sandbox-proven:

- `TRANZILA_HANDSHAKE_ENABLED=true`
- `TRANZILA_HANDSHAKE_API_URL=https://api.tranzila.com/v2/handshake/create`
- Uses existing `buildTranzilaApiAuthHeaders()`.
- Tranzila testcards portal Hand Shake is ON.
- Checkout URL contains `thtk`.
- `thtk` is hashed and stored as `PaymentIntent.handshakeThtkHash`.
- Plaintext `thtk` is not stored on PaymentIntent.
- Tranzila first-payment notify echoes `thtk`.
- `handleNotify` verifies `sha256(notify.thtk)` against `PaymentIntent.handshakeThtkHash`.
- `thtk` is stripped from `payloadAllowlisted`.

### Forgery tests passed

- Forged notify without `thtk` was blocked:
  - `PaymentTransaction.status=failed`
  - `failReason=handshake_thtk_missing`
  - User/Card not activated
- Forged notify with wrong `thtk` was blocked:
  - `PaymentTransaction.status=failed`
  - `failReason=handshake_thtk_mismatch`
  - User/Card not activated
- Real sandbox first payment with Handshake passed:
  - `PaymentTransaction.status=paid`
  - `PaymentIntent.status=completed`
  - `User.subscription.status=active`
  - `Card.billing.status=active`
  - YeshInvoice sandbox receipt created/sent

### No-secret rule

Never document raw `thtk`. Use `thtkHashPresent=true` / `handshakeThtkHashPresent=true`.

---

## 11. YeshInvoice receipt integration — current truth

YeshInvoice sandbox receipts are proven for:

- first payment;
- STO recurring notify.

Receipt behavior:

- Receipt creation/share happens after payment fulfillment.
- Receipt share is fire-and-forget.
- Receipt failure must not roll back subscription/card renewal.
- Duplicate receipt is guarded via idempotency/unique relations.

**Phase 2A/P3A closure (2026-05-02) — YeshInvoice shareDocument ReturnValue contract fix:**

`shareStatus="sent"` is set only when the provider response satisfies both `Success === true` AND `ReturnValue === true`. `Success: true` alone is not sufficient — for `shareDocument`, `ReturnValue` is a **boolean** (`true` = email dispatched), not an object. `createDocument` `ReturnValue` is an object `{ id, docNumber, pdfurl, url }` — do not conflate these two shapes.

Fixed failure paths (Phase 2A):
- `share_document_not_sent` — `Success: true` but `ReturnValue !== true` → `Receipt.shareStatus = "failed"`.
- `missing_provider_doc_id` — `providerDocId` absent before API call → `Receipt.shareStatus = "failed"`.
- `shareDocument` request body is `{ id, SendEmail, SendSMS }` only — undocumented `email` field removed.
- Operator log anchors (Render warn events): `receipt_share_failed` (any `ok: false` from share), `receipt_share_exception` (unexpected throw in share IIFE). Both contain only non-sensitive boolean presence fields.

Controlled smoke (2026-05-02, `neiron.player@gmail.com`): `PaymentTransaction.status=paid`, `Receipt` created, `Receipt.shareStatus=sent`, `Receipt.shareFailReason=null`, `recipientEmailMatchesTarget=true`, receipt email arrived automatically, STO created.

`support@cardigo.co.il` routing audit (2026-05-02): no code fallback or hardcode found in any payment/receipt/YeshInvoice path. The one `Receipt` row where `recipientSnapshot.email=support@cardigo.co.il` had `recipientSource=paymentIntent` — that user's own checkout snapshot email was `support@cardigo.co.il`. No bug.

Remaining deferred tails (out of scope for this contour):
- Sandbox STO schedule cleanup (`dannybestboy@gmail.com`, `testcardstok`) before production cutover — operator to cancel manually.
- Receipt retry job — separate future contour.
- YeshInvoice portal "email sent" indicator is not reliable as sole evidence for API `shareDocument`; `Receipt.shareStatus=sent` (after `ReturnValue: true` check) plus inbox arrival are the stronger proofs.

Canonical reference: `docs/runbooks/billing-flow-ssot.md §9` (updated), `docs/handoffs/current/Cardigo_Enterprise_Handoff_YeshInvoice_Receipt_Sandbox_Proof_2026-04-24.md §9` (addendum).

For latest STO recurring proof:

```txt
Receipt countForLatestStoTxn=1
Receipt.status=created
Receipt.shareStatus=sent
documentUniqueKeyPresent=true
paymentTransactionMatchesLatestStoTxn=true
Receipt email arrived
```

---

## 12. STO create sandbox E2E — CLOSED / PASS

STO create was proven via sandbox:

- First payment succeeded.
- STO created via Tranzila API.
- `User.tranzilaSto.status=created`.
- `stoIdPresent=true`.
- STO visible in Tranzila `testcardstok` UI.
- Terminal: `testcardstok`.
- Amount: ₪39.90.
- Frequency: monthly.
- Unlimited recurring.
- Card expiry captured as 06/30.
- YeshInvoice sandbox receipt created/sent.
- Receipt email arrived.
- `thtk` not persisted in `PaymentTransaction.payloadAllowlisted`.

Important: raw STO ID must not be documented. Use `stoIdPresent=true`.

---

## 13. STO fast-forward create — CLOSED / PASS

### Reason for fast-forward

Manual UI rescheduling in Tranzila was not accepted as final enterprise proof because prior manual UI date changes may not trigger webhook reliably. A controlled API-created STO schedule was needed.

### Operator script

Existing operator script was discovered and used:

```txt
backend/scripts/sto-create-custom-date.mjs
```

Script properties:

- dry-run by default;
- requires `--execute`;
- requires `--i-understand-sto-api-call`;
- does nothing automatically;
- not a runtime job / not cron / not worker;
- should not be deleted casually.

### Important charge_dom finding

A first attempt using `first-charge-date=2026-04-29` was not usable for next-day webhook proof:

```txt
תחילת החיובים = 29/04/2026
יום חיוב בחודש = 28
מועד החיוב הבא = 28/05/2026
```

Reason:

```txt
charge_dom = Math.min(Math.max(firstChargeDate.getUTCDate(), 1), 28)
```

Dates 29/30/31 are not valid fast-forward proof dates for next-day webhook. Use days 1–28.

### Final fast-forward candidate

Final correct candidate:

```txt
user=dannybestboy@gmail.com
first-charge-date=2026-05-01
terminal=testcardstok
amount=₪39.90
plan=monthly
```

Tranzila portal confirmed:

```txt
תחילת החיובים = 01/05/2026
מועד החיוב הבא = 01/05/2026
```

---

## 14. Real STO recurring notify E2E — CLOSED / PASS

### Final status

```txt
TRANZILA_STO_NOTIFY_SANDBOX_E2E_P0 = CLOSED / PASS
```

Real Tranzila MyBilling STO recurring charge scheduled for 01/05/2026 succeeded. Receipt email arrived. Tranzila schedule advanced to next charge date 01/06/2026. Final verification completed on 2026-05-02 with exit code:

```txt
STO_NOTIFY_FINAL_VERIFY_EXIT:0
```

### Verified User/Card state

```txt
Target user: dannybestboy@gmail.com
User.plan=monthly
User.subscription.status=active
User.subscription.provider=tranzila
User.subscription.expiresAt=2026-06-27T08:20:38.113Z
subscriptionExtendedBeyondFirstPayment=true
renewalFailedAt=null
User.tranzilaSto.status=created
stoIdPresent=true
stoLastErrorCode=null
stoLastErrorMessage=null
Card.billing.status=active
Card.billing.plan=monthly
Card.billing.paidUntil=2026-06-27T08:20:38.113Z
billingMatchesUserSubscription=true
```

### Verified STO recurring PaymentTransaction

```txt
count=1
latest.status=paid
latest.plan=monthly
latest.amountAgorot=3990
latest.currency=ILS
latest.failReason=null
latest.idempotencyNote=sto_recurring_notify
providerTxnIdPresent=true
providerTxnIdLooksSto=true
paymentIntentIdPresent=false
rawPayloadHashPresent=true
payloadAllowlistedForbiddenKeysPresent=[]
payloadHasStoExternalId=true
createdAt=2026-05-01T23:20:24.885Z
```

Critical confirmed invariants:

- `idempotencyNote=sto_recurring_notify`, not null.
- `paymentIntentIdPresent=false` because STO recurring path does not use PaymentIntent.
- `payloadAllowlistedForbiddenKeysPresent=[]` confirms sensitive payload fields were stripped.

### Verified Receipt

```txt
countForLatestStoTxn=1
latest.status=created
latest.shareStatus=sent
documentUniqueKeyPresent=true
paymentTransactionMatchesLatestStoTxn=true
createdAt=2026-05-01T23:20:25.361Z
Receipt email arrived
```

### Architecture proved by this E2E

The STO recurring notify path is independent from first-payment checkout:

- does not use PaymentIntent;
- does not use Handshake V2;
- does not have paymentIntentId;
- uses STO correlation and providerTxnId idempotency;
- creates its own recurring PaymentTransaction;
- creates and shares a receipt;
- extends User.subscription and Card.billing consistently.

STO recurring security model:

```txt
CARDIGO_STO_NOTIFY_TOKEN
+ Netlify/backend proxy secret
+ stoId user correlation
+ supplier/currency/amount checks
+ providerTxnId idempotency
```

---

## 15. Current documentation status — CLOSED / PASS

The following documentation contour was closed:

```txt
TRANZILA_STO_NOTIFY_SANDBOX_E2E_DOC_CLOSURE_P0 = CLOSED / PASS
```

Updated/created docs:

- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-28_Billing_Hardening_STO_Notify_Pending.md`
- `docs/runbooks/billing-flow-ssot.md`
- `docs/runbooks/tranzila-go-live-checklist.md`
- `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-05-02_STO_Notify_E2E_Closed.md`

Final tail verification passed:

```txt
429105: 0 matches
stoId (e.g.: 0 matches
current pending STO webhook test candidate: 0 matches
pending STO webhook test candidate: 0 matches
idempotencyNote=null: 0 matches
thtk=w: 0 matches
TranzilaTK=: 0 matches
providerTxnId=: 0 matches
providerDocId=: 0 matches
```

---

## 16. Current open operational tail

The only open operational tail from this payment contour:

```txt
Cleanup sandbox/test artifacts:
- cancel/deactivate dannybestboy@gmail.com STO before unintended future charge / before production cutover
- clean DB/test artifacts before production
- do not change PRICES_AGOROT while active sandbox STO schedules remain
```

The user explicitly said he will handle cleanup manually. This is not a blocker for documentation closure, but it is a production-readiness requirement.

Do not push production cutover while active sandbox schedules/test artifacts remain.

---

## 17. PRICES_AGOROT / price policy

Current code truth:

```txt
monthly=3990
yearly=39990
```

Meaning:

```txt
monthly = ₪39.90
yearly = ₪399.90
```

Policy:

- Do not change `PRICES_AGOROT` while active sandbox STO schedules exist.
- Changing price while active recurring schedules exist can cause `amount_mismatch` on recurring notify.
- Restore/adjust production prices only in a dedicated pre-production contour after all sandbox schedules/test artifacts are cancelled/deactivated/cleaned.

---

## 18. No-secret / no raw provider data policy

Forbidden in docs, chat handoffs, prompts, screenshots, and reports:

- raw `CARDIGO_NOTIFY_TOKEN`;
- raw `CARDIGO_STO_NOTIFY_TOKEN`;
- raw `thtk`;
- raw `snk` token;
- raw `stoId` numeric value;
- raw `TranzilaTK` / card token;
- raw PAN/card number/CVV;
- raw `TRANZILA_API_PRIVATE_KEY`;
- raw `YESH_INVOICE_SECRET`;
- raw HMAC / nonce / private auth values;
- raw providerTxnId / providerDocId where avoidable.

Allowed:

- env var names;
- placeholders like `?snk=<CARDIGO_STO_NOTIFY_TOKEN>`;
- boolean proof values:
  - `stoIdPresent=true`
  - `providerTxnIdPresent=true`
  - `providerTxnIdLooksSto=true`
  - `paymentIntentIdPresent=false`
  - `thtkHashPresent=true`
  - `payloadAllowlistedForbiddenKeysPresent=[]`

---

## 19. Operator scripts and cleanup

Relevant scripts:

```txt
backend/scripts/sto-create-custom-date.mjs
backend/scripts/sto-cancel.mjs
backend/scripts/sto-retry-failed.mjs
```

These are permanent operator tools. Do not delete casually.

### Cleanup recommendation

When user decides to clean sandbox artifacts:

1. Run `sto-cancel.mjs` dry-run first.
2. Then run execute mode with required acknowledgement.
3. Verify in Tranzila `testcardstok` portal that schedule is deactivated.
4. Clean DB/test artifacts manually before production cutover.

Do not ask Copilot to delete test data without a dedicated audit. Deleting users/cards/payment artifacts has fiscal/audit/security implications.

---

## 20. Existing future/next workstreams

### Immediate next bounded candidate

The completed billing proof is closed. Do not mix the next workstream into it.

Possible next bounded workstreams:

1. **Operator cleanup / sandbox STO cancellation**
   - User said he will handle manually.
   - If reopened, must start with audit.

2. **Production terminal cutover / G6**
   - Separate contour.
   - Requires production Tranzila terminals, production notify URLs, Handshake settings, STO notify URL, env parity, smoke plan, rollback plan.
   - Must not carry sandbox `testcards/testcardstok` into production.

3. **G7 production recurring lifecycle proof**
   - Separate contour after production cutover.
   - Must be carefully planned; may involve low-risk production transaction strategy.

4. **PRICES_AGOROT production readiness**
   - Separate pre-production contour.
   - Only after sandbox schedules/test artifacts are cleaned.

5. **Admin platform user deletion / billing lifecycle audit**
   - Large audit needed.
   - Key concern: deleting a user must cancel/detach provider-side STO and handle all owned data/fiscal retention properly.

6. **Auth/registration/token/error handling hardening**
   - Continue improving invalid-token and invalid-input paths.

7. **Monitoring / CI/CD / production readiness**
   - Sentry/cron monitoring, alerts, CI gates, smoke scripts.

8. **Security/performance/stress testing**
   - After production readiness baseline.

---

## 21. Admin delete / payment lifecycle future audit

Important future workstream already identified:

When platform admin deletes a user, local deletion must not proceed while active provider-side STO can continue charging.

Audit must cover:

- User;
- Card;
- images/storage;
- analytics;
- bookings/leads;
- PaymentIntent;
- PaymentTransaction;
- Receipt;
- Tranzila STO cancellation;
- recurring billing lifecycle;
- provider cancellation;
- audit/fiscal retention;
- DeletedEmailBlock / tombstones;
- admin audit write reliability.

This must start as a large Phase 1 read-only audit. No implementation before proof.

---

## 22. CI / index governance baseline

Important current truth:

- CI uses dedicated Atlas cluster for drift checks.
- `MONGO_URI_DRIFT_CHECK` is required for Mongo-touching CI workflows.
- Production `MONGO_URI` must not be used as fallback in CI.
- Manual migrations govern indexes.
- PaymentIntent indexes were verified correct.
- PaymentTransaction/Receipt indexes are important for idempotency.

Never assume indexes exist because schema declares them. For production readiness, verify via migrations/sanity/probe.

---

## 23. How to prompt Copilot — templates

### Phase 1 audit prompt skeleton

```txt
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect / Senior Backend Engineer / Senior Frontend Engineer / Security Engineer / Production Readiness Engineer.

Hard constraints:
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

SCOPE:
<CONTOUR_NAME>

PHASE 1 — READ-ONLY AUDIT ONLY.

Do not edit files.
Do not create files.
Do not run migrations.
Do not write DB.
Do not call providers.
Do not change env.
No git commands.

Goal:
<clear goal>

Audit tasks:
1. Inspect relevant files.
2. Provide PROOF file:line ranges.
3. Identify risks, invariants, blast radius.
4. Recommend minimal Phase 2 plan.
5. STOP after audit.
```

### Phase 2 implementation prompt skeleton

```txt
PROJECT MODE: Cardigo enterprise workflow.

PHASE 2 — MINIMAL FIX ONLY.

Allowed files:
- <file1>
- <file2>

Do not edit any other file.
No refactor.
No formatting churn.
No git commands.

Implement only the accepted Phase 1 plan.
After edit, report:
- files changed
- exact behavior change
- PROOF file:line ranges
- explicit non-actions
STOP.
```

### Phase 3 verification prompt skeleton

```txt
PROJECT MODE: Cardigo enterprise workflow.

PHASE 3 — VERIFICATION ONLY.

Do not edit files.
No git commands.

Run/read:
- syntax checks
- relevant sanity scripts
- targeted greps
- build if frontend
- endpoint smoke with PowerShell curl.exe if relevant

Return:
- raw stdout
- EXIT codes
- proof table
- PASS/FAIL
STOP.
```

---

## 24. Common stop conditions

Stop immediately if:

- Copilot tries to edit without audit.
- Copilot modifies files outside scope.
- Copilot runs git commands.
- Copilot prints secrets/tokens/provider IDs.
- Copilot changes CSS with grid/inline styles.
- Copilot introduces literal font-size values.
- Copilot changes CardLayout DOM skeleton without dedicated migration proof.
- Copilot changes payment/security trust gates without explicit audit.
- A test uses production terminal/provider unintentionally.
- Any DB mutation is proposed without operator confirmation.
- A docs update includes raw `stoId`, raw `thtk`, raw `TranzilaTK`, raw tokens, or raw card data.

---

## 25. Current closed status summary

```txt
First-payment notify hardening = CLOSED / PASS
Handshake V2 hardening = CLOSED / PASS
Iframe return fallback = CLOSED / PASS
STO create sandbox E2E = CLOSED / PASS
STO fast-forward create = CLOSED / PASS
Real STO recurring notify E2E = CLOSED / PASS
Billing docs / handoff closure = CLOSED / PASS
```

The billing/STO proof contour is complete.

---

## 26. Current open state summary

```txt
Open operational tail:
- sandbox/test artifact cleanup
- cancel/deactivate active sandbox STO schedule before unintended future charge / before production cutover
- user said he will handle cleanup manually
```

```txt
Open future contours:
- production terminal cutover / G6
- production recurring lifecycle proof / G7
- PRICES_AGOROT production readiness
- admin deletion/payment lifecycle audit
- broader production readiness / monitoring / CI/CD / security testing
```

---

## 27. Final instruction to next ChatGPT

Do not treat the project as a toy app. This is an enterprise SaaS with real payment, receipt, billing, privacy and data-retention implications.

Before giving any Copilot prompt:

1. Identify the bounded workstream.
2. Confirm it is not reopening a closed contour accidentally.
3. State architecture intent.
4. Use Phase 1 read-only audit first.
5. Require proof.
6. Require minimal fix.
7. Require verification.
8. Update docs/handoff if truth changed.

The correct default posture is conservative, proof-driven and security-first.

