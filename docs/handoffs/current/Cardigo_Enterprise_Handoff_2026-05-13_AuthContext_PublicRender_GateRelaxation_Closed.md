# Cardigo Enterprise Handoff — AuthContext Public Render Gate Relaxation — CLOSED

**Date:** 2026-05-13
**Project:** Cardigo — Digital Business Cards SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / PRODUCTION VERIFIED

**Brand invariant:** Cardigo and Digitalyty are separate products. No brand, canonical URL, public path, SEO metadata, OG, or structured data changes were made in this contour.

---

## 1. Executive Summary

The previous `AuthContext` provider rendered `{!loading && children}`, blocking all SPA children from mounting until `/api/auth/me` either resolved or failed. This created a browser-side public render delay affecting all users and a WRS render-latency exposure for public SEO routes: if `/api/auth/me` was slow during a WRS observation window, the root element could remain empty for the full WRS execution budget.

This contour changed the browser runtime so that public routes render while the auth bootstrap continues in the background. The provider now renders `{children}` unconditionally. `/api/auth/me` still runs on every page load. Auth state still resolves globally and is available to all consumers once bootstrap completes. Consumers that require auth — `/inbox`, `/admin` — are protected by purpose-built route guards. The hybrid `/edit` route guards each of its internal effects against the `loading` state directly.

What improved: public SPA content is visible to browsers and WRS without waiting for `/api/auth/me`.

What did not change: server HTML TTFB (the SPA shell delivery), SSR (none was added), `/api/auth/me` endpoint (still present and still called), Googlebot indexing guarantees (none are made), route topology, sitemap, OG routes, backend.

---

## 2. Contours Closed

### A. AUTHCONTEXT_BOOTSTRAP_TIMEOUT_RESILIENCE

**Status:** CLOSED / PASS

Added a bounded fail-open timeout to the `AuthContext` bootstrap call.

- `AUTH_BOOTSTRAP_TIMEOUT_MS = 2500` hardcoded in `frontend/src/context/AuthContext.jsx` (L15). Intentionally not env-driven in this phase.
- `getMe({ signal, timeout })` — `auth.service.js` was updated to accept and forward `signal` and `timeout` options through the underlying API call, enabling the AbortController-based timeout.
- Each bootstrap effect run owns its own `AbortController`, `setTimeout` timer, and `active`/`finished` guards. Late responses after timeout cannot flip user state.
- Fail-open: if `/api/auth/me` does not settle within `AUTH_BOOTSTRAP_TIMEOUT_MS`, the request is aborted, `user` is set to `null`, and `loading` is set to `false`. The app renders as anonymous rather than remaining blank indefinitely.

### B. AUTHCONTEXT_PUBLIC_RENDER_FOUNDATION_ROUTES_P2A1

**Status:** CLOSED / PASS

Exposed `loading` from `AuthContext` and added route-level guards for private and admin routes.

- `AuthContext.jsx`: `loading` added to the `useMemo` context value and dependency array (L122, L125).
- `router.jsx`: `RequireAuth` helper added (L54–59). Reads `{ isAuthenticated, loading }` from context. While `loading=true`, returns `<RouteFallback>`; when `loading=false` and `!isAuthenticated`, redirects to `/login`; otherwise renders children.
- `router.jsx`: `/inbox` route (path `"inbox"`) is the only route wrapped with `<RequireAuth>`. No other routes are wrapped.
- `router.jsx`: `AdminRouteGate` updated (L61–90) to read `{ user, loading }`. Loading branch returns `<SeoHelmet robots="noindex, nofollow" />` + `<RouteFallback>`. Non-admin branch returns `<SeoHelmet robots="noindex, nofollow" />` + `<NotFound>`. Admin is never redirected to `/login`.

### C. AUTHCONTEXT_PUBLIC_RENDER_EDITCARD_GUARD_P2A2

**Status:** CLOSED / PASS

Added `authLoading` guards to `EditCard.jsx` to prevent premature anonymous flow execution during the auth bootstrap window.

- `EditCard.jsx` L23: `const { isAuthenticated, loading: authLoading } = useAuth();`
- Auth-transition reset effect (L465–477): `if (authLoading) return;` as first statement.
- `initCard` useCallback (L572): `if (authLoading) return;` before the existing `contextResolved` gate.
- Launcher effect (L921–950): `if (authLoading) { return () => { isMounted = false; }; }` as first branch.
- `/edit` remains a hybrid route. `RequireAuth` was NOT added to `/edit`. Anonymous users can still reach the consent path. The guards prevent the authenticated-user init flow from running while the auth state is indeterminate.

