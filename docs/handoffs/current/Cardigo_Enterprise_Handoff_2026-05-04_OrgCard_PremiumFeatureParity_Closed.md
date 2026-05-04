# Cardigo Enterprise Handoff — Org Card Premium Feature Parity

**Contour:** `ORG_CARD_PREMIUM_FEATURE_PARITY`
**Status:** CLOSED / PRODUCTION PASS
**Date:** 2026-05-04
**Type:** Backend multi-path entitlement fix + product decision (gallery limit)

---

## 1. Executive Summary

Org-owned premium cards (cards under `Organization.orgEntitlement.status = "active"`) were receiving free-tier behavior in several backend feature paths, even though the editor DTO (`getOrCreateMyOrgCard`) correctly returned premium entitlements. The root cause was repeated org-unaware entitlement resolution in feature-specific controllers: analytics, booking, lead, and gallery upload each called `resolveBilling(card, now)` or `toCardDTO(card, now)` without passing the organization, causing them to see `effectiveBilling.plan = "free"` and gate premium features.

All paths are now org-aware. `Organization.orgEntitlement` is SSoT for org-owned premium cards across editor DTO, gallery upload, analytics data, booking availability/create, lead form entitlement, and sitemap inclusion.

Additionally, a product decision was applied: `PLANS.org.galleryLimit` was set from 50 → 10, aligned with monthly/yearly plans.

Security regression audit (P3B) passed. All sanity scripts and frontend gates EXIT:0. Production manual smoke passed.

---

## 2. User-Facing Symptoms

1. **Gallery upload premium error**: Org-owned premium card operators received `403 PREMIUM_REQUIRED` when attempting to upload gallery images, even with active `orgEntitlement`. The upload controller resolved billing without the org → tier = "free" → `canUseGallery = false`.

2. **Org gallery limit was 50 (product changed to 10)**: `PLANS.org.galleryLimit` was set to 50. Product decision to align with monthly/yearly plans at 10. `GALLERY_LIMITS.org` (legacy) also updated to 10.

3. **Analytics showed demo instead of real data**: `getSummary`, `getActions`, `getSources`, `getCampaigns` all called `toCardDTO(card, now, { user, ... })` without passing `org`. Result: `analyticsLevel = "demo"` for org cards → `buildDemoPremiumPayload` returned synthetic fixture data with the banner "דוגמה של לקוח פרימיום".

4. **Booking/calendar did not load real availability**: `assertBookingEntitled` called `resolveBilling(card, now)` without org → `isEntitled = false` for org premium cards → `403 TRIAL_EXPIRED` on `getPublicAvailability` and `createPublicBooking` → calendar section never loaded.

5. **Lead form returned 403**: `createLead` called `resolveBilling(card, now)` without org → same chain → `403 TRIAL_EXPIRED` on lead submission.

6. **Business hours / booking needed verification**: `updateCard` PATCH DTO was fixed in a prior contour (ORG_CARD_PREMIUM_STATUS_REVERT_ON_SAVE). Business hours save/reload was confirmed working via that prior fix. Booking availability depended on the booking entitlement fix in this workstream.

---

## 3. Root Cause Class

**Repeated org-unaware entitlement resolution in feature-specific backend paths.**

The canonical resolver `resolveEffectiveBilling(card, now, org)` accepts an optional `org` parameter. When `org` is null, it falls through to `resolveBilling(card, now)` which reads only `card.billing` — always "free" for org-owned cards because `card.billing` is never upgraded by org entitlement. Each feature controller independently had to opt into loading the org and passing it. Several controllers missed this.

Reference implementation (pre-existing): `ai.controller.js` L88-108 — org load + `resolveEffectiveBilling(card, now, org)` pattern.

---

## 4. Completed Fixes

### 4a. Prior workstream — updateCard PATCH DTO (card.controller.js)

**Contour:** ORG_CARD_PREMIUM_STATUS_REVERT_ON_SAVE
**File:** `backend/src/controllers/card.controller.js` L2169-2197
After `Card.findByIdAndUpdate`, `orgForDto` is loaded via `Organization.findById(card.orgId).select("_id slug isActive orgEntitlement").lean()` (guarded by `isNonPersonalOrg`). Passed to `toCardDTO(card, now, { user: userTier, org: orgForDto })`. Editor sidebar now shows `מסלול: פרמיום` immediately after שמור, without reload.

