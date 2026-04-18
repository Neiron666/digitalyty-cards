# Runbook: Scheduled Jobs Readiness

**Scope:** Operational SSoT for all scheduled / background job infrastructure in Cardigo.
**Status:** Active — last reviewed 2026-04-18.

---

## 1) Scheduled Jobs Architecture Overview

### Current architecture

| Layer                     | Status                   | Notes                                                               |
| ------------------------- | ------------------------ | ------------------------------------------------------------------- |
| Render Cron Jobs          | **None configured**      | All scheduled work runs in-process                                  |
| Render Background Workers | **None configured**      | All scheduled work runs in-process                                  |
| In-process Node timers    | **5 active workers**     | Started inside the backend Web Service via `server.js`              |
| GitHub Actions cron       | **1 workflow**           | `backend-admin-sanity.yml` — nightly sanity against CI-only cluster |
| MongoDB TTL indexes       | **DB-engine automation** | Booking `purgeAt` TTL; not Node cron; not in-process                |

### Important: Render Free / sleeping runtime limitation

The backend is currently deployed as a **Render Free web service**, which sleeps after periods of inactivity.

- When the service sleeps, the Node process is terminated.
- All Node `setTimeout` and `setInterval` timers stop.
- In-process jobs do not run while the service is asleep.
- Sentry Cron missed check-ins are **expected and normal** under a sleeping runtime.

**Production readiness requirement:** before relying on scheduled jobs in production, the backend must be either:

- (A) upgraded to an **always-on paid Render instance**, or
- (B) jobs moved to a dedicated **Render Cron Job / Background Worker** or external scheduler architecture.

---

## 2) In-Process Worker Inventory

All 5 workers are started in `backend/src/server.js` after `connectDB`. None require a separate deploy target.

### 2.1 `reset-mail-worker`

| Property            | Value                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Purpose             | Drains the `MailJob` queue; generates password-reset tokens; sends reset-link emails via Mailjet                              |
| Interval            | Default: **60 s** (`RESET_MAIL_WORKER_INTERVAL_MS`)                                                                           |
| Boot delay          | 30 s (staggered)                                                                                                              |
| Auto-start / gate   | **Unconditional** — no enabled/disabled env gate                                                                              |
| Classification      | Email                                                                                                                         |
| Required env vars   | `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_FROM_EMAIL` (all required for email delivery; absent → silent skip per job) |
| Sentry monitor slug | `reset-mail-worker`                                                                                                           |
| Readiness status    | **ACTIVE**                                                                                                                    |
| Key risks           | A `MailJob` stuck in `processing` has no auto-retry (V1 policy). No Sentry alert currently configured on free plan.           |

### 2.2 `trial-cleanup`

| Property            | Value                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose             | Deletes anonymous draft cards inactive beyond `ANON_CARD_TTL_DAYS` (default 14 days) and their Supabase media                                               |
| Interval            | Default: **1 h** (`TRIAL_CLEANUP_INTERVAL_MS`)                                                                                                              |
| Boot delay          | 15 s                                                                                                                                                        |
| Auto-start / gate   | **Unconditional** — no enabled/disabled env gate                                                                                                            |
| Classification      | Destructive + Storage                                                                                                                                       |
| Required env vars   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`; optional: `SUPABASE_STORAGE_BUCKET_ANON_PRIVATE`, `ANON_CARD_TTL_DAYS`              |
| Sentry monitor slug | `trial-cleanup`                                                                                                                                             |
| Readiness status    | **ACTIVE** — currently reporting missed check-ins (see §4)                                                                                                  |
| Key risks           | Missing Supabase env → per-card storage failure (cards preserved, not deleted). No race guard before `Card.deleteOne`. Storage-first ordering is preserved. |

### 2.3 `trial-lifecycle-reconcile`

| Property            | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Purpose             | Normalizes expired user-premium trial billing to free; stamps `downgradedAt` |
| Interval            | Default: **6 h** (`TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS`)                   |
| Boot delay          | 45 s                                                                         |
| Auto-start / gate   | **Unconditional** — no enabled/disabled env gate                             |
| Classification      | Write (non-destructive)                                                      |
| Required env vars   | None beyond standard Mongo/JWT                                               |
| Sentry monitor slug | `trial-lifecycle-reconcile`                                                  |
| Readiness status    | **ACTIVE**                                                                   |
| Key risks           | None blocking. Atomic `updateOne` race guard prevents double-downgrade.      |

### 2.4 `retention-purge`

| Property            | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Purpose             | Permanently removes premium card contact data 90 days after `downgradedAt` (`RETENTION_GRACE_DAYS`)                       |
| Interval            | Default: **6 h** (`RETENTION_PURGE_INTERVAL_MS`)                                                                          |
| Boot delay          | 60 s                                                                                                                      |
| Auto-start / gate   | **Unconditional** — no enabled/disabled env gate                                                                          |
| Classification      | Destructive + Storage                                                                                                     |
| Required env vars   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`; configurable: `RETENTION_GRACE_DAYS` (default 90) |
| Sentry monitor slug | `retention-purge`                                                                                                         |
| Readiness status    | **ACTIVE**                                                                                                                |
| Key risks           | Auto-enabled on every boot. Storage-first ordering preserved. No Sentry alert on free plan.                               |

