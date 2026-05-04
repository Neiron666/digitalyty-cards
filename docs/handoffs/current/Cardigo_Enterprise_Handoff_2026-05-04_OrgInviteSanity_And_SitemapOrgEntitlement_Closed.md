# Cardigo Enterprise Handoff — ORG_INVITE_SANITY_AND_SITEMAP_ORG_ENTITLEMENT — 2026-05-04

**Date:** 2026-05-04
**Project:** Cardigo
**Contour:** ORG_INVITE_SANITY_AND_SITEMAP_ORG_ENTITLEMENT
**Status:**

- ORG_INVITE_SANITY_404_FIRSTNAME_FIX — CLOSED / LOCAL PASS
- ORG_ACCESS_SANITY_SITEMAP_ORG_ENTITLEMENT_FIX — CLOSED / PRODUCTION PASS

---

## 1. Executive Summary

Two related tails were identified, fixed, and verified:

1. Both `sanity:org-access` and `sanity:org-membership` scripts omitted `firstName` from the invite-accept body. This caused a 404 at the invite-accept step, incorrectly classified as a local fixture limitation. The scripts were stale after the firstName contour made the field required. The backend route was correct throughout.

2. After the firstName fix, `sanity:org-access` progressed further and revealed a real production SEO bug: `sitemap.routes.js` did not load `Organization.orgEntitlement`, causing org-owned premium cards under active org entitlement to be excluded from `sitemap.xml`. This was a billing-contract violation in the sitemap. The fix was applied and confirmed in production.

---

## 2. Problem Timeline

### Phase 1 — org sanity scripts fail at inviteAccept 404

Both `sanity:org-access` and `sanity:org-membership` called `POST /api/invites/accept` without the `firstName` field.

The `/api/invites/accept` new-user branch requires:

- `token` (invite token)
- `password` (PASSWORD_POLICY_V1 compliant)
- `consent: true`
- `firstName` (non-empty, max 100)

Omitting `firstName` caused the backend to return a 404 anti-enumeration shape (same as unknown token), not a 400 validation error.

This was misclassified in `docs/runbooks/backend-verification-and-deploy.md` as "local environments without a valid org invite fixture present in the DB."

The real root cause: sanity script contract drift — scripts were not updated when the firstName contour added the mandatory field.

### Phase 2 — firstName fix reveals sitemap org entitlement bug

After `firstName: "Sanity"` was added to both scripts, `sanity:org-membership` achieved EXIT:0 immediately. `sanity:org-access` progressed further and failed at:

```
sitemap.xml must include org card URL for active membership
```

Root cause: `sitemap.routes.js` queried `Organization.find()` with `.select("_id slug")` only — no `isActive`, no `orgEntitlement`. The `resolveBilling()` call without user/org context always returned free-tier for org cards that had no `card.adminTier` and no raw `card.billing` record.

`Organization.orgEntitlement` is the SSoT for org-owned premium access (billing-flow-ssot.md §18). The sitemap violated this contract.

---

## 3. Fixes Applied

### Phase 2A — ORG_INVITE_SANITY_404_FIRSTNAME_FIX

Files changed:

- `backend/scripts/sanity-org-access.mjs`
- `backend/scripts/sanity-org-membership.mjs`

Changes in both scripts:

- `inviteAccept` body now includes `firstName: "Sanity"`.
- Anti-drift comment added adjacent to the inviteAccept call referencing the `/api/invites/accept` contract.
- `assert(ok, ...)` failure diagnostic improved to include response body on failure.

### Phase 2B — ORG_ACCESS_SANITY_SITEMAP_ORG_ENTITLEMENT_FIX

Files changed:

- `backend/src/routes/sitemap.routes.js`
- `backend/scripts/sanity-org-access.mjs`

Changes in `sitemap.routes.js`:

- Import: `import { resolveOrgEntitlementBilling } from "../utils/orgEntitlement.util.js"` added (L9).
- `Organization.find()` query now selects `"_id slug isActive orgEntitlement"` (previously `"_id slug"`).
- `const orgById = new Map(orgs.map((o) => [String(o._id), o]))` — new map added alongside existing `orgSlugById`.
- Card visible filter applies `resolveOrgEntitlementBilling(org, now)` before `resolveBilling(c, now)`:
    - `const org = orgById.get(orgId)`
    - `const orgBilling = org ? resolveOrgEntitlementBilling(org, now) : null`
    - `const effectiveBilling = orgBilling || resolveBilling(c, now)`
- One batch `Organization.find()` — no N+1 added.
- `resolveOrgEntitlementBilling` receives the full org object (required because it guards `org.isActive !== true` → null).

Changes in `sanity-org-access.mjs` (fixture):

