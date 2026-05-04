# Cardigo Enterprise Handoff — Org Premium Feature QA Sanity Coverage Closed — 2026-05-04

**Contour:** `ORG_PREMIUM_FEATURE_QA_SANITY_COVERAGE`
**Status:** CLOSED / VERIFIED
**Date:** 2026-05-04
**Scope:** Backend QA sanity scripts + documentation
**Runtime deploy:** No
**Production mutation:** No
**Git commands:** No

---

## 1. Executive Summary

Dedicated enterprise sanity coverage was added and verified for the analytics, booking, and leads feature paths following the org premium feature parity fixes (`ORG_CARD_PREMIUM_FEATURE_PARITY`). Three new controlled-write local sanity scripts were created — `sanity:analytics`, `sanity:booking`, `sanity:leads` — along with a shared fixture helper. All target sanities passed (19/19 total checks). Existing backend regression sanity suite and frontend gates/build all passed EXIT:0.

---

## 2. Why This Contour Was Required

Analytics, booking, and leads are premium/data/action paths gated by org entitlement. The prior contour (`ORG_CARD_PREMIUM_FEATURE_PARITY`) fixed org-unaware entitlement resolution in `analytics.controller.js`, `booking.controller.js`, and `lead.controller.js`. Those fixes restored correct premium behavior but had no dedicated regression sanity coverage.

Before this contour:

- There were no `sanity:analytics`, `sanity:booking`, or `sanity:leads` commands.
- The premium/demo/FEATURE_NOT_AVAILABLE/TRIAL_EXPIRED split across free vs org-premium cards had no automated verification path.
- Missing coverage was a QA/production-readiness tail, not a runtime product bug after the previous fix.

---

## 3. Files Created / Modified

**Created:**

- `backend/scripts/sanity-shared-fixtures.mjs` — shared helper module (L1–L66): exports `assert`, `randomHex`, `listen`, `readJson`, `requestJson`, `SANITY_INVITE_PASSWORD`, and `extractTokenFromInviteLink`. Not a standalone script; now imported by five sanity scripts: `sanity-analytics.mjs`, `sanity-booking.mjs`, `sanity-leads.mjs`, `sanity-org-access.mjs`, and `sanity-org-membership.mjs`. `extractTokenFromInviteLink` was added in contour `SANITY_INVITE_HELPERS_DEDUP` (2026-05-04).
- `backend/scripts/sanity-analytics.mjs` — standalone sanity script (L1–L345): 9 checks covering analytics entitlement contract.
- `backend/scripts/sanity-booking.mjs` — standalone sanity script (L1–L340): 4 checks covering booking entitlement contract.
- `backend/scripts/sanity-leads.mjs` — standalone sanity script (L1–L315): 6 checks covering lead form entitlement contract.

**Modified:**

- `backend/package.json` — L33–L35: added three new script entries:
    - `"sanity:analytics": "node scripts/sanity-analytics.mjs"`
    - `"sanity:booking": "node scripts/sanity-booking.mjs"`
    - `"sanity:leads": "node scripts/sanity-leads.mjs"`

No runtime controllers, routes, models, frontend files, or CI workflows were modified in this contour.

---

## 4. sanity:analytics Coverage

**Endpoints tested** (baseUrl = `http://127.0.0.1:{port}/api`):

- `GET /analytics/summary/:id`
- `POST /analytics/track`
- `GET /analytics/actions/:id`
- `GET /analytics/sources/:id`
- `GET /analytics/campaigns/:id`

**Checks (9/9):**

1. `noAuthSummary401` — unauthenticated GET summary returns 401.
2. `nonOwnerSummary403` — non-owner authenticated GET summary returns 403.
3. `trackValid204` — valid POST track returns 204.
4. `trackMissingSlug204` — POST track with missing slug returns 204 (best-effort, no existence leak).
5. `freeSummaryIsDemo` — free-tier card summary returns 200 with `body.isDemo === true`.
6. `orgSummaryNotDemo` — org-premium card summary returns 200 with `isDemo` absent/false and `rangeDays` present.
7. `orgActions200` — org-premium actions endpoint returns 200 with `isDemo` absent/false.
8. `orgSources200` — org-premium sources endpoint returns 200 with `isDemo` absent/false.
9. `orgCampaigns200` — org-premium campaigns endpoint returns 200 with `isDemo` absent/false.

**Verification:** 9/9 PASSED — `SANITY_ANALYTICS_EXIT:0`

---

## 5. sanity:booking Coverage

