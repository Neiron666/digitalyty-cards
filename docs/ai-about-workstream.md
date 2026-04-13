# AI Workstream - Technical Handoff

> Internal engineering/product handoff for AI-powered content generation features in Cardigo.

---

## 1. Executive Overview

### What exists

Cardigo includes AI-powered content generation across three editor surfaces:

| Surface                | Feature key           | Endpoint                                  | Status  |
| ---------------------- | --------------------- | ----------------------------------------- | ------- |
| **About / Content AI** | `ai_about_generation` | `POST /api/cards/:id/ai/about-suggestion` | Shipped |
| **FAQ AI (V1)**        | `ai_faq_generation`   | `POST /api/cards/:id/ai/faq-suggestion`   | Shipped |
| **SEO / Scripts AI**   | `ai_seo_generation`   | `POST /api/cards/:id/ai/seo-suggestion`   | Shipped |

All three surfaces share a **single monthly AI generation budget** per user (see §5 Quota Policy). Each surface has its own feature flag, endpoint, and telemetry bucket, but the user-facing quota counter is unified.

### What it does for the user

- **About AI**: Generates professional About section content (full block, title-only, or single paragraph) in Hebrew or English. Supports create and improve modes.
- **FAQ AI (V1)**: Generates FAQ question-and-answer pairs for business cards. V1 is full generation only, available only when FAQ items are empty.
- **SEO AI**: Generates SEO title and description for the card.
- All surfaces show a read-only preview before the user applies or dismisses.
- A shared monthly usage counter is displayed so users know how many AI generations remain across all surfaces.
- All surfaces require business name and category to be filled before AI generation is available (frontend readiness + server-side enforcement).

### Intentionally out of scope

- Anonymous/unauthenticated AI generation.
- Admin-facing AI analytics dashboard.
- Multi-language beyond Hebrew and English.

---

## 2. Product Behavior

### 2.1 Generation targets

| Target      | What is generated           | Response shape                       |
| ----------- | --------------------------- | ------------------------------------ |
| `full`      | Title + up to 3 paragraphs  | `{ aboutTitle, aboutParagraphs }`    |
| `title`     | Title only                  | `{ aboutTitle }`                     |
| `paragraph` | Single paragraph (by index) | `{ aboutParagraph, paragraphIndex }` |

### 2.2 Mode selection

- **`create`**: Used when no existing About content is present on the card. Generates fresh content based on business name, category, and slogan.
- **`improve`**: Used when existing About content is present. Rewrites existing content to be more compelling while preserving factual accuracy.

The backend supports both modes for all targets. The frontend determines mode automatically: if `aboutTitle` or any `aboutParagraphs` exist, it sends `improve`; otherwise `create`.

**Current user-facing exposure:**

- **Full-block CTA** - visible only when the About section is completely empty (no title and no non-empty paragraphs). Since no content exists at that point, mode is always `create`. The CTA is hidden when missing fields ≤ 1.
- **Title point-action** - always visible. Sends `improve` when a title exists, `create` when empty.
- **Paragraph point-action** - always visible per paragraph. Sends `improve` when the paragraph has content, `create` when empty.

The backend `improve` capability for `target=full` remains intact and could be re-exposed via frontend changes without any backend work.

### 2.3 Preview / Apply / Dismiss

1. User clicks an AI generation button (full, title, or per-paragraph).
2. A **loading** state is shown during the Gemini call.
3. On success, a **preview** panel appears with the AI suggestion and target-specific label (e.g., "הצעת AI - כותרת").
4. The user can **Apply** (writes the suggestion into the card form) or **Dismiss** (discards the suggestion).
5. Applying resets the AI state machine to idle.

### 2.4 Target-aware apply behavior

- **Full**: Overwrites `aboutTitle` and replaces `aboutParagraphs` entirely.
- **Title**: Overwrites only `aboutTitle`; paragraphs are unchanged.
- **Paragraph**: Replaces only the specific paragraph at the given index; other paragraphs and title are unchanged.

### 2.5 Delete paragraph UX

When a paragraph is deleted from the editor:

- If the AI preview was for that specific paragraph, the preview is dismissed.
- If the AI preview was for a paragraph at a higher index, the `aiParagraphIndex` shifts down by one to stay aligned.

### 2.6 Quota visibility

- On component mount, each AI panel fetches the current quota via `GET /api/cards/:id/ai/quota?feature=<feature_key>`.
- The returned quota DTO reflects the **shared budget** across all surfaces (`quotaScope: "shared_generation"`). The `featureEnabled` field is specific to the requested feature.
- After every successful generation or quota-related error, the returned `quota` DTO is used to update the displayed usage.
- When `remaining <= 0`, generation buttons are disabled across all AI panels.
- The shared `AiQuotaHint` component displays: "נותרו X/Y הצעות AI החודש".

