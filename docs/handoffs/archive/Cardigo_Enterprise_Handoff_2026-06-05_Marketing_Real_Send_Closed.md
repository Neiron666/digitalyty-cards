# Cardigo Enterprise Handoff — Marketing Real Send Closed

**Date:** 2026-06-05
**Status:** CLOSED / PRODUCTION PROVED
**Contour group:** MARKETING_CAMPAIGN_REAL_SEND (all sub-contours)

---

## 1) Executive Status

MARKETING REAL SEND — CLOSED / PRODUCTION PROVED

The Cardigo admin marketing email real-send feature is end-to-end implemented, production-tested, and documentation-complete as of 2026-06-05.

---

## 2) Closed Capabilities

The following capabilities are implemented, verified, and closed:

### Eligible user selection

Admin can query eligible users (emailMarketingConsent=true, verified, not opted out) via the admin marketing panel. Recipient selection is snapshotted at draft time.

### Draft composer

Admin can create and edit campaign drafts with: subject, heading, preview text, body, footer, optional top image. Draft stores a `contentSnapshot` and `selectionSnapshot`.

### Preview and readiness

Admin can preview the rendered email (HTML + text). Readiness check validates content and recipient count before send.

### Test-send

Admin can send a test copy to themselves. Subject is personalized using the admin's own `firstName` (with `[user]` fallback). Test-send does not create recipient rows or affect campaign status.

### Start → queued + recipient ledger

POST `/api/admin/marketing/:id/send-to-list` (requires `MARKETING_SEND_TO_LIST_ENABLED=true`) transitions campaign to `queued` and creates one `MarketingCampaignRecipient` row per selected user (`status:pending`).

### Real-send worker

`marketingRealSendWorker.js` processes pending rows: eligibility revalidation → unsubscribe token mint → email render → Mailjet send → row update → campaign finalization. Atomic claim via `findOneAndUpdate`. Reentrancy guard via module-level `running` flag. Boot delay + interval configurable via env.

### Mailjet delivery

`sendMarketingCampaignEmailBestEffort` in `mailjet.service.js` sends one recipient per call. Includes `List-Unsubscribe` and `List-Unsubscribe-Post` headers for RFC compliance.

### Unsubscribe link and consume

Per-recipient unsubscribe token minted before provider call. Fail-closed: no email sent without a valid persisted token. Consume sets `User.emailMarketingConsent=false`, creates `MarketingOptOut` suppression. Replay rejected via `usedAt:null` predicate. Production-verified.

### Cancel-send

Admin can cancel pending rows for a `queued` campaign. CAS predicate prevents accidental cancellation of completed/canceled campaigns. Frontend hides cancel-send when `isTerminal=true`.

### Canceled cleanup

Campaigns with all rows canceled (no evidence) can be deleted. Evidence rows (`sent`, `failed`) are retained permanently as audit trail.

### Completed lifecycle and "נשלחו" tab

After all recipient rows are terminal, `finalizeMarketingCampaignIfTerminal` (called inside the worker after each terminal row update) transitions the campaign to `completed` (or `failed`). Completed campaigns appear in the "נשלחו" tab with status label "הושלם".

### `[user]` subject personalization

Admin can write `[user]` in the campaign subject. The placeholder is replaced per-recipient at send time with `User.firstName`. Fallback: `"לקוח יקר"`. Email never used as name fallback. Sanitization: CR/LF strip, 60-char firstName cap, 255-char final subject cap. Case-sensitive (`[user]` only). Deployed and verified (sanity:imports EXIT:0, build EXIT:0).

---

## 3) Key Files Changed Across Workstream

