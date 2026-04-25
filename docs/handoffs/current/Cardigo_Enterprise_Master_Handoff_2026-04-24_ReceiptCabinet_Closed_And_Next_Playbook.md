# Cardigo / Digitalyty Cards — Enterprise Master Handoff, Project Doctrine, Current Truth, and Next-Step Playbook
**Date:** 2026-04-24  
**Status:** Active project handoff for next ChatGPT window  
**Audience:** Next ChatGPT session acting as Senior Project Architect / Senior Full-Stack / Enterprise Consultant  
**Scope:** Product, architecture, doctrine, recent closed contours, current billing/receipts truth, and recommended next bounded steps  

---

## 1) Executive Summary

This project is **Cardigo** — an **Israel-first / Israel-only** SaaS for digital business cards, mini business pages, sharing, SEO, analytics, self-service editing, and an expanding operational/business layer. The canonical public domain is:

- **https://cardigo.co.il** (non-www)

**Digitalyty** is a separate brand/site and must **never** be mixed into Cardigo canonical paths, SEO, product logic, structured data, public naming, or analytics truth.

At this point, the project is no longer in vague prototype territory. It already contains substantial architecture, billing/runtime logic, Tranzila integration contours, YeshInvoice receipt generation/share contours, admin flows, legal/public pages, and multiple documented handoff layers.

### Current high-level status
The project is **not yet in production rollout mode**, but multiple critical foundations are already implemented and validated. In the most recent work:

- **YeshInvoice receipt generation** was implemented and sandbox-proven.
- **Receipt persistence** was implemented and verified.
- **First-payment receipt hook** in `handleNotify` was implemented and verified.
- **Recurring/STO receipt hook** in `handleStoNotify` was implemented and verified.
- **Receipt share/email orchestration** was implemented and verified.
- **Receipt cabinet feature in `/edit/card/settings`** was implemented end-to-end:
  - list endpoint,
  - secure backend proxy download endpoint,
  - frontend receipt history UI,
  - receipts accordion UX,
  - docs/closure handoff.

This means the **Receipt Cabinet** feature is now considered **fully closed** in MVP scope.

---

## 2) Project Identity and Product Truth

### Product identity
Cardigo is a SaaS platform centered around:

- digital business cards,
- mini business pages,
- public sharing,
- SEO/discoverability,
- self-service content editing,
- branding/theme/template system,
- analytics/tracking,
- business/payment/billing layers,
- future booking/operations contours.

### Market truth
Cardigo is intentionally:

- **Israel-first**
- **Israel-only baseline**
- Hebrew / RTL oriented by default
- tuned to local market realities

### Domain truth
- Canonical: **https://cardigo.co.il**
- Non-www canonical
- Cardigo and Digitalyty must never be mixed in public/canonical/SEO/product logic

---

## 3) Tech Stack and Core Architecture

### Frontend
- React + Vite
- RTL-first
- CSS Modules only
- Flex only, **no CSS Grid**
- Mobile-first
- typography tokens only: `var(--fs-*)`
- no inline styles
- no px/em/%/vw/vh/clamp/fluid for font sizes
- no calc(non-rem)
- token-based skins
- shared render chain for public + preview
- protected high-blast-radius areas around card layout and template render chain

### Backend
- Node.js + Express
- MongoDB + Mongoose
- DTO-driven public truth
- manual index governance
- org/auth/admin/billing/content/payment APIs
- cookie-auth / CSRF / CORS hardened direction
- no casual reintroduction of localStorage/browser Authorization-header auth

### Infra / integrations
- MongoDB Atlas
- Supabase Storage
- Mailjet
- Tranzila
- YeshInvoice
- Netlify / Render style hosting/runtime split
- Netlify proxy / function relay layer where applicable

---

## 4) Non-Negotiable Project Doctrine

This doctrine must be treated as active law in future chats.

### ChatGPT role
In this project, ChatGPT must operate as:

- **Senior Project Architect**
- **Senior Full-Stack Engineer**
- **Enterprise Consultant**

Responsibilities include:

- protecting SSoT and contracts,
- protecting invariants and boundaries,
- minimizing blast radius,
- security-first reasoning,
- maintainability/scalability decisions,
- architecture design,
- production readiness guidance,
- CI/CD/monitoring/release discipline guidance,
- documentation ownership and handoff clarity.

### Copilot role
Copilot Agent is **executor only**, not architect.

### Canonical work formula
**Architecture → Audit → Minimal Fix → Verification → Documentation**

### Strict execution phases
Every bounded implementation contour must follow:

1. **Phase 1 — Read-Only Audit with PROOF**
2. **Phase 2 — Minimal Fix**
3. **Phase 3 — Verification with RAW stdout + EXIT**
4. **Documentation / Handoff** only after meaningful change

### Hard constraints for every Copilot prompt
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography:
  - font-size only via `var(--fs-*)`
  - use only approved tokens
  - no invented tokens ad hoc
  - no leaking card-scope tokens into unrelated app/public/auth/admin contexts
  - `--fs-*` rem-only
  - no px/em/%/vw/vh/clamp/fluid
  - no calc(non-rem)

### Working rules
- No scope creep
- No “заодно поправил”
- No changes before audit
- Always require PROOF `file:line-range`
- Smoke/manual checks via PowerShell + `curl.exe`
- Never decide boundaries by intuition; prove them
- One bounded contour at a time
- Closed contours stay closed unless there is a hard reason to reopen them

---

## 5) Critical Invariants to Preserve

### Frontend / render / layout invariants
- SSoT render chain for public + preview
- templates registry only in `frontend/src/templates/templates.config.js`
- skins token-only
- preview-only styles only under `[data-preview="phone"]`
- CardLayout DOM skeleton is protected and must not be casually changed
- CardLayout-related CSS is high-blast-radius
- public/QR/OG URLs must come from backend DTO truth (`publicPath` / `ogPath`)

### Security / org invariants
- anti-enumeration 404 behavior where required
- membership-gate before SEO/410 decisions
- avoid leaking internal/provider identifiers unnecessarily
- backend autoIndex/autoCreate OFF
- indexes are manual / migration-governed
- rollout changes must be explicit and bounded

### Billing / payments invariants
- PaymentTransaction remains internal ledger truth
- user-facing receipt cabinet reads **Receipt**, not PaymentTransaction
- provider internal URLs must not be exposed directly if they contain token-like query params
- proxy download is the chosen safe pattern for receipts

---

## 6) Recent Major Closed Workstream: YeshInvoice + Tranzila + Receipt Lifecycle

This section is especially important because it changed the system materially.

### What was built
The following receipt lifecycle is implemented:

**Tranzila notify / sto-notify**  
→ `PaymentTransaction.create`  
→ user/card fulfillment  
→ `Receipt.create`  
→ fire-and-forget `shareReceiptYeshInvoice`  
→ `Receipt.shareStatus` update  
→ replay/idempotency handling  
→ public relay behavior verified

### What was proved in sandbox/runtime
The project achieved the following proof results:

- direct backend sandbox proof = PASS
- real Tranzila sandbox first payment = PASS
- Tranzila token capture = PASS
- STO create = PASS
- direct STO notify = PASS
- direct STO replay/idempotency = PASS
- YeshInvoice `Receipt.create` = PASS
- YeshInvoice share/email = PASS
- `Receipt.shareStatus` update = PASS
- public relay through `cardigo.co.il` = PASS after warm runtime

### Important caveat already discovered and explained
A failed public smoke attempt existed due to **Render cold start + Netlify 9s timeout**. It was classified as a **known infra caveat**, not as a business logic defect. A subsequent warmed retry passed.

### What this means
The billing/receipt runtime is no longer only theoretical. The project has:

- real payment path evidence,
- real receipt creation evidence,
- real receipt email/share evidence,
- real recurring/STO evidence,
- idempotency evidence,
- relay evidence.

---

## 7) Receipt Cabinet Feature — Final Current Truth

This feature is now **fully closed** in MVP scope.

### Backend
Implemented:

- `GET /api/account/receipts`
- `GET /api/account/receipts/:id/download`

### Security decision
The receipt `pdfUrl` from YeshInvoice contains a **query-string access key**. Therefore:

- **direct redirect was rejected**
- **backend proxy download was chosen**

This is a critical architectural decision and must be preserved.

### Cabinet source of truth
The user-facing cabinet reads **Receipt**, not PaymentTransaction.

### Frontend
In `/edit/card/settings`, inside **Section 3: תשלומים**, the product now has:

- a receipt history UI,
- inside a native accordion labelled **"קבלות"**,
- collapsed by default,
- showing up to **12 latest receipts**,
- with secure same-origin download action.

### Manual sanity already verified
Operator/user-level truth already confirmed:

- user with receipts: verified
- user without receipts: verified
- download works: verified
- accordion UX works: verified

### Current MVP limitations
These are conscious limitations, not hidden defects:

- no pagination / load-more UI
- failed/skipped receipts are not shown to users
- some negative security/manual cases may still remain undocumented as explicit manual runs
- formatter creation in JSX IIFE is acceptable for MVP and not a blocker

---

## 8) Broader Billing / Pre-Production Truth

The receipt cabinet is closed, but broader pre-production work still remains.

### Important truth
**Do not reopen receipt cabinet casually.**  
That feature is implemented, verified, and documented.

### Still-open broader areas
The next work is no longer “build receipts”; it is broader pre-production/rollout readiness.

Examples of broader open areas that may still matter outside this closed feature:

- production terminal cutover truth
- operator env verification on Render/Netlify
- sandbox/test STO cleanup/cancellation truth
- price/runtime/documentation divergence checks
- production recurring lifecycle proof
- broader operational runbooks
- possible receipt retry/recovery job policy
- final rollout sequencing

---

## 9) Tactics for Working in the Next Chat

This is one of the most important sections. The next chat must not work chaotically.

### Required operating style
The next chat must continue with:

- enterprise-level reasoning,
- narrow bounded contours,
- read-only audit first,
- minimal fix only after proven need,
- full verification after each meaningful change,
- documentation/handoff discipline.

### Do not do this
- do not jump straight into code
- do not widen scope “because nearby things look similar”
- do not reopen already-closed contours without hard proof
- do not mix frontend UX work with rollout work
- do not mix operator env actions with repo code changes unless explicitly necessary
- do not let Copilot improvise boundaries

### Do this instead
- start with a read-only audit of the exact next contour
- extract file:line proof
- define minimal file surface
- implement only that
- verify with raw outputs
- document only after closure

---

## 10) Recommended Immediate Next Macro Step

Now that the receipt cabinet feature is closed, the next meaningful macro step is:

### **Pre-Production Tails / Production Readiness Re-Audit**

But it must be done carefully and in bounded sub-contours.

### Recommended next sequence
1. Re-establish current truth from updated docs and closed contours
2. Audit remaining pre-production tails from the new baseline
3. Prioritize operator-truth gaps vs code gaps
4. Close one bounded readiness contour at a time
5. Only move toward rollout after those tails are closed

---

## 11) Suggested First Next Bounded Contours

These are examples of the kind of contours to open next, one by one, after a fresh audit.

### Possible next contours
- **PREPROD_TAILS_REAUDIT**
  - read-only
  - confirm what still blocks production
  - confirm what is already resolved

- **RENDER_NETLIFY_ENV_TRUTH_AUDIT**
  - operator/env truth
  - compare live env expectations to documented required env set

- **TRIAL / PRICING / BILLING CURRENT TRUTH RECONCILIATION**
  - re-check current pricing/runtime/doc truth after recent billing work

