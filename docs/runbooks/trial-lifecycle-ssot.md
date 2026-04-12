# Trial Lifecycle SSoT

**Scope:** End-to-end reference for the Cardigo premium trial feature - eligibility, activation, billing resolution, frontend UX, expiry, reconciliation, retention, and purge.

**Status:** Active.

---

## 1) Overview

Cardigo offers a time-bounded premium trial to eligible registered users. During the trial, the user's cards receive `effectiveBilling.source === "trial-premium"` with `isPaid: true` and `plan: "monthly"`, granting premium entitlements for the trial duration.

---

## 2) Eligibility

**SSoT:** `backend/src/config/trial.js` → `isUserTrialEligible(user)`

A user is eligible when **all** conditions hold:

1. `TRIAL_ROLLOUT_DATE` env var is configured (non-null).
2. `user.createdAt >= TRIAL_ROLLOUT_DATE` (signed up after rollout).
3. `user.trialActivatedAt` is null (never activated a trial before).
4. `user.trialEligibilityClosedAt` is null (eligibility not manually closed).

---

## 3) Activation

Trial activates through one of two canonical paths:

1. **First card creation** - eligible user creates their first personal card (`card.controller.js` → `createCard`).
2. **Anonymous card claim** - eligible user registers and claims an anonymous card as their first legitimate card acquisition (`claimCard.service.js` → `claimAnonymousCardForUser`).

Both paths mirror the same canonical activation truth. The following fields are set:

**User-side:**

- `user.trialActivatedAt` - current timestamp.
- `user.trialEndsAt` - `now + TRIAL_DURATION_DAYS` days.

**Card-side:**

- `card.trialStartedAt` - current timestamp.
- `card.trialEndsAt` - `now + TRIAL_DURATION_DAYS` days.
- `card.billing.status` - `"trial"`.
- `card.billing.plan` - `"monthly"`.
- `card.billing.paidUntil` - `null`.

After successful activation, `user.trialEligibilityClosedAt` is set to close eligibility permanently (anti-abuse law).

**Duration:** `TRIAL_DURATION_DAYS` (default: **10 days**), configurable via env var.

---

## 4) Billing Resolution - trial-premium Source

**SSoT:** `backend/src/utils/trial.js` → `resolveBilling()`

The `trial-premium` source is selected when:

- Card is user-owned (`card.user` exists).
- `card.billing.status === "trial"`.
- `card.trialEndsAt > now` (trial is still active).

**DTO shape returned:**

```json
{
    "source": "trial-premium",
    "isPaid": true,
    "plan": "monthly",
    "until": "<ISO 8601 trialEndsAt>"
}
```

This sits at **precedence 4** in the full billing resolution chain (see `docs/runbooks/billing-flow-ssot.md` §7):

1. `adminOverride` → 2. `billing` (paid) → 3. anonymous → free → **4. trial-premium** → 5. user fallback → free → 6. trial (anon) → 7. legacy → 8. none

---

## 5) Entitlements During Trial

Trial-premium users receive the same feature gates as `monthly` plan:

- `publish: true`, `seo: true`, `analytics: true`, `slugChange: true`, etc.
- `gallery: true`, `galleryLimit: 10`
- `templates: "all"`

**AI access:** Trial-premium maps to the **free AI profile** (10 generations/month). SEO AI is gated: `billingSource !== "trial-premium"`.

---

## 6) Frontend UX - Editor Sidebar

**SSoT files:**

- `frontend/src/components/editor/Editor.jsx` (passes `billingSource`, `billingUntil` props)
- `frontend/src/components/editor/EditorSidebar.jsx` (renders trial card)
- `frontend/src/components/editor/EditorSidebar.module.css` (trial card styles)

### Plan badge

When `billingSource === "trial-premium"`:

- Badge label: **"פרמיום ניסיון"** (instead of "פרמיום").

### Trial countdown card

Visible when `isTrial && trialDaysLeft != null`:

| Days left | Copy                            |
| --------- | ------------------------------- |
| > 1       | נותרו עוד X ימים לניסיון פרמיום |
| = 1       | נותר עוד יום לניסיון פרמיום     |
| < 1       | נותר פחות מיום לניסיון פרמיום   |

CTA: `<a href="/pricing">עבור למסלולים</a>`

**Computation:** `computeTrialDaysLeft(billingUntil)` - `Math.ceil((trialEndsAt - now) / DAY_MS)`, null-safe, NaN-safe.

---

## 7) Trial Expiry

