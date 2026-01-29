# Site Analytics — Coverage Map (Marketing Pages)

Scope: marketing site pages only (not `/card/*`, not `/admin`, not `/edit`).

## Page Views (trackSitePageView)

| Page    | File                           | trackSitePageView() | Notes                |
| ------- | ------------------------------ | ------------------: | -------------------- |
| Home    | frontend/src/pages/Home.jsx    |                  ✅ | Called once on mount |
| Pricing | frontend/src/pages/Pricing.jsx |                  ✅ | Called once on mount |
| Guides  | frontend/src/pages/Guides.jsx  |                  ✅ | Called once on mount |
| Cards   | frontend/src/pages/Cards.jsx   |                  ✅ | Called once on mount |
| Blog    | frontend/src/pages/Blog.jsx    |                  ✅ | Called once on mount |
| Contact | frontend/src/pages/Contact.jsx |                  ✅ | Called once on mount |

## Click Intents (trackSiteClick)

### Contact

| CTA            | Current tracking | Action                           | pagePath |
| -------------- | ---------------: | -------------------------------- | -------- |
| Email (mailto) |               ✅ | SITE_ACTIONS.contact_email_click | /contact |

No other CTAs (tel/WhatsApp/social) are present in the current Contact page.

## Anti-regression

- Run `npm run check:site-actions` in `frontend/`.
- This fails if any `trackSiteClick({ action: "..." })` uses a string-literal action instead of `SITE_ACTIONS.*`.
- CI also runs this guardrail via `.github/workflows/ci.yml`.

## Business-effect manual check

1. As admin, call `GET /api/admin/site-analytics/diagnostics` (must be 200).
2. Click Contact mail CTA once.
3. Re-fetch diagnostics and confirm `counters.missing_action` does not change and `clicksTotal` in summary increments (or actionCounts increases, depending on your UI view).