### 2.5 `trial-reminder`

| Property            | Value                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose             | Sends one pre-expiry reminder email (~day 9 of 10-day premium trial) to consented users, daytime hours (Asia/Jerusalem)                                                                                                                     |
| Interval            | Default: **2 h** (`TRIAL_REMINDER_INTERVAL_MS`)                                                                                                                                                                                             |
| Boot delay          | 75 s                                                                                                                                                                                                                                        |
| Auto-start / gate   | **Gated** — only starts if `TRIAL_REMINDER_ENABLED` ∈ `"1"`, `"true"`, `"on"`, `"yes"` (case-insensitive)                                                                                                                                   |
| Classification      | Email                                                                                                                                                                                                                                       |
| Required env vars   | `TRIAL_REMINDER_ENABLED=true`; `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_FROM_EMAIL`                                                                                                                                                |
| Sentry monitor slug | `trial-reminder`                                                                                                                                                                                                                            |
| Readiness status    | **ACTIVE** — `TRIAL_REMINDER_ENABLED=true` confirmed in Render (owner 2026-04-18)                                                                                                                                                           |
| Key risks           | Sends only to `emailMarketingConsent === true` users. Suppression/unsubscribe/repeat-send protections all active. Email sender env is `MAILJET_FROM_EMAIL` / `MAILJET_FROM_NAME` — do not confuse with the unused `MAILJET_SENDER_*` names. |

---

## 3) Render Free Sleeping Runtime — Operational Impact

| Behavior                      | Detail                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Service sleep trigger         | No inbound HTTP requests for ~15 minutes (Render Free tier)                                  |
| Effect on Node timers         | All `setInterval` / `setTimeout` stopped; in-process workers do not run                      |
| Sentry missed check-ins       | Expected and normal when service is asleep; not a code error                                 |
| Log evidence of sleeping      | Repeated `[worker] scheduled` lines at boot = repeated cold-starts                           |
| Sentry monitor alert behavior | Missed check-in → Sentry Cron Issue after `failureIssueThreshold` (set to 2 for all workers) |

**Distinguishing noise from real failure:**

| Signal                                                        | Interpretation                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Sentry: "A missed check-in was detected" + no exception stack | Expected — service was sleeping                                   |
| Sentry: exception type + stack trace                          | Real failure — investigate immediately (see §4 for trial-cleanup) |
| Render logs: `[worker] failed <message>`                      | Real failure — capture log line and exception class               |
| Render logs: `[worker] done { candidates: 0 }`                | Normal idle operation                                             |
| Render logs: `[worker] heartbeat { candidates: 0 }`           | Normal idle heartbeat                                             |

---

## 4) Trial Cleanup — Current Status

- **Auto-enabled**: `trial-cleanup` starts unconditionally on every backend boot.
- **Classification**: Destructive + Storage.
- **Current Sentry alerts**: Missed check-ins from Render Free sleeping runtime.
- **Render logs confirm**: `candidates: 0` in recent runs — no cards are currently being deleted.
- **Do not disable** solely because of missed check-in alerts; this is expected behavior under sleeping free tier.

### When to investigate immediately

Investigate (and consider disabling) only if **any** of the following appear:

1. Sentry issue shows exception type + stack trace (not "A missed check-in was detected").
2. Render logs show `[trial-cleanup] failed <message>`.
3. Render logs show `[trial-cleanup] supabase remove failed` with non-zero candidates.
4. Render logs show non-zero `failedStorageDeletesCount` alongside `deletedCount > 0` (storage deleted but cards not).
5. Data integrity anomaly: user-owned or published card was deleted.

