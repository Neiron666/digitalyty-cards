# Cardigo Enterprise Project Handoff / Next Chat Master Brief

**Дата:** 2026-05-02  
**Назначение файла:** передать в новое окно ChatGPT полную картину проекта Cardigo, текущую архитектурную правду, правила работы, закрытые контуры, последние изменения и рекомендуемые следующие шаги.

---

## 1. Краткое описание проекта

**Cardigo** — Israel-first / Israel-only SaaS для цифровых визитных карточек и мини-страниц бизнеса.

Проект включает не просто “карточку”, а полноценную платформу вокруг бизнес-присутствия:

- цифровая визитная карточка;
- публичная мини-страница бизнеса;
- QR / share / public URL;
- SEO, OG, JSON-LD, sitemap;
- self-service editor;
- шаблоны / skins / preview;
- аналитика;
- лиды;
- booking foundation;
- free / trial / premium lifecycle;
- admin/operator tooling;
- Tranzila payments;
- Tranzila MyBilling STO recurring lifecycle;
- YeshInvoice receipts;
- receipt cabinet;
- billing support runbooks;
- privacy/security/compliance posture;
- будущая production readiness: monitoring, alerts, CI/CD, rollout discipline.

**Canonical domain:** `https://cardigo.co.il` non-www.

**Критически важно:** Cardigo и Digitalyty — разные бренды. Их нельзя смешивать в canonical URLs, SEO, structured data, OG, sitemap logic, user-facing copy, billing docs, receipt docs, analytics truth или product logic.

---

## 2. Роль ChatGPT в проекте

В новом чате ChatGPT должен работать не как обычный помощник по коду, а как:

- Senior Project Architect;
- Senior Full-Stack Engineer;
- Senior Backend Engineer;
- Senior Frontend Engineer;
- Senior Payment Lifecycle Engineer;
- Payment Security Engineer;
- Production Readiness Engineer;
- Enterprise Consultant;
- Technical Documentation Owner.

Основные обязанности:

1. Защищать архитектурную правду проекта.
2. Думать через SSoT, contracts, invariants, blast radius и production behavior.
3. Не предлагать быстрые хаки там, где нужна зрелая lifecycle-логика.
4. Не смешивать разные контуры.
5. Не давать Copilot выполнять изменения без предварительного аудита.
6. Не принимать отчёты без PROOF `file:line-range` и raw verification outputs.
7. После каждого meaningful change требовать gates / sanity / smoke / docs.
8. Вести проект к enterprise-grade production readiness.

Copilot / Agent в VS Code должен работать строго по поставленной задаче и фазе. Архитектурные решения, расширение scope, security/product boundaries должны быть утверждены до implementation.

---

## 3. Канонический рабочий процесс

Для всех будущих задач по Cardigo использовать строгий режим:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

Каждая новая задача должна идти по фазам:

```text
Architecture / Intent
→ Phase 1 — Read-Only Audit with PROOF file:line-range
→ STOP
→ Phase 2 — Minimal Fix / Implementation
→ STOP
→ Phase 3 — Verification with RAW stdout + EXIT
→ STOP
→ Documentation / Handoff
→ Rollout / Monitoring when relevant
```

Нельзя перескакивать через фазы.

### Обязательный шаблон исполнения

#### Phase 1 — Read-Only Audit

Только чтение:

- изучить релевантные файлы;
- построить flow map;
- доказать boundaries;
- найти точки риска;
- дать severity P0/P1/P2/P3;
- предложить варианты решения;
- ничего не менять;
- STOP.

#### Phase 2 — Minimal Fix

Только после принятого аудита:

- минимальный change set;
- обычно 1–3 файла, если это возможно;
- без refactor;
- без formatting churn;
- без “заодно поправил”;
- без изменения соседних контуров;
- без git-команд;
- STOP.

#### Phase 3 — Verification

Обязательно:

- syntax/build/gates;
- targeted greps;
- anti-drift checks;
- anti-regression proof;
- raw stdout;
- EXIT codes;
- file:line proof;
- behavior matrix;
- explicit non-actions;
- STOP.

#### Documentation / Handoff

После закрытого контура:

- обновить SSoT / runbook / handoff;
- проверить stale phrases;
- anti-secret scan;
- anti-overclaim scan;
- закрыть или зафиксировать tails.

---

## 4. Жёсткие правила для всех Copilot prompts

