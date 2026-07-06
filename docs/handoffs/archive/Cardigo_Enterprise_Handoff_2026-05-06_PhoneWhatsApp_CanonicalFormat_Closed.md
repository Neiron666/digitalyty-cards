# Cardigo Enterprise Handoff — Phone / WhatsApp Canonical Format

**Project:** Cardigo
**Date:** 2026-05-06
**Contour:** PHONE_WHATSAPP_CANONICAL_FORMAT_AUDIT_P1
**Status:** CLOSED / PASS
**Scope:** Frontend render-side phone/WhatsApp normalization + RTL input hardening
**Documentation contour:** PHONE_WHATSAPP_DOCS_CLOSURE_P1

---

## 1. Executive Summary

Phone and WhatsApp values are stored raw in the database. Prior to this fix, `tel:` and `https://wa.me/` action hrefs on the public card were constructed directly from those raw stored values. This caused two failure modes: (1) a raw value with spaces, hyphens, or a leading `+` produces a broken `wa.me` URL (which requires digits-only international format); (2) the RTL editor wrapper applied the browser bidi algorithm to phone/WhatsApp inputs that had no direction override, visually reordering `+` to the right end of the input — causing users to store corrupted values such as `58-651-3042 972+` instead of `+972 58-651-3042`.

The fix is frontend-only. No DB migration was run. No backend files were changed. No schema validators were changed. No DTO was changed.

Public action hrefs now use computed normalized values (`telHref`, `waHref`) derived at render time from the raw stored value. Editor inputs for phone and WhatsApp now carry `dir="ltr"`, `inputMode="tel"`, and `autoComplete="tel"` as HTML attributes to prevent future bidi corruption and improve mobile UX.

Manual browser smoke by operator: PASS.

---

## 2. Problem Statement

### 2.1 Raw `tel:` href

Prior to this fix, ContactButtons.jsx built the phone action href as `tel:${phone}` where `phone` is the raw stored string. A stored value of `+972 58-651-3042` produces `tel:+972 58-651-3042`. While many dialer apps are tolerant of spaces, this is not E.164-compliant and is fragile across environments.

### 2.2 Raw `wa.me` href

The WhatsApp action href was built as `https://wa.me/${whatsapp}`. The `wa.me` deep-link contract requires a digits-only international number with no leading `+`, no spaces, and no hyphens (e.g., `972586513042`). A raw value of `058-651-3042` produces `https://wa.me/058-651-3042` — which `wa.me` does not recognize, silently opening the WhatsApp home screen instead of a pre-addressed chat.

### 2.3 RTL editor bidi corruption

The editor wrapper component sets `dir="rtl"` at the form level (Editor.jsx). Phone and WhatsApp `<input>` elements had no per-field direction override. The browser bidi algorithm, applied to a field containing both LTR digits and a `+` prefix, can visually relocate the `+` to the right — causing the character-order of the stored value to be corrupted on input.

Example: user types `+972 58-651-3042`; displayed visually in RTL context as `58-651-3042 972+`; when the input's text content is read back, the stored value becomes `58-651-3042 972+`. The phone/WhatsApp buttons on the public card then receive this corrupted string.

---

## 3. Implementation Summary

### 3.1 `frontend/src/utils/phoneNormalize.js` — CREATED

**File:** `frontend/src/utils/phoneNormalize.js` lines 1–100

Pure utility module. No DOM access. No browser APIs. No external dependencies. No throws for user input. Empty string or unrecognized format always returns `""`.

**Bidi mark stripping (line 5):**
The regex `/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g` strips U+200E (LRM), U+200F (RLM), U+202A (LRE), U+202B (RLE), U+202C (PDF), U+202D (LRO), U+202E (RLO) from all raw input before any normalization.

**`extractCleanParts(raw)` (lines 7–14):**
Trims the raw string, strips bidi marks, records whether the cleaned string had a leading `+`, then extracts all digits via `/\D/g`.

**`isIlNsn(nsn)` (lines 16–23):**
Returns true if the string is an Israeli National Subscriber Number: 8 or 9 digits, must not start with `"0"`.

**`isPlausibleE164Digits(digits)` (lines 25–32):**
Returns true if the digit string is 7–15 characters and does not start with `"0"` — used for the generic E.164 fallback.

**`normalizeForTel(raw)` (lines 34–90) — normalization rules:**

- Rule A (lines 40–46): digits start with `"972"` — extract NSN (`digits.slice(3)`), validate with `isIlNsn`. If valid, return `"+" + digits`. Guard: NSN must not start with `"0"` — prevents false-positive on `+9720586513042`.
- Rule B (lines 49–56): digits start with `"0"` — local Israeli with leading zero. Total digit count must be 9 or 10. Slice the leading zero, validate NSN, return `"+972" + nsn`.
- Rule C (lines 59–64): digits do not start with `"0"`, exactly 9 digits, starts with `"5"` — bare Israeli mobile NSN. Return `"+972" + digits`.
- Rule D (lines 67–78): digits end with `"972"` — known RTL-corrupted country-code suffix pattern. D1: prefix is a valid bare IL NSN → return `"+972" + prefix`. D2: prefix starts with `"0"` with local format length → slice leading zero, validate NSN, return `"+972" + nsn`.
- Rule E (lines 81–84): original input had a leading `"+"` and `isPlausibleE164Digits` passes — generic E.164 fallback. Return `"+" + digits`.
- Rule F (line 87): unrecognized format — return `""`.