### 2.7 Consent / Disclosure

- Before the first AI generation in a session, a consent modal appears explaining that AI-generated content is used.
- User acceptance is persisted in `localStorage` under `cardigo_ai_about_consent`.
- If localStorage is blocked, consent proceeds in-memory for the session only.

---

## 3. Backend Architecture

### 3.1 Endpoints

| Method | Path                                            | Auth          | Handler        | Surface |
| ------ | ----------------------------------------------- | ------------- | -------------- | ------- |
| POST   | `/api/cards/:id/ai/about-suggestion`            | `requireAuth` | `suggestAbout` | About   |
| POST   | `/api/cards/:id/ai/seo-suggestion`              | `requireAuth` | `suggestSeo`   | SEO     |
| POST   | `/api/cards/:id/ai/faq-suggestion`              | `requireAuth` | `suggestFaq`   | FAQ     |
| GET    | `/api/cards/:id/ai/quota?feature=<feature_key>` | `requireAuth` | `getAiQuota`   | Shared  |

Routes are defined in `backend/src/routes/ai.routes.js` and mounted on the `/api/cards` router in `backend/src/app.js`.

The quota endpoint accepts any of the three feature keys (`ai_about_generation`, `ai_seo_generation`, `ai_faq_generation`) in the `feature` query parameter. The returned quota DTO always reflects the **shared budget** (all surfaces combined) via `quotaScope: "shared_generation"`; `featureEnabled` is specific to the requested feature.

### 3.2 Request contract (POST suggest)

```json
{
  "mode": "create" | "improve",
  "language": "he" | "en",
  "target": "full" | "title" | "paragraph",
  "paragraphIndex": 0 | 1 | 2
}
```

- `mode`: Optional. Defaults to `"create"` if missing or invalid.
- `language`: Optional. Defaults to `"he"` if missing or invalid.
- `target`: Optional. Defaults to `"full"` if missing. Returns 400 if present but invalid.
- `paragraphIndex`: Required when `target === "paragraph"`. Must be integer 0–2. Returns 400 if invalid.

Unknown fields in the request body are silently ignored (forward-compatibility).

### 3.3 Response variants by target

**Full (target=full)**

```json
{
    "ok": true,
    "suggestion": { "aboutTitle": "...", "aboutParagraphs": ["...", "..."] },
    "quota": {
        "feature": "ai_about_generation",
        "periodKey": "2026-03",
        "used": 5,
        "limit": 10,
        "remaining": 5
    }
}
```

**Title (target=title)**

```json
{
  "ok": true,
  "suggestion": { "aboutTitle": "..." },
  "quota": { ... }
}
```

**Paragraph (target=paragraph)**

```json
{
  "ok": true,
  "suggestion": { "aboutParagraph": "...", "paragraphIndex": 1 },
  "quota": { ... }
}
```

### 3.4 Handler step order

The `suggestAbout` handler follows this exact sequence:

1. **Feature flag** - if `AI_ABOUT_ENABLED` is off → 503 `AI_DISABLED`.
2. **Auth** - defense-in-depth check for `userId` → 401 `UNAUTHORIZED`.
3. **Card lookup** - → 404 `NOT_FOUND`.
4. **Ownership check** - card must belong to the authenticated user → 404 `NOT_FOUND`.
5. **Org membership gate** - if card belongs to a non-personal org, verify active membership → 404 `NOT_FOUND` (anti-enumeration).
6. **Parse + validate request** - parse body, validate `target` and `paragraphIndex` → 400 on invalid.
7. **Daily rate-limit** - in-memory, tier-aware → 429 `RATE_LIMITED`.
   7b. **Monthly quota check** - persistent, success-only → 429 `AI_MONTHLY_LIMIT_REACHED`.
8. **Derive card context** - extract business name, category, slogan from the trusted card document (server-side only, never from the request body).
   8b. **Business-context readiness gate** - if `businessName` or `category` is empty → 400 `AI_INSUFFICIENT_BUSINESS_CONTEXT`. This is a server-side enforcement layer; the frontend also gates proactively.
   8c. **Outbound context caps** - existing About content is extracted from the card and bounded before being sent to Gemini: title capped at 500 chars, each paragraph capped at 2,000 chars. This prevents user-controlled content from inflating input token cost.
9. **Call Gemini** - target-aware structured output generation.
10. **Increment monthly usage** - success-only, atomic `$inc`. Accounting failure does not block the response.
11. **Metadata log** - latency, card ID, user ID, model, mode, language, target. No prompt or AI response content is logged.
12. **Return** - suggestion + fresh quota DTO.

