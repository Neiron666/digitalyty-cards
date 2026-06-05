# Runbook: Marketing Email Real-Send Worker

**Scope:** Operational SSoT for the Cardigo admin marketing email real-send feature — architecture, lifecycle, env flags, safe procedures, monitoring, and troubleshooting.
**Status:** Active — last reviewed 2026-06-05.
**Production proof:** First production send verified 2026-06 (single recipient, email received, unsubscribe worked, multiple emails sent, completed lifecycle works, `[user]` subject personalization deployed).

---

## 1) Overview

The marketing email real-send feature allows a Cardigo platform admin to:

1. Select eligible users (emailMarketingConsent=true, email verified, not opted out) from the admin panel.
2. Compose a campaign draft (subject, heading, preview text, body, footer, optional top image).
3. Preview the rendered email and send a test copy to themselves.
4. Check readiness (user count, content validity).
5. Start the send: this creates a queued campaign and one pending recipient row per selected user.
6. The real-send worker processes pending rows one at a time, sending via Mailjet with a per-recipient unsubscribe link.
7. After all rows are terminal the campaign automatically transitions to `completed`.
8. Completed campaigns appear in the "נשלחו" (Sent) tab.
9. Recipients can click the unsubscribe link at any time to opt out.

**This runbook does NOT cover:**

- The dry-run worker (rehearsal only, never sends email — see §18).
- Billing, trial-reminder, or other unrelated workers.
- Broad high-volume rollout strategy (deferred — see §14).

---

## 2) Architecture

### Components

| Component                          | File                                                                               | Purpose                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `MarketingCampaign` model          | `backend/src/models/MarketingCampaign.model.js`                                    | Campaign document: status, contentSnapshot, selectionSnapshot, createdBy       |
| `MarketingCampaignRecipient` model | `backend/src/models/MarketingCampaignRecipient.model.js`                           | One row per recipient: userId, campaignId, status, evidence fields             |
| `MarketingOptOut` model            | `backend/src/models/MarketingOptOut.model.js`                                      | Suppression tombstone — emailKey, createdAt. Retained permanently.             |
| `EmailUnsubscribeToken` model      | `backend/src/models/EmailUnsubscribeToken.model.js`                                | Per-recipient unsubscribe token: tokenHash, emailNormalized, expiresAt, usedAt |
| Real-send worker                   | `backend/src/jobs/marketingRealSendWorker.js`                                      | Scheduled worker that processes pending recipient rows and calls Mailjet       |
| Dry-run worker                     | `backend/src/jobs/marketingSendDryRunWorker.js`                                    | Rehearsal only — never sends email, never calls Mailjet (see §18)              |
| Subject personalization            | `backend/src/utils/marketingPersonalization.util.js`                               | Replaces `[user]` placeholder in subject with recipient's firstName            |
| Mailjet adapter                    | `backend/src/services/mailjet.service.js` → `sendMarketingCampaignEmailBestEffort` | Sends one marketing email per call via Mailjet v3.1 API                        |
| Unsubscribe token mint             | `backend/src/utils/issueEmailUnsubscribeToken.util.js`                             | Creates and persists an EmailUnsubscribeToken before any provider call         |
| Recipient eligibility              | `backend/src/utils/marketingRecipientEligibility.util.js`                          | Send-time revalidation: consent, verification, opt-out                         |
| Admin campaign controller          | `backend/src/controllers/adminMarketingCampaign.controller.js`                     | CRUD, preview, test-send, start, send-status, cancel-send, delete              |

### Data flow (one recipient row)