### 4b. Prior workstream — sitemap orgEntitlement (sitemap.routes.js)

**Contour:** ORG_INVITE_SANITY_AND_SITEMAP_ORG_ENTITLEMENT
**File:** `backend/src/routes/sitemap.routes.js` L66-74
Single batch `Organization.find({ _id: { $in: candidateCompanyOrgIds }, isActive: true }).select("_id slug isActive orgEntitlement").lean()`. Result stored in `orgById` Map. `resolveOrgEntitlementBilling(org, now)` used in tier filter. Org premium cards now appear in sitemap.

### 4c. Gallery upload entitlement fix (upload.controller.js)

**File:** `backend/src/controllers/upload.controller.js` L196-232
**PROOF L133:** `assertCardOwner(card, actor)` runs before org lookup.
**PROOF L196-207:** `getPersonalOrgId()` → `isNonPersonalOrg` guard → `Organization.findById(card.orgId).select("_id isActive orgEntitlement").lean()`.
**PROOF L208-211:** `resolveEffectiveBilling(card, now, orgForUpload)`.
**PROOF L233-256:** `canUseGallery` gate then `galleryLimit` count gate — both before `processImage` at L260 and storage at L280.

### 4d. Gallery limit product decision (plans.js + limits.js)

**File:** `backend/src/config/plans.js` L56: `galleryLimit: 10` (org plan — was 50).
**File:** `backend/src/config/limits.js` L4: `org: 10` (was 50).
Decision: org gallery limit aligned to 10, matching monthly and yearly plans.

### 4e. Analytics org-aware toCardDTO (analytics.controller.js)

**File:** `backend/src/controllers/analytics.controller.js`
**PROOF L206-213:** `loadOrgForCard(card)` helper — guards `card?.orgId`, excludes personal org ID, runs `Organization.findById(card.orgId).select("_id isActive orgEntitlement").lean()`.
**PROOF L654-663:** `getSummary` — `loadOwnedCardOrThrow` first (ownership gate), then `Promise.all([userTier, loadOrgForCard(card)])`, then `toCardDTO(card, now, { includePrivate: false, user: userTier, org })`.
Same pattern at `getActions` L759-768, `getSources` L802-811, `getCampaigns` L1038-1047.
**PROOF L492-508:** `trackAnalytics` uniques path — `loadOrgForCard(card).catch(() => null)`, both `toCardDTO` calls pass `org: orgForCard`.
All 6 `toCardDTO` call sites in this file now pass `org`.

### 4f. Booking entitlement fix (booking.controller.js)

**File:** `backend/src/controllers/booking.controller.js` L110-158 `assertBookingEntitled`
**PROOF L110-128:** `let org = null; if (card?.orgId) { const personalOrgId = await getPersonalOrgId(); if (String(card.orgId) !== String(personalOrgId)) { org = await Organization.findById(card.orgId).select("_id isActive orgEntitlement").lean(); } } const effectiveBilling = resolveEffectiveBilling(card, now, org);`
**PROOF L246-249:** `getPublicAvailability` calls `loadActiveCardOrNotFound` (card active gate) before `assertBookingEntitled`.
**PROOF L440-442:** `createPublicBooking` same gate order.
Org-owned premium cards now have `isEntitled = true` → booking calendar loads.

### 4g. Lead entitlement fix (lead.controller.js)

**File:** `backend/src/controllers/lead.controller.js` L59-74
**PROOF L55-59:** `Card.findById(cardId); if (!card || !card.isActive) → 404` runs before org load.
**PROOF L61-72:** `let leadOrg = null; if (card?.orgId) { const personalOrgId = await getPersonalOrgId(); if (String(card.orgId) !== String(personalOrgId)) { leadOrg = await Organization.findById(card.orgId).select("_id isActive orgEntitlement").lean(); } }`
**PROOF L74:** `const effectiveBilling = resolveEffectiveBilling(card, now, leadOrg);`
Org-owned premium cards now receive `canUseLeads = true` → lead form submits successfully.

---

## 5. Current Production Truth

`Organization.orgEntitlement` is SSoT for org-owned premium cards across:

| Path                                                             | File                             | Org-aware since                               |
| ---------------------------------------------------------------- | -------------------------------- | --------------------------------------------- |
| Editor DTO (getOrCreateMyOrgCard)                                | card.controller.js               | pre-existing                                  |
| updateCard PATCH response                                        | card.controller.js L2184         | ORG_CARD_PREMIUM_STATUS_REVERT_ON_SAVE        |
| Sitemap inclusion                                                | sitemap.routes.js L87            | ORG_INVITE_SANITY_AND_SITEMAP_ORG_ENTITLEMENT |
| Gallery upload entitlement                                       | upload.controller.js L208-211    | this workstream                               |
| Gallery limit                                                    | plans.js L56, limits.js L4       | this workstream (product decision: 10)        |
| Analytics data (summary/actions/sources/campaigns/track uniques) | analytics.controller.js L206-213 | this workstream                               |
| Booking availability/create                                      | booking.controller.js L110-158   | this workstream                               |
| Lead form creation                                               | lead.controller.js L61-74        | this workstream                               |
| AI feature plan                                                  | ai.controller.js L88-108         | pre-existing                                  |

**Gallery limit SSoT:** `PLANS.org.galleryLimit = 10` (`backend/src/config/plans.js` L56). `GALLERY_LIMITS.org = 10` (`backend/src/config/limits.js` L4).

---

## 6. Security Invariants Preserved

All verified in security regression audit P3B (2026-05-04):

| Invariant                                           | Status    | Proof                                                                                                                             |
| --------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ownership before org load (analytics)               | PRESERVED | analytics.controller.js L197-204 `loadOwnedCardOrThrow` before `loadOrgForCard`                                                   |
| Active card check before entitlement (booking)      | PRESERVED | booking.controller.js L244-249: `loadActiveCardOrNotFound` then `assertBookingEntitled`                                           |
| Active card check before entitlement (lead)         | PRESERVED | lead.controller.js L55-59: card active gate before org load                                                                       |
| `assertCardOwner` before org load (upload)          | PRESERVED | upload.controller.js L133 before L196                                                                                             |
| Entitlement/count check before storage (upload)     | PRESERVED | upload.controller.js L233-256 before `processImage` L260 and storage L280                                                         |
| Membership / anti-enumeration (sitemap)             | PRESERVED | sitemap.routes.js L108-152 membership gate unchanged                                                                              |
| Fake org OG 404                                     | CONFIRMED | `/og/c/nonexistent-org/nonexistent-card` → 404 "Not found"                                                                        |
| No analytics read without auth                      | CONFIRMED | analytics.routes.js L17-20: all 4 read routes behind `requireAuth`                                                                |
| No payment / Tranzila / YeshInvoice / Receipt drift | CONFIRMED | zero overlap between changed files and payment layer                                                                              |
| No orgEntitlement mutation drift                    | CONFIRMED | only `adminOrganizations.controller.js` L1123 writes `orgEntitlement.status` (admin-only, unchanged)                              |
| No new public unauthenticated read endpoints        | CONFIRMED | analytics/booking/lead route contracts unchanged                                                                                  |
| Organization query selects minimal fields only      | CONFIRMED | all 4 new `Organization.findById` calls select `"_id isActive orgEntitlement"` (+ `slug` in card.controller.js for path assembly) |

---

## 7. Verification Summary

### Local backend sanity scripts

All run EXIT:0:

- `sanity:imports` — EXIT:0
- `sanity:slug-policy` — EXIT:0 (ok:true, all checks passed)
- `sanity:ownership-consistency` — EXIT:0 (all 6 counts = 0)
- `sanity:org-access` — EXIT:0
- `sanity:org-membership` — EXIT:0

No `sanity:analytics`, `sanity:booking`, or `sanity:leads` scripts exist in `backend/package.json` (see §10 deferred tails).

### Frontend gates

All run EXIT:0:

- `check:skins` — PASS (28 skin files, all token-only)
- `check:contract` — PASS (25 templates, consistent)
- `build` — EXIT:0 (362 modules, 2.79s, no errors)

### Production read-only smoke (2026-05-04)

- `GET /api/health` → `{"status":"OK","db":"connected"}` — 200 PASS
- `GET /c/digitalyty/digital-card` → 200, card renders fully — PASS
- `GET /sitemap.xml` → contains `https://cardigo.co.il/c/digitalyty/digital-card` — PASS
- `GET /og/c/nonexistent-org/nonexistent-card` → 404 "Not found" — PASS (anti-enumeration)

### Operator manual smoke