**Route path:** `/bookings` (plural) — verified by static check (0 hits for singular `/booking[^s]` pattern in script).

**Endpoints tested:**

- `GET /bookings/availability?cardId=...`
- `POST /bookings/`

**Checks (4/4):**

1. `inactiveCard404` — GET availability for inactive card returns 404.
2. `freeCardFeatureGate` — GET availability for free-tier card returns 403 `FEATURE_NOT_AVAILABLE`.
3. `orgAvailability200` — GET availability for org-premium card returns 200 with `Array.isArray(body.days) === true`.
4. `orgBookingCreate201` — POST booking for org-premium card returns 201 with `body.bookingId` present.

**Unique index fixture strategy:**

The DB has a unique compound index `orgId_1_user_1`. All three cards share the same owner `_id`. To avoid collision:

- `inactiveCard`: `orgId = new mongoose.Types.ObjectId()` — random non-existent ObjectId. The 404 fires from `isActive:false` before any org lookup; the orgId value is irrelevant to the assertion.
- `freeCard`: `orgId = personalOrgId` — the personal org carries no `orgEntitlement`, resolving to free tier → `canUseBooking:false` → 403 `FEATURE_NOT_AVAILABLE`.
- `orgCard`: `orgId = testOrg._id` — the test org with active `orgEntitlement`.

Three distinct `(orgId, user)` pairs; no collision possible.

**Verification:** 4/4 PASSED — `SANITY_BOOKING_EXIT:0`

---

## 6. sanity:leads Coverage

**Route path:** `/leads` (POST).

**Checks (6/6):**

1. `inactiveCard404` — POST lead for inactive card returns 404.
2. `consentFalse400` — POST lead with `consent: false` returns 400 `CONSENT_REQUIRED`.
3. `honeypotFake201` — POST lead with `website: "http://spam.example.test"` returns 201 with `leadId === "000000000000000000000000"` (no real Lead document written). Backend `leadSanitize.js` reads `raw.website` as the honeypot field (`hp`). Verified: `body.website` used in request; no `_xf92` field sent.
4. `freeCardFeatureGate` — POST lead for free-tier card returns 403 `FEATURE_NOT_AVAILABLE`.
5. `orgLeadCreated201` — POST lead for org-premium card returns 201 with `body.leadId` present.
6. `leadDocInDb` — `Lead.findOne({ card: orgCard._id, name: "Sanity Test" })` — document exists after valid submission.

**Comment hygiene:** A stale comment referencing `_xf92` (old honeypot field name) was present in an earlier revision. It was removed in a targeted hygiene pass (`ORG_PREMIUM_FEATURE_QA_SANITY_COVERAGE_COMMENT_HYGIENE_P2C`) before documentation closure. `sanity:leads` continued to pass EXIT:0 after the hygiene patch.

**Same unique index strategy as sanity:booking** — three distinct `(orgId, user)` pairs per run.

**Verification:** 6/6 PASSED — `SANITY_LEADS_EXIT:0`

---

## 7. Shared Fixture / Anti-Drift Strategy

All three scripts share these conventions (via `sanity-shared-fixtures.mjs`):

- **Randomized emails:** all test users use `*-{timestamp}-{hex}@example.test` addresses — never real addresses, never collision with production data.
- **Randomized safe slugs:** org slugs prefixed `st-analytics-*`, `st-booking-*`, `st-leads-*`; card slugs prefixed `sanity-analytics-*`, `sanity-booking-*`, `sanity-leads-*`.
- **Local in-process server:** Express app is spun up internally on `127.0.0.1` with an ephemeral OS-assigned port (port 0). No external URL is called.
- **Test org with active `orgEntitlement`:** each script creates an `Organization` with `orgEntitlement.status = "active"` and `orgEntitlement.plan = "org"` to exercise the premium path.
- **personalOrgId for free-card fixture:** uses the real personal org (no `orgEntitlement`) so `resolveEffectiveBilling` resolves to free tier.
- **Random ObjectId for inactive-card fixture:** avoids `orgId_1_user_1` unique index collision. The inactive-card 404 fires before any org lookup, so the orgId value is irrelevant to the assertion.
- **No production endpoints called:** all requests go to `http://127.0.0.1:{port}`.

---

## 8. Cleanup Strategy

Each script cleans up all created fixtures in a `finally` block, ensuring cleanup runs even if a check assertion throws:

| Script           | Cleaned models                                       |
| ---------------- | ---------------------------------------------------- |
| sanity-analytics | `CardAnalyticsDaily`, `Card`, `Organization`, `User` |
| sanity-booking   | `Booking`, `Card`, `Organization`, `User`            |
| sanity-leads     | `Lead`, `Card`, `Organization`, `User`               |

Additionally:

- No `OrganizationMembers` documents are created (no invite flow used).
- No `OrgInvite` or `OrgInviteAudit` documents are created.
- No Supabase storage or media uploads are created.
- `mongoose.disconnect()` and `server.close()` are called in `finally`.

---

## 9. Security / Operations Notes

**These scripts are controlled-write sanity scripts.**

- They create real MongoDB documents and clean them in `finally` blocks.
- They are **not production-safe by default** if `MONGO_URI` points to the production cluster. Run only against a safe local or staging DB.
- This is consistent with the existing sanity suite pattern (`sanity:org-access`, `sanity:org-membership`, etc. have the same pattern with no explicit production-DB guard).
- No raw secrets or tokens are printed to stdout. JWTs are signed via `signToken()` and used only in `Authorization` headers of outgoing in-process requests — never logged.
- No production mutation was performed during verification.
- No production endpoints were called during verification. All requests hit `http://127.0.0.1:{port}`.

**Future optional hardening (P2, non-blocking):**

- ~~Add an explicit `MONGO_URI` production-guard check (e.g., refuse to run if `MONGO_URI` contains the production Atlas hostname) across all controlled-write sanity scripts.~~ **COMPLETED** in contour `CONTROLLED_WRITE_SANITY_PRODUCTION_DB_GUARD` (2026-05-04). All three new QA sanity scripts (`sanity:analytics`, `sanity:booking`, `sanity:leads`) — and all 11 controlled-write scripts in the full suite — now call `assertControlledWriteSanityTarget` (from `backend/scripts/lib/controlled-write-guard.mjs`) before DB connect. They fail closed on production-like DB targets unless an explicit verbose override is set. See `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-04_ControlledWriteSanity_ProductionDBGuard_Closed.md`.

---

## 10. Verification Results

**Target sanities:**

| Script           | Checks | Result | EXIT |
| ---------------- | ------ | ------ | ---- |
| sanity:analytics | 9/9    | PASSED | 0    |
| sanity:booking   | 4/4    | PASSED | 0    |
| sanity:leads     | 6/6    | PASSED | 0    |

**Existing backend regression sanity suite:**

| Script                       | Result | EXIT |
| ---------------------------- | ------ | ---- |
| sanity:imports               | PASSED | 0    |
| sanity:org-access            | PASSED | 0    |
| sanity:org-membership        | PASSED | 0    |
| sanity:slug-policy           | PASSED | 0    |
| sanity:ownership-consistency | PASSED | 0    |
| sanity:card-index-drift      | PASSED | 0    |

**Frontend gates:**

| Gate                  | Result | EXIT |
| --------------------- | ------ | ---- |
| check:inline-styles   | PASS   | 0    |
| check:skins           | PASS   | 0    |
| check:contract        | PASS   | 0    |
| frontend build (vite) | PASS   | 0    |

---

## 11. Explicit Out of Scope

- No runtime controller changes in this contour (`analytics.controller.js`, `booking.controller.js`, `lead.controller.js` were changed in the prior contour `ORG_CARD_PREMIUM_FEATURE_PARITY`, not here).
- No frontend changes.
- No production deploy.
- No production mutation.
- No CI workflow changes.
- ~~No global production-DB guard added to the sanity suite (deferred, see Section 9).~~ Guard was subsequently completed in contour `CONTROLLED_WRITE_SANITY_PRODUCTION_DB_GUARD` (2026-05-04) — all 11 controlled-write scripts are now guarded.
- No archive handoffs modified.

---

## 12. Related Docs / Handoffs

- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-04_OrgCard_PremiumFeatureParity_Closed.md` — the prior contour that fixed org-unaware entitlement in analytics/booking/leads controllers.
- `docs/handoffs/current/Cardigo_Enterprise_Production_Launch_Handoff_2026-05-03.md` — production truth file; Section 16 updated with this contour's closure.
- `docs/runbooks/backend-verification-and-deploy.md` — Section D canonical sanity order; updated to include `sanity:analytics`, `sanity:booking`, `sanity:leads`.

---

## 13. Closed Contour Declaration

**Status:** CLOSED / VERIFIED

All 19 checks across 3 new sanity scripts passed. All existing backend regression sanities passed. Frontend gates and build passed. No runtime files, no frontend files, no production data, no archive handoffs modified in this contour.

STOP.