```
Admin clicks Start
  -> POST /api/admin/marketing/:id/send-to-list (requires MARKETING_SEND_TO_LIST_ENABLED=true)
  -> campaign.status set to "queued"
  -> N MarketingCampaignRecipient rows created (status:pending, nextAttemptAt:now)

Worker tick (requires MARKETING_REAL_SEND_WORKER_ENABLED=true)
  -> reclaimStaleRows() — handles stuck sending rows with lock TTL
  -> findOneAndUpdate claim: pending -> sending (atomic, sort by nextAttemptAt)
  -> fetch MarketingCampaign (status check: must be queued or sending)
  -> revalidateMarketingRecipientUserIds([userId]) — consent/verify/opt-out at send time
  -> User.findById.select({ email:1, firstName:1 }) — never stored on row
  -> issueEmailUnsubscribeToken({ emailNormalized }) — minted, persisted to EmailUnsubscribeToken
  -> MarketingCampaignRecipient.updateOne: persist unsubscribeTokenId BEFORE provider call
  -> renderMarketingEmailCore(contentSnapshot, { mode:"send", unsubscribeUrl })
  -> personalizeMarketingSubject(contentSnapshot.subject, user) — per-recipient
  -> sendMarketingCampaignEmailBestEffort({ toEmail, subject, htmlPart, textPart, customId, unsubscribeUrl })
  -> update row: status:sent (ok:true) or status:failed (ok:false)
  -> finalizeMarketingCampaignIfTerminal(campaignId)
     -> if all rows terminal and no active rows: campaign.status -> completed or failed
```

---

## 3) Recipient Row Lifecycle

### Statuses

| Status       | Meaning                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| `pending`    | Waiting for worker to claim. `nextAttemptAt` controls when eligible.                      |
| `sending`    | Claimed by worker. Lock held via `lockedAt` + `claimedBy`.                                |
| `sent`       | Mailjet accepted delivery. Evidence fields populated.                                     |
| `failed`     | Hard failure. Not auto-retried. Operator must inspect `providerErrorSafe`.                |
| `skipped`    | Eligibility revalidation failed for non-opt-out reason (e.g. unverified). Not suppressed. |
| `suppressed` | Eligibility: OPTED_OUT at send time. User is now in suppression list.                     |
| `canceled`   | Worker found campaign no longer queued/sending; or admin canceled pending rows.           |

### Evidence fields (on sent/failed rows)

| Field                | Meaning                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `providerMessageId`  | Mailjet message ID. Present on sent rows.                            |
| `providerStatus`     | `"accepted"` (sent) or `"failed"`.                                   |
| `providerErrorSafe`  | Safe provider error code (no PII). Present on failed rows.           |
| `unsubscribeTokenId` | ObjectId reference to the EmailUnsubscribeToken minted for this row. |
| `sentAt`             | Timestamp of successful send.                                        |
| `failedAt`           | Timestamp of failure.                                                |
| `lockedAt`           | Set when claimed; cleared on completion.                             |
| `claimedBy`          | Worker identity string. Cleared on completion.                       |

### Evidence and reclaim rules

- **Evidence present** (`providerMessageId` or `unsubscribeTokenId` non-null): delivery state is unknown. Stale sending row → `AMBIGUOUS_PRIOR_SEND`. **Never auto-retried.** Requires operator inspection.
- **No evidence + attempts < maxAttempts**: released back to pending with cooldown.
- **No evidence + attempts >= maxAttempts**: permanently failed with `REAL_SEND_STUCK`.

### Retention

Sent and evidence rows are retained permanently — they are the audit trail. Do not delete `MarketingCampaignRecipient` rows for campaigns that have sent rows or active evidence fields. The normal delete endpoint (`DELETE /api/admin/marketing/:id`) is blocked for campaigns with sent evidence rows.

---

## 4) Campaign Lifecycle

### Statuses

| Status      | Meaning                                                                  | UI tab                                                  |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `draft`     | Created; not yet sent.                                                   | טיוטות פעילות                                           |
| `queued`    | Start called; recipient rows created; worker processing.                 | ממתינות לשליחה                                          |
| `completed` | All rows terminal; at least one sent or all skipped/suppressed/canceled. | נשלחו                                                   |
| `failed`    | All rows terminal; zero sent, at least one failed.                       | (currently no dedicated tab — appears as failed status) |
| `canceled`  | Admin canceled send before or during processing.                         | טיוטות שבוטלו                                           |

### Transitions

```
draft
  -> queued (on Start, if MARKETING_SEND_TO_LIST_ENABLED=true)
  -> (worker processes rows)
  -> completed (most sends: at least one sent, or all rows non-failed terminal)
  -> failed (zero sent + at least one failed)
  -> canceled (admin cancel-send while still queued with pending rows)
```

### Finalization

`finalizeMarketingCampaignIfTerminal` is called after every terminal row update inside the worker. It uses a CAS predicate `{ status: { $in: ["queued","sending"] } }` so it never overrides `canceled`, `draft`, `completed`, or `failed`.

Resolution logic:

- `sent > 0` OR `failed === 0` → `completed`
- `sent === 0` AND `failed > 0` → `failed`

### Historical note — pre-finalization campaigns

The first production test campaign (from the initial controlled rollout) was sent before the `finalizeMarketingCampaignIfTerminal` helper was deployed. Its status remains `queued` as a historical evidence artifact. It will not be automatically corrected. Any correction requires a separate explicitly-audited operator contour. Do not use cancel-send on it (the recipient rows are already in `sent` status). Do not manually edit its status without an explicit audited operator contour.

---

## 5) Subject Personalization (`[user]` Placeholder)

Admin can use `[user]` anywhere in the campaign subject field. The placeholder is replaced per recipient at send time.

**UI hint shown in the composer:**
ניתן להשתמש ב-[user] כדי להכניס את שם הנמען לנושא.

### Rules

| Rule              | Detail                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Source            | `User.firstName`                                                                                                        |
| Fallback          | `"לקוח יקר"` — used when `firstName` is null, empty, or blank after sanitization                                        |
| Email as fallback | Never — raw email is not used as a name fallback                                                                        |
| Case-sensitive    | Only `[user]` is replaced — `[User]` and `[USER]` are not                                                               |
| Timing            | Per-recipient, at send time (not at draft creation)                                                                     |
| Test-send         | Also personalizes subject using admin's `firstName`                                                                     |
| Sanitization      | CR/LF/ASCII control chars (0x00–0x1F, 0x7F) stripped; `firstName` capped at 60 chars; final subject capped at 255 chars |
| Logging           | Subject, name, and email are never logged in this path                                                                  |

**Implementation:** `backend/src/utils/marketingPersonalization.util.js` → `personalizeMarketingSubject(subjectTemplate, user)`

---

## 6) Env Flags Table

### Required for production send

| Variable             | Required | Default                 | Description                                                                     |
| -------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------- |
| `MAILJET_API_KEY`    | yes\*    | —                       | Mailjet public API key                                                          |
| `MAILJET_API_SECRET` | yes\*    | —                       | Mailjet secret API key (`MAILJET_SECRET_KEY` in api-security docs)              |
| `MAILJET_FROM_EMAIL` | no       | `noreply@cardigo.co.il` | Sender address                                                                  |
| `MAILJET_FROM_NAME`  | no       | `Cardigo`               | Sender display name                                                             |
| `SITE_URL`           | prod     | `http://localhost:5173` | Base URL used to build per-recipient unsubscribe links                          |
| `EMAIL_BLOCK_SECRET` | yes      | —                       | HMAC-SHA256 key for unsubscribe token signing. Required at startup (fail-fast). |

\* If Mailjet keys are absent, `sendMarketingCampaignEmailBestEffort` returns `ok:false` with reason `MAILJET_NOT_CONFIGURED`. No email is sent.

### Worker control gates