- **PRODUCTION_TERMINAL_CUTOVER_PLAN**
  - only after env and sandbox/test cleanup truth is clear

- **RECEIPT_RETRY_POLICY_DECISION**
  - only if current docs/workflows still leave receipt recovery as open policy

These are examples, not all to be opened at once.

---

## 12) How to Frame the Very Next Chat

The next chat should begin with something like this in spirit:

- restate project mode,
- restate hard constraints,
- ask for a read-only audit of the exact next bounded scope,
- insist on file:line proof,
- insist on no code before the audit is accepted.

### Desired ChatGPT role in next chat
ChatGPT must continue acting as:

- senior architect,
- enterprise consultant,
- narrow-scope guardian,
- verifier of truth,
- protector of invariants,
- documentation owner.

---

## 13) Safety / Governance Reminders

### Never expose in docs or chat
- raw `tranzilaToken`
- full `pdfUrl`
- full `documentUrl`
- provider secrets / API keys
- notify tokens
- password hashes or raw credentials

### Billing/receipt security truth
- provider/internal URLs are not user DTO fields
- wrong-owner resources should anti-enumerate
- internal provider identifiers are not cabinet truth
- security decisions (proxy over redirect) are already made and should not be casually revisited

---

## 14) What the Project Already Includes

This is a concise project inventory snapshot.

### Includes
- public/legal/accessibility pages
- auth flows
- dashboard/editor/settings
- card rendering system
- templates/skins system
- admin surfaces
- Tranzila billing lifecycle
- YeshInvoice receipt lifecycle
- receipt cabinet MVP
- sandbox/runtime proof handoffs
- operational/runbook/documentation backbone

### Still expected to include / continue strengthening
- broader production-readiness hardening
- monitoring/alerts discipline
- CI/CD completeness
- recovery/reconciliation policies where still open
- final production rollout evidence
- long-term maintainability docs
- operator runbooks for real incidents and lifecycle cases

---

## 15) Final Closure Statements for the Next Chat

Use these as current truth anchors:

```text
Receipt cabinet feature = CLOSED
YeshInvoice + Tranzila receipt lifecycle = IMPLEMENTED and SANDBOX-PROVEN
Production rollout = NOT STARTED by this feature closure
Do not reopen closed receipt cabinet contours unless hard evidence requires it
Next step = bounded pre-production tails audit from updated truth
```

---

## 16) Recommended Working Law for the Next Window

If the next chat needs a short working law, use this:

```text
PROJECT MODE: Cardigo enterprise workflow.

Act as Senior Project Architect / Senior Full-Stack Engineer / Enterprise Consultant.

Work only in bounded contours.
Always start with Phase 1 Read-Only Audit with PROOF.
Then Phase 2 Minimal Fix.
Then Phase 3 Verification with RAW stdout + EXIT.
Then Documentation if meaningful change occurred.

Hard constraints:
- No git commands
- No inline styles
- CSS Modules only
- Flex only — no grid
- Mobile-first mandatory
- Typography only via var(--fs-*), rem-only
- no px/em/%/vw/vh/clamp/fluid
- no calc(non-rem)

Protect:
- SSoT
- contracts
- invariants
- security
- minimal blast radius
- no scope creep
- no “заодно поправил”
```

---

## 17) Final Short Summary

Cardigo is an enterprise-minded digital business card / mini-site platform for the Israeli market with substantial frontend, backend, billing, and operational architecture already in place.

The recent major milestone was the successful closure of the **YeshInvoice + Tranzila receipt lifecycle** and the **receipt cabinet** feature in `/edit/card/settings`.

That feature is now:

- implemented,
- UX-polished for MVP,
- security-bounded,
- manually sanity-verified in core scenarios,
- and documented.

The next chat should **not** reopen that feature. It should use this updated truth as a stable baseline and move carefully into the next bounded **pre-production readiness** contour.
