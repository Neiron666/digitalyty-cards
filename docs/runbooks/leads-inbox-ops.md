# Runbook: Leads & Inbox - Operations

> **Owner:** Backend / DevOps.  
> **Last updated:** 2026-03-03.  
> **Related docs:** [Architecture & Spec → docs/leads-inbox-architecture.md](../leads-inbox-architecture.md)

> **⚠ Security:** Never paste real secrets, tokens, or credentials into documentation, scripts, logs, or chat. Use placeholders (`$JWT`, `$CARD_ID`, `$LEAD_ID`, etc.). Obtain test tokens via browser DevTools after a normal login - never via `jwt.sign()` or by exposing `JWT_SECRET`.

---

## 1. Manual Indexes

> **autoIndex is OFF** in the Lead model (project index governance).  
> Indexes must be created manually in production via `mongosh`.

### 1.1 Required indexes

Run these commands in `mongosh` connected to the production database:

```js
// #1 - Base list + cascade deleteMany
db.leads.createIndex({ card: 1, createdAt: -1 });

// #2 - Unread-count + filtered lists
db.leads.createIndex({ card: 1, readAt: 1, createdAt: -1 });

// #3 - Mailbox view tabs (active / archived / trash)
db.leads.createIndex({ card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 });

// #4 - TTL: auto-purge soft-deleted leads after 90 days
db.leads.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 7776000 });
```

### 1.2 Verify indexes exist

```js
db.leads.getIndexes().forEach((idx) => {
    printjson({
        name: idx.name,
        key: idx.key,
        unique: !!idx.unique,
        expireAfterSeconds: idx.expireAfterSeconds || null,
    });
});
```

Expected output: 5 indexes (`_id_` + 4 above).

### 1.3 Source of truth

Schema + index definitions: `backend/src/models/Lead.model.js` (L65–80).

---

## 2. TTL Retention (90 Days for Trash)

### 2.1 How it works

- Index #4 (`{ deletedAt: 1 }`) has `expireAfterSeconds: 7776000` (90 days).
- MongoDB's TTL monitor runs approximately **every 60 seconds** and removes documents where `deletedAt + 90 days < now`.
- Documents with `deletedAt: null` are **skipped** by the TTL monitor - active/archived leads are safe.

### 2.2 Testing TTL (staging / local only)

Backdate `deletedAt` by 91 days to trigger TTL on next monitor pass:

```js
// Create a test lead in trash with deletedAt = 91 days ago
db.leads.insertOne({
    card: ObjectId("000000000000000000000001"),
    name: "TTL Test",
    deletedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
});

// Wait ~60–120 s, then verify it was purged:
db.leads.countDocuments({ name: "TTL Test" });
// Expected: 0
```

### 2.3 Expectations

- TTL removal is **not instant**. The monitor runs ~every 60 s, but under heavy load it may lag.
- On Atlas free/shared tier, TTL may take several minutes.
- If a lead has `deletedAt` as a non-Date type (string, number), the TTL monitor ignores it - always store a proper `Date`.

---

## 3. Hard Delete

### 3.1 When it's allowed

`DELETE /api/leads/:id` only succeeds if `lead.deletedAt` is set (the lead is in trash).

- Attempting to hard-delete an active or archived lead → `400 Invalid request`.
- Non-owner or non-existent → `404 Not found` (anti-enumeration).

### 3.2 Expected status codes

| Scenario                      | HTTP | Body                               |
| ----------------------------- | ---- | ---------------------------------- |
| Success (trashed lead, owner) | 200  | `{ success: true }`                |
| Lead not in trash             | 400  | `{ message: "Invalid request" }`   |
| Not found / not owner         | 404  | `{ message: "Not found" }`         |
| Invalid ObjectId              | 400  | `{ message: "Invalid request" }`   |
| Rate limited                  | 429  | `{ message: "Too many requests" }` |

---

## 4. Rate-Limit Tuning

### 4.1 Current limits

| Tier        | Key         | Limit  | Window | Applies to                           |
| ----------- | ----------- | ------ | ------ | ------------------------------------ |
| Public IP   | Client IP   | **15** | 15 min | `POST /api/leads`                    |
| Public Card | `IP:cardId` | **5**  | 15 min | `POST /api/leads`                    |
| Auth        | `IP:userId` | **60** | 15 min | All auth routes (GET, PATCH, DELETE) |

### 4.2 Where to change

All constants are in `backend/src/routes/lead.routes.js` (L16–19):

```js
const LEAD_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min window
const LEAD_RATE_LIMIT_IP = 15; // per IP
const LEAD_RATE_LIMIT_CARD = 5; // per IP:cardId
const AUTH_RATE_LIMIT = 60; // per IP:userId
```

### 4.3 Safe testing

