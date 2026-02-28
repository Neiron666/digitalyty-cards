# Runbook: Anonymous Card Cleanup / TTL

## Purpose & Scope

This runbook covers the automated cleanup of **anonymous** (not user-owned) draft cards
that have been inactive beyond the configured TTL.

It applies only to the backend cleanup job (`trialCleanup.js`).
It does **not** cover user-owned card deletion, admin-initiated deletion, or inline TTL-delete paths in controllers.

---

## Policy Summary

| Parameter         | Env var                     | Default          | Description                                                      |
| ----------------- | --------------------------- | ---------------- | ---------------------------------------------------------------- |
| Inactivity TTL    | `ANON_CARD_TTL_DAYS`        | `14`             | Days since last `updatedAt` before card is eligible for deletion |
| Schedule interval | `TRIAL_CLEANUP_INTERVAL_MS` | `3600000` (1 h)  | Interval between cleanup sweeps                                  |
| First-run delay   | —                           | 15 000 ms (15 s) | Hardcoded delay after server boot before first sweep             |

**Exclusions (card is never deleted by this job):**

- `status = "published"` — published cards are unconditionally excluded.
- `user != null` — user-owned cards are excluded (query filter `user: null`).
- `anonymousId` missing or null — only cards with a truthy `anonymousId` qualify.
- `isActive = false` — only active cards qualify.
- `updatedAt > anonCutoff` — card was updated within the TTL window.

**Safety skip (billing/admin):**

Even if a card passes the query filter, the job calls `resolveBilling(card, now)` and skips
cards where `source === "billing"` or `source === "adminOverride"` (counter: `skippedPaid`).

---

## Architecture (SSoT)

### Schedule

1. `server.js` calls `startTrialCleanupJob({ intervalMs })` after `connectDB`.
2. Inside, `setTimeout(15 000)` fires the first `cleanupOnce()`.
3. `setInterval(intervalMs)` fires subsequent sweeps.
4. A `running` mutex prevents overlapping sweeps (reset in `finally`).

### Candidate query shape

```text
Card.find({
  isActive: true,
  user: null,
  anonymousId: { $exists: true, $ne: null },
  status: { $ne: "published" },
  updatedAt: { $lte: <now − TTL> }
}).select("billing plan uploads gallery design anonymousId user status updatedAt")
```

### 3-step deletion order (per card)

```text
Step 1 — Supabase media removal
  ├─ collectSupabasePathsFromCard(card)
  ├─ normalizeSupabasePaths(rawPaths)   → keeps only "cards/" prefix
  └─ removeObjects({ paths, buckets })
  FAIL → log, increment failedStorageDeletesCount, SKIP card (continue)

Step 2 — Cascade delete (Mongo related docs)
  └─ deleteCardCascade({ cardId })
      ├─ Lead.deleteMany({ card: cardId })
      └─ CardAnalyticsDaily.deleteMany({ cardId })
  FAIL → log, SKIP card (continue)

Step 3 — Card document deletion
  └─ Card.deleteOne({ _id: card._id })
  Only reached if Steps 1 + 2 succeeded.
```

**Fail-safe semantics:** if any step fails, the card document is preserved.
The job will retry the card on the next sweep (card still matches the query).

### Helpers

| Helper                         | Location                         | Responsibility                                                                                                                                |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `collectSupabasePathsFromCard` | `src/utils/supabasePaths.js`     | Collects `gallery[].path`, `gallery[].thumbPath`, `uploads[].path`, `design.{backgroundImagePath, coverImagePath, avatarImagePath, logoPath}` |
| `normalizeSupabasePaths`       | `src/utils/supabasePaths.js`     | Filters to `cards/` prefix only (safety guard)                                                                                                |
| `deleteCardCascade`            | `src/utils/cardDeleteCascade.js` | Parallel `Lead.deleteMany` + `CardAnalyticsDaily.deleteMany`                                                                                  |

### Bucket resolution

| Function                                            | Env var                                | Fallback                  |
| --------------------------------------------------- | -------------------------------------- | ------------------------- |
| `getAnonPrivateBucketName({ allowFallback: true })` | `SUPABASE_STORAGE_BUCKET_ANON_PRIVATE` | `SUPABASE_STORAGE_BUCKET` |
| `getPublicBucketName()`                             | `SUPABASE_STORAGE_BUCKET`              | _(required, no fallback)_ |

For anonymous-owned cards, both buckets are tried (deduplicated via `Set`).
`removeObjects` tries each bucket in order; success in any one bucket → return OK.

