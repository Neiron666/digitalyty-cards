# PWA Install Architecture — Cardigo

> **Tier 2 — Architecture / Ops Contract**
> Canonical runtime truth for the Cardigo PWA install contour.
> Do not contradict from handoff files.

_Date: 2026-04-07_

---

## 1) Purpose and scope

This document records the architecture of the Cardigo PWA installability contour — the runtime that enables users to install the Cardigo web app to their home screen from both the homepage and any public card route.

Scope: frontend only. No backend, no analytics, no service worker.

---

## 2) What is included

### 2.1 Manifest foundation

- File: `frontend/public/manifest.webmanifest`
- Linked from: `frontend/index.html` via `<link rel="manifest">`
- `scope: "/"` — covers the entire app
- `start_url: "/"` — install entry point is the homepage
- Icons: `/icons/icon-192.png` and `/icons/icon-512.png`
- No service worker is registered in this contour. Offline support is out of scope.

### 2.2 Shared install prompt runtime / store

- File: `frontend/src/lib/installPromptStore.js`
- Vanilla JS ES module — zero React dependency
- Captures `beforeinstallprompt` at **module initialization time** (import side-effect)
- Maintains module-level singleton state: `_deferredPrompt`, `_canPrompt`, `_isInstalled`
- Exposes `subscribe / getSnapshot / getServerSnapshot` for `useSyncExternalStore` consumption
- `triggerPrompt()` immediately calls `deferredPrompt.prompt()` when the captured event is available
- All browser API access is guarded: `if (typeof window !== "undefined")`
- ES module semantics guarantee exactly one initialization regardless of import count

### 2.3 Consumer hook

- File: `frontend/src/hooks/useInstallPrompt.js`
- Subscribes to the store via `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
- Owns only platform detection (`isIOS`, `isSafari`, `isInAppBrowser`) — computed once, hook-local
- Derives `showIOSGuide` from platform + store state
- Has **zero** event listeners of its own — no `useEffect`, no `addEventListener`
- Consumer API (stable, must not be broken without a new bounded workstream):

| Export           | Type     | Description                                                              |
| ---------------- | -------- | ------------------------------------------------------------------------ |
| `canPrompt`      | boolean  | Native install prompt is available and capturable                        |
| `triggerPrompt`  | async fn | Triggers the native browser install dialog                               |
| `isInstalled`    | boolean  | App is currently in standalone/installed state                           |
| `isIOS`          | boolean  | Device is iOS                                                            |
| `isSafari`       | boolean  | Browser is iOS Safari                                                    |
| `isInAppBrowser` | boolean  | Running inside an in-app WebView                                         |
| `showIOSGuide`   | boolean  | iOS Safari, not yet installed, no prompt — show Add to Home Screen guide |

### 2.4 Site footer CTA

- File: `frontend/src/components/layout/InstallCta.jsx`
- CSS: `frontend/src/components/layout/InstallCta.module.css`
- Rendered inside `Footer.jsx` → present on all Layout-wrapped routes (homepage, editor, pricing, etc.)
- Uses site-shell tokens only (`--fs-ui`, `--gold`, `--gold-fade`, `--text-muted`)
- Button always visible; never disabled
- On click: if `canPrompt` → `triggerPrompt()`, else → toggle highlighted help text

### 2.5 Public card footer CTA

- File: `frontend/src/components/card/layout/CardFooter.jsx` (`InstallRow` sub-component)
- CSS: `frontend/src/components/card/layout/CardFooter.module.css` (`.installRow`, `.installBtn`, `.installHelp`, `.installHelpHl`)
- Rendered as the last child of `<footer>` in every public card
- Uses card-scope tokens only (`--fs-12`, `--primary`, `--text-main`, `--card-bg`)
- Hidden in embedded editor preview via `:global([data-preview="phone"]) .installRow { display: none }`
- Identical behavioral pattern to site footer CTA

---

## 3) Why early shared capture was required

`beforeinstallprompt` is a one-shot browser event fired once when the browser decides the app is installable. Consuming it requires calling `e.preventDefault()` before the browser discards it.

Public card routes (`/card/:slug`, `/c/:orgSlug/:slug`) are:

- Lazy-loaded (`React.lazy()`) in `router.jsx`
- Asynchronously data-fetched (`loadCard()` API call before `CardFooter` renders)

This means the consumer hook on card routes mounts after the event has already fired — the hook's listener would be attached too late and the prompt would be silently lost.

The shared store solves this by attaching the `beforeinstallprompt` listener at module initialization time via `main.jsx`:

```
main.jsx → import "./lib/installPromptStore"   ← listeners attach here
         → import router                         ← lazy() declarations only
         → createRoot().render()                 ← React tree begins
              ↓
         lazy route resolves → async card fetch → CardFooter mounts
              ↓
         useSyncExternalStore reads store → canPrompt: true ✓
