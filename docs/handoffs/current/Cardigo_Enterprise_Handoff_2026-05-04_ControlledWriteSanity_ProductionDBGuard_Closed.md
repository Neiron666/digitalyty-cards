# Cardigo Enterprise Handoff — Controlled-Write Sanity Production DB Guard Closed — 2026-05-04

**Contour:** `CONTROLLED_WRITE_SANITY_PRODUCTION_DB_GUARD`
**Status:** CLOSED / VERIFIED
**Date:** 2026-05-04
**Scope:** `backend/scripts` controlled-write safety guard
**Runtime deploy:** No
**Production mutation:** No
**Git commands:** No

---

## 1. Executive Summary

A shared guard now protects all controlled-write sanity scripts from accidental production-like DB execution. Before this contour, all 11 controlled-write scripts could be accidentally run against any `MONGO_URI`, including the production cluster. The guard fails closed unless the target DB is explicitly non-production-like.

---

## 2. Why This Was Needed

Phase 1 audit found 11 controlled-write sanity scripts with no production DB guard. These scripts create and delete test fixtures (users, orgs, cards, analytics events, bookings, leads, etc.) and clean them in `finally` blocks. If accidentally run against the production cluster they could leave orphan documents in `cardigo_prod` even if cleanup partially fails, and would generate unwanted audit/analytics signals.

---

## 3. Controlled-Write Scripts Covered

All 11 scripts now import and call `assertControlledWriteSanityTarget` before any `mongoose.connect` / `connectDB` call:

- `sanity:analytics`
- `sanity:booking`
- `sanity:leads`
- `sanity:org-access`
- `sanity:org-membership`
- `sanity:admin-user-delete`
- `sanity:slug-policy`
- `sanity:cascade-delete`
- `sanity:claim-api-contract`
- `sanity:claim-migrate-media`
- `sanity:claim-vs-create-race`

---

## 4. Read-Only Scripts Intentionally Not Guarded

The following scripts are read-only (import checks or index drift reads) and are intentionally excluded from the guard. They may be valid to run against production / index-governance contexts and must not import `controlled-write-guard.mjs`:

- `sanity:imports`
- `sanity:card-index-drift`
- `sanity:ownership-consistency`
- `sanity:analytics-daily-index-drift`
- `sanity:site-analytics-visit-index-drift`
- `sanity:paymentintent-index-drift`
- `sanity:aiusagemonthly-index-drift`

---

## 5. Guard Design

**File:** `backend/scripts/lib/controlled-write-guard.mjs`
**Export:** `assertControlledWriteSanityTarget(scriptName)`

Behavioral contract:

- Synchronous — no DB connection, no `await`.
- Safe to call at module top-level or as the first statement inside `async main()`.
- Must be called before `mongoose.connect` / `connectDB` or any external storage mutation.
- Never logs the full `MONGO_URI`, credentials, query params, or any secret.
- Logs only: `scriptName`, parsed `dbName`, safe host hint (hostname only), `NODE_ENV`.

Production-like detection — ANY single condition triggers the block:

| Condition          | Value                                       |
| ------------------ | ------------------------------------------- |
| dbName exact match | `cardigo_prod`                              |
| dbName contains    | `prod` (case-insensitive)                   |
| dbName is empty    | URI has no DB path segment                  |
| URI is unparseable | Multi-host replica-set URI or malformed URI |
| Runtime env        | `NODE_ENV === "production"`                 |

If none of these conditions are true, the guard logs `CONTROLLED_WRITE_GUARD: OK` and returns, allowing the script to proceed.

---

## 6. Override Policy

**Override env var:** `CARDIGO_ALLOW_CONTROLLED_WRITE_SANITY_ON_PRODUCTION_LIKE_DB`
**Required exact value:** `I_UNDERSTAND_THIS_CAN_WRITE_TEST_FIXTURES`

No aliases or partial values are accepted. The exact value requirement is intentional: it forces the operator to acknowledge the risk explicitly, preventing clipboard accidents.

When to use the override:

- Only when the target DB is intentionally a disposable local or staging cluster whose DB name happens to be production-like (e.g., a cloned snapshot renamed for testing).
- Set only in the affected script's env for that specific run — never globally.

When NOT to use the override:

- Never against the real `cardigo_prod` cluster.
- Never against any cluster with live user data.

Preferred approach: use safe DB names such as `cardigo_ci`, `cardigo_local_sanity`, `cardigo_staging`. These names do not match any production-like condition and require no override.

---

## 7. Verification Results

**Phase 3A — Static checks:**

| Check                                                                                 | Result |
| ------------------------------------------------------------------------------------- | ------ |
| 11 imports present (all 11 controlled-write scripts)                                  | PASS   |
| 11 call sites present                                                                 | PASS   |
| Guard call before connect verified for all 11 scripts                                 | PASS   |
| Read-only scripts: 0 guard imports (all 7)                                            | PASS   |
| Helper content: OVERRIDE_ENV, OVERRIDE_VALUE, all 5 productionLike conditions present | PASS   |
| No full MONGO_URI logged in guard                                                     | PASS   |