### 3.5 Auth / ownership / org-gate posture

- The endpoint requires JWT authentication via `requireAuth` middleware.
- The card must be owned by the authenticated user (exact `card.user === userId` match).
- For cards belonging to a non-personal organization, `assertActiveOrgAndMembershipOrNotFound` verifies active org membership.
- All non-match cases return 404 (anti-enumeration posture - does not distinguish "not found" from "not authorized").

### 3.6 Daily anti-abuse limiter

- **Type**: In-memory `Map`, keyed by `userId`.
- **Window**: 24 hours (rolling from first request).
- **Limits**: Free = 15/day, Premium = 75/day.
- **Counts**: All attempts (both successful and failed Gemini calls), but validation failures (400) are excluded - validation runs before the limiter.
- **Sweep**: Every 200 requests, expired entries are cleaned up. If map exceeds 5,000 entries, oldest 1,000 are evicted.
- **Not persisted**: Resets on server restart. This is intentional - the daily limiter is a safety rail, not a product feature. The monthly quota is the product-visible limit.

### 3.7 Monthly product quota (shared budget)

All three AI generation surfaces (About, FAQ, SEO) share a **single monthly AI budget** per user. This is the canonical product policy.

- **Type**: Persistent in MongoDB via `AiUsageMonthly` model.
- **Scope**: Shared across all generation features. Constants: `AI_GENERATION_FEATURES = [ai_about_generation, ai_seo_generation, ai_faq_generation]`.
- **Enforcement**: `readTotalMonthlyUsage(userId, periodKey)` aggregates `$sum` of `count` across all feature rows for the user's current month.
- **Period**: UTC month in `YYYY-MM` format.
- **Limits**: Free = **10**/month, Premium = **30**/month - shared across all AI surfaces.
- **Counting**: Success-only - only incremented after a successful Gemini response (step 10). Failed requests, validation errors, and rate-limit hits do not consume quota.
- **Per-feature telemetry**: Each successful generation increments the feature-specific `AiUsageMonthly` row (`incrementMonthlyUsage(userId, feature, periodKey)`). This preserves per-surface telemetry while the user-facing budget is shared.
- **Atomic increment**: Uses `findOneAndUpdate` with `$inc` and `upsert: true`.
- **Accounting failure tolerance**: If the increment operation fails, the user still receives their suggestion. A console error is logged but the response is not blocked.
- **DTO**: The quota response includes `quotaScope: "shared_generation"` so the frontend knows this is a unified counter.

### 3.8 Provider quota distinction

The backend distinguishes between internal quota exhaustion and upstream Gemini provider quota:

- **`AI_MONTHLY_LIMIT_REACHED` (429)**: The user's own monthly quota is exhausted.
- **`AI_PROVIDER_QUOTA` (429)**: The Gemini API returned HTTP 429 (upstream provider rate-limit or quota).
- **`RATE_LIMITED` (429)**: The user hit the daily anti-abuse safety rail.

Each has a distinct error code so the frontend can show appropriate Hebrew messaging.

### 3.9 Validation and error semantics

Validation runs at step 6, **before** the daily rate-limiter (step 7). This ensures that malformed requests do not consume daily attempt slots.

| Code                               | HTTP | Condition                                                      |
| ---------------------------------- | ---- | -------------------------------------------------------------- |
| `AI_DISABLED`                      | 503  | Feature flag off                                               |
| `UNAUTHORIZED`                     | 401  | No authenticated user                                          |
| `NOT_FOUND`                        | 404  | Card not found / not owned / org gate failed                   |
| `INVALID_TARGET`                   | 400  | `target` present but not in `["full", "title", "paragraph"]`   |
| `INVALID_PARAGRAPH_INDEX`          | 400  | `paragraphIndex` missing/invalid when `target === "paragraph"` |
| `AI_INSUFFICIENT_BUSINESS_CONTEXT` | 400  | Business name or category is empty on the card                 |
| `RATE_LIMITED`                     | 429  | Daily anti-abuse limiter exceeded                              |
| `AI_MONTHLY_LIMIT_REACHED`         | 429  | Monthly quota exhausted                                        |
| `INVALID_SUGGESTION`               | 502  | Gemini returned empty, non-JSON, or unusable content           |
| `AI_PROVIDER_QUOTA`                | 429  | Upstream Gemini HTTP 429                                       |
| `AI_UNAVAILABLE`                   | 503  | Gemini timeout, API key missing, or other provider error       |

### 3.10 Token economy and Gemini service profile

