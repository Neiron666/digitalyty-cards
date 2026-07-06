# Cardigo Enterprise Handoff — Gemini Paid-Usage Cost Guards P1 (Closed)

**Contour**: GEMINI_AI_USAGE_COST_GUARDS_P1
**Closed**: 2026-05-05
**Type**: Backend hardening — defensive outbound payload caps + provider telemetry extraction

---

## 1. Summary

Backend-only minimal fix. No frontend, route, schema, SDK, or quota changes.

| Phase                             | Status                   |
| --------------------------------- | ------------------------ |
| Phase 1 — Cost audit (read-only)  | Complete                 |
| Phase 2 — Minimal fix             | Complete                 |
| Phase 3 — Verification (15 gates) | **PASS**                 |
| Phase 1D — Docs audit (read-only) | Complete                 |
| Phase 2D — Docs closure           | **Complete (this file)** |

---

## 2. Changed runtime files

- `backend/src/controllers/ai.controller.js`
- `backend/src/services/gemini.service.js`

No other files were modified at runtime.

---

## 3. What changed

### 3.1 Outbound business field caps (ai.controller.js)

All three AI handlers (About, SEO, FAQ) now defensively truncate business fields before including them in the Gemini provider prompt payload. Caps use SSoT constants from `backend/src/utils/business.util.js`:

| Field          | Cap | Constant                | Handlers        |
| -------------- | --- | ----------------------- | --------------- |
| `businessName` | 60  | `BUSINESS_NAME_MAX`     | About, SEO, FAQ |
| `category`     | 80  | `BUSINESS_SUBTITLE_MAX` | About, SEO, FAQ |
| `slogan`       | 120 | `BUSINESS_SLOGAN_MAX`   | About, SEO, FAQ |
| `city`         | 40  | `BUSINESS_CITY_MAX`     | SEO only        |

Caps are **prompt-payload-only**. Stored card data is not mutated. Overlong values are silently truncated into a local variable; no request rejection is added.

### 3.2 Gemini usageMetadata extraction (gemini.service.js)

All three provider functions (`generateAboutSuggestion`, `generateSeoSuggestion`, `generateFaqSuggestion`) now read `result?.response?.usageMetadata` after each successful provider call and return `{ suggestion, usageMeta }` instead of `suggestion` directly. `usageMeta` is null if the field is absent (fully guarded — cannot throw).

### 3.3 Safe tokenCounts logging (ai.controller.js)

All three success logs now include a `tokenCounts` field with four numeric/null values:

- `promptTokenCount`
- `candidatesTokenCount`
- `thoughtsTokenCount`
- `totalTokenCount`

Each field uses a `?? null` fallback. These are sourced from Gemini `usageMetadata` and are safe numeric metadata only.

---

## 4. What did NOT change

- Frontend API contract: all three endpoints still return `{ ok, suggestion, quota }` only
- `usageMeta` / `tokenCounts` are not returned to the frontend
- Auth: `requireAuth` on all AI routes — unchanged
- Free-user block: premium gate still fires before any Gemini call
- Daily rate limit: in-memory, tier-aware — unchanged
- Monthly shared quota: FREE=10/month, PREMIUM=30/month — unchanged
- `AiUsageMonthly` schema: unchanged
- Routes: `ai.routes.js` — unchanged
- SDK: `@google/generative-ai` version — unchanged
- `package.json` / `package-lock.json` — unchanged
- `thinkingConfig` / `thinkingBudget` — not added (intentionally deferred)
- `maxOutputTokens`, `temperature`, timeout behavior — unchanged
- Retry logic: none exists, none added
- Streaming: none exists, none added
- Frontend files: no changes
- SEO / sitemap / OG / public route boundaries: no changes

---

## 5. Security and privacy

- No prompt body is logged anywhere
- No Gemini response body is logged anywhere
- No suggestion object is logged
- No user or business text (businessName, category, slogan, city, aboutTitle, aboutParagraphs) is logged
- No secret or API key is logged
- `usageMeta` / `tokenCounts` are not returned to the frontend
- `GEMINI_API_KEY` is not exposed to the frontend (unchanged posture)
- Gemini calls remain backend-only and auth-gated (unchanged posture)

---

## 6. Deferred work

The following are explicitly out of scope for this contour and intentionally deferred:

- **`AiUsageMonthly` token persistence**: Token counts are logged only. Persisting them to MongoDB for per-user cost tracking requires a schema migration and a separate contour.
- **SDK upgrade / `thinkingBudget` compatibility**: The installed SDK version (`@google/generative-ai@0.24.1`) does not support `thinkingConfig`. Evaluating and upgrading is a separate contour.
- **Broader input bounds / security audit**: **Update 2026-05-06:** The broad storage-side input-bounds hardening for card fields has since been substantially closed in the dedicated Input Bounds and Editor UX Validation Closure batch. That closure covered schema validators, normalizer-first truncation/clamping, anonymous PATCH entitlement gates, and editor-side limit UX for the relevant card fields. The residual deferred scope here is narrower: Gemini outbound prompt-payload hardening for AI-service-internal prompt fields at the provider API boundary, such as `existingSeoTitle`/`aboutSnippet`-style values when assembled for Gemini calls. This residual prompt-payload scope remains separate from storage-side schema validation and is not closed by this handoff.

---

## 7. Docs closure files

- `docs/ai-about-workstream.md` — updated (§3.4 step 8b-out, §3.4 step 11, §3.10 cap inventory, §12.1 stale item removed, §12.3 completed improvement added, footer updated)
- This handoff file

---

## 8. Phase 3 verification gate summary

All 15 gates PASS. Highlights:

- `sanity:imports`: `{"ok":true,"importedCount":20,"failedCount":0}` EXIT 0
- `FAQ_OUTBOUND_SLOGAN_CAP` remaining in controller: 0 matches
- `return suggestion;` remaining in service (direct, without usageMeta): 0 matches
- `usageMetadata` extractions in service: 3 (one per function)
- `tokenCounts` in controller success logs: 3 (one per handler)
- Frontend-facing `res.json` bodies: unchanged (`{ ok, suggestion, quota }`)
- `suggestion = await generate…` direct assignment pattern: 0 matches (all converted to `_r` destructure)
- No magic number cap literals in slice calls: 0 matches
- `business.util` import in controller: confirmed at line 17–22
- All AI routes: `requireAuth` present, routes file last-write predates Phase 2
- `AiUsageMonthly.model.js`: last-write predates Phase 2 (schema unchanged)
- All frontend/src files modified after Phase 2 start: 0
- All backend/src files (outside two changed files) modified after Phase 2 start: 0