When `trialEndsAt <= now`:

- `resolveBilling()` skips the `trial-premium` branch.
- Card falls back to `source: "free"` (user-owned fallback).
- All premium feature gates are revoked.
- Frontend countdown disappears (trialDaysLeft becomes ≤ 0 or null).

---

## 8) Reconciliation Job

**Purpose:** Detects expired trials and ensures billing status transitions are applied.

| Env var                                 | Default    | Purpose                       |
| --------------------------------------- | ---------- | ----------------------------- |
| `TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS` | `21600000` | Job interval (6 hours)        |
| `TRIAL_LIFECYCLE_HEARTBEAT_MS`          | `43200000` | Heartbeat log interval (12 h) |

---

## 9) Retention Grace & Purge

After trial expiry, cards enter a retention grace period before purge eligibility.

| Env var                        | Default    | Purpose                       |
| ------------------------------ | ---------- | ----------------------------- |
| `RETENTION_GRACE_DAYS`         | `90`       | Days before purge eligibility |
| `RETENTION_PURGE_INTERVAL_MS`  | `21600000` | Purge job interval (6 hours)  |
| `RETENTION_PURGE_HEARTBEAT_MS` | `43200000` | Purge heartbeat log interval  |

### Retention purge scope

The retention purge job removes all premium-only surplus data, including:

- Extra paragraphs beyond free truth
- Services, videoUrl, businessHours, bookingSettings (card-side)
- Premium contact fields
- **Gallery: full removal** - gallery is premium-only on free; retention purge removes **all** gallery items (not a partial trim)
- Uploads ledger cleanup for purged gallery paths
- Best-effort Supabase storage cleanup for removable gallery objects

Storage-first ordering: if storage deletion fails, DB purge is skipped for that card (retry on next run). `retentionPurgedAt` is stamped only after successful completion.

---

## 10) Environment Variables (complete)

| Variable                                | Required | Default    | Purpose                         |
| --------------------------------------- | -------- | ---------- | ------------------------------- |
| `TRIAL_ROLLOUT_DATE`                    | Yes      | -          | ISO 8601 cutoff for eligibility |
| `TRIAL_DURATION_DAYS`                   | No       | `10`       | Trial length in days            |
| `TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS` | No       | `21600000` | Reconcile job interval          |
| `TRIAL_LIFECYCLE_HEARTBEAT_MS`          | No       | `43200000` | Reconcile heartbeat interval    |
| `RETENTION_GRACE_DAYS`                  | No       | `90`       | Grace period before purge       |
| `RETENTION_PURGE_INTERVAL_MS`           | No       | `21600000` | Purge job interval              |
| `RETENTION_PURGE_HEARTBEAT_MS`          | No       | `43200000` | Purge heartbeat interval        |

---

## 11) Smoke Checklist - CONFIRMED (2026-04-06)

Final Controlled Smoke Under Gate passed. All scenarios confirmed:

- [x] `TRIAL_ROLLOUT_DATE` is set in `.env` / Render.
- [x] New user created after rollout date → `isUserTrialEligible` returns `true`.
- [x] After trial activation → `effectiveBilling.source === "trial-premium"`, `isPaid: true`.
- [x] Editor sidebar shows "פרמיום ניסיון" badge + countdown.
- [x] After `TRIAL_DURATION_DAYS` → card falls back to free; countdown disappears.
- [x] AI quota respects free profile (10/mo) during trial.
- [x] SEO AI is gated for trial-premium users.
- [x] Claim-path trial activation (anonymous → register → claim → trial) confirmed.
- [x] Create-path trial activation (new user → first card → trial) confirmed.
- [x] Free fallback: public free truth confirmed (no premium paywall on public surfaces).
- [x] Retention purge: full gallery removal + premium data purge confirmed.

---

## 12) Cross-References

- Billing resolution chain: `docs/runbooks/billing-flow-ssot.md` §7
- AI quota tiers: `docs/ai-about-workstream.md` §5.1
- Plans / feature matrix: `backend/src/config/plans.js`
- Trial config: `backend/src/config/trial.js`
- Billing resolver: `backend/src/utils/trial.js` → `resolveBilling()`
- Backend env vars: `backend/README.md` → Trial & Retention Lifecycle
- Anon card cleanup: `docs/runbooks/anon-card-cleanup.md`
- Pre-expiry reminder job: `backend/src/jobs/trialReminderJob.js` (see §13)

---

## 13) Pre-Expiry Reminder Email Contour