- Analytics: real data shown, no "דוגמה של לקוח פרימיום" demo banner, level shows פרמיום — CONFIRMED
- Business hours: save/reload works — CONFIRMED
- Booking: calendar with real slots loads on public card — CONFIRMED
- Gallery upload: uploads successfully — CONFIRMED
- Gallery limit: enforced at 10 for org cards — CONFIRMED

### Security regression audit

Full P3B audit conducted (2026-05-04). Final verdict: PASS_READY_FOR_DOC_CLOSURE.

---

## 8. Files Changed (Full Workstream)

| File                                              | Change                                                                    | Contour                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `backend/src/controllers/card.controller.js`      | `updateCard` PATCH response: org-aware `toCardDTO` via `orgForDto`        | ORG_CARD_PREMIUM_STATUS_REVERT_ON_SAVE        |
| `backend/src/routes/sitemap.routes.js`            | Batch-load `orgEntitlement`; org-aware tier filter in sitemap             | ORG_INVITE_SANITY_AND_SITEMAP_ORG_ENTITLEMENT |
| `backend/src/controllers/upload.controller.js`    | Gallery upload: org-aware `resolveEffectiveBilling` for entitlement/limit | this workstream                               |
| `backend/src/config/plans.js`                     | `PLANS.org.galleryLimit`: 50 → 10                                         | this workstream                               |
| `backend/src/config/limits.js`                    | `GALLERY_LIMITS.org`: 50 → 10                                             | this workstream                               |
| `backend/src/controllers/analytics.controller.js` | `loadOrgForCard` helper; all 6 `toCardDTO` calls now pass `org`           | this workstream                               |
| `backend/src/controllers/booking.controller.js`   | `assertBookingEntitled`: org-aware via `resolveEffectiveBilling`          | this workstream                               |
| `backend/src/controllers/lead.controller.js`      | `createLead`: org-aware via `resolveEffectiveBilling`                     | this workstream                               |

---

## 9. Out of Scope / Deferred Tails

1. **Public booking availability active-only vs published-check**: `getPublicAvailability` uses `loadActiveCardOrNotFound` (active-only check, no published requirement). This is the historical contract. A separate audit contour is needed to decide whether published status should be required for public booking.

2. **Org member media management beyond card.user owner-only**: Gallery upload is strictly gated by `assertCardOwner(card, actor)` — only `card.user` can upload. Org membership does not confer upload rights. If org-member upload delegation is ever desired, it requires a separate policy contour and ownership model change.

3. **Dedicated sanity:analytics / sanity:booking / sanity:leads scripts**: No such scripts exist in `backend/package.json`. A future QA contour should create automated sanity coverage for analytics entitlement, booking entitlement, and lead entitlement paths.

4. **No change to Tranzila / YeshInvoice / PaymentTransaction / Receipt**: Payment infrastructure was not touched and is out of scope for this workstream.

5. **No frontend UI/styling changes**: All fixes are backend-only. Frontend analytics panel, booking calendar, and lead form receive correct data as a result of the backend fixes but no frontend code was modified.

6. **Admin-granted orgEntitlement mutation path**: Only `adminOrganizations.controller.js` can write `orgEntitlement`. No new mutation path was added. The admin grant runbook is at `docs/runbooks/org-annual-entitlement-admin-grant.md`.

---

## 10. Related Docs / Handoffs

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-04_OrgCard_PremiumStatusRevert_OnSave_Closed.md` — prior contour: updateCard PATCH DTO org-aware fix
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-04_OrgInviteSanity_And_SitemapOrgEntitlement_Closed.md` — prior contour: sitemap orgEntitlement + sanity script fixes
- `docs/runbooks/billing-flow-ssot.md` — canonical billing/plan feature matrix (galleryLimit column updated: org = 10)
- `docs/runbooks/org-annual-entitlement-admin-grant.md` — admin grant procedure and resolver behavior doc (galleryLimit reference updated: 10)
- `docs/runbooks/trial-lifecycle-ssot.md` — trial/entitlement lifecycle reference

---

## 11. Closed Contour Declaration

Contour `ORG_CARD_PREMIUM_FEATURE_PARITY` is **CLOSED**.

All six feature paths (gallery upload, gallery limit, analytics, booking, lead form, business hours) are now org-entitlement-aware. Production manual smoke passed. Security regression audit P3B passed. Documentation updated.

No further action required for this contour. Future org-premium issues should be opened as new bounded contours referencing this document.

**STOP.**