1. Change the window to a short period (e.g., `10 * 1000` = 10 s) in a local/staging env.
2. Send requests beyond the limit.
3. Verify 429 response.
4. Wait for window to expire, verify requests succeed again.
5. **Restore original values** before deploying.

> **Do not** reduce `LEAD_RATE_LIMIT_CARD` below 3 without checking UX impact-form submission retries after validation errors count against the limit.

---

## 5. Smoke Tests

### Prerequisites

- Local backend running on `http://localhost:5000`.
- A valid `cardId` for an active card with `canUseLeads` entitlement (replace `<CARD_ID>` below).
- A valid JWT for the card owner. **How to obtain safely:** log in to the Cardigo dashboard, open browser DevTools → Application → Local Storage → copy the `token` value. **Never** use `jwt.sign()` or expose `JWT_SECRET` in docs/scripts. Replace `<JWT>` in commands below.

All commands use **PowerShell + curl.exe** (Windows).

### 5.1 POST - Lead creation (consent: true)

```powershell
@'
{
  "cardId": "<CARD_ID>",
  "name": "Smoke Test",
  "email": "smoke@example.com",
  "phone": "0501234567",
  "message": "Smoke test message",
  "website": "",
  "consent": true
}
'@ | curl.exe -s -X POST "http://localhost:5000/api/leads" `
     -H "Content-Type: application/json" --data-binary "@-"
```

**Expected:** `201 { "success": true, "leadId": "..." }`

### 5.2 POST - Consent false (should fail)

```powershell
@'
{
  "cardId": "<CARD_ID>",
  "name": "No Consent",
  "email": "test@example.com",
  "consent": false
}
'@ | curl.exe -s -X POST "http://localhost:5000/api/leads" `
     -H "Content-Type: application/json" --data-binary "@-"
```

**Expected:** `400 { "message": "Invalid request", "code": "CONSENT_REQUIRED" }`

### 5.3 POST - Honeypot filled (fake success)

```powershell
@'
{
  "cardId": "<CARD_ID>",
  "name": "Bot",
  "website": "http://spam.example.com",
  "consent": true
}
'@ | curl.exe -s -X POST "http://localhost:5000/api/leads" `
     -H "Content-Type: application/json" --data-binary "@-"
```

**Expected:** `201 { "success": true, "leadId": "$FAKE_ID" }` - a deterministic fake ObjectId (value intentionally not documented).

### 5.4 POST - Free plan (no canUseLeads)

Use a `cardId` belonging to a free-tier card:

```powershell
@'
{
  "cardId": "<FREE_CARD_ID>",
  "name": "Free User",
  "consent": true
}
'@ | curl.exe -s -X POST "http://localhost:5000/api/leads" `
     -H "Content-Type: application/json" --data-binary "@-"