| Variable                               | Default      | Description                                                                                                                                                                                      |
| -------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MARKETING_SEND_TO_LIST_ENABLED`       | absent/false | Set `"true"` to allow admins to queue campaigns via Start. Absent or any other value returns `409`. Must be managed carefully: only enable when admins should be allowed to queue new campaigns. |
| `MARKETING_REAL_SEND_WORKER_ENABLED`   | absent/false | Set `"true"` to enable the recurring real-send scheduler. Absent/false means no send timers are registered. Worker is always started in `server.js` but self-gates immediately.                  |
| `MARKETING_SEND_WORKER_ENABLED`        | absent/false | Dry-run worker gate. **Must be `false`/absent when real worker is enabled.** Real-send worker refuses to schedule if this is `"true"`.                                                           |
| `MARKETING_REAL_SEND_RUN_ONCE_ENABLED` | absent/false | Manual one-shot operator gate. Set `"true"` to allow a single `runMarketingRealSendOnce()` call (used for operator smoke testing). Separate from the scheduler gate.                             |

### Scheduler tuning (all optional)

| Variable                                 | Default           | Min           | Notes                                                                               |
| ---------------------------------------- | ----------------- | ------------- | ----------------------------------------------------------------------------------- |
| `MARKETING_REAL_SEND_BATCH_SIZE`         | `1`               | `1` (max: 10) | Recipient rows processed per sweep tick. Use `1` for controlled production rollout. |
| `MARKETING_REAL_SEND_BOOT_DELAY_MS`      | `135000` (2m15s)  | `0`           | Delay before first sweep after server start. Faster rollout value used: `10000`.    |
| `MARKETING_REAL_SEND_INTERVAL_MS`        | `600000` (10 min) | `60000`       | Sweep tick interval. Faster rollout value used: `60000`.                            |
| `MARKETING_REAL_SEND_LOCK_TTL_MS`        | `300000` (5 min)  | `60000`       | Age of a `sending` lock before it is considered stale and eligible for reclaim.     |
| `MARKETING_REAL_SEND_MAX_ATTEMPTS`       | `3`               | `1` (max: 20) | Max claim attempts before a row is permanently failed without evidence.             |
| `MARKETING_REAL_SEND_COOLDOWN_MS`        | `300000` (5 min)  | `60000`       | Cooldown before a released (no-evidence) row is eligible for re-claim.              |
| `MARKETING_REAL_SEND_RECLAIM_BATCH_SIZE` | `10`              | `1` (max: 50) | Max stale rows reclaimed per `processOneMarketingRealSend` invocation.              |

---

## 7) Safe Enable / Disable Procedure

### Before enabling the real-send worker

1. Confirm `MARKETING_SEND_WORKER_ENABLED` is `false` or absent in Render env. The real-send worker refuses to schedule if the dry-run worker is enabled.
2. Run the pending-row read-only pre-enable check (see §8). Confirm pending count matches expectation.
3. Confirm `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `SITE_URL`, and `EMAIL_BLOCK_SECRET` are set in production.
4. Confirm `MARKETING_SEND_TO_LIST_ENABLED` is set to `"true"` only if admins should be able to queue new campaigns. This flag is independent of the worker flag.

### Enable procedure

1. Set `MARKETING_REAL_SEND_WORKER_ENABLED=true` in Render environment.
2. For controlled rollout set: `MARKETING_REAL_SEND_BATCH_SIZE=1`, `MARKETING_REAL_SEND_BOOT_DELAY_MS=10000`, `MARKETING_REAL_SEND_INTERVAL_MS=60000`.
3. Redeploy or restart the backend service.
4. Monitor Render logs for `[marketing-real-send] worker scheduled` within the first 30 s of boot.
5. After first sweep tick, confirm `[marketing-real-send] sweep done` appears in logs with expected counts.
6. If `sent` count increments: verify email received at expected address.

### After send window

1. Set `MARKETING_REAL_SEND_WORKER_ENABLED` to `false` or remove the env var in Render.
2. Redeploy or restart backend.
3. Confirm logs show `[marketing-real-send] disabled` on the next boot.
4. Set `MARKETING_SEND_TO_LIST_ENABLED` to `false` or remove it if admins should not queue new campaigns.

### Mutual exclusion rule

`MARKETING_REAL_SEND_WORKER_ENABLED` and `MARKETING_SEND_WORKER_ENABLED` must **never both be `"true"`** at the same time. The real-send worker checks for this at startup and refuses to schedule. The dry-run worker was used during development; it is not needed in production and must remain disabled when real sends are active.

---

## 8) Pending-Row Read-Only Pre-Enable Check

Before enabling the real-send worker, verify the pending row count matches what you expect. Run these counts against your production Mongo using mongosh or Compass. Replace `cardigo_prod` with your actual database name.

**Count claimable pending rows (what the worker will claim on first sweep):**

```js
db.getCollection("marketingcampaignrecipients").countDocuments({
    status: "pending",
    nextAttemptAt: { $lte: new Date() },
    dryRunOnly: { $ne: true },
});
```

**Count all rows by status for a specific campaign:**

```js
db.getCollection("marketingcampaignrecipients").aggregate([
    { $match: { campaignId: ObjectId("REPLACE_WITH_CAMPAIGN_ID") } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
]);
```

**Count campaigns by status:**

```js
db.getCollection("marketingcampaigns").aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
]);
```

**Rules:**

- If pending count is `0` and no campaigns are in `queued` status: no emails will be sent. Enabling the worker is safe (it will idle).
- If pending count matches the expected selection size: proceed.
- If pending count is unexpected (too high, wrong campaigns): **STOP**. Investigate before enabling.
- Do not include actual ObjectIds, email addresses, or user IDs in reports or chat messages.

