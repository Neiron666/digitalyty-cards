# Leads & Inbox — Architecture & Specification (SSoT)

> **Owner:** Full-stack (Backend + Frontend).  
> **Last updated:** 2026-03-03.  
> **Related docs:** [Ops Runbook → docs/runbooks/leads-inbox-ops.md](runbooks/leads-inbox-ops.md)

> **⚠ Security:** Never paste real secrets, tokens, or credentials into documentation, scripts, logs, or chat. Use placeholders (`$JWT`, `$CARD_ID`, `$LEAD_ID`, etc.). Obtain test tokens via browser DevTools after a normal login — never via `jwt.sign()` or by exposing `JWT_SECRET`.

---

## 1. Overview

Cardigo provides a **Lead Form** on public card pages and a unified **Inbox** in the dashboard.

### Account-level Inbox

The Inbox aggregates leads across **all active cards** owned by the authenticated user — personal and org cards alike. A single **unread badge** (rendered in the sidebar/nav) reflects total unread count across all cards.

This is intentional:

- Users rarely own more than 5–10 cards; a global badge avoids per-card navigation overhead.
- `UnreadCountContext` polls a single `GET /api/leads/unread-count` endpoint (60 s, visibility-aware) — one query, one badge.
- The Inbox list enriches each lead row with `cardLabel` (business name or slug) and `cardKind` ("personal" / "org") so the user can immediately identify which card a lead came from.

### Data lifecycle

```
Visitor fills form → POST /api/leads (public)
  ↓
Lead created (readAt: null, isImportant: false, archivedAt: null, deletedAt: null)
  ↓
Owner opens Inbox → PATCH read → PATCH flags (star, archive, trash)
  ↓  (trash)
deletedAt = Date → TTL auto-purge after 90 days
  ↓  (manual)
DELETE hard-delete (trash-only guard)
```

---

## 2. Data Model

**Collection:** `leads`  
**Source:** `backend/src/models/Lead.model.js`  
**autoIndex:** OFF (project index governance — manual migration only).

### 2.1 Schema fields

| Field         | Type                | Default  | Notes                                               |
| ------------- | ------------------- | -------- | --------------------------------------------------- |
| `card`        | ObjectId (ref Card) | required | FK to the card that received the lead               |
| `name`        | String              | required | Sender name (trim, maxlength 100)                   |
| `email`       | String              | —        | Optional, trim + lowercase, maxlength 254           |
| `phone`       | String              | —        | Optional, trim, maxlength 20                        |
| `message`     | String              | —        | Optional, trim, maxlength 1000                      |
| `readAt`      | Date                | `null`   | `null` = unread; `Date` = when owner read           |
| `isImportant` | Boolean             | `false`  | Starred/important flag                              |
| `archivedAt`  | Date                | `null`   | `null` = active; `Date` = archived                  |
| `deletedAt`   | Date                | `null`   | `null` = not deleted; `Date` = soft-deleted (trash) |
| `createdAt`   | Date                | auto     | Mongoose timestamps                                 |
| `updatedAt`   | Date                | auto     | Mongoose timestamps                                 |

### 2.2 Indexes (4 total)

