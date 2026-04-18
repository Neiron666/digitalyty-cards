# CI-Only Atlas Cluster Bootstrap

> **Tier 2 — Architecture / Ops Contract**
> Canonical runbook for the dedicated CI-only MongoDB Atlas cluster used by GitHub Actions workflows.

_Established: 2026-04-18_

---

## 1. Context and Purpose

GitHub Actions runs on dynamically addressed `ubuntu-latest` runners. Because the production Atlas cluster only allowlists static Render outbound ranges, GitHub-hosted runners cannot reach it.

To enable Mongo-backed CI checks (card index drift gate, admin sanity integration), a **dedicated CI-only Atlas cluster** was created. This cluster:

- Contains **no production data**.
- Mirrors only the `cards` collection index structure required for drift verification.
- Is in a **separate Atlas project** from the production cluster (reason: M0 free-tier allows only one cluster per Atlas project; the production project already has its cluster).
- Has open Network Access (`0.0.0.0/0`) intentionally, because it holds no sensitive data and GitHub Actions runner IPs are dynamic.

**This `0.0.0.0/0` posture must never be copied to production.**

---

## 2. Cluster Configuration

| Property       | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Atlas project  | Separate project from production                               |
| DB name        | `cardigo_ci`                                                   |
| Cluster tier   | M0 (free)                                                      |
| Network Access | `0.0.0.0/0` — intentional, CI cluster only, no production data |

The production cluster and CI cluster have **no shared data, users, or collections** beyond index structure parity on the `cards` collection.

---

## 3. Production Cluster Post-Hardening Truth

After the CI-only cluster was established, the temporary `0.0.0.0/0` rule was removed from the production Atlas cluster.

**Production Atlas Network Access (post-hardening):**

| CIDR             | Purpose                       |
| ---------------- | ----------------------------- |
| `74.220.51.0/24` | Render backend outbound range |
| `74.220.59.0/24` | Render backend outbound range |

**Verification method:** Render service logs — confirmed `MongoDB connected` after `0.0.0.0/0` was removed from production.

**Frontend smoke:** `https://cardigo.co.il` returns 200. This confirms the full request path (Netlify → backend → MongoDB) is healthy.

### Why direct `/api/health` curl may return 403

After the proxy gate was enabled, a direct `curl` to the production backend URL returns:

```
HTTP/2 403
{"code":"PROXY_FORBIDDEN"}
```

This is **expected behavior**. It is the proxy gate (`CARDIGO_PROXY_SHARED_SECRET`) rejecting a non-proxied request. It is not a MongoDB connectivity failure. Do not diagnose this as a Mongo error.

**Correct production verification path:** Render logs + frontend smoke, not direct API curl to protected endpoints.

---

## 4. GitHub Actions Secret Split

| Secret                  | Points to                 | Purpose                                                                                 |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `MONGO_URI`             | Production Atlas cluster  | Runtime application truth. **Must not be used in GitHub Actions CI jobs.**              |
| `MONGO_URI_DRIFT_CHECK` | **CI-only Atlas cluster** | Required for all GitHub Actions Mongo-backed jobs. Not a fallback — a hard requirement. |

**Hardened CI behavior (no fallback to production):**

- `MONGO_URI_DRIFT_CHECK` is **required** by all Mongo-backed CI jobs. There is no fallback to production `MONGO_URI`.
- PR drift check: if `MONGO_URI_DRIFT_CHECK` is missing → warn + skip (exit 0). No fallback.
- push/`workflow_dispatch` drift gate: if `MONGO_URI_DRIFT_CHECK` is missing → hard-fail (exit 1). No fallback.
- Admin sanity (nightly/manual): if `MONGO_URI_DRIFT_CHECK` is missing → hard-fail (exit 1). No fallback.

**Law:** GitHub Actions Mongo-backed jobs must not reach the production cluster. `MONGO_URI_DRIFT_CHECK` must always point to the CI-only cluster.

Do not include raw URI values in documentation or code comments.

---

## 5. Bootstrap Procedure

This procedure is required once for a blank CI cluster, and must be re-run if the CI cluster is recreated.

### 5.1 Prerequisites

- `MONGO_URI_DRIFT_CHECK` CI cluster URI available (from GitHub Secrets or local secure note)
- Working directory: `backend/`
- `npm ci` completed
- `backend/.env` must **not** be modified — use session-scoped env override only

### 5.2 Step 0 — Set session-scoped MONGO_URI

Set `MONGO_URI` for this PowerShell session only. This overrides `dotenv` for all subsequent scripts without modifying `.env`.

```powershell
# PowerShell — session scope only, does NOT modify .env
$env:MONGO_URI = "<CI_CLUSTER_URI>"
```