The Gemini integration uses target-specific output budgets, structured JSON schemas, and bounded context:

| Target      | `maxOutputTokens` | Schema constraints                             | System instruction scope |
| ----------- | ----------------- | ---------------------------------------------- | ------------------------ |
| `title`     | 100               | Single `aboutTitle` string                     | Title-only rules         |
| `paragraph` | 512               | Single `aboutParagraph` string                 | Paragraph-only rules     |
| `full`      | 1024              | `aboutTitle` + `aboutParagraphs` (maxItems: 3) | Full-block rules         |

**Outbound context caps** (applied at step 8c before Gemini call):

- Existing title: capped at 500 characters.
- Existing paragraphs: each capped at 2,000 characters.

**Additional parameters**: temperature 0.7, structured JSON output (`responseMimeType: "application/json"`), hard request timeout 15 s. Downstream normalizers enforce character-level caps on output: title ≤ 120 chars, each paragraph ≤ 2,000 chars. The `aboutFullSchema.maxItems` constraint limits Gemini to producing at most 3 paragraphs at the schema level.

**Current posture**: The token economy has been audited and is considered operationally mature. Per-target schemas, bounded context, and output caps are in place. No urgent further optimization pass is currently recommended.

**Variation-hint addition (April 2026)**: The `title` and `paragraph` prompt builders now append a compact server-side variation-angle directive (~30 tokens per call) drawn from a small bounded enum (`ABOUT_TITLE_VARIATION_HINTS` / `ABOUT_PARAGRAPH_VARIATION_HINTS`). This is About-AI-local; the `full` target prompt is unaffected. FAQ AI, SEO AI, quota/limiter logic, provider settings, temperature, and `maxOutputTokens` were not changed.

---

## 4. Frontend Architecture

### 4.1 Key files

| File                                                            | Responsibility                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `frontend/src/services/ai.service.js`                           | HTTP client: `suggestAbout`, `suggestSeo`, `suggestFaq`, `fetchAiQuota` |
| `frontend/src/components/editor/panels/ContentPanel.jsx`        | About AI: state machine, consent, preview/apply/dismiss, error mapping  |
| `frontend/src/components/editor/panels/ContentPanel.module.css` | CSS Module styles for About AI preview, buttons, consent modal          |
| `frontend/src/components/editor/panels/SeoPanel.jsx`            | SEO AI: generation trigger, preview/apply/dismiss                       |
| `frontend/src/components/editor/panels/FaqPanel.jsx`            | FAQ AI: empty-state CTA, generation, preview/apply/dismiss              |
| `frontend/src/components/editor/panels/AiQuotaHint.jsx`         | **Shared** AI quota hint component used by all three panels             |
| `frontend/src/components/editor/panels/AiQuotaHint.module.css`  | CSS Module for the shared quota hint                                    |

### 4.2 ContentPanel flow

1. On mount, fetches current quota via `fetchAiQuota`.
2. User clicks an AI button → triggers `handleAiClick(target, paragraphIndex)`.
3. If no consent recorded → shows `AiConsentModal`; on confirm, saves consent and proceeds.
4. `requestSuggestion(target, paragraphIndex)` sets `aiState: "loading"`, constructs payload, calls `suggestAbout`.
5. On success → `aiState: "preview"`, suggestion and quota are stored.
6. On error → `aiState: "error"`, `mapAiError` produces a Hebrew user-facing message.
7. Apply → writes suggestion fields to form state via `onChange` / `commitAboutParagraphs`.
8. Dismiss → resets all AI state to idle.

### 4.3 ai.service responsibilities

- `suggestAbout(cardId, payload)` - POST to `/cards/:id/ai/about-suggestion`, returns `{ suggestion, quota }`.
- `fetchAiQuota(cardId, feature)` - GET to `/cards/:id/ai/quota`, returns quota DTO.
- Both use the shared `api` Axios instance which handles auth headers and base URL.

### 4.4 Shared AI quota display

The `AiQuotaHint` component is a shared React component imported by `ContentPanel`, `FaqPanel`, and `SeoPanel`. It renders a unified quota hint:

> נותרו X/Y הצעות AI החודש

The `aiQuota` state is shared across each panel:

- Initialized on mount via `fetchAiQuota`.
- Updated after every successful generation (from the response `quota` field).
- Updated after quota-related errors (from `err.response.data.quota` if present).
- Used to compute `quotaExhausted` which disables generation buttons.

### 4.5 Unified AI state machine

```
States: "idle" | "loading" | "preview" | "error"

idle → loading (user clicks generate)
loading → preview (success)
loading → error (failure)
preview → idle (apply or dismiss)
error → idle (dismiss)
error → loading (retry)
```

