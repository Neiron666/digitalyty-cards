# Cardigo Enterprise Handoff — Public Card Deterministic OG HTML — Closed

Date: 2026-05-27
Contour: PUBLIC_CARD_DETERMINISTIC_SSR_RENDERING
Status: CLOSED / PASS

## 1. Executive status

- CONTOUR CLOSED / PASS.
- Production smoke PASS for `/og/card/:slug`, `/og/c/:orgSlug/:slug`, and social-UA `/card/:slug` and `/c/:orgSlug/:slug`.
- Rollback NOT required.
- No DB writes performed during production smoke.
- No controlled-write sanity scripts executed against production.
- No migrations, no `Card.syncIndexes()`.
- No frontend source changes were required by this contour.
- No package.json, no env, no docs (other than this handoff), no Edge, no sitemap, no middleware/model/schema changes were made.

## 2. Architecture summary

- Option A selected: server-side deterministic HTML rendering for OG endpoints, produced by a dedicated stateless service (`renderCardOgHtml`) over a strictly projected public DTO pair (`toCardPublicSeoDTO` + `toCardPublicRenderDTO`) derived from `toCardDTO(card, now, { includePrivate: false, org })`.
- Option B (Vite SSR artifact / cross-deploy coupling) rejected for this contour: cross-deploy coupling risk between frontend bundle and backend rendering surface, larger blast radius, harder anti-enumeration guarantees, weaker determinism contract.
- `/og/card/:slug` and `/og/c/:orgSlug/:slug` now produce deterministic semantic HTML (doctype, `<html lang="he" dir="rtl">`, head with title/description/robots/self canonical/self og:url/og:type/og:image, body with `<main><article><h1>…`, JSON-LD LocalBusiness, no inline styles, no `<style>`, no `target=`, no `http-equiv="refresh"`) instead of the previous meta-refresh success HTML.
- Social-UA requests against the public card routes (`/card/:slug`, `/c/:orgSlug/:slug`) receive deterministic OG-equivalent HTML via the existing Edge behavior; byte-shape parity with `/og/*` direct response confirmed during 2B6 smoke (the only intentional difference is Edge `Cache-Control: public, max-age=300, stale-while-revalidate=60` vs backend `Cache-Control: no-cache`).
- Normal browser SPA behavior for `/card/:slug` and `/c/:orgSlug/:slug` is out of scope for this contour and is unchanged.

## 3. Closed phases summary

- Phase 1 / 1B — Read-only audits. Mapped existing meta-refresh OG path, classified risk surface, identified anti-enumeration and trial-410 invariants on `/og/c`.
- Phase 2A — Architecture decision. Selected Option A (backend deterministic renderer). Rejected Option B (Vite SSR artifact).
- Phase 2B1 — Public projection helpers. Added `toCardPublicSeoDTO` and `toCardPublicRenderDTO` with strict forbidden-field guards (`billing`, `tranzila`, `seo.headSnippets`, gallery `storagePath/bucket/internalId/path/thumbPath`, render skin/theme/palette/templateId, businessHours `_id/__v/v/ownerId/internalNote/providerToken`). Same-https-host invariant on `ctx.publicUrl` vs `ctx.siteUrl`.
- Phase 2B2 — Deterministic HTML service `renderCardOgHtml({ seo, render, lang, dir })`. Hardened against `</script` payloads, U+2028/U+2029, attribute injection, `javascript:`/`data:`/`http:`/`ftp:` URLs, non-https canonical/ogUrl. Byte-identical output on same inputs (golden snapshot test).
- Phase 2B3 — Route wiring in `backend/src/routes/og.routes.js` for `/og/card/:slug` and `/og/c/:orgSlug/:slug`. Same-origin canonical and og:url constructed by the route from `siteUrl` + route shape, ignoring any user-supplied `seo.canonicalUrl`. Anti-enumeration preserved on `/og/c` (membership check before 410).
- Phase 2B3 safe DB verification — Controlled-write sanity gates (`sanity:org-access`, `sanity:org-membership`, `sanity:slug-policy`) executed exclusively against disposable Atlas cluster `cardigo_ssr_sanity`. DB governance tail (index footprint bootstrap for the empty disposable DB) classified as a separate future contour; `syncIndexes` explicitly rejected.
- Phase 2B4 — Local fixture-backed runtime smoke against `127.0.0.1:5051` with disposable fixtures inserted in `cardigo_ssr_sanity` only. PASS for personal-valid 200, org-valid 200, personal-missing 404, org-missing 404. Trial-410 marked NOT_RUN due to route-shape unreachability (handler requires `user not-null` and `isEntitled` returns true for any user-owned card). All fixtures cleaned up; zero residue.
- Phase 2B5 — Read-only pre-deploy readiness. Local syntax check, projection 67/67, HTML 46/46, `sanity:imports` ok, `sanity:ownership-consistency` all-zero discrepancy buckets, `sanity:card-index-drift` ok with missing/mismatches/unexpected all empty on production-shaped DB. Targeted source proofs: `seo.canonicalUrl` only in comments, no meta-refresh in card handlers, no Cache-Control added, 404 body "Not found", 410 body "TRIAL_EXPIRED_PUBLIC", required imports present.
- Phase 2B6 — Production read-only smoke against `https://cardigo.co.il` after operator-completed backend deploy. Six cases PASS (see §4).

## 4. Production smoke proof

Fixtures used (no secrets, public URLs):

- Personal: https://cardigo.co.il/card/kartis-bikur-digitali-hinam
- Org: https://cardigo.co.il/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan

Pass conditions met:

- Direct `/og/card/kartis-bikur-digitali-hinam` → 200, deterministic HTML, self canonical https://cardigo.co.il/card/kartis-bikur-digitali-hinam, self og:url, no homepage canonical, no external canonical, no meta refresh, no `<style`, no `style=`, no `target=`.
- Direct `/og/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan` → 200, deterministic HTML, self canonical https://cardigo.co.il/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan, self og:url, same hardening invariants pass.
- Social-UA (`facebookexternalhit/1.1`) `/card/kartis-bikur-digitali-hinam` → 200, deterministic OG-equivalent HTML, byte-shape parity with the direct backend response (same title/canonical/og:url/og:type/og:image), Edge `Cache-Control: public, max-age=300, stale-while-revalidate=60`.
- Social-UA `/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan` → 200, identical hardening profile.
- `/og/card/missing-ssr-smoke-<rand>` → 404, body exactly "Not found", `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff`, no doctype, no homepage canonical leak.
- `/og/c/missing-org-ssr-smoke-<rand>/missing-card-ssr-smoke-<rand>` → 404, body exactly "Not found", anti-enumeration shape preserved (identical to personal-missing response).
- No 5xx, no redirect loops, no certificate issues, no rollback signal.

## 5. Protected invariants

- Canonical and `og:url` are always derived from the resolved backend route shape (`${siteUrl}/card/${card.slug}` or `${siteUrl}/c/${orgSlug}/${card.slug}`), never from user-supplied `seo.canonicalUrl`. The projection helper explicitly ignores `dto.seo.canonicalUrl`.
- `/card/:slug` (personal) and `/c/:orgSlug/:slug` (org) remain separate route/security namespaces. The personal handler filters `orgId ∈ { personalOrgId, missing, null }`; the org handler scopes by `orgId = org._id` and additionally requires an active `OrganizationMember` for the card owner.
- `/og/c` anti-enumeration: org membership check runs before any 410 trial-expired branch, so non-members and revoked members cannot distinguish "exists but trial expired" from "does not exist". Missing org vs missing card vs non-member all yield the same 404 + "Not found".
- 404 body is exactly `"Not found"`. 410 body is exactly `"TRIAL_EXPIRED_PUBLIC"`.
- No new `Cache-Control` header was introduced on backend `/og/card` or `/og/c` responses. Direct backend response remains `Cache-Control: no-cache`. Edge-served public `/card` and `/c` retain their pre-existing `public, max-age=300, stale-while-revalidate=60` profile for social-UA traffic.
- The deterministic HTML renderer enforces https-same-host invariants on canonical and og:url and rejects non-https or cross-host URLs at the projection layer.
- `Card.syncIndexes()` is not used. Production index footprint validated read-only via `sanity:card-index-drift` (missing/mismatches/unexpected all empty).
- No production DB writes occurred at any phase. Disposable writes were limited to cluster `cardigo_ssr_sanity` and fully reverted.

## 6. Open tails / deferred contours

The following are recorded as separate future contours and are explicitly out of scope of this closure:

- DB governance: explicit `createIndex`-only bootstrap scripts that bring an empty disposable sanity DB to the canonical Card index footprint without `syncIndexes`. Production already matches the canonical footprint; tail applies only to the disposable cluster's bring-up flow.
- Cache hardening for deterministic `/og/card` and `/og/c` (introduce a bounded `Cache-Control` / `Surrogate-Control` profile and consider a CDN tier). Requires its own audit and rollout.
- Dead-code cleanup of pre-2B2 meta-refresh OG helper code paths once confirmed unreferenced; deferred to avoid scope creep in this contour.
- Trial-410 policy clarification: under the current route shape, `/og/card` and `/og/c` require a non-null `user`, and `isEntitled` returns true unconditionally for any user-owned card, making the live 410 branch unreachable for user-owned cards. Either accept this as the intended product behavior or revise the handler precondition in a dedicated contour.
- Optional broader SSR/body rendering strategy for normal browser `/card` and `/c` (full SSR vs current SPA shell) is a separate product decision.
- Blog/guides meta-refresh paths (`/og/blog/:slug`, `/og/guides/:slug`) remain out of this contour. Any future deterministic rendering for those routes is a separate workstream.

## 7. Verification commands summary (raw summaries)

- `node backend/scripts/sanity-card-public-projection.mjs` → Total: 67 Failed: 0.
- `node backend/scripts/sanity-card-og-html.mjs` → Total: 46 Failed: 0.
- `cd backend && npm.cmd run sanity:imports` → `{"ok":true,"importedCount":20,"failedCount":0,"failures":[]}`.
- `node --check backend/src/routes/og.routes.js` → exit 0.
- Phase 2B3-E controlled-write sanity gates on disposable cluster `cardigo_ssr_sanity` (`sanity:org-access`, `sanity:org-membership`, `sanity:slug-policy`) → PASS. Not re-run against production per policy.
- Phase 2B5 read-only DB sanities on production-shaped DB: `sanity:ownership-consistency` all-zero discrepancy buckets; `sanity:card-index-drift` ok with missing/mismatches/unexpected empty.
- Phase 2B4 local runtime smoke against `127.0.0.1:5051` with disposable fixtures in `cardigo_ssr_sanity` → PASS (Cases A/B/C/D); Case E trial-410 NOT_RUN with documented unreachability reason; cleanup verified zero residue.
- Phase 2B5 pre-deploy readiness → PRE_DEPLOY_READINESS_PASS.
- Phase 2B6 production read-only smoke against `https://cardigo.co.il` → PRODUCTION_SMOKE_PASS (Cases A/B direct OG 200, C/D social-UA 200, E/F missing 404, no rollback signal).

## 8. Final operator note

- No rollback required.
- Do not re-deploy purely for this docs change unless docs deployment is intentionally desired by the documentation pipeline.
- Keep future changes bounded: the deferred tails in §6 are independent contours and must be opened as their own phased workstreams rather than appended to this one.