---

## What Is Deleted

| Store    | Collection / Bucket          | What                                                                                   | Condition                    |
| -------- | ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- |
| Mongo    | `cards`                      | The card document itself                                                               | Step 3 only                  |
| Mongo    | `leads`                      | All leads referencing `card: cardId`                                                   | Step 2 (`deleteCardCascade`) |
| Mongo    | `cardanalyticsdailies`       | All daily analytics with `cardId`                                                      | Step 2 (`deleteCardCascade`) |
| Supabase | anon-private + public bucket | Gallery images (`gallery[].path`, `gallery[].thumbPath`)                               | Step 1                       |
| Supabase | anon-private + public bucket | Upload records (`uploads[].path`)                                                      | Step 1                       |
| Supabase | anon-private + public bucket | Design assets (`backgroundImagePath`, `coverImagePath`, `avatarImagePath`, `logoPath`) | Step 1                       |

---

## Error Handling Semantics

| Failure                         | Consequence                                               | Card preserved? | Counter incremented                    |
| ------------------------------- | --------------------------------------------------------- | :-------------: | -------------------------------------- |
| Supabase `removeObjects` throws | Card is **not** deleted; retried next sweep               |       Yes       | `failedStorageDeletesCount`            |
| `deleteCardCascade` throws      | Card is **not** deleted; retried next sweep               |       Yes       | _(logged only)_                        |
| `Card.deleteOne` throws         | Uncaught within loop body → caught by outer `try/catch`   |       Yes       | _(logged as general failure)_          |
| Entire `cleanupOnce` throws     | Caught by outer `try/catch`, `running` reset in `finally` |       N/A       | _(logged as `[trial-cleanup] failed`)_ |

**Key distinction:**

- `deletedCount` = cards where all 3 steps succeeded (card is gone).
- `failedStorageDeletesCount` = cards where Step 1 failed (card is preserved, will retry).

---

## Monitoring

### Log prefixes

All cleanup logs use the prefix `[trial-cleanup]`.

| Log line                                                   | Meaning                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `[trial-cleanup] scheduled { intervalMs }`                 | Job registered at boot (once)                               |
| `[trial-cleanup] done { candidates, deletedCount, … }`     | Sweep completed (only printed if `candidates > 0`)          |
| `[trial-cleanup] heartbeat { candidates: 0, … }`           | Idle heartbeat (rate-limited, every ~6 h when 0 candidates) |
| `[trial-cleanup] supabase remove failed { cardId, error }` | Step 1 failure for a specific card                          |
| `[trial-cleanup] cascade delete failed { cardId, error }`  | Step 2 failure for a specific card                          |
| `[trial-cleanup] failed <message>`                         | Unhandled error in the sweep                                |

### Sentry Crons

Monitor slug: `trial-cleanup`. Each sweep sends `in_progress` → `ok` / `error` check-ins via `Sentry.withMonitor`. Active only when `SENTRY_DSN` is set.

### What silence means

With the heartbeat feature, the job logs `[trial-cleanup] heartbeat` at most once every ~6 hours even when there are 0 candidates.
If there are **no** `[trial-cleanup]` log lines (no `done`, no `heartbeat`) for longer than ~6 hours, the job is likely dead or never started.

**To distinguish:** check that `[trial-cleanup] scheduled` appeared at boot. If it did and heartbeat lines are present, the job is alive with 0 candidates.

### Windows PowerShell log commands

Search recent logs (assuming log file or Render log export):

```powershell
# Check if job was scheduled at boot
Select-String -Path .\backend.log -Pattern "\[trial-cleanup\] scheduled"

# Find all cleanup sweep results
Select-String -Path .\backend.log -Pattern "\[trial-cleanup\] done"

# Find failures
Select-String -Path .\backend.log -Pattern "\[trial-cleanup\] (supabase remove failed|cascade delete failed|failed)"

# Count total deletions in log
(Select-String -Path .\backend.log -Pattern "\[trial-cleanup\] done").Count
```

For Render or Docker: replace file path with `docker logs <container> 2>&1 | Select-String …` or use the hosting dashboard log search with `[trial-cleanup]`.

---

## Tuning

| Parameter                   | How to change |                        Restart required?                         | Safe range                                                                          |
| --------------------------- | ------------- | :--------------------------------------------------------------: | ----------------------------------------------------------------------------------- |
| `ANON_CARD_TTL_DAYS`        | Set env var   | **Yes** (read on each sweep, but env is loaded at process start) | `>= 1` (clamped by `Math.max(1, …)`)                                                |
| `TRIAL_CLEANUP_INTERVAL_MS` | Set env var   |           **Yes** (used at `setInterval` registration)           | Recommended: `>= 300000` (5 min). Very low values increase DB load without benefit. |