**`normalizeForWaMe(raw)` (lines 92–96):**
Calls `normalizeForTel(raw)`. If result is empty, returns `""`. Strips leading `"+"` to produce the digits-only format required by `wa.me`.

---

### 3.2 `frontend/src/components/card/sections/ContactButtons.jsx` — PATCHED

**Import (lines 5–8):**

```
import {
    normalizeForTel,
    normalizeForWaMe,
} from "../../../utils/phoneNormalize";
```

**Computed hrefs (lines 29–30):**

```
const telHref = normalizeForTel(phone);
const waHref = normalizeForWaMe(whatsapp);
```

Both are computed from the raw stored values (`phone`, `whatsapp`) resolved from the card's `contact` object. Raw values are unchanged; normalization is render-side only.

**Early-return guard (lines 59–69):**
Gate condition uses `!telHref` and `!waHref` (previously `!phone` and `!whatsapp`). A card with a non-empty but unrecognizable phone value will now correctly fail the guard rather than producing a broken `tel:` href.

**Phone button (lines 74–88):**

- Gate: `{telHref && (` — button is suppressed when normalization returns `""`.
- `href={`tel:${telHref}`}` — E.164-normalized value.
- `aria-label={`Call ${phone || telHref}`}` — raw value used for human-readable label; falls back to `telHref` only if raw is empty.
- Display label `"טלפון"` and tracking call `trackClick(card?.slug, "call")` unchanged.

**WhatsApp button (lines 91–106):**

- Gate: `{waHref && (` — button is suppressed when normalization returns `""`.
- `href={`https://wa.me/${waHref}`}` — digits-only international format.
- `aria-label={`Open WhatsApp chat ${whatsapp || waHref}`}` — raw value for label.
- Display label `"וואטסאפ"` and tracking call unchanged.

**Not touched:** waze, facebook, instagram, twitter, tiktok, website logic; CSS Modules; all tracking behavior.

---

### 3.3 `frontend/src/components/editor/panels/ContactPanel.jsx` — PATCHED

**Phone Input (lines ~57–67):**
Added three HTML attributes to the existing `<Input>` component:

- `dir="ltr"` — overrides the RTL wrapper direction for this field only, preventing bidi visual corruption of `+` prefix.
- `inputMode="tel"` — requests the phone dial-pad keyboard on mobile.
- `autoComplete="tel"` — enables browser phone autofill.

**WhatsApp Input (lines ~80–88):**
Same three attributes added: `dir="ltr"`, `inputMode="tel"`, `autoComplete="tel"`.

These are HTML attributes passed through to the underlying `<input>` element. They are not inline styles. No CSS was added or removed.

**Unchanged:** save logic, `whatsappLinked` toggle logic, `activePhoneMax` computation, `maxLength` constraints, `fieldErrors` wiring, all other inputs in the panel.

---

## 4. Behavior Matrix

Verified by running `normalizeForTel` / `normalizeForWaMe` against a 14-case matrix. All cases passed. Exit code: 0.

| Raw input          | `normalizeForTel` | `normalizeForWaMe` |
| ------------------ | ----------------- | ------------------ |
| `+972586513042`    | `+972586513042`   | `972586513042`     |
| `+972 58-651-3042` | `+972586513042`   | `972586513042`     |
| `972586513042`     | `+972586513042`   | `972586513042`     |
| `9720586513042`    | `""`              | `""`               |
| `0586513042`       | `+972586513042`   | `972586513042`     |
| `058-651-3042`     | `+972586513042`   | `972586513042`     |
| `048651234`        | `+97248651234`    | `97248651234`      |
| `58-651-3042 972+` | `+972586513042`   | `972586513042`     |
| `0586513042 972+`  | `+972586513042`   | `972586513042`     |
| `04-8651234 972+`  | `+97248651234`    | `97248651234`      |
| `""` (empty)       | `""`              | `""`               |
| `123`              | `""`              | `""`               |
| `+14155552671`     | `+14155552671`    | `14155552671`      |
| `14155552671`      | `""`              | `""`               |

Note on `9720586513042`: Rule A fires (starts with `972`), NSN = `0586513042` which starts with `"0"` — `isIlNsn` returns false. Rules B–E all fail. Returns `""`. Phone button suppressed. Correct behavior.

Note on `14155552671` (US number, no leading `+`): No IL pattern matches. Rule E fails (no leading `+` in original input). Returns `""`. Correct behavior — ambiguous bare international number is not guessed.

Note on `+14155552671`: Rule E fires (leading `+`, 11 digits, does not start with `"0"`). Returns `+14155552671`. Correct — non-IL E.164 with explicit `+` is preserved.

---

## 5. Verification Evidence

All frontend static gates run from `frontend/` directory. All EXIT 0.