### D. AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION_P2B

**Status:** CLOSED / PASS

Removed the global render gate from the `AuthContext` provider.

- `AuthContext.jsx` L128 (previously L129): changed from `{!loading && children}` to `{children}`.
- One line changed, one file.
- All prerequisite phases (A, B, C) were verified PASS before this change was applied.

---

## 3. Changed Files

Exactly four source files were changed by this contour. No other files were modified.

**frontend/src/context/AuthContext.jsx**
Added `AUTH_BOOTSTRAP_TIMEOUT_MS = 2500` constant; added `AbortController`/timer/`active`/`finished` bootstrap guards; added `getMe({ signal, timeout })` call; exposed `loading` in `useMemo` context value and dependency array; changed provider render from `{!loading && children}` to `{children}`.

**frontend/src/services/auth.service.js**
Updated `getMe` to accept and forward `{ signal, timeout }` options to the underlying API call, enabling AbortController-based cancellation from `AuthContext` bootstrap.

**frontend/src/app/router.jsx**
Added `RequireAuth` helper (loading → `RouteFallback`, unauthenticated → `/login`); wrapped `/inbox` route with `<RequireAuth>`; updated `AdminRouteGate` to handle loading branch with `RouteFallback` and non-admin branch with `NotFound` (not `/login`).

**frontend/src/pages/EditCard.jsx**
Added `loading: authLoading` from `useAuth()`; added `authLoading` guard in auth-transition reset effect, `initCard` callback, and launcher effect to prevent premature anonymous init during auth bootstrap window.

**Not changed:**

- No backend files changed.
- No CSS or CSS Module files changed.
- No environment files changed.
- No sitemap (`sitemap.routes.js`), OG routes (`og.routes.js`), or `SeoHelmet.jsx` changed.
- No `index.html`, `_redirects`, or `og-preview.js` changed.
- Documentation files were not part of the runtime implementation.

---

## 4. Invariants Preserved

- `/api/auth/me` still runs in the background on every page load. It was not removed, disabled, or bypassed.
- `loading` remains in the `AuthContext` context value, `useMemo` return, and dependency array. Consumers can read it.
- `user` shape remains `{ email, role, isVerified }`.
- `/inbox` remains private. Logged-out users are redirected to `/login` by `RequireAuth` once `loading=false`.
- `/admin` remains anti-enumerated: non-admin and logged-out users see `NotFound`, not `/login`. This is enforced by `AdminRouteGate`.
- `/edit` remains hybrid. Anonymous users can reach the consent path. `RequireAuth` was not added to `/edit`.
- Authenticated `/edit` does not show the anonymous consent gate. The `authLoading` guards prevent the anonymous init path from running before auth resolves.
- No SSR was added. The app remains a client-side SPA served via Netlify `_redirects` catchall.
- Sitemap was not changed.
- OG routes were not changed.
- No backend route was changed.
- Public route taxonomy (indexable vs noindex) was not changed.
- `AUTH_BOOTSTRAP_TIMEOUT_MS` is hardcoded at 2500ms; it is not env-driven.

---

## 5. Verification Summary

### Local automated gates (run from `frontend/`)

All four gates EXIT 0. Module count unchanged.

```
check:inline-styles  EXIT 0   — PASS
check:skins          EXIT 0   — PASS
check:contract       EXIT 0   — PASS
build                EXIT 0   — PASS   370 modules transformed
```

### Playwright browser smoke (local vite preview, `/api/auth/me` blocked via route intercept)

All six public routes rendered with full Hebrew content and correct document titles while `/api/auth/me` was permanently intercepted and aborted (`net::ERR_FAILED`) for the entire test run:

- `/` — title "כרטיס ביקור דיגיטלי לעסקים | Cardigo"; hero text visible; `og:title`, `og:description`, `canonical` present in rendered head. PASS.
- `/blog` — title "בלוג | Cardigo"; Hebrew section heading visible. PASS.
- `/guides` — title "מדריכים | Cardigo"; Hebrew section heading visible. PASS.
- `/pricing` — title "מחירים לכרטיס ביקור דיגיטלי | Cardigo"; pricing content visible. PASS.
- `/contact` — title "צור קשר | Cardigo"; contact heading visible. PASS.
- `/cards` — title "דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo"; card examples heading visible. PASS.

Private route smoke (anonymous session, auth timeout elapsed):

