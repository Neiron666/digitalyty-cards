# Cardigo Enterprise Handoff — Editor Demo Notice Visibility + Anonymous Draft Preview Link

**Date:** 2026-05-12
**Project:** Cardigo — Israel-first / Israel-only digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / PASS (with authentication runtime smoke caveat — see §6)

**Brand separation invariant:** Cardigo and Digitalyty are separate products and must not be mixed in canonical URLs, SEO metadata, public paths, product logic, structured data, user-facing copy, billing docs, or analytics truth.

---

## 1. Contours Closed

### 1.1 EDITOR_PREVIEW_DEMO_NOTICE_VISIBILITY_POLICY_FIX — CLOSED / PASS

**Problem:** The editor live-preview demo notice was gated on `isAuthenticated`, causing it to remain invisible to anonymous users who had demo content in their draft card. The notice and its link were both suppressed, even when a safe preview link was available.

**Fix:** Decoupled notice visibility from linkability and authentication state:

- `showDemoNotice` — a content-based boolean derived from the draft card data — exclusively controls whether the notice renders. It checks for the string "דוגמא" in `business.name`, `content.aboutTitle`, `faq.title`, and `reviews[].name`. Authentication state has no role in this check.
- `canOpenPreviewNoticeLink` — a local boolean condition — controls whether the notice renders as a clickable link or a plain span. It is true when `previewHref` is available AND either `isAuthenticated` is true OR `getAnonymousId()` returns a truthy value.
- When `canOpenPreviewNoticeLink` is false, a plain `<span>` fallback renders the phrase "במצב תצוגה מקדימה" without a link. This preserves the informational message even when no safe link can be offered.

**Changed file:** `frontend/src/components/editor/EditorPreview.jsx`

---

### 1.2 EDITOR_ANONYMOUS_DRAFT_PREVIEW_LINK_SUPPORT — CLOSED / PASS (auth cookie runtime smoke NOT RUN — see §6)

**Problem:** Anonymous draft card owners could not navigate to their own card's preview page from the editor. The preview controller blocked all non-authenticated access unconditionally.

**Fix:** A new anonymous ownership branch was added to `getPreviewCardBySlug` in `card.controller.js`. The branch evaluates after identity extraction and slug/card lookup:

- `requesterAnonymousId` is read from `req.anonymousId` (set by `anonymousMiddleware` from the `x-anonymous-id` header, validated as a UUID).
- If both `requesterUserId` and `requesterAnonymousId` are absent → 404 (no identity).
- If the card has a truthy `card.anonymousId` and `card.user` is null (anonymous-owned card):
    - `req.anonymousId` must equal `card.anonymousId` exactly.
    - Mismatch → 404 (wrong anonymous identity).
    - Match → `toCardDTO(card, now)` is returned (no `userTier` argument); `setDraftNoStore` headers are applied; early return (does not reach `User.findById`).
- If `card.user` is null and `card.anonymousId` is also null (orphan card) → 404.
- If the card is user-owned and the request has no `requesterUserId` (anonymous actor) → 404.
- If the card is user-owned and `requesterUserId` does not match `card.user` (wrong owner) → 404.
- If the card is user-owned and owner matches → registered-owner path proceeds unchanged: `User.findById`, `toCardDTO(card, now, { user: userTier })`, `setDraftNoStore`.

**Changed file:** `backend/src/controllers/card.controller.js` (function `getPreviewCardBySlug`, approx. lines 2252–2331)

---

## 2. Changed Code Files

- `backend/src/controllers/card.controller.js` — `getPreviewCardBySlug` anonymous ownership branch
- `frontend/src/components/editor/EditorPreview.jsx` — `showDemoNotice` decoupled from auth; `canOpenPreviewNoticeLink` local condition; `getAnonymousId` import added

---

## 3. Access-Control Invariants

### 3.1 Anonymous draft preview is not public-by-slug

An anonymous-owned draft card is not publicly reachable. Slug alone is not sufficient. The backend personal preview API route (`GET /api/preview/cards/:slug`) requires a valid, matching `x-anonymous-id` header for anonymous-owned cards. All other access attempts return 404.

### 3.2 Anti-enumeration

All denial paths return `404 { message: "Not found" }`. No distinction is exposed between "card not found", "wrong owner", "wrong anonymousId", or "orphan card". This preserves the anti-enumeration posture consistent with the rest of the card access control surface.

### 3.3 anonymousId not leaked in DTO

`toCardDTO` does not include `anonymousId` in its output. This was confirmed by static source review and by inspecting the API smoke response body. The anonymous owner branch returns `toCardDTO(card, now)` without any extra field exposure.

### 3.4 Registered-owner path is source-preserved

