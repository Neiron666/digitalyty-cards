# Cardigo Enterprise Handoff — SEO Magic Setup Orchestrator

**Date:** 2026-05-14
**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Contour:** SEO_MAGIC_SETUP_ORCHESTRATOR_P2A
**Scope:** Frontend-only — SeoPanel Magic SEO Setup orchestrator + docs closure
**Env changes required:** NO
**Backend changes:** NO
**Files changed (code):** 2 (frontend only)
**Files changed (docs):** 2 updated + this handoff

---

## Section 1: Executive Summary

### What was added

A "Magic SEO Setup" card was added as the first element of the `/edit/card/seo` editor panel (`SeoPanel.jsx`). It provides a single-button flow — "הגדירו לי SEO אוטומטית ✨" — that fills all baseline SEO fields in one click without requiring the user to edit each field manually.

### Why it was added

The `/edit/card/seo` panel previously required users to manually fill each field independently: title, description, canonical URL, and JSON-LD structured data. Most users left these fields empty. The Magic SEO Setup reduces the time-to-SEO-configured from multiple manual steps to a single action, lowering the barrier for card owners who are not familiar with SEO tooling.

### Save semantics

The orchestrator operates on local draft state only. It does not autosave and does not trigger any backend write. The user must click "שמור שינויים" to persist the changes. This is the same save contract as all other fields in the editor.

---

## Section 2: Changed Files

### Code files

- `frontend/src/components/editor/panels/SeoPanel.jsx` — orchestrator state, logic, and JSX
- `frontend/src/components/editor/panels/SeoPanel.module.css` — Magic SEO card styles

### Docs files

- `docs/runbooks/seo-scripts.md` — added "Magic SEO Setup — הגדרת SEO אוטומטית" section
- `docs/ai-about-workstream.md` — updated SeoPanel.jsx file-table row to reflect both AI paths
- `docs/handoffs/current/Cardigo_Enterprise_Handoff_2026-05-14_SeoMagicSetup_Orchestrator_Closed.md` — this file

---

## Section 3: User-Facing UX

### Card title

"הגדרת SEO אוטומטית" — a styled card section displayed at the top of the `/edit/card/seo` panel.

### Button label

"הגדירו לי SEO אוטומטית ✨"

The button is disabled and shows prerequisite hints when business name, category, or public URL are missing, or when an AI quota is exhausted, or when an existing AI call is in progress.

### Save reminder

After the orchestrator completes, the notice explicitly reminds the user that changes are in draft and "שמור שינויים" is required.

### Partial success behavior

If the AI call fails (quota exhausted, provider error, timeout), canonical URL and JSON-LD setup still run. The user sees a warning notice describing which steps succeeded and which did not.

---

## Section 4: Orchestrator Behavior

### Consent modal reuse

On first AI use, the existing `AiConsentModal` is shown (same modal as the individual SEO AI button and all other AI surfaces). Consent is persisted in `localStorage` under `cardigo_ai_about_consent`. If consent was already granted, the orchestrator proceeds immediately.

### suggestSeo helper reuse

The orchestrator calls the existing `requestSeoSuggestion` helper (same function used by the individual AI button in SeoPanel). No new API client method was created. The call uses the existing `POST /api/cards/:id/ai/seo-suggestion` endpoint without modification.

### canonicalUrl assignment

After AI completes (or if AI is skipped due to existing valid content), `canonicalUrl` is set to `computedPublicUrl` — the same derived public URL shown as a hint label in the panel. No backend computation; the value is already present in the panel's derived state.

### JSON-LD empty → create

If `seo.jsonLd` is empty or whitespace, the orchestrator generates a baseline LocalBusiness JSON-LD block using the existing `buildJsonLdTemplate` helper. The generated block uses the card's business name, category, phone, city, and the computedPublicUrl as the canonical source.

### Valid root JSON-LD → sync url and @id only

If `seo.jsonLd` is valid JSON and contains a top-level object with a recognized `@type`, only the `url` and `@id` fields are updated to the current computedPublicUrl. All other fields in the existing JSON-LD are preserved unchanged.

### Invalid / unsupported JSON-LD → preserved

If `seo.jsonLd` is present but is invalid JSON, or is an array, or has an unsupported / missing `@type`, the field is left unchanged. A warning notice is shown explaining that the existing JSON-LD could not be synced.

### AI failure → partial success

If the `suggestSeo` call rejects for any reason, the orchestrator does not abort. It continues to the canonical URL and JSON-LD steps. The final notice state is "partial success" (warning level) rather than "error" when canonical/JSON-LD succeeded despite the AI failure.

### aiState === "loading" race guard

Before the orchestrator starts, it checks whether `aiState === "loading"` (i.e., the existing individual AI button is mid-request). If so, the orchestrator does not start and the magic button shows a pending state via `pendingMagicRef`. The orchestrator resumes automatically once the in-flight AI call settles.

### Stale AI preview cleared

If the existing individual AI preview panel (`aiState === "preview"`) is showing when the orchestrator runs, the orchestrator clears the preview state on completion so that a stale preview from the individual button is not left visible alongside the orchestrator's own result notice.

---

## Section 5: Preserved Invariants