Additional tracked state:

- `aiTarget`: `"full"` | `"title"` | `"paragraph"` | `null`
- `aiParagraphIndex`: `number | null` (relevant only when target is paragraph)
- `aiSuggestion`: the current suggestion object
- `aiError`: Hebrew error string for display

### 4.6 aboutText bridge preservation

For backward compatibility with existing card data, the frontend maintains a **tolerant writer** bridge:

- When committing `aboutParagraphs`, it also writes `aboutText` as the paragraphs joined by `\n\n`.
- This ensures older cards that may still reference `aboutText` continue to have valid data.
- The backend normalizes and filters empties.

### 4.7 Error mapping (mapAiError)

| Backend code                                 | Hebrew user message                                      |
| -------------------------------------------- | -------------------------------------------------------- |
| `RATE_LIMITED`                               | יותר מדי בקשות כרגע. נסה שוב בעוד מספר דקות.             |
| `AI_PROVIDER_QUOTA`                          | מכסת שירות ה-AI החיצוני מוצתה זמנית. נסה שוב מאוחר יותר. |
| `AI_MONTHLY_LIMIT_REACHED`                   | מכסת ה-AI החודשית מוצתה. נסה שוב בחודש הבא.              |
| `AI_DISABLED`                                | שירות ה-AI אינו פעיל כרגע.                               |
| `AI_UNAVAILABLE`                             | שירות ה-AI אינו זמין זמנית. נסה שוב.                     |
| `INVALID_SUGGESTION`                         | ה-AI החזיר תוכן לא שמיש. נסה שוב.                        |
| `INVALID_TARGET` / `INVALID_PARAGRAPH_INDEX` | בקשה שגויה. נסה שוב.                                     |
| `AI_INSUFFICIENT_BUSINESS_CONTEXT`           | יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.        |
| HTTP 401                                     | יש להתחבר מחדש כדי להשתמש בשירות זה.                     |
| Fallback                                     | משהו השתבש. נסה שוב מאוחר יותר.                          |

### 4.8 Business-context readiness UX

AI generation requires business name and category to be present on the card. The backend enforces this (step 8b), and the frontend adds a proactive readiness layer:

- **`aiReady`**: Computed as `Boolean(business?.name?.trim()) && Boolean(business?.category?.trim())`. Slogan is optional and does not affect readiness.
- **When `!aiReady`**:
    - All three AI buttons (title, paragraph, full) are `disabled`.
    - A readiness helper hint is rendered once, above the title AI action: "כדי לקבל הצעת תוכן מדויקת, מלאו קודם את שם העסק ותחום העיסוק".
    - If `onNavigateTab` callback is available (passed from `Editor.jsx` → `EditorPanel.jsx` → `ContentPanel.jsx`), the helper renders the text as a `<button>` that navigates the user to the Business tab via the canonical editor tab-switching flow (SPA navigation, no page reload).
    - If the callback is absent (defensive fallback), the helper renders as plain text with no clickable affordance.
- **Prop-drilling chain**: `Editor.jsx` passes `onNavigateTab={handleChangeTab}` → `EditorPanel.jsx` forwards it → `ContentPanel.jsx` receives it. `handleChangeTab` validates the tab key, handles mobile view, closes drawer/toast, and navigates via React Router.

### 4.9 Bulk CTA visibility and orphan-safe architecture

The full-block AI CTA has been narrowed to **create-from-empty only**:

- **`bulkEligible`**: `!hasTitleFilled && !hasParagraphsFilled` - true only when both title is empty **and** no non-empty paragraphs exist. If missing fields ≤ 1, the bulk CTA is hidden and the relevant point-action covers the gap.
- **Create-only copy**: The disclosure text ("✦ ניתן לייצר את כל בלוק האודות בבת אחת") and button text ("הצע בלוק אודות מלא עם AI") use create wording only. No improve/rewrite bulk copy is user-facing.

**Visibility guards (orphan-safe):**

- **Section outer guard**: `cardId && (bulkEligible || aiTarget === "full")` - the section stays mounted while either the CTA is eligible **or** a full-target flow is active.
- **Idle CTA guard**: `bulkEligible && aiTarget !== "full"` - the disclosure + CTA button render only in idle state when About is fully empty.
- **Active flow guard**: `aiTarget === "full"` renders `renderAiStatus()` and `renderAiPreview()` regardless of `bulkEligible`.

This means: if a user starts a full-block AI flow and then types content into a field (causing `bulkEligible` to flip to `false`), the active loading/preview/error surface remains visible until the user applies or dismisses. No orphan wrapper (section visible but empty) can occur.

---

## 5. Quota and Limiter Policy

