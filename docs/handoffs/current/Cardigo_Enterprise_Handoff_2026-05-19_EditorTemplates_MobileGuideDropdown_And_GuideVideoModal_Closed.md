# Cardigo Enterprise Handoff — Editor Templates Mobile Guide Dropdown + Guide Video Modal

**Date:** 2026-05-19
**Project:** Cardigo — Israel-first / Israel-only digital business card SaaS
**Canonical domain:** https://cardigo.co.il
**Status:** CLOSED / CODE DEPLOYED / OPERATOR-SMOKED / CURRENTLY ENV-DISABLED

**Brand separation invariant:** Cardigo and Digitalyty are separate products and must not be mixed in canonical URLs, SEO metadata, public paths, product logic, structured data, user-facing copy, billing docs, or analytics truth.

---

## 1. Contour

EDITOR_TEMPLATES_MOBILE_GUIDE_DROPDOWN_AND_GUIDE_VIDEO_MODAL

---

## 2. Decision

A mobile-only `מדריך` (guide) dropdown was added to the editor templates route `/edit/card/templates`. It surfaces a short guide entry that opens a strict-sandbox in-app YouTube video modal, with an app-owned `פתח ביוטיוב` external link as the sanctioned escape hatch.

The feature is controlled exclusively by validated frontend Vite environment variables. While those variables are empty or contain values rejected by the validator, the guide button does not render and the feature is fully inert.

The feature is currently intentionally disabled in production until the final guide videos are ready. Code is deployed; activation is a Netlify env + redeploy operation.

---

## 3. Feature Behavior

- **Route:** `/edit/card/templates` (editor templates tab).
- **Placement:** mobile topbar center slot.
- **Mobile-only:** the topbar itself is mobile-only (breakpoint 900px). Desktop guide placement is deferred — see §12.
- **Visibility gating (all must be true for the button to render):**
    - `isAuthenticated` is true.
    - Org context has finished resolving (`contextResolved` is true and the orgs load state is `loaded`).
    - The user does NOT have an org context switcher / context bar (the guide replaces the empty center slot for personal users without org context).
    - Active editor tab is the templates panel.
    - At least one valid guide URL is configured (see §6).
- **Hidden states:** during org loading, org error, or any unresolved context state, the guide button is suppressed.
- **Acknowledgement / pulse behavior:**
    - First-use pulse animation draws attention to the dropdown trigger.
    - First user interaction (open or activation) records an acknowledgement under the `localStorage` key `cardigo_guide_dropdown_v1`.
    - After acknowledgement, the pulse is suppressed for that browser; the button border switches to an acknowledged state.
- **Dropdown content:** items that open the guide video modal with a validated embed URL and a Hebrew title.
- **Video modal:** focus-trapped, Escape-closeable, backdrop-closeable. Focus returns to the guide button on close. Renders an iframe with embedded YouTube playback under a strict sandbox (see §8). Includes the app-owned `פתח ביוטיוב` link that opens a clean watch URL in a new tab.

---

## 4. Files Created and Modified

### Created (4)

- `frontend/src/utils/guideVideoUrls.js` — pure URL validation and watch-URL reconstruction utilities.
- `frontend/src/hooks/useGuideDropdownAck.js` — `localStorage`-backed acknowledgement hook.
- `frontend/src/components/editor/GuideVideoModal.jsx` — focus-trapped modal hosting the iframe and the external link.
- `frontend/src/components/editor/GuideVideoModal.module.css` — modal styles (CSS Modules, no inline styles, no grid).

### Modified (4)

- `frontend/src/pages/EditCard.jsx` — derives `showContextBar` / `showGuideDropdown` and passes them to the editor.
- `frontend/src/components/editor/Editor.jsx` — guide button + dropdown JSX, modal wiring, env consumption.
- `frontend/src/components/editor/Editor.module.css` — guide button, pulse, dropdown styles inside the mobile media query.
- `frontend/.env` — added the two `VITE_GUIDE_URL_*` keys (currently empty by intent).

Source code is not inlined in this handoff. No real environment values or video IDs are recorded here.

---

## 5. Environment Configuration

### Variables

- `VITE_GUIDE_URL_MOBILE`
- `VITE_GUIDE_URL_DESKTOP`

Both are Vite frontend variables. Both are optional. Either, both, or neither may be set.

### Accepted URL formats

