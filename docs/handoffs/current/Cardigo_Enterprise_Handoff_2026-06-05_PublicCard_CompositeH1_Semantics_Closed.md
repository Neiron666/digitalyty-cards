# Cardigo Enterprise Handoff — Public Card Composite H1 Semantics — Closed

Date: 2026-06-05
Contour: PUBLIC_CARD_COMPOSITE_H1_SEMANTICS
Status: CLOSED / PASS / DEPLOY-SAFE / LOCAL/PREVIEW BROWSER VERIFIED

---

## 1. Executive Summary

The identity block of the public card (and editor preview) now implements composite h1 semantics. There is still exactly one `<h1>` per card render. The h1 now contains a `<span>` for the business name and, when the guardrail allows it, a second `<span>` for the business category (תחום עיסוק). If the category folds into h1, the standalone subtitle paragraph is suppressed. If not, the subtitle paragraph renders as before. Slogan remains outside h1. The backend deterministic OG HTML service has matching semantics. All frontend and backend verification gates pass.

---

## 2. Contour Scope and Architecture Decision

Option B selected: composite h1 with a stateless guardrail function (`shouldFoldCategoryIntoHeading`). The guardrail is pure (no DTO dependency) and is intentionally duplicated in both the frontend render component and the backend OG HTML service — not shared via a shared import — to keep each surface independently deployable.

The fold decision: name and category must both be non-empty; they must not be equal, overlapping (containment), or share ≥ 2 significant tokens (length ≥ 3); the name must not contain a compound separator (" - ", "|", ":", " / "); and the combined character length must not exceed 90.

The public DTO, SeoHelmet, buildSeo, og.routes, Edge og-preview, templates registry, and all skin files were not changed. This contour is a semantic HTML + rendering logic change only.

---

## 3. Files Changed (Phase 2A)

- `frontend/src/templates/layout/CardLayout.jsx` — added guardrail helpers; wrapped business name in `<span className={styles.nameHeadingText}>`; added conditional folded category `<span>` inside h1; made standalone subtitle paragraph conditional on `!foldCategory`; `foldCategory` computed after existing `name`/`subtitle`/`slogan` derives.
- `frontend/src/templates/layout/CardLayout.module.css` — added `.nameHeadingText { display: block }` and `.headingCategory { display: block; margin-block-start: 0.25rem; font-weight: 400 }`. Both added after existing `.subtitle` rule. No existing rule modified.
- `backend/src/services/cardOgHtml.service.js` — added guardrail helpers (same algorithm, duplicated); updated `renderBody` to compute `foldCategory` and emit `<h1><span>NAME</span> <span>CATEGORY</span></h1>` when folded (skipping standalone subtitle `<p>`), or `<h1>NAME</h1>` + standalone `<p>CATEGORY</p>` when not. `pickH1`/`renderHead`/head title path unchanged.
- `backend/scripts/sanity-card-og-html.mjs` — updated F1 h1 assertion to composite shape; added F1 no-duplicate-subtitle assertion; updated F2 escaped-composite h1 assertion; added F11 guardrail block (fold, compound-separator suppress, containment suppress, length-cap suppress — 7 assertions). Total count grew from 46 to 54.

---

## 4. Files Intentionally Not Changed

- `backend/src/services/cardPublicProjection.util.js` (`toCardPublicRenderDTO` / `toCardPublicSeoDTO`) — DTO shape unchanged.
- `frontend/src/components/seo/SeoHelmet.jsx` — head title/meta logic unchanged.
- `backend/src/controllers/card.controller.js` `buildSeo` — head title construction unchanged.
- `backend/src/routes/og.routes.js` — route/anti-enumeration/canonical logic unchanged.
- `frontend/netlify/edge-functions/og-preview.js` — head-only injection and social branch unchanged.
- `frontend/src/templates/templates.config.js` — templates registry unchanged.
- All 28 skin files under `frontend/src/templates/skins/` — skins remain token-only, unchanged.
- `frontend/src/pages/PublicCard.jsx`, `frontend/src/templates/TemplateRenderer.jsx`, `frontend/src/components/card/CardRenderer.jsx` — render chain wiring unchanged.