### Safety properties (code-proven)

- Published cards: excluded by query `status: { $ne: "published" }`.
- User-owned cards: excluded by query `user: null`.
- Paid/adminOverride cards: excluded by post-query `resolveBilling` skip.
- Storage-first ordering: Supabase delete always precedes `Card.deleteOne`.
- Per-card failures are isolated: one failed card does not abort the sweep.

---

## 5) Trial Reminder — Current Status

- **Active in production**: `TRIAL_REMINDER_ENABLED=true` confirmed in Render by owner (2026-04-18).
- **Consent-gated**: sends only to users where `emailMarketingConsent === true`.
- **Suppression/unsubscribe**: `isMarketingOptOut` check applied before every send.
- **Repeat-send protection**: `trialReminderSentAt` stamp with `null` write guard prevents double-send.
- **Daytime guard**: sends only during 09:00–18:00 Asia/Jerusalem local time.
- **Email sender env**: `MAILJET_FROM_EMAIL` and `MAILJET_FROM_NAME`.
    - `MAILJET_SENDER_EMAIL` and `MAILJET_SENDER_NAME` are **not** Cardigo env names and are not referenced anywhere in the codebase. Do not use them as sender config names.

---

## 6) Sentry Monitoring Status

| Monitor slug                | Job                     | Alert active?               | Free plan limitation           |
| --------------------------- | ----------------------- | --------------------------- | ------------------------------ |
| `trial-cleanup`             | trialCleanup            | **Yes** (only active alert) | —                              |
| `reset-mail-worker`         | resetMailWorker         | No                          | Sentry free plan: 1 alert only |
| `trial-lifecycle-reconcile` | trialLifecycleReconcile | No                          | Sentry free plan: 1 alert only |
| `retention-purge`           | retentionPurge          | No                          | Sentry free plan: 1 alert only |
| `trial-reminder`            | trialReminderJob        | No                          | Sentry free plan: 1 alert only |

**Current readiness**: PARTIAL.

All 5 monitors exist in the Sentry dashboard. Alert routing exists only for `trial-cleanup`. Full monitoring readiness requires either:

- Sentry plan upgrade enabling per-monitor alerts for all 5 slugs, or
- An alternative alert strategy (e.g. Render log-based alerting, external uptime monitor, log forwarding to a 3rd-party alerting service).

**Sentry monitor config (code defaults, all 5 workers):**

```
checkinMargin: 5 min
maxRuntime: 10 min
failureIssueThreshold: 2 (consecutive errors before Sentry creates issue)
recoveryThreshold: 1
```

---

## 7) GitHub Actions Scheduled Jobs Status

### backend-admin-sanity.yml

- **Trigger**: `cron: "13 2 * * *"` — nightly at 02:13 UTC.
- **Mongo target**: `MONGO_URI_DRIFT_CHECK` — CI-only Atlas cluster (confirmed by owner, 2026-04-18).
- **Does NOT reference**: production `MONGO_URI`, Mailjet, Tranzila, or YeshInvoice.
- **Hard fail**: if `MONGO_URI_DRIFT_CHECK` is absent, workflow exits 1.
- **Graceful skip**: if `JWT_SECRET` is absent, workflow exits 0.

### backend-index-governance.yml

- **No cron** — event-driven only (PR, push to main, manual dispatch).
- **Read-only** — runs `sanity:card-index-drift` (no index mutations).
- **Missing**: no concurrency block (P1 hardening — no fix in this workstream).

### GitHub secret hygiene note

`MONGO_URI` exists as a GitHub repository secret but is **not referenced** by any workflow. This is security hygiene debt — an unused production credential in GitHub Secrets. Recommend removing it as part of a production Mongo credential rotation / secrets cleanup contour (not in this workstream).

---

## 8) Recurring Billing Cron — Status: NOT IMPLEMENTED (Intentional)

Recurring billing automation does **not exist** and is **intentionally deferred**.

The full billing/Tranzila/YeshInvoice/idempotency/distributed-locks/audit-log/retry/manual-recovery scope has not been designed or closed. Implementing a recurring billing cron before that scope is complete creates unrecoverable financial-data risk.