### 5.1 Shared monthly AI budget

All editor AI generation surfaces share one monthly budget per user.

| Tier           | Shared limit         | Scope                      | Period             |
| -------------- | -------------------- | -------------------------- | ------------------ |
| Free           | 10 generations/month | About + FAQ + SEO combined | UTC calendar month |
| Trial-premium  | 10 generations/month | About + FAQ + SEO combined | UTC calendar month |
| Premium (paid) | 30 generations/month | About + FAQ + SEO combined | UTC calendar month |

- **Trial-premium** uses the free AI profile (10/mo) because trial billing resolves to `plan: "monthly"` but tier classification maps it to the free quota bucket. SEO AI generation is additionally gated: `billingSource !== "trial-premium"` must hold for SEO generation to be available.
- **Free hard-block (frontend):** The editor UX disables all three AI surfaces when `plan === "free"` (`ContentPanel`, `FaqPanel`, `SeoPanel` show a locked overlay). This is a frontend-only gate; backend quota enforcement is the canonical limit.
- Counts successful generations only (across all surfaces).
- Displayed to the user in real time via a unified `AiQuotaHint` component.
- Resets automatically at the start of each UTC month (new `periodKey`).
- Per-feature `AiUsageMonthly` rows are preserved for internal telemetry; the user-facing counter is the shared total.

### 5.2 Daily anti-abuse rail

| Tier    | Limit           | Window                         |
| ------- | --------------- | ------------------------------ |
| Free    | 15 attempts/day | 24h rolling from first request |
| Premium | 75 attempts/day | 24h rolling from first request |

- Counts all attempts that pass validation (including failed Gemini calls).
- Not displayed to the user - this is a safety rail, not a product feature.
- Resets on server restart (in-memory only).

### 5.3 Why these are separate layers

The **shared monthly budget** is the product-visible consumption limit - it protects against cost overrun and provides a clear UX contract (“you have N AI generations remaining this month”). The budget is shared across About, FAQ, and SEO surfaces so the user sees one simple counter.

The **daily anti-abuse rail** is a defense-in-depth mechanism - it prevents a single user from exhausting their entire monthly quota in a burst or from scripting rapid-fire requests. It is intentionally set higher than the monthly quota to avoid interfering with normal usage.

The **provider quota** is an external dependency - even if the user has remaining monthly quota, the upstream Gemini API may impose its own rate limits. The backend detects this and returns a distinct error code so the frontend can explain it differently from "you've used up your quota."

---

## 6. Persistence and Governance

### 6.1 AiUsageMonthly model

- **Collection**: `aiusagemonthlies`
- **Schema**: `{ userId (ObjectId, required), feature (String, required), periodKey (String, required), count (Number, default: 0) }`
- **Timestamps**: `createdAt`, `updatedAt` (auto-managed by Mongoose).

### 6.2 periodKey format

UTC month in `YYYY-MM` format (e.g., `"2026-03"`). Generated via `currentPeriodKey()` using `getUTCFullYear()` and `getUTCMonth()`.

### 6.3 Unique compound index

```
{ userId: 1, feature: 1, periodKey: 1 } - unique
```

This index enforces one document per user per feature per month, enabling safe `$inc` with `upsert: true`.

### 6.4 Manual index governance

The project enforces `autoIndex: false` and `autoCreate: false` globally. Indexes are not applied automatically at runtime. They must be applied via manual migration scripts.

### 6.5 Migration script

- **Script**: `backend/scripts/migrate-aiusagemonthly-indexes.mjs`
- **npm command**: `npm run migrate:aiusagemonthly-indexes`
- **Modes**: `--dry-run` (default, read-only) and `--apply` (creates the index).
- **Features**: Duplicate detection aggregation, pre-check of existing indexes, post-check verification, `NamespaceNotFound` handling for fresh deployments.
- **Pattern**: Follows the established `migrate-paymenttransaction-indexes.mjs` pattern used by other models.

### 6.6 Current status

The unique compound index `userId_1_feature_1_periodKey_1` is **live in production**. Verified via dry-run post-check showing the index already exists.

---

## 7. Environment / Operational Dependencies

### 7.1 Required environment variables

| Variable           | Required             | Default                 | Description                                                                     |
| ------------------ | -------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `AI_ABOUT_ENABLED` | Yes (for About AI)   | `false`                 | Feature flag for About AI. Accepts `1`, `true`, `on`, `yes` (case-insensitive). |
| `AI_FAQ_ENABLED`   | Yes (for FAQ AI)     | `false`                 | Feature flag for FAQ AI. Same accepted values as above.                         |
| `AI_SEO_ENABLED`   | Yes (for SEO AI)     | `false`                 | Feature flag for SEO AI. Same accepted values as above.                         |
| `GEMINI_API_KEY`   | Yes (for generation) | -                       | Google AI API key for Gemini access. Missing key → `AI_UNAVAILABLE`.            |
| `GEMINI_MODEL`     | No                   | `gemini-2.5-flash-lite` | Model name. Must be in allowlist: `gemini-2.5-flash-lite`, `gemini-2.5-flash`.  |