Replace `<CI_CLUSTER_URI>` with the value from your secure note / GitHub Secrets. Never hardcode the URI in documentation or scripts.

Verify the variable is set:

```powershell
$env:MONGO_URI | Select-String "cardigo_ci"
```

### 5.3 Step 1 — Create the empty `cards` collection

A blank Atlas cluster has no collections. The migration scripts require the collection to exist before they can operate on its indexes.

Run in `mongosh` connected to the CI cluster:

```js
use cardigo_ci
db.createCollection("cards")
```

Verify:

```js
show collections
// cards
```

### 5.4 Step 2–5 — Run card index migrations in order

All four must be run in sequence. Each is idempotent — re-running is safe if the index already exists.

**Script 1 — `user_1` index:**

```powershell
node scripts/migrate-card-user-index.mjs --apply --i-understand-index-downtime
```

**Script 2 — `anonymousId` unique+sparse (critical for drift check):**

```powershell
node scripts/migrate-card-anonymousid-index.mjs --apply
```

**Script 3 — `orgId_1_user_1` compound index:**

```powershell
node scripts/migrate-card-org-user-index.mjs --apply
```

**Script 4 — `tenantKey_1_slug_1` index (no npm script — invoke `node` directly):**

```powershell
node scripts/migrate-tenantkey-slug.mjs --apply --create-index
```

Note: `migrate-tenantkey-slug.mjs` has no `npm run` script. It must be invoked via `node` directly. The `--create-index` flag is required; without it the index will not be created even in `--apply` mode.

Expected exit for each script: `EXIT:0`.

### 5.5 Step 3 — Local drift verification

After all 4 scripts pass:

```powershell
npm run sanity:card-index-drift
```

Expected output:

```json
{ "ok": true, "missing": [], "mismatches": [] }
EXIT:0
```

Warnings are expected and non-blocking (see §6). The presence of warnings does not affect `ok: true`.

### 5.6 Step 4 — Clear session env

```powershell
Remove-Item Env:MONGO_URI
```

Verify `backend/.env` is unchanged (it must not have been modified at any point during bootstrap).

---

## 6. Accepted Non-Blocking Warnings

After a correct bootstrap, `sanity:card-index-drift` reports 5 non-blocking warnings. These do **not** fail the drift gate when `ok: true`, `missing: []`, `mismatches: []`.