**Status:** Technically implemented, verified, and compliance-contour closed (2026-04-12). Rollout remains deliberately gated OFF — see §13.11.

**Scope:** One pre-expiry lifecycle email sent to each trial user approximately on day 9 of the 10-day trial. Includes explicit opt-in gating, suppression defense, one-time unsubscribe token, and a public `/unsubscribe` page.

---

### 13.1 Timing Model

The reminder job runs every `TRIAL_REMINDER_INTERVAL_MS` (default 2 h). On each tick it looks for users whose `trialEndsAt` falls within a rolling candidate window:

```
now + TRIAL_REMINDER_WINDOW_START_HOURS  <  trialEndsAt  <=  now + TRIAL_REMINDER_WINDOW_END_HOURS
```

Defaults: `WINDOW_START_HOURS=20`, `WINDOW_END_HOURS=32` — a 12-hour eligibility window ending ~20 h before expiry. With a 10-day trial, this targets approximately day 9.

**Daytime send guard:** Emails are only sent when the local hour in `Asia/Jerusalem` is in the range `[TRIAL_REMINDER_SEND_HOUR_MIN, TRIAL_REMINDER_SEND_HOUR_MAX)`. Defaults: 09:00–18:00. Uses native `Intl.DateTimeFormat` — no timezone library dependency.

---

### 13.2 Candidate Selection

The job queries for:

- `trialActivatedAt: { $ne: null }` — trial must have been activated
- `trialEndsAt` inside the rolling window
- `trialReminderSentAt: null` — reminder not yet sent
- `isVerified: true` — unverified users excluded
- `emailMarketingConsent: true` — **explicit opt-in required** (null and false are excluded)
- `trialReminderClaimedAt: null` or stale (older than `TRIAL_REMINDER_STALE_CLAIM_THRESHOLD_MS`, default 4 h)

Defense-in-depth after claim: job re-checks that `trialEndsAt` is still in the future, that the user still has at least one card with `billing.status: "trial"`, and that the user is not in the marketing suppression list.

---

### 13.3 Idempotency Model

Two fields on the User model guard against duplicate sends across concurrent processes and process crashes:

| Field                    | Purpose                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trialReminderClaimedAt` | Atomically stamped via `findOneAndUpdate` before sending. Acts as a distributed ownership lock. Stale claims (older than `STALE_CLAIM_THRESHOLD_MS`) re-enter the eligible pool. |
| `trialReminderSentAt`    | Stamped only after a confirmed successful Mailjet send. Once set, the user is permanently excluded from the reminder candidate query.                                            |

On send failure the claim is released (`trialReminderClaimedAt` reset to `null`), allowing retry on the next tick.

**Accepted structural tradeoff:** A process crash in the window between the Mailjet API returning 2xx and the `trialReminderSentAt` write completing can result in one duplicate send. This is a best-effort delivery model, consistent with the rest of the mail layer. Closing this gap requires an outbox / at-least-once delivery contour that is currently out of scope.

---

### 13.4 Email Delivery Shape

- **Transport:** Mailjet v3.1 API via raw HTTPS (`api.mailjet.com/v3.1/send`).
- **Parts:** Both `TextPart` (Hebrew plain text + pricing URL + conditional unsubscribe footer) and `HTMLPart` (branded RTL table layout, conditional logo, CTA button `#6c47ff`, conditional unsubscribe row) are sent.
- **CTA:** `getSiteUrl() + "/pricing"` — uses `SITE_URL || PUBLIC_ORIGIN || PUBLIC_URL || "https://cardigo.co.il"` as the base.
- **Unsubscribe footer:** A one-time tokenized unsubscribe URL is generated before each send and appended to both TextPart and HTMLPart. Neither part is sent if token generation fails (see §13.9).
- **Logo:** resolved as `MAILJET_TRIAL_REMINDER_LOGO_URL` → `MAILJET_BRAND_LOGO_URL` → no logo (falls back to branded `<p>` heading, no broken image).
- **Subject / prefix:** configurable via `MAILJET_TRIAL_REMINDER_SUBJECT` / `MAILJET_TRIAL_REMINDER_TEXT_PREFIX` with Hebrew fallbacks.
- **When Mailjet is not configured:** returns `{ ok: true, skipped: true }` — claim is silently released, no error logged (dev-env behavior).

---

### 13.5 Governed Indexes

#### Users collection

A compound index supports the reminder candidate query:

| Name                                  | Key                                          | Options |
| ------------------------------------- | -------------------------------------------- | ------- |
| `trialReminderSentAt_1_trialEndsAt_1` | `{ trialReminderSentAt: 1, trialEndsAt: 1 }` | none    |

**Applied via:** `npm run migrate:user-auth-indexes --apply`

**Status:** Confirmed live as of 2026-04-12.

#### EmailUnsubscribeTokens collection

| Name                | Key                      | Options |
| ------------------- | ------------------------ | ------- |
| `tokenHash_1`       | `{ tokenHash: 1 }`       | unique  |
| `emailNormalized_1` | `{ emailNormalized: 1 }` | none    |
| `expiresAt_1`       | `{ expiresAt: 1 }`       | none    |
| `usedAt_1`          | `{ usedAt: 1 }`          | none    |

**Applied via:** `npm run migrate:email-marketing-indexes --apply`

**Status:** All four indexes confirmed live as of 2026-04-12.

#### MarketingOptOuts collection

| Name         | Key               | Options |
| ------------ | ----------------- | ------- |
| `emailKey_1` | `{ emailKey: 1 }` | unique  |

**Applied via:** `npm run migrate:email-marketing-indexes --apply`

**Status:** Confirmed live as of 2026-04-12.

---

### 13.6 Job Registration

File: `backend/src/jobs/trialReminderJob.js`

Registered in `backend/src/server.js` as the 5th and final job after `startRetentionPurgeJob`. First run is staggered by 75 s after server start. Recurring interval governed by `TRIAL_REMINDER_INTERVAL_MS`.

---

### 13.7 Environment Variables

| Variable                                  | Default           | Purpose                                                                  |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `TRIAL_REMINDER_ENABLED`                  | `false`           | **Production gate — must be explicitly set to `true` to enable sending** |
| `TRIAL_REMINDER_INTERVAL_MS`              | `7200000` (2 h)   | Job tick interval                                                        |
| `TRIAL_REMINDER_WINDOW_START_HOURS`       | `20`              | Lower bound of expiry window (hours from now)                            |
| `TRIAL_REMINDER_WINDOW_END_HOURS`         | `32`              | Upper bound of expiry window (hours from now)                            |
| `TRIAL_REMINDER_SEND_HOUR_MIN`            | `9`               | Earliest local hour to send (Asia/Jerusalem)                             |
| `TRIAL_REMINDER_SEND_HOUR_MAX`            | `18`              | Latest local hour (exclusive) to send                                    |
| `TRIAL_REMINDER_STALE_CLAIM_THRESHOLD_MS` | `14400000` (4 h)  | Age after which a claim is considered abandoned                          |
| `TRIAL_REMINDER_HEARTBEAT_MS`             | `43200000` (12 h) | Heartbeat log interval when no candidates found                          |
| `MAILJET_TRIAL_REMINDER_SUBJECT`          | Hebrew fallback   | Email subject line                                                       |
| `MAILJET_TRIAL_REMINDER_TEXT_PREFIX`      | Hebrew fallback   | Opening line of plain-text body                                          |
| `MAILJET_TRIAL_REMINDER_LOGO_URL`         | `""`              | Contour-specific logo image URL                                          |
| `MAILJET_BRAND_LOGO_URL`                  | `""`              | Shared brand logo fallback (also used by this contour)                   |

All vars are optional — all have in-code defaults. `TRIAL_REMINDER_ENABLED` defaults to `false`; the job exits immediately at startup unless it is set to one of `"1"`, `"true"`, `"on"`, `"yes"`.

---

### 13.8 Smoke Test — CONFIRMED (2026-04-12)

- [x] Reminder job schedules on server start, appears in startup logs.
- [x] Candidate query correctly excludes unverified, already-reminded, and upgraded users.
- [x] Candidate query excludes users with `emailMarketingConsent` null or false.
- [x] Atomic claim prevents duplicate processing across concurrent ticks.
- [x] Suppression check (Step 4) blocks opted-out users even after candidate query passes.
- [x] Unsubscribe token generated and stored before each send attempt.
- [x] Token generation failure releases claim and skips send (no email without unsubscribe link).
- [x] TextPart + HTMLPart email delivered via Mailjet, including unsubscribe footer.
- [x] `trialReminderSentAt` stamped after successful send.
- [x] Failed sends release claim for retry.
- [x] Governed indexes confirmed live: `trialReminderSentAt_1_trialEndsAt_1` on users, `tokenHash_1` (unique) + `emailNormalized_1` + `expiresAt_1` + `usedAt_1` on emailunsubscribetokens, `emailKey_1` (unique) on marketingoptouts.
- [x] Frontend gates (check:inline-styles, check:skins, check:contract) EXIT 0.
- [x] `sanity:imports` EXIT 0.