---

## 9) Monitoring / Logs

### Expected log lines

| Log line                                                        | Meaning                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `[marketing-real-send] disabled`                                | Worker gate not set. No timers registered. Safe idle.                                                   |
| `[marketing-send-dry-run] disabled`                             | Dry-run worker gate not set. Safe idle.                                                                 |
| `[marketing-real-send] worker scheduled`                        | Real-send scheduler registered boot delay + interval. Boot delay = `MARKETING_REAL_SEND_BOOT_DELAY_MS`. |
| `[marketing-real-send] sweep done { claimed:0, sent:0, ... }`   | Sweep ran, no pending rows found. Normal idle.                                                          |
| `[marketing-real-send] sweep done { claimed:1, sent:1, ... }`   | One row claimed and sent successfully in this tick.                                                     |
| `[marketing-real-send] sweep done { claimed:1, failed:1, ... }` | One row claimed and failed. Check `providerErrorSafe` on the row.                                       |
| `[marketing-real-send] sweep done { ... ambiguous:N, ... }`     | N stale rows had evidence and were marked AMBIGUOUS_PRIOR_SEND. Requires operator inspection.           |
| `[marketing-real-send] finalization error { error: "..." }`     | Finalization helper swallowed an error. Campaign may not auto-complete. Log the error and investigate.  |
| `[marketing-real-send] eligibility check failed`                | Eligibility util threw. Row was failed. Check error message.                                            |
| `[marketing-real-send] token mint failed`                       | Unsubscribe token minting failed. Row was failed. No email sent.                                        |
| `[marketing-real-send] render failed`                           | Email renderer threw. Row was failed. No email sent.                                                    |
| `[marketing-real-send] provider call threw`                     | Mailjet adapter threw. Row was failed.                                                                  |
| `[marketing-real-send] unsubscribeTokenId write raced`          | Another process modified the row between claim and tokenId write. Row was failed.                       |

### Stop conditions — act immediately

- Dry-run worker and real-send worker are both enabled (`[marketing-real-send] refused: dry-run worker is also enabled` in logs or both start up together).
- Unexpected pending rows (more campaigns or recipients than intended).
- Unexpected Mailjet sends (wrong addresses, wrong campaign content).
- Repeated `AMBIGUOUS_PRIOR_SEND` at high rate — delivery state is unknown for those rows.
- Repeated `PROVIDER_CALL_FAILED` or `PROVIDER_REJECTED` — Mailjet may be rejecting sends.
- More emails sent than intended.
- **In any of these cases: immediately set `MARKETING_REAL_SEND_WORKER_ENABLED=false` in Render and redeploy.**

---

## 10) Cancel-Send and Rollback Rules

### What cancel-send does

- Cancels **pending rows only** for the campaign.
- Updates rows from `pending` to `canceled`.
- Does **not** touch rows already in `sent`, `failed`, `skipped`, `suppressed`, or `sending`.
- Campaign is set to `canceled` status by a CAS update (only flips from `queued`).

### What cancel-send does NOT do

- Does not undo sent emails.
- Does not invalidate unsubscribe tokens already minted.
- Does not delete evidence rows.

### Rules

- Do not use the cancel-send button when rows are already in `sent` status. Evidence is retained.
- Do not use `cardigo_ci` cleanup harnesses on production data.
- Do not manually edit production `MarketingCampaign.status` or `MarketingCampaignRecipient.status` without an explicit audited operator contour.
- The frontend hides the cancel-send button when `isTerminal=true` (all rows terminal) to prevent accidental cancellation of an already-completed send.

---

## 11) Unsubscribe

### How it works

1. The real-send worker mints a per-recipient `EmailUnsubscribeToken` before any Mailjet call.
2. If the token cannot be minted or persisted to DB, **no email is sent** (fail-closed).
3. The unsubscribe URL (`SITE_URL` + path + HMAC-signed token) is embedded in both the HTML and plain-text email body.
4. `List-Unsubscribe` and `List-Unsubscribe-Post` headers are set on all marketing emails for RFC 2369 / RFC 8058 compliance.
5. When the recipient clicks the unsubscribe link:
    - `User.emailMarketingConsent` is set to `false`.
    - A `MarketingOptOut` suppression tombstone is created for the email key.
    - The `EmailUnsubscribeToken` is consumed (usedAt set). Replay is rejected via `usedAt:null` predicate.

