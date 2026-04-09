# Cardigo --- Enterprise Master Handoff Playbook

Date: 2026-04-09

This document is a bootstrap instruction file for the next ChatGPT
session working on the Cardigo project. It summarizes the architecture,
operating doctrine, closed contours, current truths, and the correct
working method.

------------------------------------------------------------------------

# 1. What Cardigo Is

Cardigo is an Israel‑first SaaS platform for digital business cards.

Core idea: Digital business card + mini business page + sharing layer +
SEO layer + analytics layer + self‑service editing.

Canonical domain: https://cardigo.co.il

Important rule: Cardigo and Digitalyty must never be mixed in canonical
URLs, SEO structure, product logic, or analytics audiences.

------------------------------------------------------------------------

# 2. Core Architecture

Frontend React + Vite

Rules: • CSS Modules only • No inline styles • Flexbox only --- no grid
• Mobile‑first mandatory • Typography tokens only (var(--fs-\*), rem
units)

Key public routes:

/\
/cards\
/pricing\
/blog\
/guides\
/contact

Card routes:

/card/:slug\
/c/:orgSlug/:slug

Preview routes:

/preview/card/:slug

Preview routes must stay isolated from public runtime logic.

------------------------------------------------------------------------

# 3. Backend

Node.js + Express + MongoDB

Key principles:

• DTO‑driven public URL generation • manual Mongo index governance •
security‑first design

Runtime invariants:

autoIndex = OFF\
autoCreate = OFF

------------------------------------------------------------------------

# 4. Operating Doctrine

ChatGPT role: Senior Architect / Senior Full‑Stack Engineer / Enterprise
Consultant

Responsibilities: architecture design, security guidance, scalability
decisions, code review, CI/CD guidance, documentation.

Copilot role: execution agent only.

------------------------------------------------------------------------

# 5. Mandatory Copilot Workflow

Phase 1 --- Read‑Only Audit\
Phase 2 --- Minimal Fix\
Phase 3 --- Verification

Rules:

• never modify code before audit • require PROOF file:line‑range •
minimal changes only • no scope creep

Verification always runs:

npm run check:inline-styles\
npm run check:skins\
npm run check:contract\
npm run build

All must EXIT:0.

------------------------------------------------------------------------

# 6. Tracking Architecture

Tracking stack:

Meta Pixel\
Google Tag Manager\
GA4

Container:

GTM-W6Q8DP6R

Meta Pixel:

1901625820558020

Site‑level tracking allowed only on approved marketing routes:

/\
/cards\
/pricing\
/blog\
/guides\
/contact

All other routes are excluded.

------------------------------------------------------------------------

# 7. Route Isolation Hardening

Layout.jsx contains:

AD_MEASUREMENT_PATHS allowlist

Purpose: prevent marketing audience contamination from system routes
such as:

/login\
/register\
/edit\
/dashboard\
/admin\
/org

------------------------------------------------------------------------

# 8. Per‑Card Tracking

Card owners may configure:

GTM container\
GA4 measurement ID\
Meta Pixel

Stored in:

card.seo.gtmId\
card.seo.gaMeasurementId\
card.seo.metaPixelId

Injected via SeoHelmet.jsx.

------------------------------------------------------------------------

# 9. Platform Safety Protections

Blocked IDs:

GTM-W6Q8DP6R\
1901625820558020

Blocked in:

SeoHelmet.jsx\
Card.model.js

Purpose: prevent owners from loading Cardigo's own marketing
infrastructure.

------------------------------------------------------------------------

# 10. Card‑Route Consent System

Separate consent key:

cardigo_card_consent_v1

Stored in localStorage.

Structure:

{ version: 1, acknowledged: true, ownerTrackingAllowed: boolean, ts:
number }

Banner component:

CardOwnerConsentBanner.jsx

Rules:

• owner trackers run only after consent • scripts removed on decline •
preview routes unaffected

------------------------------------------------------------------------

# 11. First‑Party Analytics

Cardigo analytics uses:

trackView()

Endpoint:

/api/analytics/track

First‑party analytics remains ungated.

------------------------------------------------------------------------

# 12. Closed Contours

Completed workstreams:

Route isolation hardening\
Platform ID blocklist\
Per‑card consent subsystem\
GA4 consent alignment\
Documentation synchronization

All verified with EXIT:0 gates.

------------------------------------------------------------------------

# 13. Deferred Contours

Future work:

main.jsx GTM signal bootstrap for card routes

Possible later feature:

reopen consent preferences UI.

------------------------------------------------------------------------

# 14. Project Mindset

Always prioritize safety and maintainability.

Avoid quick hacks.

Protect architectural invariants.

Think like an enterprise architect.

------------------------------------------------------------------------

# 15. Next Chat Bootstrap Prompt

PROJECT MODE: Cardigo enterprise workflow.

Hard constraints:

• No git commands\
• No inline styles\
• CSS Modules only\
• Flex only --- no grid\
• Mobile‑first mandatory\
• Typography tokens only

Workflow:

Phase 1 Audit → STOP\
Phase 2 Minimal Fix → STOP\
Phase 3 Verification → STOP