**Recommendations:**

- Do not set `ANON_CARD_TTL_DAYS` below 1 (the code clamps it, but intent should match config).
- Do not set `TRIAL_CLEANUP_INTERVAL_MS` below 60 000 (1 min) in production.
- After changing either value, **restart the backend process** for the new value to take effect.

> Note: `ANON_CARD_TTL_DAYS` is re-read from `process.env` on each sweep invocation,
> so in theory a hot-reload of env (e.g., Render env update + restart) is sufficient.
> But `TRIAL_CLEANUP_INTERVAL_MS` is only read once at `startTrialCleanupJob` call time.

---

## Alerts (Suggested)

| Alert                    | Condition                                                            | Severity | Notes                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage cleanup failures | `failedStorageDeletesCount > 0` in `[trial-cleanup] done` log        | Warning  | Indicates Supabase connectivity or bucket misconfiguration. Cards are preserved and will retry.                                                           |
| Job silence              | No `[trial-cleanup]` log lines for `> 2 × TRIAL_CLEANUP_INTERVAL_MS` | Warning  | May indicate job crash or server restart loop. Check that `[trial-cleanup] scheduled` appeared at boot. Caveat: 0 candidates also produces no `done` log. |
| High skip rate           | `skippedPaid > 0` consistently                                       | Info     | Anomaly: anonymous cards should not have billing/adminOverride. Investigate data integrity.                                                               |

---

## Troubleshooting

### Supabase credentials / bucket misconfiguration

**Symptom:** `[trial-cleanup] supabase remove failed` with auth or bucket-not-found errors.

**Resolution:**

1. Verify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are set and valid.
2. Verify `SUPABASE_STORAGE_BUCKET` exists in Supabase dashboard.
3. If using a separate anon bucket: verify `SUPABASE_STORAGE_BUCKET_ANON_PRIVATE` exists.
4. Cards are preserved — once creds are fixed, next sweep will retry.

### Mongo connectivity

**Symptom:** `[trial-cleanup] failed` with connection/timeout errors.

**Resolution:**

1. Check `MONGO_URI` and network connectivity.
2. The job will retry on the next interval tick automatically.

### `running` mutex / stuck job

**Symptom:** no sweep logs despite candidates existing and sufficient time elapsed.

**Explanation:** the `running` boolean prevents concurrent sweeps. It is reset in a `finally` block,
so it cannot get stuck unless the process itself hangs (e.g., infinite await on a Mongo/Supabase call).

**Resolution:**

1. Restart the backend process.
2. If recurring: investigate whether a specific card's media removal or cascade causes a hang.

### Read-only candidate check

To inspect how many cards would be eligible for cleanup **without deleting anything**:

```powershell
# From backend/ directory, using a one-off Node script:
node -e "
  import 'dotenv/config';
  import Card from './src/models/Card.model.js';
  import { connectDB } from './src/config/db.js';
  await connectDB(process.env.MONGO_URI);
  const ttl = Number(process.env.ANON_CARD_TTL_DAYS) || 14;
  const cutoff = new Date(Date.now() - ttl * 86400000);
  const count = await Card.countDocuments({
    isActive: true, user: null,
    anonymousId: { $exists: true, $ne: null },
    status: { $ne: 'published' },
    updatedAt: { $lte: cutoff }
  });
  console.log({ pendingCandidates: count, ttlDays: ttl, cutoff: cutoff.toISOString() });
  process.exit(0);
" --input-type=module
```

---

## Verification Checklist

- [ ] **Job started:** after server boot, logs contain `[trial-cleanup] scheduled { intervalMs: <value> }`.
- [ ] **First sweep:** within ~15 s of boot, either `[trial-cleanup] done` (if candidates exist) or silence (0 candidates).
- [ ] **Health check:** `GET /api/health` returns 200 (confirms server is running; job is registered at boot).
- [ ] **Env vars present:** `ANON_CARD_TTL_DAYS` and `TRIAL_CLEANUP_INTERVAL_MS` appear in `.env` / hosting env config.
- [ ] **Bucket exists:** Supabase dashboard shows the bucket(s) referenced by `SUPABASE_STORAGE_BUCKET` (and `SUPABASE_STORAGE_BUCKET_ANON_PRIVATE` if set).