The existing registered-owner branch in `getPreviewCardBySlug` — which calls `User.findById(String(card.user))` and passes `userTier` to `toCardDTO` — was not changed. It is reached only after `card.user` is confirmed truthy and `requesterUserId` matches `card.user`.

---

## 4. Frontend Preview Link Behavior

- Frontend preview page route: `/preview/card/:slug`
- `previewHref` is derived from `card.publicPath` via `toPreviewHrefFromPublicPath`.
- The editor demo notice link `<a href={previewHref} target="_blank" rel="noopener noreferrer">` renders only when `canOpenPreviewNoticeLink` is true.
- The `x-anonymous-id` header is sent on all API requests via the axios interceptor in `frontend/src/services/api.js`. The backend's `anonymousMiddleware` reads this header on every request before the controller executes.

---

## 5. Unchanged Boundaries

- Public card routes (`/card/:slug`, `/c/:orgSlug/:slug`): unchanged.
- `CardLayout`, public render chain, SSoT render chain: unchanged.
- SEO, sitemap, OG, JSON-LD: unchanged.
- Org preview controller/function: not changed by this workstream.
- Anonymous card TTL cleanup job (`trialCleanup.js`): unchanged.
- Anonymous card claim flow (`claimCard.service.js`): unchanged.
- `EditorPreview.module.css`: unchanged (no CSS changes in this workstream).
- `anonymousMiddleware`: unchanged (reads `x-anonymous-id`, validates UUID, sets `req.anonymousId`).

---

## 6. Verification Matrix

| Check                                                        | Result                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Static source verification                                   | PASS                                                                   |
| check:inline-styles                                          | EXIT 0                                                                 |
| check:skins                                                  | EXIT 0                                                                 |
| check:contract                                               | EXIT 0                                                                 |
| Frontend build                                               | EXIT 0 (370 modules)                                                   |
| Anonymous API smoke — no identity → 404                      | PASS                                                                   |
| Anonymous API smoke — own anonymousId → 200 + DTO            | PASS                                                                   |
| Anonymous API smoke — wrong anonymousId → 404                | PASS                                                                   |
| Anonymous API smoke — user-owned card via anon request → 404 | PASS                                                                   |
| Anonymous browser smoke — demo notice visible with link      | PASS                                                                   |
| Anonymous browser smoke — preview link navigability (no 404) | PASS                                                                   |
| Authenticated owner runtime cookie smoke                     | NOT RUN — auth cookie sessions were unavailable during this workstream |
| Authenticated non-owner runtime cookie smoke                 | NOT RUN — auth cookie sessions were unavailable during this workstream |
| Production smoke                                             | NOT RUN in this workstream                                             |

The authenticated owner path is source-preserved (the registered-owner branch in `getPreviewCardBySlug` was not modified). No runtime verification with live authenticated cookies was performed in this workstream.

---

## 7. Anti-Overclaim Note

This handoff does NOT claim:

- Authenticated owner or non-owner runtime cookie smoke passed.
- Production smoke passed.
- Anonymous draft cards are public or reachable by slug alone.
- The preview route is public.
- Org preview controller was runtime-smoked.
- SEO, sitemap, OG, or CardLayout were changed.
- There are no remaining verification tails.

The remaining tail is: authenticated owner and non-owner runtime cookie smoke should be completed in a future session when live auth sessions are available.

---

## 8. Related Documents

- `docs/runbooks/anon-card-cleanup.md` — anonymous card TTL, candidate query, deletion order (unchanged by this workstream; access-control addendum added in this doc closure)
- `docs/api-security.md` — auth endpoint security reference (preview route access-control subsection added in this doc closure)
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-06_InputBounds_And_EditorUX_ValidationClosure.md` — prior closure for `card.controller.js` anonymous PATCH entitlement gate (separate function, separate concern)

---

## 9. Closed Contour Declaration

EDITOR_PREVIEW_DEMO_NOTICE_VISIBILITY_POLICY_FIX: CLOSED / PASS
EDITOR_ANONYMOUS_DRAFT_PREVIEW_LINK_SUPPORT: CLOSED / PASS (auth cookie runtime smoke NOT RUN — source-preserved)

Do not casually reopen these contours. Future issues with demo notice visibility or anonymous preview access must be opened as new bounded contours referencing this document.

_Document created 2026-05-12 as part of the DOCS_EDITOR_ANONYMOUS_DRAFT_PREVIEW_LINK_CLOSURE_P2 workstream. Records the closure of EDITOR_PREVIEW_DEMO_NOTICE_VISIBILITY_POLICY_FIX and EDITOR_ANONYMOUS_DRAFT_PREVIEW_LINK_SUPPORT. No source code, CSS, config, env, DB, or deploy changes are made by this documentation phase._