| #   | Key                                                       | Purpose                                          | Notes                          |
| --- | --------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| 1   | `{ card: 1, createdAt: -1 }`                              | Base list + cascade deleteMany                   | —                              |
| 2   | `{ card: 1, readAt: 1, createdAt: -1 }`                   | Unread-count + filtered lists                    | Additive (does not replace #1) |
| 3   | `{ card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 }` | Mailbox view tabs                                | Additive                       |
| 4   | `{ deletedAt: 1 }`                                        | **TTL: 90 days** (`expireAfterSeconds: 7776000`) | Auto-purge trash; skips `null` |

> **Manual creation required.** autoIndex is OFF. See [Ops Runbook](runbooks/leads-inbox-ops.md#1-manual-indexes) for `createIndex` commands.

### 2.3 PERSONAL_ORG pattern

All cards — including personal ones — have an `orgId`. Personal cards point to a sentinel org document with `slug: "personal"` (`PERSONAL_ORG_SLUG`).

**Why:** The multi-tenant model requires every card to belong to an org for consistent query patterns. The sentinel org avoids null-checks and partial indexes on `orgId`.

**Classification in Inbox DTO:**

```js
const personalOrgId = await getPersonalOrgId(); // cached in-memory
cardKind =
    !c.orgId || String(c.orgId) === String(personalOrgId) ? "personal" : "org";
```

Source: `backend/src/utils/personalOrg.util.js` (L3: `PERSONAL_ORG_SLUG`, L59–67: `getPersonalOrgId()`).

---

## 3. API Contracts

Base path: `/api/leads` (mounted via `backend/src/routes/lead.routes.js`).

### 3.1 POST /api/leads — Public lead submission

**Auth:** None (public).  
**Rate limits:** IP-level (15 req / 15 min) + IP:cardId composite (5 req / 15 min).  
**Controller:** `createLead` (`lead.controller.js` L14–112).

#### Request body

```json
{
    "cardId": "ObjectId (24 hex chars)",
    "name": "string (required, max 100)",
    "email": "string (optional, RFC-ish, max 254)",
    "phone": "string (optional, max 20)",
    "message": "string (optional, max 1000)",
    "website": "string (anti-spam field)",
    "consent": true
}
```

#### Sanitization pipeline

`sanitizeLeadInput(body)` in `leadSanitize.js` (L44–83):

1. `cardId` — trim, `isValidObjectId()` check.
2. `website` (honeypot) — extracted as `hp`.
3. `name` — `stripTags(max 100)`, required.
4. `email` — `stripTags(max 254)`, lowercase, RFC regex if present.
5. `phone` — `stripTags(max 20)`, optional.
6. `message` — `stripTags(max 1000, allowNewlines: true)`, optional.
7. `consent` — strict: `raw.consent === true` (not truthy — must be boolean `true`).

`stripTags` (L14–37): removes HTML/XML tags, control chars, collapses whitespace, enforces maxLen.

#### Processing order (critical for anti-training)

```
1. Sanitize + validate input       → 400 on INVALID_CARD_ID / NAME_REQUIRED / INVALID_EMAIL
2. Honeypot check (hp non-empty)   → fake 201 { success: true, leadId: "$FAKE_ID" }
3. Consent enforcement             → 400 { code: "CONSENT_REQUIRED" }
4. Card lookup (findById, isActive) → 404
5. Billing resolution              → 403 { code: "TRIAL_EXPIRED" }
6. Entitlements check              → 403 { code: "FEATURE_NOT_AVAILABLE" }
7. Lead.create(...)                → 201 { success: true, leadId: "<real ObjectId>" }
```

> **Honeypot before consent** is intentional: bots that fill `website` get a fake 201 instead of learning that consent is required (anti-training).

#### Response codes

| HTTP | Code                    | When                                              |
| ---- | ----------------------- | ------------------------------------------------- |
| 201  | —                       | Lead created (or honeypot fake success)           |
| 400  | —                       | Invalid cardId or name missing                    |
| 400  | `INVALID_EMAIL`         | Email present but fails RFC check                 |
| 400  | `CONSENT_REQUIRED`      | `consent !== true`                                |
| 403  | `TRIAL_EXPIRED`         | Card owner's trial/billing expired                |
| 403  | `FEATURE_NOT_AVAILABLE` | Plan does not include leads (`canUseLeads` false) |
| 404  | —                       | Card not found or inactive                        |
| 429  | —                       | Rate limit exceeded (IP or IP:cardId)             |
| 500  | —                       | Unexpected error (PII-safe log)                   |

---

### 3.2 GET /api/leads/mine — Inbox list (cursor-paginated)

**Auth:** `requireAuth` + `authRateLimit` (60 req / 15 min per IP:userId).  
**Controller:** `getMyLeads` (`lead.controller.js` L128–253).

#### Query params

| Param    | Type                                               | Default    | Notes                                  |
| -------- | -------------------------------------------------- | ---------- | -------------------------------------- |
| `view`   | `"active" \| "important" \| "archived" \| "trash"` | `"active"` | Tab filter                             |
| `cursor` | ISO 8601 date string                               | —          | `createdAt` of last item for next page |
| `limit`  | integer 1–50                                       | 20         | Page size                              |

#### View filters (MongoDB query)

| View        | Filter                                                 |
| ----------- | ------------------------------------------------------ |
| `active`    | `deletedAt: null, archivedAt: null`                    |
| `important` | `deletedAt: null, archivedAt: null, isImportant: true` |
| `archived`  | `deletedAt: null, archivedAt: { $ne: null }`           |
| `trash`     | `deletedAt: { $ne: null }`                             |

All views add: `card: { $in: [ownerCardIds] }` and optional `createdAt: { $lt: cursor }`.

#### Response shape

```json
{
  "leads": [
    {
      "_id": "ObjectId",
      "card": {
        "_id": "ObjectId",
        "slug": "my-card",
        "cardLabel": "Business Name or slug",
        "cardKind": "personal" | "org"
      },
      "senderName": "string",
      "senderEmail": "string | null",
      "senderPhone": "string | null",
      "message": "string | null",
      "readAt": "ISO date | null",
      "isImportant": false,
      "archivedAt": "ISO date | null",
      "deletedAt": "ISO date | null",
      "createdAt": "ISO date"
    }
  ],
  "nextCursor": "ISO date | null"
}
```

**DTO notes:**

- `cardLabel`: resolved from `card.business.name || card.business.businessName || card.slug`.
- `cardKind`: `"personal"` if `orgId` is null or matches `PERSONAL_ORG`, else `"org"`.
- Field names are **explicit pick** — no raw Mongoose document leaks.

---

### 3.3 GET /api/leads/unread-count

**Auth:** `requireAuth` + `authRateLimit`.  
**Controller:** `getUnreadCount` (`lead.controller.js` L257–280).

```json
{ "unreadCount": 5 }
```

Filter: `readAt: null, archivedAt: null, deletedAt: null` (active unread only).

---

### 3.4 PATCH /api/leads/:id/read

**Auth:** `requireAuth` + `authRateLimit`.  
**Controller:** `markLeadRead` (`lead.controller.js` L284–325).

- Sets `readAt = new Date()`.
- **Idempotent:** if already read, returns `{ success: true }` without DB write.
- Ownership: `Lead.card → Card.user === req.userId`. Anti-enumeration: 404 for both "not found" and "not owned".

---

### 3.5 PATCH /api/leads/:id/flags

**Auth:** `requireAuth` + `authRateLimit`.  
**Controller:** `updateLeadFlags` (`lead.controller.js` L329–417).

#### Allowlist

Only these keys are accepted in the body: `readAt`, `isImportant`, `archivedAt`, `deletedAt`.

#### Normalization rules

| Key           | Input  | $set value     | Side effect                                 |
| ------------- | ------ | -------------- | ------------------------------------------- |
| `readAt`      | truthy | `new Date()`   | —                                           |
| `readAt`      | falsy  | `null`         | —                                           |
| `isImportant` | any    | `Boolean(val)` | —                                           |
| `archivedAt`  | truthy | `new Date()`   | Forces `deletedAt = null` (out of trash)    |
| `archivedAt`  | falsy  | `null`         | —                                           |
| `deletedAt`   | truthy | `new Date()`   | Forces `archivedAt = null` (out of archive) |
| `deletedAt`   | falsy  | `null`         | —                                           |

**Mutual exclusion enforced:** a lead cannot be simultaneously archived and trashed. Setting one clears the other.

**Idempotent:** if the resulting `$set` would not change any field value, the DB write is skipped.

---

### 3.6 DELETE /api/leads/:id — Hard delete

**Auth:** `requireAuth` + `authRateLimit`.  
**Controller:** `hardDeleteLead` (`lead.controller.js` L421–456).

- **Guard:** `lead.deletedAt` must be set (trash only). Non-trashed leads → 400.
- Ownership check + anti-enumeration 404.
- `Lead.deleteOne({ _id })` — permanent removal.

---

### 3.7 Rate Limiting

Three in-memory rate-limit tiers defined in `lead.routes.js` (L16–19):

| Tier        | Key         | Limit | Window | Scope           |
| ----------- | ----------- | ----- | ------ | --------------- |
| Public IP   | Client IP   | 15    | 15 min | POST only       |
| Public Card | `IP:cardId` | 5     | 15 min | POST only       |
| Auth        | `IP:userId` | 60    | 15 min | All auth routes |

**Sweep:** Every 500th check, expired entries are cleaned from each `Map`. Emergency cap: if map > 10 000 entries, force-prune 2 000 oldest (L40–48).

**IP resolution:** `X-Forwarded-For` first IP, fallback to `req.ip` / `req.connection.remoteAddress` (L27–31).

---

## 4. Security Invariants

### 4.1 Ownership chain

Every authenticated lead operation verifies:

```
Lead (by _id) → lead.card → Card.findOne({ _id: lead.card, user: req.userId })
```

If the card is not found or does not belong to the caller → **404** (anti-enumeration).

### 4.2 Anti-enumeration

Non-owners and non-existent resources both return `404 { message: "Not found" }`. No distinction is leaked.

### 4.3 PII-safe logging

All catch blocks log `err?.message` only — never `req.body`, lead content, or user data.

### 4.4 Field exposure control

- Inbox DTO uses **explicit field pick** (`lead.controller.js` L213–228) — no raw `.lean()` pass-through.
- Internal fields (`__v`, `updatedAt`) are not exposed.
- `cardLabel` / `cardKind` are **computed server-side** — the client receives only derived values, not raw `orgId`.

### 4.5 Honeypot semantics

- The `website` field is an anti-spam field.
- Bots that fill it receive a fake `201` with a deterministic fake ObjectId (value intentionally not documented).
- No DB write occurs.
- Checked **before** consent validation to avoid training bots to bypass consent.

---

## 5. Frontend Architecture

### 5.1 LeadForm component

**Source:** `frontend/src/components/card/sections/LeadForm.jsx` (216 lines).  
**CSS:** `frontend/src/components/card/sections/LeadForm.module.css` (136 lines).

#### Consent checkbox

- Required: both FE (`form.consent` checked) and BE (`consent === true`).
- Contains inline links to `/privacy` and `/terms` (`target="_blank"`).
- **Specificity fix:** Links inside `.consentRow .consentText :global(a)` at `(0,2,1)` override CardLayout's `.sectionWrap :global(a)` at `(0,1,1)` — prevents pill-button appearance.

#### Notice component

`frontend/src/components/ui/Notice/Notice.jsx` (24 lines) + `Notice.module.css` (50 lines).

| Variant   | Icon | Role     | aria-live   | Border color            |
| --------- | ---- | -------- | ----------- | ----------------------- |
| `success` | ✓    | `status` | `polite`    | `--c-success` (#16a34a) |
| `error`   | ✗    | `alert`  | `assertive` | `--c-danger` (#c62828)  |
| `info`    | ℹ    | `status` | `polite`    | `--primary` (#3b82f6)   |

#### Error mapping (9 cases)

| Condition                     | Hebrew message                             |
| ----------------------------- | ------------------------------------------ |
| FE: `!form.consent`           | חובה להסכים למדיניות הפרטיות ולתנאי השימוש |
| 429                           | יותר מדי ניסיונות, נסה שוב מאוחר יותר      |
| 400 + `INVALID_EMAIL`         | כתובת אימייל לא תקינה                      |
| 400 + `CONSENT_REQUIRED`      | חובה להסכים למדיניות הפרטיות ולתנאי השימוש |
| 400 (generic)                 | אנא בדוק את הפרטים ונסה שנית               |
| 403 + `TRIAL_EXPIRED`         | תקופת הניסיון הסתיימה                      |
| 403 + `FEATURE_NOT_AVAILABLE` | טופס יצירת קשר זמין למנויי פרימיום בלבד    |
| 404                           | הכרטיס לא זמין כרגע                        |
| 500 / other                   | שגיאה בשליחת הטופס                         |

#### Auto-reset & manual reset

- On success: `Notice variant="success"` + "שלח הודעה נוספת" button.
- Auto-reset after **9 seconds** via `useEffect` + `setTimeout`, cleanup on unmount/status change.
- `handleReset()`: sets status → idle, clears error, resets form to `INITIAL_FORM`.

#### Honeypot field

```jsx
<input
    name="website"
    className={styles.hp}
    tabIndex={-1}
    autoComplete="off"
    aria-hidden="true"
/>
```

CSS `.hp`: `position: absolute; inset-inline-start: -9999px; opacity: 0; height: 0; width: 0; pointer-events: none`.

#### Field maxLength

| Field   | maxLength |
| ------- | --------- |
| name    | 100       |
| email   | 254       |
| phone   | 20        |
| message | 1000      |

---

### 5.2 Inbox page

**Source:** `frontend/src/pages/Inbox.jsx` (~525+ lines).  
**CSS:** `frontend/src/pages/Inbox.module.css` (~360+ lines).

#### Tabs

Four views: **Active** (default), **Important** (starred), **Archived**, **Trash**.  
Tab switching passes `view` param to `getMyLeads({ view })`.

#### Card metadata

Each lead row shows:

- **cardLabel**: business name or slug (truncated, `max-width: 10rem`).
- **kindPill**: gold "עסקי" (org) or blue "אישי" (personal).

#### Action bar

Per-lead actions available depending on current tab:

- Star / unstar (`isImportant` toggle)
- Archive / unarchive (`archivedAt` toggle)
- Move to trash / restore (`deletedAt` toggle)
- Hard delete (trash tab only, with confirmation dialog)

#### Optimistic updates

Flag changes update local state immediately via `updateLeadFlags` + `adjustUnreadCount(delta)`:

- Mark read: `adjustUnreadCount(-1)` (only if was unread).
- Star/archive/trash: local state mutation, then API call. On error: rollback + `refresh()`.

---

### 5.3 UnreadCountContext

**Source:** `frontend/src/context/UnreadCountContext.jsx` (119 lines).

| Aspect        | Detail                                                         |
| ------------- | -------------------------------------------------------------- |
| Poll interval | 60 s (`POLL_INTERVAL_MS`)                                      |
| Visibility    | Pauses when tab hidden; resumes + immediate fetch on tab focus |
| Auth-aware    | Resets to 0 on logout; starts polling on login                 |
| De-dupe       | `inflightRef` prevents concurrent fetches; queues one pending  |
| Optimistic    | `adjustUnreadCount(delta)` for immediate badge update          |
| API           | Exposes `{ unreadCount, refresh, adjustUnreadCount }`          |

---

### 5.4 FE Service layer

**Source:** `frontend/src/services/leads.service.js` (37 lines).

| Function                                          | Method | Path                  |
| ------------------------------------------------- | ------ | --------------------- |
| `createLead(data)`                                | POST   | `/leads`              |
| `getMyLeads({ cursor, limit, unreadOnly, view })` | GET    | `/leads/mine`         |
| `getUnreadCount()`                                | GET    | `/leads/unread-count` |
| `markLeadRead(id)`                                | PATCH  | `/leads/:id/read`     |
| `updateLeadFlags(id, flags)`                      | PATCH  | `/leads/:id/flags`    |
| `hardDeleteLead(id)`                              | DELETE | `/leads/:id`          |

---

## 6. Multi-Tenant: cardKind Classification

### Problem

All cards — including personal ones — have a non-null `orgId` pointing to either:

- **PERSONAL_ORG** (sentinel org, `slug: "personal"`) — for personal cards.
- A real business org — for org cards.

Naively checking `orgId != null` marks everything as "org".

### Solution

```js
// lead.controller.js — getMyLeads (L193–202)
const personalOrgId = await getPersonalOrgId(); // cached String
cardKind =
    !c.orgId || String(c.orgId) === String(personalOrgId) ? "personal" : "org";
```

`getPersonalOrgId()` (`personalOrg.util.js` L59–67): resolves once, caches in-memory.

---

## 7. PROOF Index

| What                  | File                                                        | Lines    |
| --------------------- | ----------------------------------------------------------- | -------- |
| Lead schema + indexes | `backend/src/models/Lead.model.js`                          | L1–81    |
| Lead sanitizer        | `backend/src/utils/leadSanitize.js`                         | L1–83    |
| Routes + rate limits  | `backend/src/routes/lead.routes.js`                         | L1–140   |
| createLead            | `backend/src/controllers/lead.controller.js`                | L14–112  |
| getOwnerCardIds       | `backend/src/controllers/lead.controller.js`                | L116–121 |
| getMyLeads + DTO      | `backend/src/controllers/lead.controller.js`                | L128–253 |
| getUnreadCount        | `backend/src/controllers/lead.controller.js`                | L257–280 |
| markLeadRead          | `backend/src/controllers/lead.controller.js`                | L284–325 |
| updateLeadFlags       | `backend/src/controllers/lead.controller.js`                | L329–417 |
| hardDeleteLead        | `backend/src/controllers/lead.controller.js`                | L421–456 |
| PERSONAL_ORG_SLUG     | `backend/src/utils/personalOrg.util.js`                     | L3       |
| getPersonalOrgId      | `backend/src/utils/personalOrg.util.js`                     | L59–67   |
| LeadForm component    | `frontend/src/components/card/sections/LeadForm.jsx`        | L1–216   |
| LeadForm CSS          | `frontend/src/components/card/sections/LeadForm.module.css` | L1–136   |
| Notice component      | `frontend/src/components/ui/Notice/Notice.jsx`              | L1–24    |
| Notice CSS            | `frontend/src/components/ui/Notice/Notice.module.css`       | L1–50    |
| UnreadCountContext    | `frontend/src/context/UnreadCountContext.jsx`               | L1–119   |
| Inbox page            | `frontend/src/pages/Inbox.jsx`                              | L1–525+  |
| FE leads service      | `frontend/src/services/leads.service.js`                    | L1–37    |