- `https://www.youtube.com/embed/<videoId>`
- `https://www.youtube-nocookie.com/embed/<videoId>`

The validator preserves `<videoId>` only when it matches a strict character set and length. The handoff intentionally documents only the structural placeholder `<videoId>`; no real ids are recorded here.

### Rejected URL formats

- `youtu.be/...` short share URLs.
- `https://www.youtube.com/watch?v=...` watch URLs.
- `https://www.youtube.com/shorts/...` shorts URLs.
- Non-HTTPS (`http://...`) URLs.
- Arbitrary hosts outside the accepted allowlist.
- Extra path segments beyond `/embed/<videoId>`.
- Any unknown query parameter, including the YouTube tracking parameter `si`.

### Allowed query parameter allowlist

Only the following params are preserved by the validator:

- `rel`
- `modestbranding`
- `playsinline`
- `start`
- `end`

All other query parameters are rejected (the URL fails validation as a whole, not silently stripped).

### Build-time semantics

`VITE_*` values are inlined at frontend build time. Changing the values in Netlify environment variables has no runtime effect until a new build is published. A redeploy is required.

### Disabled state

If both keys are empty, or if every configured value is rejected by the validator, no guide button renders and the dropdown / modal subsystem is never instantiated. The feature is fully inert in that state.

---

## 6. Current Production Status

Code is deployed to production. The feature was proven end-to-end by the operator using a temporary valid YouTube embed URL: the button appeared on mobile, the modal opened, embedded playback succeeded, fullscreen succeeded, the app-owned `פתח ביוטיוב` link opened a clean watch URL in a new tab, and acknowledgement persisted under the `localStorage` key `cardigo_guide_dropdown_v1`.

The feature is currently intentionally disabled in production: both `VITE_GUIDE_URL_MOBILE` and `VITE_GUIDE_URL_DESKTOP` are empty or disabled pending the final guide videos. While both keys are empty or rejected by the validator, the guide button does not render and the feature is inert.

To re-enable, set valid embed URL value(s) in Netlify environment variables, trigger a redeploy, and confirm the button appears on mobile `/edit/card/templates` for an authenticated personal user with no org context switcher.

---

## 7. Security and Privacy

- **Validated input only.** Raw environment URLs are never trusted directly. Every URL passes through `validateYouTubeEmbedUrl` before any use.
- **Iframe `src`.** Set exclusively from a validated embed URL. Never from raw env input.
- **External link `href`.** Generated by `getYouTubeWatchUrlFromEmbedUrl`, which re-validates the embed URL, extracts the `videoId` from the canonical `/embed/<videoId>` path, and reconstructs the watch URL as the hardcoded literal `https://www.youtube.com/watch?v=<videoId>`. The raw environment host is not reused, and no query parameters from the embed URL are forwarded to the watch URL.
- **No tracking smuggling.** The `si` parameter and any other unknown parameter is rejected at the validator level (the whole URL is rejected, not silently sanitized).
- **Privacy-preferring host.** `youtube-nocookie.com` is preferred over `youtube.com` because it avoids cookie tracking before user interaction.
- **Iframe sandbox (strict — must not be loosened):** `allow-scripts allow-same-origin allow-presentation allow-fullscreen`. There is no `allow-popups` and no `allow-popups-to-escape-sandbox`.
- **Iframe permissions:** `fullscreen; picture-in-picture; accelerometer; gyroscope`. `referrerPolicy="no-referrer-when-downgrade"`.
- **External link relation:** `target="_blank"` with `rel="noopener noreferrer"`.
- **No cross-contour impact.** The feature has no backend, auth, payment, billing, SEO, sitemap, OG, analytics, or tracking-pipeline impact.
- **No PII.** No personal data is read or written by the feature.
- **No cookies.** The feature does not set or read any cookie. The single `localStorage` key `cardigo_guide_dropdown_v1` stores a UX-only boolean acknowledgement, scoped per browser.

---

## 8. Manual Smoke

Manual smoke was **operator-manual, not automated**.

Operator-confirmed observations using a temporary valid embed URL:

- Guide button appeared on mobile `/edit/card/templates` for an authenticated personal user with no org context switcher.
- Dropdown opened; pulse stopped after first interaction.
- Modal opened with focus trapped on the close button.
- Embedded playback worked inside the iframe.
- Fullscreen succeeded through the YouTube player permissions.
- The app-owned `פתח ביוטיוב` link opened a clean watch URL in a new tab.
- Acknowledgement persisted across page reload under `localStorage` key `cardigo_guide_dropdown_v1`.