```

**Expected:** `403 { "message": "Lead form available only for paid plans", "code": "FEATURE_NOT_AVAILABLE" }`

### 5.5 POST - Rate limit (429)

Send 16 requests in rapid succession from the same IP to exceed the IP limit of 15:

```powershell
1..16 | ForEach-Object {
    @'
{
  "cardId": "<CARD_ID>",
  "name": "Rate $_",
  "consent": true
}
'@ | curl.exe -s -o NUL -w "req $_`: %{http_code}`n" `
         -X POST "http://localhost:5000/api/leads" `
         -H "Content-Type: application/json" --data-binary "@-"
}
```

**Expected:** Requests 1–15 return `201`, request 16 returns `429`.

### 5.6 GET - Inbox leads (authenticated)

```powershell
curl.exe -s "http://localhost:5000/api/leads/mine?view=active&limit=5" `
    -H "Authorization: Bearer <JWT>"
```

**Expected:** `200 { "leads": [...], "nextCursor": "..." | null }`

### 5.7 GET - Unread count (authenticated)

```powershell
curl.exe -s "http://localhost:5000/api/leads/unread-count" `
    -H "Authorization: Bearer <JWT>"
```

**Expected:** `200 { "unreadCount": <number> }`

### 5.8 PATCH - Mark read

```powershell
curl.exe -s -X PATCH "http://localhost:5000/api/leads/<LEAD_ID>/read" `
    -H "Authorization: Bearer <JWT>"
```

**Expected:** `200 { "success": true }`

### 5.9 PATCH - Toggle flags (star + archive)

```powershell
# Star a lead:
@'
{ "isImportant": true }
'@ | curl.exe -s -X PATCH "http://localhost:5000/api/leads/<LEAD_ID>/flags" `
     -H "Authorization: Bearer <JWT>" `
     -H "Content-Type: application/json" --data-binary "@-"

# Move to trash:
@'
{ "deletedAt": true }
'@ | curl.exe -s -X PATCH "http://localhost:5000/api/leads/<LEAD_ID>/flags" `
     -H "Authorization: Bearer <JWT>" `
     -H "Content-Type: application/json" --data-binary "@-"

# Restore from trash:
@'
{ "deletedAt": null }
'@ | curl.exe -s -X PATCH "http://localhost:5000/api/leads/<LEAD_ID>/flags" `
     -H "Authorization: Bearer <JWT>" `
     -H "Content-Type: application/json" --data-binary "@-"
```

### 5.10 DELETE - Hard delete (trash only)

```powershell
# First move to trash (if not already):
@'
{ "deletedAt": true }
'@ | curl.exe -s -X PATCH "http://localhost:5000/api/leads/<LEAD_ID>/flags" `
     -H "Authorization: Bearer <JWT>" `
     -H "Content-Type: application/json" --data-binary "@-"

# Then hard-delete:
curl.exe -s -X DELETE "http://localhost:5000/api/leads/<LEAD_ID>" `
    -H "Authorization: Bearer <JWT>"
```

**Expected:** `200 { "success": true }`

---

## 6. Mongo Shell Diagnostics

### 6.1 List indexes

```js
db.leads.getIndexes();
```

### 6.2 Count by state

```js
// Total leads
db.leads.countDocuments({});

// Active (not archived, not deleted)
db.leads.countDocuments({ deletedAt: null, archivedAt: null });

// Unread (active only)
db.leads.countDocuments({ deletedAt: null, archivedAt: null, readAt: null });

// Archived
db.leads.countDocuments({ deletedAt: null, archivedAt: { $ne: null } });

// Trash
db.leads.countDocuments({ deletedAt: { $ne: null } });

// Important (active only)
db.leads.countDocuments({
    deletedAt: null,
    archivedAt: null,
    isImportant: true,
});
```

### 6.3 Find leads in trash (for TTL inspection)

```js
db.leads
    .find({ deletedAt: { $ne: null } }, { _id: 1, name: 1, deletedAt: 1 })
    .sort({ deletedAt: 1 })
    .limit(10);
```

### 6.4 Check oldest trashed lead (TTL candidate)

```js
db.leads.findOne(
    { deletedAt: { $ne: null } },
    { _id: 1, deletedAt: 1 },
    { sort: { deletedAt: 1 } },
);
```

If `deletedAt + 90 days < now`, it should be purged on the next TTL pass.

---

## 7. Troubleshooting

### 7.1 "Badge не уменьшается" / Badge doesn't decrease after reading

**Root cause (historical):** Before optimistic updates, the badge relied solely on polling (`GET /unread-count` every 60 s). If the user read a lead and the next poll hadn't fired yet, the badge appeared stale.

**Current fix:** `adjustUnreadCount(-1)` is called immediately when the user opens/reads a lead. The badge decreases instantly. The next poll (60 s) re-syncs from the server as a consistency check.

**If the badge still seems stuck:**

1. Check that `markLeadRead` API returns 200 (network tab).
2. Check that `adjustUnreadCount` is called (React DevTools → UnreadCountContext).
3. Check polling: is the tab visible? (`document.visibilityState === "visible"` gates the interval).
4. Server-side: verify the lead actually has `readAt` set (`db.leads.findOne({ _id: ObjectId("...") }, { readAt: 1 })`).

### 7.2 "Все лиды стали 'עסקי'" / All leads show "עסקי" (org) instead of "אישי" (personal)

**Root cause:** All cards have a non-null `orgId`. Personal cards point to the sentinel `PERSONAL_ORG` document (`slug: "personal"`). A naive `orgId != null → "org"` check gives wrong results.

**Fix in place:** The controller compares `String(card.orgId) === String(personalOrgId)` where `personalOrgId` is resolved once via `getPersonalOrgId()` (cached in memory).

**If it regresses:**

1. Verify `PERSONAL_ORG` exists: `db.organizations.findOne({ slug: "personal" })`.
2. Check that personal cards reference this org: `db.cards.findOne({ slug: "<personal-card-slug>" }, { orgId: 1 })`.
3. Compare the `orgId` value to the PERSONAL_ORG `_id`.
4. Clear the in-memory cache by restarting the backend process.

### 7.3 Leads not being purged by TTL

1. Verify TTL index exists: `db.leads.getIndexes()` - look for `{ deletedAt: 1 }` with `expireAfterSeconds: 7776000`.
2. If the index exists but `expireAfterSeconds` differs, drop and recreate it:
    ```js
    db.leads.dropIndex("deletedAt_1");
    db.leads.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 7776000 });
    ```
3. Check that `deletedAt` values are `Date` objects, not strings:
    ```js
    db.leads.findOne({ deletedAt: { $ne: null } }, { deletedAt: 1 });
    // deletedAt should be ISODate("..."), not a string
    ```
4. On Atlas free/shared tier, TTL runs less frequently - wait up to 10 minutes.

### 7.4 Rate limit too aggressive / too lenient

See [Section 4: Rate-Limit Tuning](#4-rate-limit-tuning) for constant locations and safe testing procedure.
