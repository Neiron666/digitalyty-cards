## Sanity scripts

## CI policy (enterprise)

- `sanity:imports` is a CI gate on **every** backend PR and on `main`/`release/**` pushes.
    - It must not require secrets and must never start the HTTP server.
- `sanity:admin-user-delete` is a **mutating integration sanity** (Mongo + Supabase Storage).
    - Run **manual/nightly only** (not on every PR).
    - Requires staging secrets: `MONGO_URI` (or `MONGO_URI_DRIFT_CHECK`), `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.

- `sanity:ownership-consistency` checks User↔Card ownership invariants (A–E) and prints a JSON report.
- Exit codes: `0` = clean, `2` = issues found, `1` = runtime error.
- Windows: `npm.cmd run sanity:ownership-consistency`

## Cleanup / TTL

- `TRIAL_CLEANUP_INTERVAL_MS`: cleanup job schedule interval in ms (default: `3600000` = 1h).
- `ANON_CARD_TTL_DAYS`: anonymous draft TTL by inactivity, based on `Card.updatedAt` (default: `14`).

## Trial & Retention Lifecycle

| Variable                                | Default    | Purpose                                                        |
| --------------------------------------- | ---------- | -------------------------------------------------------------- |
| `TRIAL_ROLLOUT_DATE`                    | -          | ISO 8601 cutoff; users created before this date are ineligible |
| `TRIAL_DURATION_DAYS`                   | `10`       | Premium trial length in days                                   |
| `TRIAL_LIFECYCLE_RECONCILE_INTERVAL_MS` | `21600000` | Trial reconcile job interval (6 h)                             |
| `TRIAL_LIFECYCLE_HEARTBEAT_MS`          | `43200000` | Reconcile heartbeat log interval (12 h)                        |
| `RETENTION_GRACE_DAYS`                  | `90`       | Days after trial expiry before card purge eligibility          |
| `RETENTION_PURGE_INTERVAL_MS`           | `21600000` | Retention purge job interval (6 h)                             |
| `RETENTION_PURGE_HEARTBEAT_MS`          | `43200000` | Purge heartbeat log interval (12 h)                            |

### Trial Reminder (pre-expiry lifecycle email)

Sends one reminder email to each trial user ~day 9 of the trial. Compliance contour implemented and verified (2026-04-12); rollout deliberately gated off pending explicit operator action — see `docs/runbooks/trial-lifecycle-ssot.md` §13.11.

| Variable                                  | Default         | Purpose                                           |
| ----------------------------------------- | --------------- | ------------------------------------------------- |
| `TRIAL_REMINDER_ENABLED`                  | `false`         | Production gate — set to `true` to enable sending |
| `TRIAL_REMINDER_INTERVAL_MS`              | `7200000`       | Job tick interval (ms)                            |
| `TRIAL_REMINDER_WINDOW_START_HOURS`       | `20`            | Lower bound of expiry window (h from now)         |
| `TRIAL_REMINDER_WINDOW_END_HOURS`         | `32`            | Upper bound of expiry window (h from now)         |
| `TRIAL_REMINDER_SEND_HOUR_MIN`            | `9`             | Earliest Asia/Jerusalem hour to send              |
| `TRIAL_REMINDER_SEND_HOUR_MAX`            | `18`            | Latest Asia/Jerusalem hour (exclusive)            |
| `TRIAL_REMINDER_STALE_CLAIM_THRESHOLD_MS` | `14400000`      | Age after which a claim is treated as abandoned   |
| `TRIAL_REMINDER_HEARTBEAT_MS`             | `43200000`      | Heartbeat log interval (ms)                       |
| `MAILJET_TRIAL_REMINDER_SUBJECT`          | Hebrew fallback | Email subject                                     |
| `MAILJET_TRIAL_REMINDER_TEXT_PREFIX`      | Hebrew fallback | Plain-text opening line                           |
| `MAILJET_TRIAL_REMINDER_LOGO_URL`         | `""`            | Contour-specific logo URL                         |
| `MAILJET_BRAND_LOGO_URL`                  | `""`            | Shared brand logo fallback                        |

All vars are optional (in-code defaults apply). None trigger startup failure if absent.

See `docs/runbooks/trial-lifecycle-ssot.md` for the full lifecycle runbook.

## AI Feature Flags

Three independent feature flags control AI generation surfaces:

| Variable           | Surface  | Default |
| ------------------ | -------- | ------- |
| `AI_ABOUT_ENABLED` | About AI | `false` |
| `AI_FAQ_ENABLED`   | FAQ AI   | `false` |
| `AI_SEO_ENABLED`   | SEO AI   | `false` |

Each accepts `1`, `true`, `on`, `yes` (case-insensitive). When disabled, the respective endpoint returns 503 `AI_DISABLED`; other surfaces remain unaffected. Also requires `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`). See `docs/ai-about-workstream.md` §7 for full details.

## Index Governance

Runtime ≠ Sanity ≠ Migration:

- Runtime (`connectDB`): Mongoose `autoIndex/autoCreate` are **disabled by default** to prevent startup crashes from index drift.
    - Override via ENV: `MONGOOSE_AUTO_INDEX=true|false`, `MONGOOSE_AUTO_CREATE=true|false`.
- Sanity (`sanity:card-index-drift`): **read-only** drift control (no index mutations). Prints `EXIT:<code>`.
    - `missing/mismatches` fail the check (`EXIT:1`).
    - `unexpected` and `warnings` are informational and do NOT fail when `missing/mismatches = 0`.
- Migration (`migrate:card-user-index`): manual repair tool for the `user_1` index options.
    - Dry-run by default (prints plan and `EXIT:1` when drift is detected).
    - Apply must be manual in a maintenance window:
        - `npm.cmd run migrate:card-user-index -- --apply --i-understand-index-downtime`
        - Alternative unlock: `set ALLOW_INDEX_MIGRATION=1` (and `--force` is required when `NODE_ENV=production`).
    - DoD: after apply, `npm.cmd run sanity:card-index-drift` must return `EXIT:0`.
- Migration (`migrate:blogpost-indexes`): governs BlogPost indexes (`slug_1`, `status_1_publishedAt_-1`, `previousSlugs_1`).
    - Dry-run by default. Apply: `npm.cmd run migrate:blogpost-indexes -- --apply`
    - Includes duplicate-slug safety check before creating unique index.
    - Details: `docs/runbooks/docs_blog_seo_og_runbook.md` §10.
- Migration (`migrate:user-auth-indexes`): **canonical** index-apply path for all auth token collections (`users`, `emailverificationtokens`, `emailsignuptokens`, `passwordresets`).
    - Covers `passwordresets` indexes: `tokenHash_1` (unique), `userId_1`, `expiresAt_1`, `usedAt_1`.
    - Also creates `trialReminderSentAt_1_trialEndsAt_1` compound index on `users` (supports reminder candidate query). Confirmed applied 2026-04-12.
    - Dry-run by default. Apply: `npm.cmd run migrate:user-auth-indexes -- --apply`
    - Includes per-collection duplicate precheck before creating unique index.
    - Runs post-check after apply to verify all critical unique indexes are present.
    - **No TTL index is created by default.** TTL on `expiresAt` is a separate operator decision (see `docs/runbooks/auth-forgot-reset-runbook.md` §Index governance).
    - **Do NOT use `autoIndex`/`autoCreate` as a substitute** - runtime has both disabled by default.
- Migration (`migrate:email-marketing-indexes`): governs indexes for the marketing consent/unsubscribe collections (`marketingoptouts`, `emailunsubscribetokens`).
    - `marketingoptouts.emailKey_1` (unique) — suppression tombstone lookup key.
    - `emailunsubscribetokens.tokenHash_1` (unique), `emailNormalized_1`, `expiresAt_1`, `usedAt_1`.
    - All five indexes confirmed applied 2026-04-12.
    - Dry-run by default. Apply: `npm.cmd run migrate:email-marketing-indexes -- --apply`

Do NOT run `--apply` automatically in CI.

## Runbooks” / “Operational docs

docs/auth-forgot-reset-runbook.md
docs/auth-signup-token-runbook.md
docs\runbooks\anon-card-cleanup.md
docs\runbooks\cardigo_billing_support_runbook.md
docs\runbooks\docs_blog_seo_og_runbook.md
docs\runbooks\image-upload-incident-runbook.md

## Release sanity gates (SSoT)

Windows commands (must-pass before release):

`npm.cmd run sanity:cascade-delete`
`npm.cmd run sanity:claim-migrate-media`
`npm.cmd run sanity:claim-api-contract`
`npm.cmd run sanity:ownership-consistency`
`npm.cmd run sanity:claim-vs-create-race`
`npm.cmd run sanity:slug-policy`

Exit code semantics:

- Most sanity scripts: `0` = OK, `1` = FAILED/exception.
- `sanity:ownership-consistency`: `0` = clean, `2` = issues found, `1` = exception.

Notes:

- `sanity:cascade-delete` is NOT read-only (creates/deletes fixtures).
- The other gates are read-only as currently implemented.
- `slugPolicy` is returned only from `GET /api/cards/mine` (user branch) when `exposeSlugPolicy:true`; `sanity:slug-policy` guards against leaking it via public/other endpoints.
- WARNING: `sanity:slug-policy` does not currently gate on `remaining/limit` fields in the 429 payload (it records it as `checks.limitPayload` only).

TENANT_HOST_ALLOWLIST:

- Wildcard `*` is forbidden (misconfig; ignored).
- Example local: `TENANT_HOST_ALLOWLIST=localhost,127.0.0.1,127.0.0.2` (no ports; ports are stripped from Host).
- If host is not allowlisted: public/SEO routes return `404`, analytics returns `204` (no DB lookup).

Allowed Hosts (MongoDB allowlist + ENV bootstrap):

- The effective allowlist is a UNION of:
    - `TENANT_HOST_ALLOWLIST` (ENV bootstrap; always applied)
    - `AllowedHost` collection in MongoDB where `isActive=true`
- Cache: backend keeps an in-memory cache (TTL default 60s).
- Failure mode: if MongoDB allowlist query fails, backend falls back to ENV allowlist only (fail-closed for DB-managed hosts).

Admin management:

- List: `GET /api/admin/allowed-hosts`
- Add: `POST /api/admin/allowed-hosts` with `{ host, note? }`
- Update: `PATCH /api/admin/allowed-hosts/:id` with `{ isActive?, note? }`
- Deactivate (soft-delete): `DELETE /api/admin/allowed-hosts/:id`

Bootstrap guidance:

- Keep the core production domains in `TENANT_HOST_ALLOWLIST` so the admin panel remains reachable even if Mongo is temporarily unavailable.
- Add new customer domains via the admin API/UI so changes persist without redeploy.