### Required env vars

- `SITE_URL`: must be the full production origin (`https://cardigo.co.il` in production). Used to build the unsubscribe link.
- `EMAIL_BLOCK_SECRET`: HMAC key for token signing. Required at startup (fail-fast).

### Retention

`MarketingOptOut` records are retained permanently as suppression tombstones. They protect against re-send if an email address is re-registered. They are not deleted by admin delete lifecycle operations.

### Production proof

Unsubscribe was verified in production: link opened from received email, consent cleared, replay rejected.

---

## 12) Production Proof Summary

| Event                               | Result                                                                | Date       |
| ----------------------------------- | --------------------------------------------------------------------- | ---------- |
| First production one-recipient send | PASS — email received, content correct                                | 2026-06    |
| Multiple production emails sent     | PASS — multiple recipients received email                             | 2026-06    |
| Production unsubscribe consume      | PASS — consent cleared, replay rejected                               | 2026-06    |
| Completed lifecycle                 | PASS — future campaigns finalize to completed after all rows terminal | 2026-06-05 |
| `[user]` subject personalization    | PASS — deployed, sanity:imports EXIT:0, build EXIT:0                  | 2026-06-05 |

No raw email addresses, user IDs, campaign IDs, provider message IDs, token values, or connection strings are included in this document.

---

## 13) Troubleshooting

**Campaign stuck at `queued` after all rows are sent**
Cause: Finalization only runs after each row is processed. If the campaign was queued before `finalizeMarketingCampaignIfTerminal` was deployed, the status will not update retroactively.
Action: Wait for the next worker sweep (it will call finalize on any new row it processes). For historical campaigns, see §4 "Historical note". To manually correct, use a separate audited operator contour — do not use cancel-send.

**No emails sent — worker appears idle**
Check: Is `MARKETING_REAL_SEND_WORKER_ENABLED=true` set in production? Is the backend redeployed after setting it? Check Render logs for `[marketing-real-send] disabled`.
Check: Are there any `pending` rows with `nextAttemptAt <= now`? Run the pre-enable check (§8).

**Worker log shows `refused` or does not start**
Cause: `MARKETING_SEND_WORKER_ENABLED=true` — the dry-run worker is enabled. The real-send worker refuses to schedule when both are enabled.
Fix: Set `MARKETING_SEND_WORKER_ENABLED=false` or remove it. Redeploy.

**Dry-run conflict**
Never enable both workers. If both are seen in logs as started, immediately set `MARKETING_REAL_SEND_WORKER_ENABLED=false` and redeploy.

**Pending rows not decreasing**
Check: Is the backend sleeping (Render Free tier)? Workers only run while the Node process is alive.
Check: Are rows stuck in `sending` with a recent `lockedAt`? Wait for the lock TTL (`MARKETING_REAL_SEND_LOCK_TTL_MS`, default 5 min). The next sweep will reclaim them.

**Mailjet not configured**
`sendMarketingCampaignEmailBestEffort` returns `ok:false, reason:MAILJET_NOT_CONFIGURED`. Rows will be marked failed.
Fix: Set `MAILJET_API_KEY` and `MAILJET_API_SECRET` in Render and redeploy.

**Unsubscribe link not working**
Check: Is `SITE_URL` set to the correct production origin?
Check: Is `EMAIL_BLOCK_SECRET` set? It is required at startup.
Check: Was the token already used? Replay is rejected with a clear error response.

**`AMBIGUOUS_PRIOR_SEND` rows**
Rows with evidence fields (`providerMessageId` or `unsubscribeTokenId`) that were found in `sending` state beyond the lock TTL are marked `AMBIGUOUS_PRIOR_SEND`. The email may or may not have been delivered.
Action: Inspect the row's `providerMessageId` in Mailjet dashboard. Do not auto-retry. Resolve manually via audited operator contour if needed.

**Old historical `queued` campaign from pre-finalization period**
The first production test campaign remains `status:queued` as a historical artifact. Its recipient rows are already in `sent` status. This campaign will not be automatically corrected.
Action: None required. It does not affect new campaigns. To correct, use a separate audited operator contour. Do not click cancel-send (recipient rows are in `sent` status, cancel-send only affects pending rows).