- `/inbox` — RequireAuth held `RouteFallback` during `loading=true`, then navigated to `/login` once `loading=false`. Final URL: `/login`. PASS.
- `/admin` — AdminRouteGate held `RouteFallback` during `loading=true`, then rendered `NotFound` (title "404 – עמוד לא נמצא | Cardigo"). Final URL: `/admin`. Not redirected to `/login`. PASS.
- `/edit` anonymous — EditCard mounted after auth timeout elapsed; `initCard` ran as anonymous; `GET /cards/mine` was attempted (expected anonymous flow); no `POST /cards`; no `/cards/claim`; layout rendered. PASS.

Resilience proof:

- Hard navigated to `/` with `/api/auth/me` blocked; waited 3500ms (exceeds `AUTH_BOOTSTRAP_TIMEOUT_MS=2500ms`); page title present; Hebrew hero text visible; blank page: NO; runtime crash: NO. PASS.

### Production rollout smoke (operator-verified, 2026-05-13)

Public routes:

- `/` PASS
- `/blog` PASS
- `/guides` PASS
- `/pricing` PASS
- `/contact` PASS
- `/cards` PASS
- `/card/cardigo` PASS

Auth flow:

- `/login` page reachable PASS
- Login with valid credentials PASS
- Page refresh restores authenticated user PASS
- Logout clears session PASS

Private / hybrid routes:

- `/inbox` logged-in: Inbox renders PASS
- `/inbox` logged-out: redirects to `/login` PASS
- `/admin` logged-out: NotFound rendered (not `/login`) PASS
- `/edit` anonymous: consent path reachable; no card created; no save PASS
- `/edit` authenticated: editor loads; anonymous consent gate not shown PASS

Mutation safety:

- No unexpected `POST /cards` PASS
- No `/cards/claim` PASS

Resilience:

- Blocking `/api/auth/me` on production homepage: page renders; no blank forever; no runtime crash PASS

---

## 6. Advisory / Non-blocking Notes

**Header anonymous nav during bootstrap (R3 — advisory)**
During the auth bootstrap window (~p50 540ms, max 2500ms), `Header.jsx` renders anonymous navigation (no "לוח בקרה" / "הודעות" links) because `isAuthenticated=false` while `loading=true`. This is the intended SEO-enabling tradeoff. The effect is bounded by `AUTH_BOOTSTRAP_TIMEOUT_MS=2500ms` and corrects when bootstrap completes.

**OrgInvites transient unauth state (R1 — advisory)**
`OrgInvites.jsx` uses a lazy `useState` initializer that reads `isAuthenticated` at mount time (L62: `isAuthenticated ? "checking" : "unauth"`). Under the relaxed gate, an authenticated user's first mount during the bootstrap window sees `isAuthenticated=false`, initializing `gateState="unauth"`. The internal effect at L92 short-circuits on `!isAuthenticated` without calling `navigate` (navigate is only called on the "denied" branch, not "unauth"). Once auth resolves, the effect re-runs and transitions correctly to "checking" → "allowed". This is advisory: no security breach, no incorrect redirect, brief UI state. No immediate contour required unless a real regression is observed in production.

**Browser console non-blocking messages**
Browser console may emit `PWA beforeinstallprompt` messages or Chrome async event-listener warnings during normal operation. These do not indicate app failure if no blank page, runtime crash, or auth regression is present.

---

## 7. Out of Scope / Not Done

The following were explicitly not done and must not be claimed as outcomes of this contour:

- `/api/auth/me` was not removed, disabled, or bypassed. It still runs.
- SSR was not added. The app is still a client-side SPA.
- Server HTML TTFB did not improve. Only client-side first-render timing improved.
- Googlebot indexing is not guaranteed. No Googlebot behavior claim is made.
- Sitemap was not changed.
- OG routes were not changed.
- Backend was not changed.
- `/edit` was not made private. It remains a hybrid route with anonymous support.
- `/admin` was not changed to redirect to `/login`. It shows `NotFound`.
- `OrgInvites.jsx` was not changed. The lazy initializer advisory remains open.
- `AUTH_BOOTSTRAP_TIMEOUT_MS` was not made env-driven. It remains hardcoded at 2500ms.
- `loading` state was not removed. It is still exposed in `AuthContext`.

---

## 8. Closure Declaration

AUTHCONTEXT_PUBLIC_RENDER_GATE_RELAXATION = CLOSED / PRODUCTION VERIFIED.

All four phases (timeout resilience, routes foundation, EditCard guard, gate relaxation) are closed, locally verified, and production-smoke confirmed as of 2026-05-13.
