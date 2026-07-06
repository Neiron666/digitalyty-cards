# Cardigo Enterprise Handoff — Slug Lifecycle Phase 2F + Phase 2G — CLOSED

**Date:** 2026-05-25
**Contours:**

- CARD_SLUG_LIFECYCLE_DELETE_ACCOUNT_TOMBSTONES_P2F
- CARD_SLUG_LIFECYCLE_RELEASE_SWEEP_P2G

**Status:** Both contours CLOSED. Production rollout complete.

---

## A. Scope Identity

### CARD_SLUG_LIFECYCLE_DELETE_ACCOUNT_TOMBSTONES_P2F

Card and account hard-delete slug quarantine tombstones. When a user-owned card with a claimed personal slug is permanently hard-deleted, a `SlugRedirect` tombstone record is created. The tombstone blocks re-claim of that slug for ~30 days and causes public slug lookups to return a plain 404. No HTTP redirect is produced. After the quarantine window expires, the release sweep job transitions the record to `released`, making the slug available for reclaim.

### CARD_SLUG_LIFECYCLE_RELEASE_SWEEP_P2G

Global release sweep for expired slug quarantine records. A backend in-process job and an operator script both call `releaseExpiredSlugRedirects()`. The helper queries `SlugRedirect` documents where status is `redirect_quarantine`, `permanentQuarantine` is not `true`, `manualReleaseRequired` is not `true`, and `expiresAt ≤ now`. It transitions matching records to `status: "released"` and sets `releasedAt`. No records are deleted — `SlugRedirect` is an audit trail. No TTL index exists on this collection.

---

## B. Phase 2F — Tombstone Truth

### B.1 createCardSlugTombstone — contract

Helper: `backend/src/utils/createCardSlugTombstone.js`

Called when a user-owned card with a personal claimed slug is permanently hard-deleted. Creates a `SlugRedirect` document with the following field values:

- `routeType`: `"card"` (personal-card slugs use the `"card"` namespace; `"orgCard"` is reserved for org-card slug records where implemented/proven)
- `orgId`: not set for personal cards (equals `personalOrgId` of the card owner — the field is set internally by the helper; not an external org)
- `slug`: the deleted card's former slug
- `sourceCardId`: the deleted card's `_id`
- `targetCardId`: `null` (tombstone — no redirect target)
- `targetSlugSnapshot`: `null` (tombstone)
- `targetOrgSlugSnapshot`: `null` (tombstone)
- `status`: `"redirect_quarantine"`
- `reason`: one of `card_deleted`, `account_deleted`, `trial_expired` (caller-supplied)
- `expiresAt`: approximately `now + 30 days`
- `permanentQuarantine`: `false`
- `manualReleaseRequired`: `false`
- `createdBy`: caller-supplied (e.g. `"card.controller"`, `"admin.controller"`, `"retentionPurge"`)

**Anonymous/user-null cards are skipped.** The helper checks `sourceCard.user` and returns without writing if the card has no owner.

### B.2 Deletion reasons

| Reason            | Triggered by                                                                     |
| ----------------- | -------------------------------------------------------------------------------- |
| `card_deleted`    | User explicitly deletes their card via editor (card controller hard-delete path) |
| `account_deleted` | Account deletion cascade (admin delete or self-delete) iterates user's cards     |
| `trial_expired`   | Retention purge job deletes cards after `RETENTION_GRACE_DAYS` post-trial-expiry |

### B.3 Public runtime behavior

When a slug matches a `SlugRedirect` tombstone with `status: "redirect_quarantine"` and `targetCardId: null`:

- `GET /api/cards/:slug` (public card API) — returns **plain 404**. No `SLUG_MOVED` code. No `redirectTo` field.
- `GET /og/card/:slug` (OG meta route) — returns **plain 404**. No OG redirect to a target card.
- No HTTP 301, 302, or 308 redirect is produced at any layer.
- Slug reclaim is **blocked** while `status === "redirect_quarantine"`. A new card cannot claim the slug until the release sweep transitions the record to `released`.

### B.4 Smoke results

Core disposable personal-card smoke passed:

- Slug-change path: redirect quarantine record created for `neiron-player` → `neiron-player-new` (routeType=card, reason=slug_changed, targetCardId set, targetSlugSnapshot set).
- Card-delete tombstone path: card `neiron-player-new` was hard-deleted. A separate `SlugRedirect` tombstone was created with reason=`card_deleted`, targetCardId=`null`.
- Public lookup of the deleted slug returned 404.
- The old slug (`neiron-player`, now released from its redirect) and the new-then-deleted slug (`neiron-player-new`) were both claim-blocked correctly during their quarantine windows.