| File                                                           | Change summary                                                                                                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/jobs/marketingRealSendWorker.js`                  | Added `finalizeMarketingCampaignIfTerminal`, wired finalize on all terminal row paths, added `personalizeMarketingSubject` import, updated User select to include `firstName`, replaced raw subject extraction with `personalizeMarketingSubject` |
| `backend/src/controllers/adminMarketingCampaign.controller.js` | Added `personalizeMarketingSubject` import, added `firstName` to admin User select in `testSendMarketingCampaign`, personalized test-send subject, added `"completed"` to `DRAFT_LIST_STATUSES`                                                   |
| `backend/src/utils/marketingPersonalization.util.js`           | NEW — pure `personalizeMarketingSubject(subjectTemplate, user)` utility: CR/LF strip, firstName sanitization, `[user]` replaceAll, fallback                                                                                                       |
| `backend/src/utils/issueEmailUnsubscribeToken.util.js`         | Unsubscribe token mint utility (earlier contour)                                                                                                                                                                                                  |
| `backend/src/services/mailjet.service.js`                      | Added `sendMarketingCampaignEmailBestEffort` and `sendMarketingTestEmailBestEffort` (earlier contour)                                                                                                                                             |
| `frontend/src/pages/admin/marketing/MarketingDraftsPanel.jsx`  | Added "completed" to `DRAFT_STATUS_OPTIONS`, added tab label "נשלחו" for completed, added `isSelectedDraftSendTerminal` gate, added terminal note, hid cancel-send when terminal                                                                  |
| `frontend/src/pages/admin/marketing/MarketingComposerForm.jsx` | Added `mkt-subject-help` span with `[user]` placeholder hint, updated `aria-describedby`                                                                                                                                                          |

`marketingSendDryRunWorker.js` was not modified in the final closed contours — it remains the development rehearsal worker.

---

## 4) Production Proof

| Verification                                                                            | Result                                                                           |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| First production send — one recipient, email received                                   | PASS                                                                             |
| Multiple production emails sent                                                         | PASS                                                                             |
| Production unsubscribe link opened and consumed                                         | PASS                                                                             |
| Unsubscribe replay rejected                                                             | PASS                                                                             |
| Completed lifecycle — campaign transitions to `completed` after all rows terminal       | PASS (future campaigns; requires `finalizeMarketingCampaignIfTerminal` deployed) |
| `[user]` subject personalization — backend syntax check, sanity:imports, frontend build | PASS (EXIT:0 all gates)                                                          |

No raw email addresses, user IDs, campaign IDs, provider message IDs, token values, or Mongo connection strings are included in this document.

---

## 5) Current Production Safety Truth

| Flag                                 | Safe default                                          | Notes                                                                                             |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `MARKETING_SEND_WORKER_ENABLED`      | `false` / absent                                      | Dry-run worker. Must stay false/absent when real worker is enabled.                               |
| `MARKETING_REAL_SEND_WORKER_ENABLED` | `false` / absent unless actively sending              | Set to `true` only for an active send window or intentional always-on. Disable after send window. |
| `MARKETING_SEND_TO_LIST_ENABLED`     | `false` / absent unless admins should queue campaigns | Controls whether admins can invoke Start. Independent of the worker flag.                         |

The faster rollout configuration used in production:

- `MARKETING_REAL_SEND_BOOT_DELAY_MS=10000`
- `MARKETING_REAL_SEND_INTERVAL_MS=60000`
- `MARKETING_REAL_SEND_BATCH_SIZE=1`

---

## 6) Known Historical Artifact

The first production test campaign from the initial controlled rollout has `status:queued` because it was sent before `finalizeMarketingCampaignIfTerminal` was deployed. Its recipient rows are in `sent` status. This is a historical evidence artifact.

- Do not click cancel-send on it (rows are already `sent` — cancel-send only cancels `pending` rows).
- Do not manually edit its status without an explicit audited operator contour.
- Any correction (setting status to `completed`) requires a separate bounded operator contour.

---

## 7) Remaining Deferred Items

- Broad high-volume rollout strategy (hundreds/thousands of recipients).
- Monitoring/dashboard improvements (Sentry Cron monitors for marketing workers).
- Optional one-time operator correction for the historical stuck-queued test campaign.
- Partial-send richer status model (live "X of Y sent" progress).
- Admin-visible worker-active indicator.
- Campaign retention/deletion policy doc.
- Email template/draft deletion docs.
- `MarketingCampaign` and `MarketingCampaignRecipient` index governance documentation.

---

## 8) Next Safe Steps

1. Keep `MARKETING_REAL_SEND_WORKER_ENABLED=false` when not actively sending.
2. Keep `MARKETING_SEND_WORKER_ENABLED=false`/absent at all times in production.
3. Before any new campaign send: run pending-row pre-enable check (see canonical runbook §8).
4. After any send window: disable `MARKETING_REAL_SEND_WORKER_ENABLED` and redeploy.
5. Deferred items above may be addressed in future bounded contours.

---

## 9) References

Canonical operational runbook: `docs/runbooks/marketing-real-send-worker-runbook.md`
Admin API reference: `docs/admin.md` → Marketing Campaigns section
Backend env vars: `backend/README.md` → Marketing Campaign Send section
