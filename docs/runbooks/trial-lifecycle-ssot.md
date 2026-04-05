# Trial Lifecycle SSoT

**Scope:** End-to-end reference for the Cardigo premium trial feature — eligibility, activation, billing resolution, frontend UX, expiry, reconciliation, retention, and purge.

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

1. **First card creation** — eligible user creates their first personal card (`card.controller.js` → `createCard`).
2. **Anonymous card claim** — eligible user registers and claims an anonymous card as their first legitimate card acquisition (`claimCard.service.js` → `claimAnonymousCardForUser`).

Both paths mirror the same canonical activation truth. The following fields are set:

**User-side:**

- `user.trialActivatedAt` — current timestamp.
- `user.trialEndsAt` — `now + TRIAL_DURATION_DAYS` days.

**Card-side:**

- `card.trialStartedAt` — current timestamp.
- `card.trialEndsAt` — `now + TRIAL_DURATION_DAYS` days.
- `card.billing.status` — `"trial"`.
- `card.billing.plan` — `"monthly"`.
- `card.billing.paidUntil` — `null`.

After successful activation, `user.trialEligibilityClosedAt` is set to close eligibility permanently (anti-abuse law).

**Duration:** `TRIAL_DURATION_DAYS` (default: **10 days**), configurable via env var.

---

## 4) Billing Resolution — trial-premium Source

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

## 6) Frontend UX — Editor Sidebar

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

**Computation:** `computeTrialDaysLeft(billingUntil)` — `Math.ceil((trialEndsAt - now) / DAY_MS)`, null-safe, NaN-safe.

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

---

## 10) Environment Variables (complete)

| Variable                                | Required | Default    | Purpose                         |
| --------------------------------------- | -------- | ---------- | ------------------------------- |
| `TRIAL_ROLLOUT_DATE`                    | Yes      | —          | ISO 8601 cutoff for eligibility |
| `TRIAL_DURATION_DAYS`                   | No       | `10`       | Trial length in days            |
| `TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS` | No       | `21600000` | Reconcile job interval          |
| `TRIAL_LIFECYCLE_HEARTBEAT_MS`          | No       | `43200000` | Reconcile heartbeat interval    |
| `RETENTION_GRACE_DAYS`                  | No       | `90`       | Grace period before purge       |
| `RETENTION_PURGE_INTERVAL_MS`           | No       | `21600000` | Purge job interval              |
| `RETENTION_PURGE_HEARTBEAT_MS`          | No       | `43200000` | Purge heartbeat interval        |

---

## 11) Smoke Checklist

- [ ] `TRIAL_ROLLOUT_DATE` is set in `.env` / Render.
- [ ] New user created after rollout date → `isUserTrialEligible` returns `true`.
- [ ] After trial activation → `effectiveBilling.source === "trial-premium"`, `isPaid: true`.
- [ ] Editor sidebar shows "פרמיום ניסיון" badge + countdown.
- [ ] After `TRIAL_DURATION_DAYS` → card falls back to free; countdown disappears.
- [ ] AI quota respects free profile (10/mo) during trial.
- [ ] SEO AI is gated for trial-premium users.

---

## 12) Cross-References

- Billing resolution chain: `docs/runbooks/billing-flow-ssot.md` §7
- AI quota tiers: `docs/ai-about-workstream.md` §5.1
- Plans / feature matrix: `backend/src/config/plans.js`
- Trial config: `backend/src/config/trial.js`
- Billing resolver: `backend/src/utils/trial.js` → `resolveBilling()`
- Backend env vars: `backend/README.md` → Trial & Retention Lifecycle
- Anon card cleanup: `docs/runbooks/anon-card-cleanup.md`

---

_Created as part of the documentation truth-alignment audit. June 2025._