| Warning key       | Source                                                              | Why non-blocking                                                       |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tenantKey:1`     | `Card.model.js` — path-level `index: true` on `tenantKey` field     | Path-level unnamed index; tracked as warning-only by the sanity script |
| `orgId:1`         | `Card.model.js` — path-level `index: true` on `orgId` field         | Path-level unnamed index; tracking-only                                |
| `status:1`        | `Card.model.js` — path-level `index: true` on `status` field        | Path-level unnamed index; tracking-only                                |
| `trialDeleteAt:1` | `Card.model.js` — path-level `index: true` on `trialDeleteAt` field | Path-level unnamed index; tracking-only                                |
| `adminTier:1`     | `Card.model.js` — path-level `index: true` on `adminTier` field     | Path-level unnamed index; tracking-only                                |

**Law:** Only `anonymousId:1` is classified as a critical unnamed index. Missing `anonymousId:1` fails the drift gate. All other unnamed/path-level indexes are warnings only.

PROOF: `backend/scripts/sanity-card-index-drift.mjs` L4 — `const CRITICAL_UNNAMED_KEY_SIGNATURES = new Set(["anonymousId:1"]);`

---

## 7. GitHub Actions Verification

After bootstrap and after `MONGO_URI_DRIFT_CHECK` is set in GitHub Secrets:

**Step 1 — Backend Index Governance (hard drift gate):**

1. Go to Actions → Backend Index Governance
2. Run workflow → Run workflow (main branch)
3. Expected: all steps green, drift check exits 0

**Step 2 — Backend Admin Sanity (integration test, up to 20 min):**

1. Go to Actions → Backend Admin Sanity
2. Run workflow → Run workflow
3. Expected: all steps green, sanity:admin-user-delete completes with cascade delete and Supabase cleanup passing

Both Mongo-backed workflows require `MONGO_URI_DRIFT_CHECK` explicitly. There is no fallback to production `MONGO_URI`. Backend Index Governance `workflow_dispatch` runs the hard drift gate against the CI-only cluster. Backend Admin Sanity runs against the CI-only cluster only when `MONGO_URI_DRIFT_CHECK` is present; if it is missing the workflow hard-fails (exit 1).

---

## 8. Anti-Drift Governance Law

The following rules are permanent and must not be bypassed without a bounded explicit decision.

### 8.1 Mandatory CI-only impact assessment

Every workstream that touches any of the following **must include an explicit CI-only impact assessment before the workstream is accepted or closed**:

- Any change to a Mongoose schema index declaration in any model (including `Card.model.js`)
- Any production Mongo migration (`--apply`)
- Any new or modified sanity script, retention script, cleanup script, bootstrap script, or Mongo-state-writing script
- Any new or removed collection in production that a CI check may depend on

**Who is responsible:** The developer or Copilot/ChatGPT agent executing the workstream must produce the assessment. It must not be deferred or assumed by inference.

**Assessment questions (must all be answered explicitly):**

1. Does this change affect a collection or index that the CI-only cluster must mirror?
2. Do the Backend Index Governance or Backend Admin Sanity workflows depend on this change?
3. Is a CI bootstrap or migration path update required?
4. Are verification and docs updates required?

**YES path — if any answer is yes:**

- Update the CI cluster (run the migration or collection setup on `cardigo_ci`).
- Run `npm run sanity:card-index-drift` against the CI cluster and confirm `ok: true, EXIT:0`.
- Trigger the Backend Index Governance workflow via `workflow_dispatch` and confirm green.
- Update §5 and §6 of this document.

**NO path — if all answers are no:**

- Explicitly state in the workstream summary: "CI-only cluster not affected. No update required."
- Recording the no-impact decision is mandatory. Silent omission is not acceptable.

### 8.2 Schema-level index change triggers

Any of the following changes to any Mongoose model schema triggers the §8.1 assessment:

- Adding a new named `CardSchema.index(...)` declaration
- Dropping or renaming an existing named index
- Changing the key shape, `unique`, `sparse`, or `partialFilterExpression` of any named index
- Adding or removing `index: true` on a path-level field (produces or removes an unnamed index; affects warning count)
- Any equivalent change in any model that a CI workflow may directly query

### 8.3 Infrastructure and cluster rules

1. **After any CI cluster recreation:** re-run §5 bootstrap in full, re-verify §7, update this document.
2. **Do NOT run migration `--apply` automatically in CI.** Migrations are manual maintenance-window operations only.
3. **Do NOT route ordinary GitHub Actions Mongo access to the production cluster.** `MONGO_URI_DRIFT_CHECK` must always point to the CI cluster.
4. **If a new collection requires Mongo-backed CI checks:** assess per §8.1. If yes — add it to §5 and create the collection and indexes on the CI cluster.
5. **Do NOT add `0.0.0.0/0` back to the production cluster.** Production Mongo access is limited to Render outbound ranges.

---

## 9. Forbidden Operations

| Operation                                                                               | Reason                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Running `bootstrap-first-admin.mjs` on CI cluster                                       | Creates admin users; not relevant to drift parity                             |
| Running any `migrate-user-*.mjs` on CI cluster                                          | User collection parity not required for card drift checks                     |
| Running any `migrate-organization-*.mjs`, `migrate-orgmember-*.mjs`, etc. on CI cluster | Not required for card drift checks                                            |
| Running `migrate-tenantkey-slug.mjs` without `--create-index`                           | Will execute backfill logic without creating the index; incomplete bootstrap  |
| Storing production documents in the CI cluster                                          | The CI cluster must never hold production data                                |
| Using `MONGO_URI` (production) in GitHub Actions for drift checks                       | Breaks production cluster IP allowlist law and exposes production to CI scope |
| Including raw Mongo URIs, passwords, or Atlas private IDs in documentation              | Security policy                                                               |
| Copying the CI `0.0.0.0/0` Network Access rule to production                            | Fundamentally different security posture                                      |

---

## 10. Rollback Notes

If the CI cluster is broken, unreachable, or recreated:

1. Temporarily revert `MONGO_URI_DRIFT_CHECK` in GitHub Secrets to point to production URI (from `MONGO_URI`).
2. This is an **emergency-only fallback**, not a steady state. Drift checks against production are not acceptable long-term.
3. Immediately schedule CI cluster recovery (§5 bootstrap on a new cluster).
4. Once CI cluster is restored, update `MONGO_URI_DRIFT_CHECK` back to the CI URI and verify both GitHub Actions workflows pass.
5. Update this document if the cluster configuration changed.

---

## Cross-references

- `backend/README.md` §CI policy — GitHub Actions secret split summary
- `backend/README.md` §Index Governance — migration scripts and accepted warning count
- `.github/workflows/backend-index-governance.yml` — drift check trigger policy
- `.github/workflows/backend-admin-sanity.yml` — nightly integration sanity
- `docs/runbooks/backend-verification-and-deploy.md` §F — production Mongo connectivity
