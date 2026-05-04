# Cardigo Enterprise Handoff — Org Card Premium Status Revert On Save — CLOSED

**Contour:** ORG_CARD_PREMIUM_STATUS_REVERT_ON_SAVE
**Status:** CLOSED / PRODUCTION PASS
**Date:** 2026-05-04
**Runtime change scope:** backend-only — `backend/src/controllers/card.controller.js`
**Frontend change:** none
**DB/migration change:** none
**Deploy:** backend deployed to Render production

---

## 1. Bug Summary

For an org-owned card whose organization had an active admin-granted annual premium entitlement:

- Opening the card editor showed: **מסלול: פרמיום**
- After clicking **שמור שינויים** the sidebar temporarily showed: **מסלול: חינם**
- Premium tabs temporarily appeared locked
- The editor could briefly become non-editable
- Reloading the page restored: **מסלול: פרמיום**

The organization premium entitlement in the DB was never downgraded. This was a response DTO assembly bug only.

---

## 2. Root Cause

`updateCard` in `backend/src/controllers/card.controller.js` assembled the PATCH response DTO by calling:

```
toCardDTO(card, now, { user: userTier })
```

The `org` parameter was omitted.

`toCardDTO` (in `backend/src/utils/cardDTO.js`) delegates billing resolution to `resolveEffectiveBilling(card, now, org)`. When `org` is null or absent, the function falls through to `resolveBilling(card, now)` which reads raw `card.billing`. For org-owned cards, `card.billing` is always `{ status: "free", plan: "free" }` by design — org premium is never written to `card.billing`. So the PATCH response returned `effectiveBilling.isPaid = false`, `entitlements.canEdit = false`.

The frontend `commitDraft` function replaces the entire `draftCard` with the PATCH response (`setDraftCard(normalizedWithLocks)`). This caused the editor sidebar to temporarily display free billing and temporarily disable premium features until the user reloaded and a fresh `GET` with the correct org-aware DTO was served.

By contrast, `getOrCreateMyOrgCard` (the initial editor load endpoint) did pass `org` correctly to `toCardDTO`, which is why the initial load always showed premium correctly.

**Root cause: PATCH response DTO path was not plumbed with `org`. GET path was correct.**

---

## 3. Fix

**File:** `backend/src/controllers/card.controller.js`
**Function:** `updateCard`
**Location:** response assembly block (after `Card.findByIdAndUpdate`)

Changes applied in the response assembly block:

1. `personalOrgId`, `cardOrgId`, and `isNonPersonalOrg` are now computed **before** `toCardDTO` (previously these were only computed inside the `if (dto && dto.slug)` publicPath block — too late for DTO billing resolution).

2. `orgForDto` is fetched only for real org-owned cards (`isNonPersonalOrg === true`):

    ```
    orgForDto = await Organization.findById(card.orgId)
        .select("_id slug isActive orgEntitlement")
        .lean();
    ```

    Personal cards: `orgForDto` stays `null`, zero new DB queries.

3. `toCardDTO` now receives `org: orgForDto`:

    ```
    const dto = toCardDTO(card, now, { user: userTier, org: orgForDto });
    ```

4. The `publicPath`/`ogPath` block reuses `orgForDto` (slug + isActive already fetched above). The previous duplicate `Organization.findById(card.orgId).select("slug isActive").lean()` call inside the publicPath block is removed.

**Side benefit:** One fewer `Organization.findById` per org-owned card PATCH request on the response assembly path.

---

## 4. Files Changed / Not Changed

**Changed:**

- `backend/src/controllers/card.controller.js` — updateCard response assembly only.

**Not changed:**

- `backend/src/utils/cardDTO.js` — already accepts and handles `org` parameter correctly.
- `backend/src/utils/orgEntitlement.util.js` — pure function, correct as-is.
- Any frontend file — no workaround, no state merge masking.
- Any payment / billing / provider / Tranzila / YeshInvoice / receipt file.
- Any admin org grant / adminSetCardBilling / adminOverride logic.
- Any membership / authorization gate.
- Any DB schema / index / migration.

---

## 5. Verification Results

### Static source verification (26/26 checks passed)

All structural invariants of the fix confirmed via Node.js source analysis:

- personalOrgId/cardOrgId/isNonPersonalOrg computed before toCardDTO: PASS
- orgForDto includes orgEntitlement field: PASS
- toCardDTO receives org: orgForDto: PASS
- duplicate org query removed from response assembly: PASS
- personal cards avoid orgForDto query: PASS
- publicPath/ogPath preserved for both personal and org paths: PASS
- featureGating (resolveFeaturePlanForCard) still before write: PASS
- card update write (findByIdAndUpdate + runValidators) unchanged: PASS
- no billing/subscription/orgEntitlement mutation added: PASS
- no payment/provider code touched: PASS