After verification, production was intentionally returned to its env-disabled state and the temporary URL was removed. No real production video URL is published in this handoff.

---

## 9. Automated Gates

Recorded from the prior implementation phase (frontend, run from `frontend/`):

- `npm run check:inline-styles` — EXIT:0
- `npm run check:skins` — EXIT:0
- `npm run check:contract` — EXIT:0
- `npm run build` — EXIT:0

These gates were executed during implementation verification. Frontend gates do not need to be rerun for this docs-only handoff. No backend sanities are required because the feature has no backend surface.

---

## 10. Anti-Scope Proof — Protected Areas Not Touched

The following areas were NOT modified by the guide feature contour and remain unchanged:

- `backend/` (entire tree, all routes, controllers, models, middleware, scripts).
- `frontend/public/_headers` (CSP / frame-src / security headers untouched).
- `frontend/src/components/editor/TemplateSelector.jsx` and its CSS module.
- `frontend/src/templates/layout/CardLayout.jsx` and `CardLayout.module.css` (shared render chain).
- `frontend/src/templates/templates.config.js` (templates registry SSoT).
- `frontend/src/hooks/useEditorTour.js` and the editor tour CSS surface (`tour.css`).
- All skin files (skins token-only invariant respected).
- SEO / sitemap / OG / structured data files.
- Tracking / analytics / GTM surfaces.
- Auth / payment / billing surfaces.
- All existing runbooks under `docs/runbooks/`.
- All archive handoffs under `docs/handoffs/archive/`.
- The historical closed handoff `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-10_EditCardHead_BackgroundTransparency_UIRemoval_Closed.md` (left unmodified; not edited even to retire its deferred `_tmp_matrix.mjs` note — see §14).

---

## 11. Deferred (Separate Contours — Do Not Casually Reopen Here)

- **CSP / `_headers` frame-src hardening for YouTube embed origins.** Not in scope for this contour. `frontend/public/_headers` was intentionally not modified. Tightening `frame-src` to the YouTube embed origins should be a separate bounded contour to avoid breaking other embeds and to allow a coordinated review.
- **Desktop guide placement.** Only the mobile placement is implemented. Desktop placement is deferred to a separate UX/architecture decision.
- **Final production guide video enablement.** Deferred until the actual guide videos are produced and approved. Re-enable procedure is documented in §6.

---

## 12. Do Not Overclaim

- Do not claim the feature is currently enabled for users. It is code-deployed but env-disabled.
- Do not claim final guide videos are ready or wired. They are not; operator awaits production videos.
- Do not claim CSP / `_headers` is hardened for YouTube. It is not. `_headers` is untouched in this contour.
- Do not claim a desktop guide exists. It does not. Desktop placement is deferred.
- Do not claim the YouTube watermark popup works inside the iframe. It is intentionally blocked by the strict sandbox; the in-app `פתח ביוטיוב` button is the sanctioned external escape.
- Do not claim the manual smoke was automated. It was operator-manual only.
- Do not publish real production video IDs or real production embed URLs in documentation.
- Do not loosen the iframe sandbox (no `allow-popups`, no `allow-popups-to-escape-sandbox`) without a new audited contour.

---

## 13. Rollback

- Revert the 8 listed files (4 created + 4 modified, listed in §4).
- No schema rollback.
- No database rollback.
- No backend rollback.
- No `_headers` rollback.
- Alternative quick disable without code rollback: clear or invalidate the `VITE_GUIDE_URL_MOBILE` and `VITE_GUIDE_URL_DESKTOP` Netlify environment variables and redeploy. The guide button stops rendering on the next build. This is the current production state.

---

## 14. `_tmp_matrix.mjs` Status

The prior closed handoff `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-10_EditCardHead_BackgroundTransparency_UIRemoval_Closed.md` recorded `_tmp_matrix.mjs` at the repository root as deferred cleanup under Rule 1.9.

That artifact is no longer present anywhere in the repository. The historical closed handoff is intentionally NOT edited (closed historical docs remain unmodified per docs SSoT discipline). This handoff retires that tail by recording the current cleanup status.