Each AI surface is independently toggleable. Disabling a flag returns 503 `AI_DISABLED` for that surface only; the other surfaces remain unaffected.

### 7.2 Backend runtime assumptions

- MongoDB connection must be available (for quota reads/writes).
- `requireAuth` middleware must be in the middleware chain (provides `req.userId`).
- Express `json()` body parser must be active.
- The AI routes must be mounted on `/api/cards` in `app.js`.

### 7.3 External dependency: Gemini API

- The feature depends on Google's Gemini API being available and the API key having sufficient quota.
- Gemini requests have a 15-second hard timeout via `AbortController`.
- Upstream quota exhaustion (HTTP 429 from Gemini) is detected and surfaced as `AI_PROVIDER_QUOTA`.
- The SDK used is `@google/generative-ai` (version 0.24.1) with structured JSON output.

---

## 8. Error Taxonomy

| Code                               | HTTP | Layer             | User-visible? | Meaning                                                                 |
| ---------------------------------- | ---- | ----------------- | ------------- | ----------------------------------------------------------------------- |
| `AI_DISABLED`                      | 503  | Feature flag      | Yes           | The AI feature is turned off at the environment level.                  |
| `UNAUTHORIZED`                     | 401  | Auth              | Yes           | User is not authenticated.                                              |
| `NOT_FOUND`                        | 404  | Ownership/Org     | Yes           | Card not found, not owned, or org membership failed (anti-enumeration). |
| `INVALID_TARGET`                   | 400  | Validation        | Yes           | The `target` field is present but not a valid value.                    |
| `INVALID_PARAGRAPH_INDEX`          | 400  | Validation        | Yes           | The `paragraphIndex` is missing or out of range for a paragraph target. |
| `AI_INSUFFICIENT_BUSINESS_CONTEXT` | 400  | Readiness gate    | Yes           | Business name or category is empty - generation requires both.          |
| `RATE_LIMITED`                     | 429  | Anti-abuse        | Yes           | Daily in-memory rate limit exceeded.                                    |
| `AI_MONTHLY_LIMIT_REACHED`         | 429  | Product quota     | Yes           | Monthly generation quota exhausted. Includes quota DTO in response.     |
| `AI_PROVIDER_QUOTA`                | 429  | External provider | Yes           | Upstream Gemini API returned 429.                                       |
| `INVALID_SUGGESTION`               | 502  | Normalization     | Yes           | Gemini returned empty, non-JSON, or content that failed normalization.  |
| `AI_UNAVAILABLE`                   | 503  | Provider/config   | Yes           | Gemini timeout, missing API key, or other unclassified provider error.  |

---

## 9. Known Caveats and Limitations

1. **External provider quota can block generation.** Even if the user has remaining monthly quota, the upstream Gemini API may impose its own rate limits. This is communicated distinctly to the user but cannot be resolved from the Cardigo side.

2. **Daily limiter counts attempts, monthly counts successes.** A user could exhaust their daily anti-abuse limit without consuming any monthly quota (e.g., if Gemini is consistently failing). This is by design - the daily limiter is a safety rail.

3. **Daily limiter is not persisted.** It resets on server restart. In a multi-instance deployment, each instance maintains its own rate map.

4. **Mode and language default silently.** Invalid `mode` defaults to `"create"` and invalid `language` defaults to `"he"`. This was an intentional design decision for backward compatibility, but it means invalid values are not rejected.

5. **Unknown request body fields are ignored.** The backend reads only `mode`, `language`, `target`, and `paragraphIndex` from the body. Extra fields are silently discarded.

6. **Consent is localStorage-based.** If localStorage is unavailable, consent works in-session only and will re-prompt on next visit.

7. **No retry logic.** The frontend does not auto-retry on transient failures. Users must manually retry by clicking the generate button again.

8. **aboutText legacy bridge.** The frontend writes `aboutText` alongside `aboutParagraphs` for backward compatibility. This dual-write is necessary until all legacy card read paths are migrated to `aboutParagraphs`.

---

## 10. FAQ AI V1

Shipped as a separate bounded workstream with its own endpoint, feature flag, and telemetry bucket.

### 10.1 Scope (V1)