### Backend sanities

| Sanity                       | Exit | Note                                 |
| ---------------------------- | ---- | ------------------------------------ |
| sanity:imports               | 0    | PASS                                 |
| sanity:slug-policy           | 0    | PASS                                 |
| sanity:ownership-consistency | 0    | PASS                                 |
| sanity:org-access            | 1    | Pre-existing local-env tail — see §7 |
| sanity:org-membership        | 1    | Pre-existing local-env tail — see §7 |

### Frontend gates

| Gate                | Exit     |
| ------------------- | -------- |
| check:inline-styles | 0 — PASS |
| check:skins         | 0 — PASS |
| check:contract      | 0 — PASS |

### Production / UI smoke

- URL tested: `https://cardigo.co.il/c/digitalyty/draft-41d469-eae8ac`
- User context: organization admin / admin of org card
- Before save: **מסלול: פרמיום** — confirmed
- Immediately after שמור שינויים: **מסלול: פרמיום** — confirmed (bug no longer present)
- Premium tabs: not locked — confirmed
- Editor: not disabled — confirmed
- After reload: **מסלול: פרמיום** — confirmed

---

## 6. Security / Product Invariants Preserved

- `Organization.orgEntitlement` remains the SSoT for org-owned card premium access. No change to this model.
- Raw `card.billing` for org-owned cards may remain `{ status: "free" }` by design. The fix does not write to it.
- The `effectiveBilling.source = "organization"` resolver path in `cardDTO.js` was already correct; this fix ensures the PATCH response path reaches it.
- No payment provider, STO, Tranzila, or YeshInvoice code touched.
- No admin org grant logic touched (`adminGrantOrgEntitlement`, `adminExtendOrgEntitlement`, `adminRevokeOrgEntitlement` are unaffected).
- No membership / anti-enumeration / authorization gate changed.
- No DB write added or removed.
- No frontend billing/merge logic changed. The fix is at the source of truth (PATCH response), not a client-side mask.
- No manual DB writes or migrations were run.

---

## 7. Pre-Existing Tails

### sanity:org-access and sanity:org-membership — EXIT:1

Both sanities invoke an invite-accept integration test flow. In local environments without valid org invite fixtures, the step fails with:

```
Error: Failed to accept invite: status=404
```

This is a pre-existing scope limitation of these integration-style sanity scripts and is unrelated to the `updateCard` response DTO fix. The org entitlement behavior (grant/verify/revoke) was not tested by these sanities in this verification run; it was tested by the static source analysis and the production/UI smoke.

Classification: pre-existing local test-env limitation. Track as a separate bounded contour if org invite fixture coverage becomes required.

See also: known-tail note added to `docs/runbooks/backend-verification-and-deploy.md §D`.

---

## 8. Explicit Out of Scope

- Fixing sanity:org-access / sanity:org-membership invite-accept local test failures.
- Refactoring `resolveFeaturePlanForCard` to surface an org object for reuse.
- Any frontend state merge / draftCard normalization changes.
- `cardDTO.js` changes.
- `orgEntitlement.util.js` changes.
- Billing / payment / Tranzila / STO / YeshInvoice / admin grant changes.
- Org annual entitlement policy changes.
- `POLICY_ORGS.md`, `billing-flow-ssot.md`, `admin.md`, `org-annual-entitlement-admin-grant.md` — not modified and not due to be modified.

---

## 9. Related Documents

| Document                                              | Relevance                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/runbooks/org-annual-entitlement-admin-grant.md` | Operator SSoT for org entitlement grant/extend/revoke; §12 resolver behavior |
| `docs/runbooks/billing-flow-ssot.md`                  | §18 org entitlement boundary and resolver chain position                     |
| `docs/policies/POLICY_ORGS.md`                        | §11 seatLimit vs. orgEntitlement; §12 org annual entitlement                 |
| `docs/admin.md`                                       | ORG_CARD_BILLING_MANAGED_BY_ORG guard; effectiveBilling reference            |
| `backend/src/utils/cardDTO.js`                        | toCardDTO SSoT; resolveEffectiveBilling with org param                       |
| `backend/src/utils/orgEntitlement.util.js`            | resolveOrgEntitlementBilling pure function                                   |
| `backend/src/controllers/card.controller.js`          | updateCard — file changed in this fix                                        |
| `docs/runbooks/backend-verification-and-deploy.md`    | §D known-tail note for sanity:org-access / org-membership                    |

---

## 10. Closed Contour — Do Not Casually Reopen

This contour is closed. The fix is minimal, surgical, and production-verified.

Do not reopen without:

- Evidence of a regression in `updateCard` response DTO org-awareness.
- A new bounded Phase 1 audit with PROOF.

STOP.