```

The store is initialized before any React rendering, before any lazy route resolves, and before any API call completes.

---

## 4) Lifecycle truth

All lifecycle events are owned by the store (`installPromptStore.js`). The hook owns none.

| Event                     | Handler | Effect                                                                         |
| ------------------------- | ------- | ------------------------------------------------------------------------------ |
| `beforeinstallprompt`     | Store   | Captures event, sets `canPrompt: true`, clears `isInstalled`                   |
| `appinstalled`            | Store   | Clears deferred prompt, sets `canPrompt: false`, sets `isInstalled: true`      |
| `display-mode MQL change` | Store   | Bidirectional: `_isInstalled = e.matches` (handles both install and uninstall) |
| `pageshow`                | Store   | Re-syncs `isInstalled` from real browser state                                 |
| `visibilitychange`        | Store   | Re-syncs `isInstalled` from real browser state                                 |
| `focus`                   | Store   | Re-syncs `isInstalled` from real browser state                                 |

**No optimistic truth:** `triggerPrompt()` does not set `isInstalled: true` after `accepted`. Only `appinstalled` and the display-mode MQL establish real truth. This prevents a one-way latch that would prevent re-install detection after uninstall.

---

## 5) UX truth by platform state

| Platform state                                   | CTA behavior                               |
| ------------------------------------------------ | ------------------------------------------ |
| `canPrompt: true`                                | Button click → native install dialog       |
| `isInstalled: true`                              | Helper text: "✓ Cardigo מותקן במכשיר שלכם" |
| `showIOSGuide: true` (iOS Safari, not installed) | Helper text: Share → Add to Home Screen    |
| `isInAppBrowser` or iOS non-Safari               | Helper text: open in Safari                |
| Other / unsupported                              | Helper text: install via browser menu      |

The button is never disabled. On non-prompt click it toggles the help text to highlighted state to draw attention to the guidance.

---

## 6) Architectural boundaries

| Boundary                                   | Decision                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `index.html` inline script                 | **Not used.** Store is initialized via ES module import in `main.jsx`. |
| Service worker                             | **Not in this contour.** No offline support, no caching layer.         |
| Backend                                    | **Not involved.** Install is a pure browser/frontend runtime.          |
| Analytics                                  | **Not tracked.** Install events are not wired to any analytics call.   |
| `CardLayout.jsx` / `CardLayout.module.css` | **Not changed.** Install row is CardFooter-contained.                  |
| `router.jsx` structure                     | **Not changed.** Card routes remain standalone (no Layout wrapping).   |
| `manifest.webmanifest` scope               | `"/"` — shared across all routes; not per-card.                        |

---

## 7) Known product truth / limitations

- **Installability is browser-controlled.** The browser grants `beforeinstallprompt` based on its own heuristics (engagement signals, manifest validity, HTTPS). The app cannot force a prompt.
- **One app identity.** Installing Cardigo from any route — homepage, card footer, or otherwise — installs the single Cardigo web app. There is no per-card separate app identity. `start_url: "/"` is canonical.
- **No per-card PWA.** The manifest is not dynamically generated per card. Each public card page is a route inside the same Cardigo SPA.
- **iOS install is manual.** iOS Safari does not support `beforeinstallprompt`. The guide text (Share → Add to Home Screen) is the only available path on iOS.
- **Installability vs. search indexability are independent concerns.** PWA install status does not affect how Cardigo public pages are indexed.

---

## 8) File map

```
frontend/public/
  manifest.webmanifest              ← app manifest (scope, icons, start_url)

frontend/src/
  main.jsx                          ← store early-init import (line 8)
  lib/
    installPromptStore.js           ← singleton runtime store + event capture
  hooks/
    useInstallPrompt.js             ← useSyncExternalStore subscriber + platform detection
  components/
    layout/
      Footer.jsx                    ← renders <InstallCta />
      InstallCta.jsx                ← site footer CTA
      InstallCta.module.css         ← site-shell tokens
    card/layout/
      CardFooter.jsx                ← InstallRow sub-component (last child)
      CardFooter.module.css         ← card-scope tokens + preview hide rule
```

---

## 9) Closed-status summary

**Contour: CLOSED.**

All five sub-contours completed and verified:

- Manifest foundation — created and linked
- Site footer CTA (Contour A) — verified PASS
- Card footer CTA (Contour B) — verified PASS
- Shared lifecycle fix — one-way latch eliminated, bidirectional re-sync confirmed
- Early shared install prompt capture runtime — store initialized at app boot, all routes now eligible

All Phase 3 gates passed: `check:inline-styles`, `check:skins`, `check:contract`, `build` — all EXIT 0.

Do not casually reopen without a bounded reason and explicit Phase 1 audit.