---

### 13.9 Unsubscribe Delivery Flow

**Token issuance (job):**

1. After passing all candidate guards, the job generates a 32-byte cryptographically random raw token (`crypto.randomBytes(32).toString("hex")`).
2. A SHA-256 hash of the raw token is stored in `EmailUnsubscribeToken` (emailNormalized, tokenHash, expiresAt = now + 90 days, usedAt = null).
3. The raw token (not the hash) is embedded in the unsubscribe URL: `${getSiteUrl()}/unsubscribe?token=<rawToken>`.
4. If token creation fails, the claim is released and the send is skipped. No email is ever sent without an unsubscribe link.

**Consume endpoint (`POST /api/unsubscribe/consume`):**

- Accepts `{ token }` in the request body.
- Looks up `tokenHash` (SHA-256 of the submitted token) in `EmailUnsubscribeToken`.
- Atomic `findOneAndUpdate` stamps `usedAt`; tokens already used or expired return 400.
- On success: creates a `MarketingOptOut` tombstone (HMAC-SHA256 of `emailNormalized`) and sets `user.emailMarketingConsent = false`.
- Returns `{ ok: true }` on success, 400 on invalid/expired/used token.
- Rate-limited (in-memory, IP-keyed).

**Frontend page (`/unsubscribe`):**

- File: `frontend/src/pages/Unsubscribe.jsx`
- Route: `unsubscribe` under root `/` Layout in `frontend/src/app/router.jsx`.
- On load: strips token from URL bar (`history.replaceState`), then POSTs to `/api/unsubscribe/consume`.
- States: `loading` → `success` | `error`. Missing token renders directly (no loading flash).
- Uses `AuthLayout` shell, CSS Modules, no inline styles.

**Suppression list (`MarketingOptOut`):**

- Model: `backend/src/models/MarketingOptOut.model.js`
- Key: `HMAC-SHA256("cardigo-email-opt-out-v1:" + normalizedEmail)` using `EMAIL_BLOCK_SECRET`.
- Checked by `isMarketingOptOut()` in the reminder job (Step 4) and in `PATCH /api/account/email-preferences`.
- Created on: unsubscribe consume, SettingsPanel toggle off.
- Deleted on: SettingsPanel toggle on (re-opt-in).

---

### 13.10 Consent Collection Points

Explicit marketing email consent (`emailMarketingConsent` on the User model) is collected at:

| Surface                                                         | Source tag         | Default                                        |
| --------------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| Registration form (`/register`)                                 | `"register"`       | unchecked (false → field not written)          |
| Magic-link signup consume (`/signup`)                           | `"signup_consume"` | unchecked (false → field not written)          |
| Invite accept (`/invite`) — new user path only                  | `"invite_accept"`  | unchecked (false → field not written)          |
| EditorSidebar trial nudge (trial + null consent + daysLeft > 0) | `"editor_sidebar"` | shows "כן/לא" buttons; hidden after any choice |
| SettingsPanel "העדפות תקשורת" toggle                            | `"settings_panel"` | reflects current DB truth                      |

**Backend endpoint:** `PATCH /api/account/email-preferences` — accepts `{ emailMarketingConsent: boolean, source? }`. Opt-out creates suppression tombstone; opt-in removes it.

---

### 13.11 Production Rollout Gate

> **`TRIAL_REMINDER_ENABLED` is currently `false` in production. The reminder job starts up but exits immediately without scheduling.**

This is the deliberate production gate. Changing it to `true` requires explicit operator action and is not a code change.

**Pre-conditions before enabling in production:**

1. Verify `sanity:imports` EXIT 0 on the production build.
2. Run `migrate:email-marketing-indexes --apply` on the production DB (or confirm all five indexes are already live).
3. Complete local unsubscribe smoke (token consume, replay, suppression write).
4. Optional: local reminder end-to-end smoke (temp enable + test user + revert).
5. Set `TRIAL_REMINDER_ENABLED=true` in production env and redeploy.
6. Monitor first sweep log: `[trial-reminder] sweep done { sentCount, ... }`.

---

_Created as part of the documentation truth-alignment audit. June 2025._
_§13 substantially updated 2026-04-12: compliance contour implemented and verified; §13.5, §13.8–§13.11 added._