- **Target**: `full` only - generates the entire FAQ block. No single-item or per-field targeting.
- **Empty-state only**: Generation is available only when the card has no valid FAQ items (both `q` and `a` must be non-empty for an item to count). If valid items exist, the backend returns 409 `AI_FAQ_NOT_EMPTY`.
- **`faq.items` only**: AI generates only the `items` array (question/answer pairs). The card's `faq.title` and `faq.lead` are preserved and never overwritten by AI.
- **Bounded output**: The Gemini schema constrains output to a maximum of **3** Q&A items (`maxItems: 3`). Each question is capped at **120** chars, each answer at **700** chars - enforced both in the system instruction and by a post-Gemini normalizer (`q.slice(0, 120)`, `a.slice(0, 700)`). Items where either `q` or `a` is empty after trim are discarded.
- **Anti-duplication**: Two layers - (1) the Gemini system instruction explicitly prohibits duplicate or near-identical questions ("Questions must be distinct from each other - no repeated or near-repeated questions"); (2) a programmatic post-Gemini deduplication pass via `normalizeQuestionKey(q)` (trim → collapse whitespace → lowercase) drops items whose normalized question key was already seen.

### 10.2 UX flow

1. FAQ section is empty → the editor panel shows an AI generation CTA.
2. User clicks “Generate FAQ with AI” → loading state.
3. On success → read-only preview of generated FAQ items.
4. User can **Apply** (writes items into the card form) or **Dismiss** (discards).
5. Apply resets the AI state machine to idle.

### 10.3 Feature flag

- `AI_FAQ_ENABLED` (env). When off → 503 `AI_DISABLED` for the FAQ endpoint only.

### 10.4 Telemetry

- Feature key: `ai_faq_generation`.
- Per-feature `AiUsageMonthly` row is incremented on success.
- User-facing budget is the shared monthly total (see §5.1).

---

## 11. SEO AI

Shipped as a separate bounded workstream. Generates SEO title and description for the card.

### 11.1 Scope

- Generates `seoTitle` and `seoDescription`.
- Available to authenticated card owners.
- Same auth / ownership / org-gate posture as About AI.

### 11.2 Feature flag

- `AI_SEO_ENABLED` (env). When off → 503 `AI_DISABLED` for the SEO endpoint only.

### 11.3 Telemetry

- Feature key: `ai_seo_generation`.
- Per-feature `AiUsageMonthly` row is incremented on success.
- User-facing budget is the shared monthly total (see §5.1).

---

## 12. Future Work

These are logical next steps. No design or implementation work has been started.

- **Broader AI runbook**: Operational documentation covering monitoring, cost tracking, API key rotation, and incident response for AI features.

- **FAQ AI V2**: Incremental features such as single-item regeneration, improve mode for existing items, and per-item point-actions.

- **Strict validation evolution**: The current `mode`/`language` defaulting may be tightened to strict rejection if new API consumers (CLI, third-party integrations) are introduced. This would be a backend change with minimal frontend impact since the current frontend always sends valid values.

### 12.2 Completed improvement (April 2026)

- **About AI title/paragraph diversity (V1 — closed)**: Backend-only variation-hint mechanism added to `buildTitlePrompt` and `buildParagraphPrompt` in `gemini.service.js`. Consecutive generations for the same card now receive a randomly selected framing-angle directive. The `full` target, FAQ AI, SEO AI, quota, limiter, provider settings, and frontend request contract were not changed.

    **Residual deferred tail**: A non-blocking title-quality tail remains — the anti-generic variation instruction may not be sharp enough to force visually distinct title _phrasing_ in all cases. This is explicitly deferred for a possible future micro-contour (instruction wording sharpening only, no contour expansion).

### 12.1 Optional low-priority refinements (not currently planned)

Identified during token economy audit. Not required for current operational posture:

- **Outbound slogan cap**: The `slogan` field is currently sent to Gemini without a character cap. Adding a ~200-char cap would be pure defense-in-depth; risk is LOW given monthly quota bounds.
- **Dead improve line in `SYSTEM_INSTRUCTION_FULL`**: The system instruction for `target=full` includes an improve-context line that is unreachable in current frontend semantics (full CTA fires only from empty state → mode is always `create`). Removing it would save ~15 tokens/request. Not urgent.

---

_Document created as part of the About AI workstream closure. Updated to reflect current implementation state including all three AI surfaces (About, FAQ V1, SEO), shared monthly AI budget (free=10, premium=30), unified AiQuotaHint component, and feature flags. March 2026. Updated April 2026: About AI title/paragraph diversity improvement (V1 closed) and deferred title-quality tail note added (§3.10, §12.2)._