---

## 14) Deferred Items

The following are intentionally deferred and must not be implemented without explicit architect sign-off:

- **Broad high-volume rollout strategy** — sending to hundreds or thousands of recipients; batching/rate-limiting at scale; bounce/complaint handling.
- **Monitoring/dashboard improvements** — Sentry Cron monitors for marketing workers; Render log-based alerting.
- **Optional one-time correction for stuck-queued test campaign** — a bounded operator script to set `status:completed` for the specific historical `campaignId` where all rows are `sent`. Requires explicit audited operator contour.
- **Partial-send richer status model** — showing live "X of Y sent" progress during active send. Not current behavior.
- **Admin-visible worker-active indicator** — UI showing whether `MARKETING_REAL_SEND_WORKER_ENABLED` is currently set.
- **Campaign retention/deletion policy doc** — formal retention rules for `MarketingCampaign` and `MarketingCampaignRecipient` collections (comparable to `POLICY_RETENTION_V1.md`).
- **Email template/draft deletion docs** — rules for deleting campaigns that have no sent evidence.
- **`MarketingCampaign` and `MarketingCampaignRecipient` index governance** — index migration docs for these collections.

---

## 15) Admin UI Reference

The marketing campaign admin UI lives at `/admin` → Marketing Campaigns. Key panels:

| Action                  | Location                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| New campaign draft      | Composer form (subject, heading, preview text, body, footer, image)                            |
| Subject `[user]` hint   | Shown below the subject field                                                                  |
| Eligible user selection | Separate recipient selector                                                                    |
| Preview                 | Preview button in composer                                                                     |
| Test send               | Sends to the logged-in admin's email with subject personalized                                 |
| Start (queue)           | "שלח לרשימה" — requires MARKETING_SEND_TO_LIST_ENABLED=true                                    |
| Send status             | "רענון סטטוס" — shows pending/sending/sent/failed counts and isTerminal                        |
| Cancel send             | Visible only for true queued campaigns with pending rows and when isTerminal=false             |
| Tabs                    | טיוטות פעילות (draft) / ממתינות לשליחה (queued) / נשלחו (completed) / טיוטות שבוטלו (canceled) |

---

## 16) Security Properties

- Email address is fetched at send time from `User` model; never stored on `MarketingCampaignRecipient`.
- Email address is never logged anywhere in the send pipeline.
- Subject, firstName, and personalized output are never logged.
- Unsubscribe token is stored as a hash (`tokenHash`) in the database; raw token appears only in the email link.
- `MarketingOptOut` uses an `emailKey` (HMAC of email) — not raw email — as the tombstone key.
- Send-time eligibility revalidation prevents sending to users who withdrew consent after draft creation.
- `dryRunOnly: { $ne: true }` guard ensures the real-send worker never processes dry-run-only rows.
- Fail-closed: no email sent without a successfully persisted unsubscribe token ID.
- Campaign cancel-send uses CAS on `status:queued` — cannot flip an already-completed or already-canceled campaign.

---

## 17) Related Runbooks and Docs

- `docs/runbooks/scheduled-jobs-readiness.md` — all in-process worker inventory (§2.9, §2.10 cover marketing workers)
- `docs/admin.md` — marketing campaign admin API endpoint reference
- `backend/README.md` — marketing campaign send env vars table
- `docs/policies/POLICY_ADMIN_DELETE_LIFECYCLE_V1.md` — `MarketingOptOut` retention policy
- `docs/policies/POLICY_RETENTION_V1.md` — distinction between transactional and marketing email gating

---

## 18) Dry-Run Worker Reference

`backend/src/jobs/marketingSendDryRunWorker.js` is a rehearsal-only worker. It:

- **Never** sends email, **never** calls Mailjet, **never** mints unsubscribe tokens, **never** renders email.
- Rehearses only the claim → campaign-recheck → eligibility-revalidate → skip/suppress/cancel → release mechanics.
- Eligible rows are released back to `pending` with a cooldown — campaign stays `queued`.
- Disabled by default: only starts if `MARKETING_SEND_WORKER_ENABLED=true` AND dry-run mode AND send-to-list enabled.
- Must be disabled when the real-send worker is enabled (mutual exclusion).
- Was used during development and integration testing. Not needed in production for normal send operations.