Каждый prompt для Copilot должен включать:

```text
PROJECT MODE: Cardigo enterprise workflow.
```

### Hard constraints

- No git commands.
- No inline styles.
- CSS Modules only.
- Flex only — no CSS Grid.
- Mobile-first mandatory.
- Typography policy:
  - `font-size` только через `var(--fs-*)`;
  - `--fs-*` только rem-based;
  - не использовать `px`, `em`, `%`, `vw`, `vh`, `clamp`, fluid typography;
  - не использовать `calc(non-rem)` для font-size.
- Не создавать ad hoc typography tokens.
- Не протаскивать card-scope tokens в app/public/auth/admin/site-shell контекст.
- Preview-only styles only under `[data-preview="phone"]`.
- Templates registry only in `frontend/src/templates/templates.config.js`.
- Skins token-only.
- Public / QR / OG URLs только из backend DTO `publicPath` / `ogPath`.
- Не трогать `CardLayout` DOM skeleton и `CardLayout.module.css` без отдельного approved contour.

### Tactical rules

- No scope creep.
- No “заодно поправил”.
- No broad refactor unless explicitly approved and proven safest.
- No formatting-only churn.
- No code changes before audit.
- Always require PROOF `file:line-range`.
- Always require RAW stdout + EXIT for verification.
- Use PowerShell + `curl.exe` for endpoint/manual smoke on Windows.
- Never decide boundaries by feel; prove contour/boundary first.
- Do not give Copilot exact edit line numbers as implementation instructions when discovery is required; require it to discover anchors and provide proof.
- Do not move to next task until current task, including all meaningful tails, is closed or explicitly deferred.

---

## 5. Frontend architecture rules

Frontend stack: React + Vite + CSS Modules.

### Styling law

- CSS Modules only.
- No inline styles.
- Flex only, no CSS Grid.
- Mobile-first.
- Use existing classes when possible.
- New CSS only if absolutely needed.
- Typography only via approved `var(--fs-*)` tokens.
- No raw px/em/%/vw/vh/clamp/fluid font-size.
- No card typography token leakage into app/admin/auth/public shell.

### UI / UX rules

- Destructive actions must not be casually exposed.
- Use modal confirmation for destructive flows.
- Use collapsible/danger visual hierarchy when action is sensitive.
- Disable + explain is better than disappearing/reappearing when user needs to understand why an action is unavailable.
- For billing/payment actions, UI must clearly state:
  - whether Premium remains active;
  - whether payment happens now;
  - whether receipt is issued;
  - whether auto-renewal will work afterward;
  - whether new checkout is needed later.

---

## 6. Backend architecture rules

Backend stack: Node.js + Express + MongoDB / Mongoose.

### MongoDB / index governance

- `MONGOOSE_AUTO_INDEX=false`
- `MONGOOSE_AUTO_CREATE=false`
- Indexes are manually governed.
- New indexes require migration/dry-run/apply discipline.
- Do not rely on runtime auto-index creation.

### Auth/security posture

- Browser runtime is cookie-backed.
- Do not reintroduce localStorage JWT truth.
- Do not reintroduce browser Authorization header as primary auth.
- Cookie-auth / CSRF / CORS / proxy hardening is treated as closed.
- Mutating endpoints must use authenticated user from cookie/session, not request body userId.
- Do not accept provider IDs, tokens, plan, amount, userId, stoId from browser unless the endpoint contract explicitly requires it and validates it.

### DTO discipline

- Backend DTO is SSoT for public / billing / auth-sensitive truths.
- Do not expose raw payment credentials.
- Do not expose raw provider tokens.
- Use booleans like:
  - `stoIdPresent`;
  - `tranzilaTokenPresent`;
  - `providerTxnIdPresent`;
  - `documentUniqueKeyPresent`;
  - `recipientEmailMatchesTarget`.
- Never document or log actual token / STO / provider transaction / provider document values.

---

## 7. Current production-shaped infrastructure truth

Current known infra/services:

- Frontend: Netlify.
- Backend: Render.
- DB: MongoDB Atlas.
- Storage: Supabase Storage.
- Email: Mailjet.
- Payments: Tranzila DirectNG + MyBilling STO.
- Receipts: YeshInvoice.
- Tracking: GTM / Meta Pixel.
- Canonical production domain: `https://cardigo.co.il`.

Current operational DB truth:

- Active DB: `cardigo_prod`.
- New clean production-shaped Mongo cluster was adopted.
- Old cluster retained as rollback/reference only.
- Manual index governance preserved locally and on Render.

---

## 8. Billing / Tranzila / YeshInvoice current truth

### 8.1 Payment flow

First payment path:

1. User starts checkout.
2. PaymentIntent snapshot may be created.
3. Tranzila DirectNG hosted payment executes.
4. Tranzila server-to-server notify is source of truth.
5. `handleNotify` validates notify.
6. PaymentTransaction is written first.
7. User subscription / plan is updated.
8. Card billing is updated.
9. Tranzila token is captured into `user.tranzilaToken`.
10. STO create is attempted best-effort after paid fulfillment.
11. YeshInvoice receipt is created and shared.
12. Payment success redirect is UX only, not entitlement truth.

### 8.2 Entitlement truth

Server-side Tranzila notify is the only payment entitlement truth.

Do not rely on:

- success redirect;
- iframe return;
- client query params;
- frontend claims.

### 8.3 STO lifecycle

STO create:

- uses saved `user.tranzilaToken`;
- sets `tranzilaSto.status="pending"` before provider call;
- success sets `status="created"`;
- failure sets `status="failed"`;
- first-payment fulfillment is not rolled back if STO create fails.

Cancel auto-renewal:

- calls Tranzila `/v2/sto/update status=inactive`;
- provider-first;
- sets `tranzilaSto.status="cancelled"`;
- does not change `subscription.expiresAt`;
- does not downgrade Premium;
- does not delete token;
- does not create PaymentTransaction / Receipt / YeshInvoice.

Resume auto-renewal:

- uses saved token;
- recreates STO;
- no payment;
- no receipt;
- no YeshInvoice;
- no checkout;
- blocked after `expiresAt`;
- blocked if token missing/expired;
- after token deletion, resume returns `token_missing`.

### 8.4 Receipt / YeshInvoice truth

Receipt is issued only on actual payment:

- first payment via `handleNotify`;
- recurring payment via `handleStoNotify`.

Receipt is **not** issued on:

- cancel renewal;
- resume auto-renewal;
- delete payment method;
- account delete;
- admin delete.

Current receipt state:

- Receipt creation and share are working in sandbox.
- `Receipt.paymentTransactionId` is populated.
- `PaymentTransaction.receiptId` write-back was implemented for new records.
- Historical records may remain without the backlink unless backfilled later.
- Receipt cabinet can list/download receipts using Receipt model directly.
- YeshInvoice `shareStatus="sent"` means provider API accepted share request; it does not guarantee inbox delivery.

---

## 9. Recently closed contours in this chat

### 9.1 Resume auto-renewal

Status: CLOSED / PASS.

Implemented behavior:

- frontend button `חדש חידוש אוטומטי`;
- backend endpoint `POST /api/account/resume-auto-renewal`;
- active + non-expired + Tranzila + monthly/yearly + cancelled STO + valid token;
- rate limit 2/24h;
- in-flight guard;
- no checkout;
- no new payment;
- no receipt;
- no YeshInvoice;
- subscription expiry unchanged;
- STO recreated for next charge date.

Manual smoke:

- Cancel auto-renewal works.
- Resume auto-renewal works.
- Tranzila schedule updates correctly.
- Rate-limit Hebrew message appears:
  - `בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.`

### 9.2 YeshInvoice missing email suspicion

Status: CLOSED as expected behavior / operator data issue.

Findings:

- Resume/cancel do not create receipt/email.
- Missing email during one test was caused by bad email entered in Tranzila UI / transaction details, not Cardigo routing bug.
- Mongo proof showed Receipt exists, `shareStatus="sent"`, `shareFailReason=null`, recipient email matched target.
- Later clean test confirmed receipt email arrived.

### 9.3 Receipt ledger backlink

Status: CLOSED for new records.

Problem:

- `Receipt.paymentTransactionId` existed.
- `PaymentTransaction.receiptId` was null for historical/new records.

Fix:

- Added best-effort write-back helper in `tranzila.provider.js`.
- After `Receipt.create()` succeeds, detached `void` write-back sets `PaymentTransaction.receiptId`.
- Does not block ACK, fulfillment, share, provider flow.
- No backfill yet.

Manual smoke:

- New payment showed `PaymentTransaction.receiptIdPresent=true`.
- Receipt backlink matched PaymentTransaction.

Future optional tail:

- Backfill historical records if needed.

### 9.4 Delete saved payment method

Status: CLOSED / PASS / manually smoke-verified.

Implemented behavior:

- `GET /api/account/me` returns safe `paymentMethod` DTO:
  - `saved`;
  - `expired`;
  - `canDelete`.
- `POST /api/account/delete-payment-method`:
  - requireAuth;
  - no request body;
  - 5/24h rate limit;
  - in-flight guard;
  - allowed only when STO status is `null`, absent, `cancelled`, or `failed`;
  - blocks `created`, `pending`, and unknown statuses fail-closed;
  - clears only:
    - `tranzilaToken = null`;
    - `tranzilaTokenMeta.expMonth = null`;
    - `tranzilaTokenMeta.expYear = null`;
  - does not touch subscription, Card.billing, renewalFailedAt, STO state, PaymentTransaction, Receipt, YeshInvoice, Mailjet;
  - idempotent if token already missing.

Frontend:

- Delete payment method UI added in SettingsPanel.
- Button moved into collapsible danger section:
  - `ניהול פרטי תשלום שמורים`;
  - button `מחק פרטי תשלום`.
- When auto-renewal is active, section remains visible but button disabled with explanation.
- After cancel, delete becomes enabled immediately without reload.
- After resume, delete becomes disabled immediately without reload.
- After delete, section disappears and success message remains visible.
- Resume button disappears after delete because `paymentMethod.saved=false`.

Manual smoke:

- Active STO: delete disabled.
- After cancel: delete enabled without reload.
- After resume: delete disabled without reload.
- Delete clears token and blocks resume via `token_missing`.
- Self-delete with active STO cancels STO in Tranzila provider-first before user deletion.

### 9.5 Docs for delete-payment-method + STO delete lifecycle

Status: CLOSED / PASS.

Updated/created:

- `billing-flow-ssot.md`
- `cardigo_billing_support_runbook.md`
- `Cardigo_Enterprise_Handoff_DeletePaymentMethod_2026-05-02.md`

Docs now state:

- raw PAN/CVV/card numbers are not stored;
- Cardigo stores provider-issued Tranzila token;
- user can delete local token self-service when STO not active/pending;
- provider-side token invalidation is not implemented/proven;
- replacement/update card is not implemented;
- active-premium checkout bypass is not supported;
- delete does not cancel STO, does not charge, does not create receipt.

---

## 10. Important distinction: delete vs replace/update payment method

This distinction is critical and must be preserved.

### Delete saved payment method

Implemented.

Meaning:

- remove Cardigo’s local saved Tranzila token;
- does not replace the card;
- does not create new token;
- does not update provider STO token;
- does not call Tranzila;
- does not charge user;
- disables resume until new payment/token exists.

### Replace/update payment method

Not implemented.

Requires provider capability confirmation:

1. Does Tranzila DirectNG support tokenization-only without charge?
2. Does Tranzila `/v2/sto/update` support replacing token/card on existing STO?
3. Does Tranzila provide provider-side token invalidation/deletion?
4. What are retry semantics for failed STO charge?
5. Can the same TranzilaTK be used across multiple active STO schedules?
6. Is zero-amount card verification supported and does it issue TranzilaTK?

Until these answers are confirmed, **do not implement active-premium card replacement**.

### Why ordinary checkout is unsafe for active Premium

Bypassing checkout guard for active Premium would cause:

- new PaymentTransaction;
- new Receipt / YeshInvoice;
- possible new STO;
- possible double charge;
- possible duplicate recurring schedule;
- accounting/refund complexity.

Therefore active Premium checkout bypass is forbidden until a dedicated update-card architecture is designed.

---

## 11. Account deletion / admin deletion truth

### Self-delete user

Current behavior:

1. User confirms deletion.
2. Backend validates password / confirmation.
3. If active STO exists, backend calls `cancelTranzilaStoForUser(source:"self_delete")`.
4. If provider cancellation fails and is not skipped, deletion is blocked.
5. After provider-side STO cancellation, cascade cleanup runs.
6. User document is deleted.
7. `tranzilaToken` disappears with User doc.
8. PaymentTransaction and Receipt are retained.

Manual smoke confirmed: self-delete cancelled active STO in Tranzila.

### Admin delete user

Expected/current policy:

1. Admin deletion must cancel STO provider-first.
2. If STO cancellation fails, deletion is blocked.
3. User document deletion removes token.
4. Fiscal records remain.

### Admin revoke subscription

Current known behavior:

- cancels STO provider-first;
- sets plan/subscription inactive/free/admin;
- currently token retention needs separate contour review.

Future recommended contour:

```text
ADMIN_REVOKE_TOKEN_CLEAR_P1
```

Audit whether admin revoke should also clear `tranzilaToken` because after revoke:

- subscription inactive;
- STO cancelled;
- resume not meaningful;
- token may become stranded data.

---

## 12. Current docs truth

The main current docs/runbooks to respect:

- `billing-flow-ssot.md` — Tier 2 billing architecture / SSoT.
- `cardigo_billing_support_runbook.md` — operator/support billing behavior.
- `POLICY_ADMIN_DELETE_LIFECYCLE_V1.md` — delete lifecycle.
- `docs/runbooks/admin-user-delete-lifecycle.md`.
- Current handoff docs in `docs/handoffs/current/`.

Rules:

- Do not edit historical/archive handoffs casually.
- For a new closed contour, create a new handoff.
- SSoT docs should reflect current truth, not aspirational behavior.
- Docs must not contain raw token/STO/provider transaction/provider document IDs.
- Use booleans and redacted proof only.

---

## 13. Known closed truths that should not be casually reopened

Do not reopen without strong reason:

- cookie-auth / proxy / CSRF / CORS hardening;
- localStorage JWT removal;
- public/preview shared render chain;
- legal/info/a11y family;
- premium public pages family;
- booking public UX hardening;
- site analytics source truth + visits/uniques;
- org entitlement baseline;
- receipt cabinet MVP;
- resume auto-renewal;
- delete payment method;
- self-delete provider-first STO cancellation.

---

## 14. Known open / deferred tails

### 14.1 Update / replace payment method

Status: deferred.

Do not implement until Tranzila capability is confirmed.

Next action:

```text
UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1
```

Read-only audit + provider questions first.

### 14.2 Admin revoke token cleanup

Status: open.

Next action:

```text
ADMIN_REVOKE_TOKEN_CLEAR_P1
```

Audit only first:

- current admin revoke flow;
- token retention after revoke;
- support/privacy implications;
- whether clearing token is safe and correct;
- whether docs need update.

### 14.3 Auto-clear expired/stale tokens

Status: deferred.

Possible contour:

```text
AUTO_CLEAR_EXPIRED_TOKEN_BILLING_RECONCILE_P1
```

Need audit before implementation:

- only clear when subscription expired and STO not active;
- never clear if STO `created/pending`;
- preserve fiscal records;
- ensure no race with STO notify.

### 14.4 Provider-side token invalidation

Status: unknown.

Need Tranzila answer:

- Is there API to invalidate TranzilaTK?
- If no, local deletion is still valid for Cardigo-local storage obligations.

### 14.5 Historical PaymentTransaction receiptId backfill

Status: optional/deferred.

New records have backlink. Historical records may not.

Potential contour:

```text
RECEIPT_LEDGER_BACKLINK_BACKFILL_P1
```

Would require dry-run/apply migration with strict idempotency.

### 14.6 Production rollout / billing go-live gates

Production rollout still must be treated separately.

Known gates include:

- legal/payment policy alignment;
- G6/G7 production terminal readiness;
- monitoring/alerts;
- support runbooks;
- Tranzila production terminal configuration;
- YeshInvoice production configuration;
- sandbox artifacts cleanup;
- active sandbox STO cleanup before cutover;
- production smoke.

---

## 15. Recommended next steps in order

### Step 1 — Close current handoff transition

Use this file in the new chat as baseline. Do not restart old questions unless new proof contradicts them.

### Step 2 — Decide next contour

Recommended next contours, in order:

1. `ADMIN_REVOKE_TOKEN_CLEAR_P1`
2. `UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1`
3. `AUTO_CLEAR_EXPIRED_TOKEN_BILLING_RECONCILE_P1`
4. `RECEIPT_LEDGER_BACKLINK_BACKFILL_P1`
5. `BILLING_PRODUCTION_ROLLOUT_READINESS_P1`

### Step 3 — For each contour use strict phase split