Gate: `npm.cmd run check:inline-styles` — EXIT:0 — PASS: no inline styles found.
Gate: `npm.cmd run check:skins` — EXIT:0 — PASS: skins are token-only.
Gate: `npm.cmd run check:contract` — EXIT:0 — PASS: template contracts are consistent.
Gate: `npm.cmd run build --if-present` — EXIT:0 — PASS: production build succeeded.
Gate: behavior matrix 14 cases — EXIT:0 — PASS: all outputs matched expected.

Manual smoke by operator — PASS:

- In the RTL editor, the `+` sign remains visually on the left side of the phone input (LTR direction override working).
- The phone action href on the public card is `tel:+972586513042` (normalized, not raw).
- The WhatsApp action href on the public card is `https://wa.me/972586513042` (digits-only, not raw).

---

## 6. Explicit Non-Actions / Anti-Overclaim

The following changes were NOT made in this contour:

- Backend source files were not changed.
- `card.controller.js` was not changed.
- `cardDTO.js` was not changed.
- `Card.model.js` schema validators for `contact.phone` and `contact.whatsapp` were not changed. They continue to accept formatted values (spaces, hyphens, parentheses, leading `+`).
- DB values were not migrated or backfilled. All stored phone/whatsapp values remain in their original raw format. Normalization is render-side only.
- `CardLayout.jsx` was not changed.
- `CardLayout.module.css` was not changed.
- `bookingPhone.util.js` (the `normalizeIlPhone()` utility used for booking customer phone normalization) was not repurposed, referenced, or touched. It is a separate booking-domain utility with different scope.
- `SaveContactButton.jsx` was not changed. The VCard `TEL:` field in the downloadable vCard continues to use the raw stored phone value. See Section 7 (Deferred Tail).
- No SEO changes. No OG tag changes. No sitemap changes.
- No auth changes. No routing or public/private boundary changes.
- No config, env, package.json, or migration files were changed.
- No git commands were used.
- No secrets, tokens, JWTs, credentials, cookie values, env variable values, or provider IDs are included anywhere in this document.
- No claim is made that all phone values in the database are E.164-formatted. They are not. The render-side normalization handles recognized patterns; unrecognized patterns suppress the action button.
- No claim is made that this fix addresses all international phone formats. Only Israeli patterns (Rules A–D) and generic E.164 with explicit `+` (Rule E) are covered.

---

## 7. Deferred Tail

### 7.1 SaveContactButton.jsx / VCard TEL — P2/P3 DEFERRED

`frontend/src/components/card/sections/SaveContactButton.jsx` generates a downloadable vCard. The `TEL:` property in that vCard is set as `TEL:${escapeVCardText(phone)}` using the raw stored phone value.

This is intentionally not fixed in the current contour for the following reasons:

1. vCard consumers (iOS Contacts, Android Contacts, Google Contacts, Outlook) are generally tolerant of formatted TEL values including spaces, hyphens, and parentheses. The vCard RFC 6350 does not require E.164.
2. The contact-action correctness problem (broken `tel:` href, broken `wa.me` URL) is separate from the vCard import correctness problem. The phone/WhatsApp buttons are fixed; the vCard download is a lower-priority tail.
3. Applying `normalizeForTel` to the vCard TEL field requires additional verification (vCard fallback behavior when normalization returns `""`, whether to suppress the TEL property or keep the raw value as fallback).

Status: explicitly deferred as a separate future bounded contour. Non-blocking. Current behavior is unchanged from pre-fix.

---

## 8. Files Changed In This Contour

### Changed (implementation contour — PHONE_WHATSAPP_CANONICAL_FORMAT_AUDIT_P1):

- `frontend/src/utils/phoneNormalize.js` — CREATED (lines 1–100)
- `frontend/src/components/card/sections/ContactButtons.jsx` — PATCHED (imports lines 5–8; telHref/waHref lines 29–30; early-return guard lines 59–69; phone button lines 74–88; whatsapp button lines 91–106)
- `frontend/src/components/editor/panels/ContactPanel.jsx` — PATCHED (phone Input dir/inputMode/autoComplete lines ~57–67; whatsapp Input dir/inputMode/autoComplete lines ~80–88)

### Not changed:

- `backend/**` — no backend files
- `backend/src/models/Card.model.js`
- `backend/src/controllers/card.controller.js`
- `backend/src/utils/cardDTO.js`
- `frontend/src/templates/layout/CardLayout.jsx`
- `frontend/src/templates/layout/CardLayout.module.css`
- `frontend/src/components/card/sections/SaveContactButton.jsx`
- All routing, SEO, OG, sitemap, auth, and analytics files
- All config, env, migration, and package files

---

_Document created 2026-05-06 as part of the PHONE_WHATSAPP_DOCS_CLOSURE_P1 workstream. Records the closure of the PHONE_WHATSAPP_CANONICAL_FORMAT_AUDIT_P1 contour. Frontend static gates: EXIT 0. Behavior matrix 14 cases: EXIT 0. Operator manual smoke: PASS. No backend changes. No DB migration. No code changes in this documentation phase._