---

## 5. Verification Summary

Frontend gates (from `frontend/`):

- `npm.cmd run check:inline-styles` → PASS. EXIT 0.
- `npm.cmd run check:skins` → PASS, 28 files scanned. EXIT 0.
- `npm.cmd run check:contract` → PASS, 25 templates. EXIT 0.
- `npm.cmd run check:typography` → REPORT_ONLY (12 pre-existing violations on primitive `--fs-*` scale lines 39-54, not in the changed region). EXIT 0.
- `npm.cmd run check:typography:boundary` → PASS, 19/19 tokens. EXIT 0.
- `npm.cmd run build --if-present` → PASS (399 client modules, 294 SSR modules, SSG all routes, check:ssg-output). EXIT 0.

Backend sanities (from `backend/`):

- `node scripts/sanity-card-og-html.mjs` → Total: 54 Failed: 0. EXIT 0.
- `node scripts/sanity-card-public-projection.mjs` → Total: 67 Failed: 0. EXIT 0.

Browser smoke (LOCAL/PREVIEW VERIFIED — not marked as production until operator confirms cardigo.co.il post-deploy):

- Fold case (distinct short name + category): h1 shows name span + category span; no duplicate subtitle paragraph rendered. PASS.
- No-fold via compound separator (" - " in name): h1 name-only; category renders as standalone subtitle paragraph. PASS.
- No-fold via length cap (name+category > 90 chars): h1 name-only; standalone subtitle paragraph preserved. PASS.
- Folded case with Hebrew content (Lakmi template fixture): fold decision correct; visual hierarchy (name larger/bold, category smaller/normal-weight) confirmed. PASS.

---

## 6. Protected Invariants (unchanged by this contour)

- Exactly one `<h1>` per rendered card in all paths (public browser, editor preview, OG HTML).
- Head `<title>` tag is derived from `pickH1` / `buildSeo` path — composite fold logic lives only in `renderBody`, not in head title construction.
- Canonical, og:url, og:title, robots, and all head meta are unchanged.
- Anti-enumeration and org security invariants on `/og/c/:orgSlug/:slug` are unchanged.
- Auth cookie, CSRF, CORS, analytics write-path — all out of scope and unchanged.

---

## 7. Remaining Non-Blocking Tails

- Guardrail duplication: `shouldFoldCategoryIntoHeading` (plus its constants) is duplicated in `CardLayout.jsx` and `cardOgHtml.service.js`. Future heuristic tuning must update both files in lockstep and extend F11 in `sanity-card-og-html.mjs`. A future optional cross-file parity sanity (asserting identical fold decisions on a shared fixture set) would eliminate the manual sync requirement.
- Pre-existing typography REPORT_ONLY tail: 12 violations on the primitive `--fs-*` fluid scale (CardLayout.module.css lines 39-54) remain. Not a regression from this contour. Tracked separately as a high-blast-radius deferred exception per `docs/cards-styling-architecture.md` §Card Typography.
- CSS ordering dependency: `.headingCategory` must remain after `.subtitle` in `CardLayout.module.css`. This is not enforced by any gate today; it is a source-order constraint noted in `docs/cards-styling-architecture.md` §Identity block.
- Production browser smoke is pending operator confirmation after backend + frontend deploy to cardigo.co.il. When confirmed, update the Status line of this handoff from LOCAL/PREVIEW BROWSER VERIFIED to PRODUCTION BROWSER VERIFIED.

---

## 8. Closure Statement

PUBLIC_CARD_COMPOSITE_H1_SEMANTICS is CLOSED / PASS / DEPLOY-SAFE / LOCAL/PREVIEW BROWSER VERIFIED.

Do not retroactively rewrite this document. Open a new handoff for any follow-on contour touching the composite h1 policy or guardrail algorithm.