For example:

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect, Senior Backend/Payment Lifecycle Engineer, Payment Security Engineer, and Production Readiness Engineer.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography via var(--fs-*), rem-only
- No scope creep
- No implementation before audit
- Always provide PROOF file:line-range
- STOP after Phase 1

Task:
Phase 1 — Read-Only Audit only.

Scope:
[describe exact contour]

Goals:
1. Map current flow.
2. Identify source-of-truth files.
3. Prove boundaries with file:line ranges.
4. Classify risks P0/P1/P2/P3.
5. Propose options with pros/cons.
6. Recommend enterprise-safe plan.
7. Explicitly list non-actions.

Do not edit files.
Do not run provider calls.
Do not write DB.
Do not change env.
Do not use git.
STOP after audit.
```

---

## 16. Recommended prompt style for future Copilot tasks

### Audit prompt template

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect, Senior Backend Engineer, Senior Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, and Production Readiness Engineer.

Hard constraints:
- No git commands.
- No inline styles.
- CSS Modules only.
- Flex only — no grid.
- Mobile-first mandatory.
- Typography via var(--fs-*), rem-only.
- No scope creep.
- No code/file changes in Phase 1.
- Always provide PROOF file:line-range.
- STOP after Phase 1.

CONTOUR:
[NAME]

PHASE 1 — READ-ONLY AUDIT ONLY.

Goal:
[exact goal]

Required audit sections:
A) Executive summary
B) Flow map
C) Source-of-truth files
D) Current behavior with PROOF
E) Risk classification P0/P1/P2/P3
F) Options table
G) Recommended enterprise plan
H) Minimal change surface
I) Anti-drift / anti-regression policy
J) Verification plan
K) Open questions
L) Explicit non-actions
M) STOP

Do not edit files.
Do not create files.
Do not call provider APIs.
Do not write DB.
Do not run migrations.
Do not use git.
```

### Implementation prompt template

```text
PROJECT MODE: Cardigo enterprise workflow.

Phase 2 — Minimal Fix only.

Use the accepted Phase 1 audit as source of truth.

Hard constraints:
- No git commands.
- No inline styles.
- CSS Modules only.
- Flex only — no grid.
- Mobile-first mandatory.
- Typography via var(--fs-*), rem-only.
- Minimal files only.
- No unrelated changes.
- No formatting churn.
- No scope creep.
- Preserve existing contracts unless explicitly approved.
- Provide PROOF file:line-range for every changed behavior.
- STOP after implementation report.

Implement only:
[exact changes]

Do not touch:
[explicit out-of-scope files/areas]

After changes, provide:
1. Files changed.
2. Exact behavior change.
3. PROOF file:line-range.
4. Explicit non-actions.
5. Any compile/import concerns.
6. STOP.
```

### Verification prompt template

```text
PROJECT MODE: Cardigo enterprise workflow.

Phase 3 — Verification only.

No file edits.
No DB writes.
No provider calls.
No env changes.
No migrations.
No git commands.

Run required gates:
[list exact commands]

Run anti-drift greps:
[list exact searches]

Verify:
1. Syntax/build/import sanity.
2. Security invariants.
3. DTO safety.
4. No raw secrets/tokens.
5. No provider side effects unless intended.
6. Behavior matrix.
7. Scope non-change proof.
8. RAW stdout + EXIT codes.
9. Final PASS/FAIL verdict.
10. STOP.
```

---

## 17. Anti-secret / anti-overclaim policy

Never place in docs, prompts, reports, or final answers:

- raw TranzilaTK / `tranzilaToken`;
- raw STO ID;
- raw provider transaction ID;
- raw provider document ID;
- raw documentUniqueKey;
- raw card number / PAN / CVV;
- raw HMAC values;
- raw request signatures;
- raw env secret values;
- production terminal secrets;
- raw provider payloads with sensitive content.

Allowed:

- env var names;
- placeholder forms like `<CARDIGO_STO_NOTIFY_TOKEN>`;
- booleans like `stoIdPresent=true`;
- `recipientEmailMatchesTarget=true`;
- `receiptIdPresent=true`;
- `shareStatus="sent"`;
- redacted operational proof.

Avoid overclaims:

- Do not say production rollout complete unless production rollout was actually done and verified.
- Do not say update-card is implemented.
- Do not say provider-side token invalidation is implemented.
- Do not say delete-payment-method cancels STO.
- Do not say resume creates payment/receipt.
- Do not say YeshInvoice email confirms inbox delivery.
- Do not claim legal/tax compliance beyond what has been confirmed by counsel/accountant.