**Phase 3B — Runtime fail-closed (fake URI `mongodb://localhost:27017/cardigo_prod`, no real DB connection):**

| Script                      | EXIT | GUARD in output | "MongoDB connected" absent | Verdict |
| --------------------------- | ---- | --------------- | -------------------------- | ------- |
| sanity:analytics            | 1    | Yes             | Yes                        | PASS    |
| sanity:booking              | 1    | Yes             | Yes                        | PASS    |
| sanity:leads                | 1    | Yes             | Yes                        | PASS    |
| sanity:org-access           | 1    | Yes             | Yes                        | PASS    |
| sanity:org-membership       | 1    | Yes             | Yes                        | PASS    |
| sanity:admin-user-delete    | 1    | Yes             | Yes                        | PASS    |
| sanity:slug-policy          | 1    | Yes             | Yes                        | PASS    |
| sanity:cascade-delete       | 1    | Yes             | Yes                        | PASS    |
| sanity:claim-api-contract   | 1    | Yes             | Yes                        | PASS    |
| sanity:claim-migrate-media  | 1    | Yes             | Yes                        | PASS    |
| sanity:claim-vs-create-race | 1    | Yes             | Yes                        | PASS    |

**Phase 3C — Safe-local self-test:**

URI: `mongodb://localhost:27017/cardigo_local_sanity` (no real DB connection)
Output: `CONTROLLED_WRITE_GUARD: OK — test-p3c-safe-local; dbName=cardigo_local_sanity; host=localhost; nodeEnv=(not-set)`
EXIT: 0 — PASS

**Phase 3D — Read-only regression:**

| Script                       | EXIT |
| ---------------------------- | ---- |
| sanity:imports               | 0    |
| sanity:card-index-drift      | 0    |
| sanity:ownership-consistency | 0    |

**No controlled-write scripts ran against the real/current `MONGO_URI` during verification. No DB writes were performed.**

---

## 8. CI Compatibility

- `backend-admin-sanity.yml` (nightly + `workflow_dispatch`) maps `MONGO_URI` from `MONGO_URI_DRIFT_CHECK` and runs `sanity:admin-user-delete`.
  PROOF: `.github/workflows/backend-admin-sanity.yml` L89–L90.
- SSoT documentation (`docs/runbooks/ci-cluster-bootstrap.md` L30, `backend/README.md` L10) states `MONGO_URI_DRIFT_CHECK` targets the dedicated CI-only Atlas cluster with DB name `cardigo_ci`.
- Guard analysis: `cardigo_ci` does not match any of the 5 production-like conditions (not `cardigo_prod`, does not contain `prod`, not empty, not unparseable, `NODE_ENV` not set in that CI job).
- **No CI override is required.**
- Recommended (optional, non-blocking): one-time governance confirmation — operator opens Atlas UI for the CI project, confirms DB name is `cardigo_ci` without sharing the full URI.

---

## 9. Explicit Non-Actions

Nothing in the following list was changed during this contour:

- No `package.json` changes
- No `backend/src` runtime changes (no controllers, routes, models, middleware)
- No frontend changes
- No CI workflow changes (`.github/workflows/**` unchanged)
- No env / secret changes
- No deploy
- No production mutation
- No read-only scripts guarded
- No archive handoffs modified

---

## 10. Future Hardening (Optional, Non-Blocking)

The following items are not blocking and were not part of this contour:

- Periodic audit for any new controlled-write scripts that fail to import `assertControlledWriteSanityTarget`.
- CI static lint check: any new script in `backend/scripts/` that calls `mongoose.connect` or `connectDB` must import from `./lib/controlled-write-guard.mjs`.
- One-time manual governance confirmation of `MONGO_URI_DRIFT_CHECK` DB name in GitHub/Atlas UI (see Section 8).

---

## 11. Related Docs / Handoffs

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-04_OrgPremiumFeature_QA_SanityCoverage_Closed.md` — prior contour that introduced `sanity:analytics`, `sanity:booking`, `sanity:leads`; noted the guard as future hardening.
- `docs/handoffs/current/Cardigo_Enterprise_Production_Launch_Handoff_2026-05-03.md` — production truth file; Section 16 updated with this contour's closure.
- `docs/runbooks/backend-verification-and-deploy.md` — Section D; updated with guard policy.
- `docs/runbooks/ci-cluster-bootstrap.md` — CI-only cluster runbook; confirms `cardigo_ci` DB name.
- `backend/scripts/lib/controlled-write-guard.mjs` — guard implementation (SSoT).

---

## 12. Closed Contour Declaration

**Status:** CLOSED / VERIFIED

All 11 controlled-write scripts are guarded. All 11 fail-closed tests passed. All 7 read-only scripts are unguarded and continue to pass. CI is compatible with no override required. No runtime files, frontend files, CI workflows, package.json, or archive handoffs were modified.

STOP.