**Rule**: do not implement recurring billing cron in the scheduled-jobs readiness workstream or any adjacent workstream until the complete billing contour (payments, receipts, failed-payment flows, idempotency keys, manual recovery runbook, audit log) is designed, reviewed, and explicitly signed off.

---

## 9) Production Readiness Table

| Job                         | Schedule source                         | Auto/gated                       | Classification          | Production impact      | Monitoring               | Current status                       | Notes                                                                  |
| --------------------------- | --------------------------------------- | -------------------------------- | ----------------------- | ---------------------- | ------------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| `reset-mail-worker`         | In-process 60 s                         | Auto                             | Email                   | Medium                 | Monitor: yes; Alert: no  | Active                               | MailJob stuck-processing has no auto-retry                             |
| `trial-cleanup`             | In-process 1 h                          | Auto                             | Destructive + Storage   | Medium                 | Monitor: yes; Alert: yes | Active (missed check-ins)            | Sleeping runtime causes missed check-ins; candidates: 0 in recent runs |
| `trial-lifecycle-reconcile` | In-process 6 h                          | Auto                             | Write                   | Low                    | Monitor: yes; Alert: no  | Active                               | No blocking risks                                                      |
| `retention-purge`           | In-process 6 h                          | Auto                             | Destructive + Storage   | High                   | Monitor: yes; Alert: no  | Active                               | Auto-enabled; deletes premium card contact data after grace period     |
| `trial-reminder`            | In-process 2 h                          | Gated (`TRIAL_REMINDER_ENABLED`) | Email                   | Medium                 | Monitor: yes; Alert: no  | Active (TRIAL_REMINDER_ENABLED=true) | Consent/suppression/repeat-send protections verified                   |
| `backend-admin-sanity`      | GitHub Actions cron 02:13 UTC           | Automated                        | Read (CI-only cluster)  | None (production data) | GitHub Actions           | Active                               | CI-only; never touches production Mongo                                |
| `Booking TTL purge`         | MongoDB engine (TTL index on `purgeAt`) | Automatic                        | Destructive (DB-engine) | Medium                 | None (DB-engine)         | Active                               | Not Node cron; DB-engine TTL                                           |
| Recurring billing cron      | N/A                                     | N/A                              | N/A                     | Critical               | N/A                      | **NOT IMPLEMENTED (deferred)**       | Do not implement until full billing contour is closed                  |

---

## 10) Production Rollout Requirements

Before relying on scheduled jobs for production SLAs, all of the following must be resolved:

| Requirement                      | Status                    | Action                                                                                                          |
| -------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Always-on backend                | ❌ Render Free / sleeping | Upgrade to paid always-on instance OR migrate jobs to Render Cron Jobs / Background Workers                     |
| Sentry alert coverage            | ❌ Partial (1/5 workers)  | Upgrade Sentry plan or adopt alternative alerting for all 5 monitor slugs                                       |
| CI / prod secret separation      | ✅ Confirmed              | `MONGO_URI_DRIFT_CHECK` ≠ production. Unused `MONGO_URI` GitHub secret should be removed in a dedicated cleanup |
| `retention-purge` sign-off       | ✅ Running                | No additional sign-off required for current scope                                                               |
| `trial-cleanup` investigation    | ⚠️ Monitor                | Investigate only if exception stack or failed logs appear; do not disable for missed check-ins alone            |
| `trial-reminder` sign-off        | ✅ Active                 | Owner confirmed `TRIAL_REMINDER_ENABLED=true`; consent/suppression/repeat-send protections verified             |
| Recurring billing cron           | ❌ Deferred               | Do not implement until full billing contour is designed and signed off                                          |
| Account inactivity deletion cron | ❌ Not implemented        | Do not enable destructive account inactivity automation without explicit sign-off and a complete runbook        |

---

## Related Runbooks

- `docs/runbooks/anon-card-cleanup.md` — detailed trial-cleanup mechanics, error table, tuning, troubleshooting.
- `docs/runbooks/trial-lifecycle-ssot.md` — full trial lifecycle, trial-reminder env vars, email content overrides.
- `docs/runbooks/backend-verification-and-deploy.md` — Render deploy checklist, sanity order, production Mongo connectivity.
- `docs/runbooks/ci-cluster-bootstrap.md` — CI-only Atlas cluster setup and MONGO_URI_DRIFT_CHECK governance.
- `docs/runbooks/billing-flow-ssot.md` — billing resolution chain, Mailjet env vars for billing flows.