Not overclaimed — explicitly deferred:

- Full admin-delete tombstone runtime smoke (multi-card user, admin hard-delete path) — not confirmed beyond Phase 2F core smoke.
- Full self-service account-delete tombstone runtime smoke — not confirmed beyond Phase 2F core smoke.
- Upload lazy trial-delete fixture smoke (retention purge path for `trial_expired` reason) — not confirmed end-to-end.
- Org-delete bulk slug lifecycle — not designed or implemented in Phase 2F.

---

## C. Phase 2G — Release Sweep Truth

### C.1 SlugRedirect audit trail contract

`SlugRedirect` documents are **never deleted** by the release sweep. The collection is a permanent audit trail. No `expireAfterSeconds` TTL index exists on this collection.

The release sweep only changes:

- `status`: `"redirect_quarantine"` → `"released"`
- `releasedAt`: set to `now`

All other fields are preserved exactly as written at creation time:

- `sourceCardId`, `targetCardId`, `targetSlugSnapshot`, `targetOrgSlugSnapshot`
- `reason`, `expiresAt`, `createdBy`
- `permanentQuarantine`, `manualReleaseRequired`
- `reclaimedAt` (null until a new card reclaims the slug)

### C.2 Release filter

```
{
  status: "redirect_quarantine",
  permanentQuarantine: { $ne: true },
  manualReleaseRequired: { $ne: true },
  expiresAt: { $lte: now }
}
```

Records with `permanentQuarantine: true` are never auto-released. Records with `manualReleaseRequired: true` are never auto-released. These require a future operator/admin manual release path (deferred — see §D).

### C.3 Operator script

```
npm run slug-redirect:release:dry-run
npm run slug-redirect:release:apply
```

Script: `backend/scripts/release-expired-slug-redirects.mjs`

- `dry-run` is the default. It counts candidates only and exits 0.
- `apply` is explicit (`--apply` flag). It runs the `updateMany` and reports `modifiedCount`.
- Output fields: `ok`, `mode`, `dbName`, `checkedAt`, `candidateCount`, `durationMs`; plus `modifiedCount` when mode is `apply`.
- No PII in output. No raw ObjectIds or card/user data.
- **Apply was NOT run during Phase 2G implementation.** The post-deploy dry-run returned `candidateCount: 0`. No records were eligible. Apply is not needed when `candidateCount` is 0.

### C.4 Backend in-process job

File: `backend/src/jobs/slugRedirectRelease.js`

| Property               | Value                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Env gate               | `SLUG_REDIRECT_RELEASE_ENABLED === "true"` — absent or any other value disables the job                                  |
| Default interval       | 24 h (`DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000`)                                                                       |
| Minimum interval guard | 1 h (`MIN_INTERVAL_MS = 1 * 60 * 60 * 1000`) — if `SLUG_REDIRECT_RELEASE_INTERVAL_MS` is set below 1 h, defaults to 24 h |
| Boot delay             | 120 s (slot 8, after receipt-retry at 105 s)                                                                             |
| Running guard          | `let running = false` prevents concurrent sweeps                                                                         |
| Sentry monitor         | None in Phase 2G                                                                                                         |
| External cron          | None — backend-owned in-process timer only                                                                               |

### C.5 Production rollout truth

| Step                                                            | Status                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| Job deployed with `SLUG_REDIRECT_RELEASE_ENABLED` absent/false  | ✅ Passed — no startup errors                                  |
| Post-deploy dry-run: `npm run slug-redirect:release:dry-run`    | ✅ Passed — `ok: true`, `mode: "dry-run"`, `candidateCount: 0` |
| `SLUG_REDIRECT_RELEASE_ENABLED=true` set in Render              | ✅ Done                                                        |
| `[slug-redirect-release] scheduled` log appeared after redeploy | ✅ Confirmed                                                   |
| First scheduled run log                                         | ✅ `candidateCount: 0`, `modifiedCount: 0`                     |

---

## D. Deferred / Not Overclaimed

The following items are explicitly out of scope for Phase 2F + 2G and must not be assumed closed:

| Item                                                                                  | Status                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Full admin-delete tombstone runtime smoke (multi-card user via admin panel)           | Deferred — not completed                             |
| Full self-service account-delete tombstone runtime smoke                              | Deferred — not completed                             |
| Upload lazy trial-delete fixture smoke (`trial_expired` reason, retention purge path) | Deferred — not completed                             |
| Org-delete bulk slug lifecycle (org card slugs on org deletion)                       | Deferred — not designed                              |
| Stale `targetCardId` cleanup (redirect records pointing to deleted target cards)      | Deferred — not designed                              |
| Admin / manual release UI (`manualReleaseRequired: true` records)                     | Deferred — not designed                              |
| Backlog sanity script for `slugredirects` collection consistency                      | Deferred — not implemented                           |
| Sentry cron monitor for `slug-redirect-release` job                                   | Deferred — no monitor in Phase 2G                    |
| Full architecture runbook for all SlugRedirect phases (Phase 2A–2G)                   | Deferred — not written                               |
| Apply operator run in production                                                      | Not performed — `candidateCount: 0`, no apply needed |

---

## E. Changed Files Summary

### Phase 2F files (5)

| File                                           | Change                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `backend/src/utils/createCardSlugTombstone.js` | NEW — tombstone creation helper                                        |
| `backend/src/utils/CardSlugReclaim.js`         | MODIFIED — blocks reclaim when active tombstone exists                 |
| `backend/src/controllers/card.controller.js`   | MODIFIED — calls `createCardSlugTombstone` on card hard-delete         |
| `backend/src/controllers/admin.controller.js`  | MODIFIED — calls `createCardSlugTombstone` via account-delete cascade  |
| `backend/src/jobs/retentionPurge.js`           | MODIFIED — calls `createCardSlugTombstone` with reason=`trial_expired` |

### Phase 2G files (5)

| File                                                 | Change                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `backend/src/utils/releaseExpiredSlugRedirects.js`   | NEW — shared pure release helper                                                               |
| `backend/scripts/release-expired-slug-redirects.mjs` | NEW — operator script (dry-run/apply)                                                          |
| `backend/src/jobs/slugRedirectRelease.js`            | NEW — in-process background job                                                                |
| `backend/src/server.js`                              | MODIFIED — starts `slugRedirectRelease` job at boot slot 120 s                                 |
| `backend/package.json`                               | MODIFIED — added `slug-redirect:release:dry-run` and `slug-redirect:release:apply` npm aliases |

---

## F. Operator Checklist

### Verifying the job is active

Check Render logs for:

```
[slug-redirect-release] scheduled — interval 86400000ms boot-delay 120000ms
```

This line confirms the job is running. If instead you see:

```
[slug-redirect-release] disabled — SLUG_REDIRECT_RELEASE_ENABLED not set to true
```

the env gate is off. Set `SLUG_REDIRECT_RELEASE_ENABLED=true` in the Render dashboard and redeploy.

### Running a manual dry-run

```
npm run slug-redirect:release:dry-run
```

Expected output when nothing to release:

```json
{"ok":true,"mode":"dry-run","dbName":"cardigo_prod","checkedAt":"<ISO>","candidateCount":0,"durationMs":<N>}
```

### Running apply (only if candidateCount > 0)

**Review the dry-run candidateCount first. Only run apply if the count is expected and acceptable.**

```
npm run slug-redirect:release:apply
```

Expected output:

```json
{"ok":true,"mode":"apply","dbName":"cardigo_prod","checkedAt":"<ISO>","candidateCount":<N>,"modifiedCount":<N>,"durationMs":<N>}
```

`modifiedCount` should equal `candidateCount` on a clean run.

### Render env configuration

| Env var                             | Required      | Value                      | Notes                                               |
| ----------------------------------- | ------------- | -------------------------- | --------------------------------------------------- |
| `SLUG_REDIRECT_RELEASE_ENABLED`     | Yes to enable | `true`                     | Absent or any other value disables the job          |
| `SLUG_REDIRECT_RELEASE_INTERVAL_MS` | No            | (omit to use 24 h default) | Min 1 h guard applies; below-min falls back to 24 h |

**Do not set `SLUG_REDIRECT_RELEASE_INTERVAL_MS`** unless intentionally overriding the 24 h default. The default is appropriate for production.

### Expected log patterns per scheduled run

Normal idle run (nothing to release):

```
[slug-redirect-release] done { candidateCount: 0, modifiedCount: 0, durationMs: <N> }
```

Run with releases:

```
[slug-redirect-release] done { candidateCount: <N>, modifiedCount: <N>, durationMs: <N> }
```

Error run:

```
[slug-redirect-release] failed <message>
```

Investigate immediately if `failed` appears.

---

_No secrets, tokens, billing credentials, raw user/card IDs, or private card content are included in this document._