---

## 18. Manual/operator actions style

When user must do something manually, explain:

1. What to open.
2. Where to click.
3. What to copy/paste.
4. What command to run.
5. What output is expected.
6. What output means fail.
7. What NOT to touch.

For Windows/PowerShell:

- use `curl.exe`, not ambiguous `curl`;
- avoid relying on aliases;
- prefer clear command blocks;
- never include secrets in copied output;
- ask user to redact if needed.

For MongoDB/mongosh:

- use read-only queries first;
- avoid update/delete unless explicitly in apply phase;
- for sensitive fields, project booleans, not raw values.

Example style:

```javascript
printjson({
  userFound: Boolean(user),
  userId: user?._id ? String(user._id) : null,
  stoIdPresent: Boolean(user?.tranzilaSto?.stoId),
  tranzilaTokenPresent: Boolean(user?.tranzilaToken),
  receiptIdPresent: Boolean(txn?.receiptId),
});
```

---

## 19. Production readiness philosophy

Cardigo should not be treated as “just a small app”. It is a billing/payment/subscription/receipt platform. Production readiness requires:

- secure auth;
- strict billing contracts;
- provider idempotency;
- auditability;
- manual recovery paths;
- operator runbooks;
- monitoring;
- alerting;
- legal/policy alignment;
- fiscal record retention;
- rollback strategy;
- smoke tests;
- staged rollout.

Before production billing launch:

1. Confirm Tranzila production terminal.
2. Confirm YeshInvoice production mode.
3. Clean/cancel sandbox STO artifacts.
4. Confirm pricing constants.
5. Confirm notify URLs.
6. Confirm receipt behavior.
7. Confirm support runbooks.
8. Confirm monitoring alerts.
9. Confirm privacy/payment policy copy.
10. Run production smoke with controlled internal user.
11. Keep rollback plan.

---

## 20. Final project status snapshot

### Strongly working / verified

- New production-shaped DB cluster.
- Admin bootstrap and login.
- Email verification flow.
- Card creation.
- Media upload.
- AI generation.
- Business hours.
- Booking requests.
- Public card.
- Payment first flow.
- STO create/cancel/resume.
- Receipt creation/share/cabinet.
- Delete saved payment method.
- Self-delete cancels STO before user deletion.
- Billing docs/runbooks for current contours.

### Do not assume fully production-complete

- Update/replace payment method.
- Provider-side token invalidation.
- Admin revoke token cleanup.
- Auto-clear stale tokens.
- Billing production rollout.
- Legal/tax final approval.
- Monitoring/alerts baseline.
- Load/security testing.

---

## 21. One-line operational summary for the next chat

Cardigo is now a serious Israel-first billing-enabled SaaS with Tranzila recurring lifecycle, YeshInvoice receipts, self-service cancel/resume/delete-payment-method flows, strict DTO/token safety, and documented enterprise workflow; the next chat must continue with audit-first, bounded contours, no scope creep, no inline styles, CSS Modules/Flex/mobile-first only, and production-readiness thinking.

---

## 22. Suggested first message in the new chat

Copy this into the next chat if continuing immediately:

```text
PROJECT MODE: Cardigo enterprise workflow.

Use the uploaded handoff file as current project truth.

Act as Senior Project Architect, Senior Backend/Frontend Engineer, Payment Lifecycle Engineer, Payment Security Engineer, Production Readiness Engineer, and Technical Documentation Owner.

Continue from the latest closed contours:
- resume auto-renewal closed;
- receipt ledger backlink for new records closed;
- self-service delete saved payment method closed;
- docs for delete-payment-method and STO delete lifecycle closed;
- self-delete with active STO manually verified provider-first.

Next I want to start one bounded contour only:
[choose one: ADMIN_REVOKE_TOKEN_CLEAR_P1 / UPDATE_PAYMENT_METHOD_ARCHITECTURE_P1 / AUTO_CLEAR_EXPIRED_TOKEN_BILLING_RECONCILE_P1 / BILLING_PRODUCTION_ROLLOUT_READINESS_P1]

Start with Phase 1 — Read-Only Audit only.
No code changes.
No file edits.
No DB writes.
No provider calls.
No git commands.
Provide PROOF file:line-range and STOP after the audit.
```