| Invariant                                                         | Status                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| No autosave                                                       | CONFIRMED — draft only; Save required                                         |
| Save ("שמור שינויים") remains required                            | CONFIRMED                                                                     |
| No backend files changed                                          | CONFIRMED                                                                     |
| No API contract changes                                           | CONFIRMED — suggestSeo endpoint unchanged                                     |
| No new API endpoints                                              | CONFIRMED                                                                     |
| No env variables added or changed                                 | CONFIRMED                                                                     |
| No sitemap changes                                                | CONFIRMED                                                                     |
| No OG / public route changes                                      | CONFIRMED                                                                     |
| No public card DTO changes                                        | CONFIRMED                                                                     |
| No QR / OG HTML changes                                           | CONFIRMED                                                                     |
| No DOM click simulation                                           | CONFIRMED — orchestrator calls helpers directly                               |
| Manual SEO / script controls remain visible                       | CONFIRMED                                                                     |
| Collapsible advanced / manual controls not implemented            | CONFIRMED — deferred                                                          |
| JSON-LD allowlist (SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1) intact  | CONFIRMED — buildJsonLdTemplate produces LocalBusiness (allowed)              |
| JSON-LD length limit (SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1) intact | CONFIRMED — generated block is well within 5000 chars                         |
| AI quota counter unchanged (shared budget)                        | CONFIRMED — one suggestSeo call = 1 unit, same as individual AI button        |
| AI feature flag respected                                         | CONFIRMED — if `ai_seo_generation` feature disabled, magic button is disabled |

---

## Section 6: Verification Evidence

### Frontend gates (all EXIT 0)

- `npm run check:inline-styles` — PASS / EXIT 0
- `npm run check:skins` — PASS / EXIT 0
- `npm run check:contract` — PASS / EXIT 0
- `npm run build` — PASS / EXIT 0 (371 modules, EditCard chunk 226.83 kB)

### Accessibility micro-fix

Applied as a separate bounded micro-contour:

- `aria-live="polite"` — present on the orchestrator notice container
- `aria-atomic="true"` — present
- `aria-label="סטטוס הגדרת SEO"` — present
- Verified via `grep` and confirmed in build output

### Manual smoke

16/16 manual smoke checks passed covering:

- Button disabled when prerequisites missing
- Button enabled when all prerequisites met
- Consent modal shown on first use
- After consent: orchestrator runs to completion
- Title and description populated from AI
- canonicalUrl set to computedPublicUrl
- JSON-LD created when empty
- JSON-LD url/@id synced when valid root exists
- JSON-LD preserved when invalid
- Partial success notice shown on AI failure
- All manual fields remain editable after orchestrator run
- Quota badge updated after AI call
- Save required (no autosave)
- Preview panel from individual AI button cleared after orchestrator
- Race guard: orchestrator waits for in-flight AI call
- RTL layout correct

### Production smoke

Production smoke confirmed the Magic SEO Setup card is visible and functional on `/edit/card/seo` for a premium card on https://cardigo.co.il.

### Source Control operator confirmation

Source Control diff confirmed only 2 code files changed before the docs phase:

- `frontend/src/components/editor/panels/SeoPanel.jsx`
- `frontend/src/components/editor/panels/SeoPanel.module.css`

No other code files were modified.

---

## Section 7: Deferred

### SEO_MAGIC_SETUP_ADVANCED_MANUAL_COLLAPSIBLE_P1

Moving the manual SEO / scripts fields (Title, Description, Canonical URL, Robots, JSON-LD, verification tokens, tracking IDs) under an expandable "מתקדם" / "הגדרות ידניות" collapsible section in the SeoPanel is explicitly deferred to a separate future contour.

**Not done in this contour:**

- No collapsible UI implemented
- No visibility toggle
- No localStorage preference for expanded/collapsed state
- No CSS for collapsed layout

---

## Section 8: Non-Actions

The following were explicitly NOT done:

- No changes to any backend file
- No changes to AI controllers or handlers (`suggestSeo` backend handler unchanged)
- No changes to AI routes (`backend/src/routes/ai.routes.js` unchanged)
- No new AI backend endpoint
- No backend batch SEO endpoint
- No changes to any env file or env variable
- No changes to `frontend/public/robots.txt`
- No changes to sitemap routes or sitemap generation
- No changes to OG routes or Edge Function
- No changes to public card DTOs
- No changes to `SeoHelmet`
- No changes to `PublicCard`
- No archive handoff edits
- No git commands
- No autosave mechanism
- No changes to JSON-LD schema allowlist
- No changes to JSON-LD length limit

---

## Section 9: Closure Statement

This handoff closes:

- **SEO_MAGIC_SETUP_ORCHESTRATOR_P2A** — CLOSED / PASS / PRODUCTION VERIFIED
- Frontend-only one-click SEO setup UX for `/edit/card/seo`
- Docs / runbook alignment for the new feature

This handoff does NOT close and does NOT claim:

- Collapsible advanced/manual SEO controls (deferred — SEO_MAGIC_SETUP_ADVANCED_MANUAL_COLLAPSIBLE_P1)
- Any global automation framework
- Any backend batch SEO endpoint
- Any change to public SEO infrastructure (sitemap, OG, robots.txt, Edge Function)
- Autosave or auto-publish of SEO changes