- `Organization.updateOne` grants org entitlement to the test org using `$set` on `orgEntitlement.*` fields:
    - `status: "active"`, `plan: "org"`, `startsAt: now - 1s`, `expiresAt: now + 365d`, `grantedByUserId: admin._id`, `grantedAt: now`, `source: "admin-manual"`.
- Anti-drift comment: "uses Organization.orgEntitlement as the SSoT — not Card.adminTier — matching the production billing contract (billing-flow-ssot.md §18)."
- `Card.adminTier` workaround was considered and explicitly rejected.

---

## 4. Rejected Alternatives

- Do not set `Card.adminTier` to make the sanity pass. That is a workaround bypassing the `Organization.orgEntitlement` SSoT.
- Do not weaken `/api/invites/accept` to accept missing firstName.
- Do not remove the sitemap org card assertion.
- Do not mark `sanity:org-access` or `sanity:org-membership` as optional.

---

## 5. Security / Product Invariants Preserved

- `/api/invites/accept` still requires `firstName`. The anti-enumeration 404 shape for invalid/missing fields remains unchanged.
- No backend route was weakened.
- `Organization.orgEntitlement` remains the SSoT for org-owned premium access (billing-flow-ssot.md §18).
- Sitemap org query is batch-loaded — no N+1 added.
- No frontend changes.
- No payment/billing/provider changes.
- No Mongoose model, schema, or migration changes.
- No index changes.

---

## 6. Verification — Local (Phase 3A + 3B)

All commands run from `backend/` or `frontend/` as applicable.

```
sanity:org-membership      EXIT:0   all 7 checks true, inviteAccept status:200
sanity:org-access          EXIT:0   all 8 checks true, inviteAccept status:200
                                    sitemapActive.containsOrgUrl:true
                                    sitemapRevoked.containsOrgUrl:false
sanity:imports             EXIT:0   importedCount:20, failedCount:0
sanity:slug-policy         EXIT:0
sanity:ownership-consistency EXIT:0 counts:0, ok:true
sanity:card-index-drift    EXIT:0   missing:[], mismatches:[], unexpected:[]

frontend check:inline-styles EXIT:0 PASS: no inline styles found
frontend check:skins         EXIT:0 PASS: skins are token-only. Scanned 28 files.
frontend check:contract      EXIT:0 PASS: template contracts are consistent. Registry templates: 25.
frontend build               EXIT:0 362 modules transformed, no errors.
```

---

## 7. Verification — Production Smoke (after backend deploy)

Test org card: `https://cardigo.co.il/c/digitalyty/draft-41d469-eae8ac`

Raw stdout:

```
API_HEALTH_HTTP:200
SITEMAP_HTTP:200
CONTENT_TYPE:application/xml; charset=utf-8
SITEMAP_CONTAINS_ORG_CARD:True
SITEMAP_CONTAINS_FAKE:False
DIGITALYTY_LINE_COUNT:1
  <url><loc>https://cardigo.co.il/c/digitalyty/draft-41d469-eae8ac</loc>...
SMOKE_DONE
EXIT:0
```

Note: a browser viewing `https://cardigo.co.il/sitemap.xml` without a cache-buster initially showed stale XML (old sitemap before the fix). A cache-buster URL `https://cardigo.co.il/sitemap.xml?v=20260504-1` confirmed the fixed sitemap immediately. The stale browser cache was the only discrepancy; the production backend was serving correct content throughout.

---

## 8. Deferred Tails

- `OrgInvite` / `OrgInviteAudit` DB document cleanup in `sanity:org-access` teardown: the `cleanup()` function does not delete OrgInvite or OrgInviteAudit records created during the test run. Pre-existing tail, not introduced by this contour.
- Gallery org premium upload bug: a separate production issue observed by the operator where the gallery upload section may not reflect active org entitlement correctly. Contour name: `ORG_CARD_GALLERY_PREMIUM_ENTITLEMENT_UPLOAD_BUG_P1`. Not part of this contour.

---

## 9. Files Changed in This Contour

Runtime code:

- `backend/src/routes/sitemap.routes.js` — Phase 2B: org entitlement fix.

Sanity scripts:

- `backend/scripts/sanity-org-access.mjs` — Phase 2A (firstName) + Phase 2B (orgEntitlement fixture).
- `backend/scripts/sanity-org-membership.mjs` — Phase 2A (firstName).

Documentation:

- `docs/runbooks/backend-verification-and-deploy.md` — known-tail note corrected (see that file for current state).
- `docs/handoffs/current/Cardigo_Enterprise_Production_Launch_Handoff_2026-05-03.md` — CLOSED entry added to Section 16.
- This file (created).

Files explicitly NOT changed:

- No frontend files.
- No other backend runtime files.
- No models/schemas.
- No migrations.
- No CI workflows.
- No package.json.
- No billing/payment providers.
