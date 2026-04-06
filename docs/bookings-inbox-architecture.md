# Bookings & Owner Inbox - Architecture & Specification (SSoT)

> **Owner:** Full-stack (Backend + Frontend).  
> **Last updated:** 2026-04-03.  
> **Related docs:** [Ops Runbook → docs/runbooks/bookings-indexes-ops.md](runbooks/bookings-indexes-ops.md)

---

## 1. Overview

Cardigo provides a public **booking request** flow on card pages and an **owner inbox** in the dashboard for managing those requests.

### Bounded scope

The booking system is currently a **request-based scheduling surface** - not a full calendar or appointment engine. A public visitor submits a time-slot request; the card owner reviews it and decides to approve or cancel. A pending request auto-expires only after the requested slot's end time passes without owner action. There is no reschedule, no recurring booking, and no calendar sync at this time.

### High-level flow

```
Visitor views availability → selects slot → submits booking request
  ↓
Booking created (status: pending, blocks slot until owner action or slot end)
  ↓
Owner opens Inbox → reviews request → approve / cancel
  ↓
If owner does not act by slot end time → system auto-expires the pending request
  ↓
Record retained ≈7 days after requested slot ends → TTL auto-purge
```

### Feature gating

Booking is available only on cards with an active paid entitlement (`canUseBooking`) and where the card owner has enabled `bookingSettings.enabled`. Both gates are enforced server-side on every public and owner endpoint.

---

## 2. Data Model

**Collection:** `bookings`  
**Source:** `backend/src/models/Booking.model.js`  
**autoIndex:** OFF (project index governance - manual migration only).

### 2.1 Key schema fields

| Field                                                                 | Type                | Notes                                                        |
| --------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| `card`                                                                | ObjectId (ref Card) | FK to the card that owns the booking                         |
| `startAt` / `endAt`                                                   | Date                | UTC boundaries of the requested slot                         |
| `dateKeyIl`                                                           | String              | Israel-local date `YYYY-MM-DD` (derived, for grouping)       |
| `localStartHHmm`                                                      | String              | Israel-local start time `HH:mm` (derived)                    |
| `tz`                                                                  | String              | Timezone identifier                                          |
| `status`                                                              | String (enum)       | `pending` · `approved` · `canceled` · `expired`              |
| `expiresAt`                                                           | Date                | Legacy-compatible; set equal to `endAt` at creation (see §4) |
| `purgeAt`                                                             | Date                | TTL deletion timestamp (see §4)                              |
| `customerName`                                                        | String              | Visitor name (required, max 100)                             |
| `customerPhoneRaw`                                                    | String              | Visitor phone as entered                                     |
| `customerPhoneNormalized`                                             | String              | Normalized phone for dedup                                   |
| `personKey`                                                           | String              | Deterministic hash for per-person uniqueness index           |
| `slotKey`                                                             | String              | UTC-based slot key for per-slot uniqueness index             |
| `consentAccepted`                                                     | Boolean             | Consent evidence                                             |
| `consentAcceptedAt` / `consentTermsVersion` / `consentPrivacyVersion` | -                   | Consent audit fields                                         |
| `publicIpHash`                                                        | String              | Best-effort IP hash (anti-abuse, not identity)               |

### 2.2 Indexes

Five governed indexes. autoIndex is OFF; indexes are created manually in production.

For the canonical `createIndex` commands and verification procedure, see [bookings-indexes-ops.md](runbooks/bookings-indexes-ops.md#1-manual-indexes).

**Summary:**

| #   | Name                           | Purpose                                                                          |
| --- | ------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `uniq_booking_blocking_slot`   | Slot lock - one blocking booking per card + slot (partial: pending/approved)     |
| 2   | `uniq_booking_blocking_person` | Person lock - one blocking booking per card + person (partial: pending/approved) |
| 3   | `idx_booking_card_startAt`     | Owner list view ordering                                                         |
| 4   | `idx_booking_pending_endAt`    | Pending slot-end reconciler scan                                                 |
| 5   | `idx_booking_purgeAt_ttl`      | TTL auto-purge (expireAfterSeconds: 0)                                           |

---

## 3. Booking Lifecycle / Status Truth

### 3.1 Statuses

| Status     | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `pending`  | Visitor submitted; awaiting owner action. Holds slot and person locks. |
| `approved` | Owner confirmed the booking. Slot and person remain locked.            |
| `canceled` | Owner (or system) canceled. Slot and person locks released.            |
| `expired`  | Requested slot end time passed without owner action. Locks released.   |

### 3.2 Blocking semantics

- **Blocking statuses:** `pending`, `approved` - these hold the unique slot lock and person lock via partial-filter unique indexes.
- **Non-blocking:** `canceled`, `expired` - these do not hold any locks; the slot becomes available for new requests.

### 3.3 Valid transitions

| From       | To         | Trigger                                                         |
| ---------- | ---------- | --------------------------------------------------------------- |
| `pending`  | `approved` | Owner approves                                                  |
| `pending`  | `canceled` | Owner cancels                                                   |
| `pending`  | `expired`  | Slot end time reached (`endAt ≤ now`) - automatic or reconciler |
| `approved` | `canceled` | Owner cancels                                                   |

No other transitions are permitted. There is no transition back to `pending` and no hard-delete action; records remain until TTL purge.

### 3.4 Slot freeing

Canceling a booking (pending or approved) transitions it to `canceled`, which releases the partial-filter unique locks. The slot immediately becomes bookable by other visitors. The record itself is not deleted - it remains for owner visibility until `purgeAt` triggers TTL cleanup.

---

## 4. Retention & Cleanup

### 4.1 Two independent timers

| Timer           | Field     | Purpose                                                                                                                         |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Slot-end expiry | `endAt`   | Pending requests auto-expire when the requested slot end time passes without owner action. This is the runtime lifecycle clock. |
| History purge   | `purgeAt` | Controls when the document is physically deleted by MongoDB TTL. Set relative to `endAt` (the end of the requested slot).       |

**Legacy field - `expiresAt`:** Still written at creation time (set equal to `endAt`) for backward compatibility. It no longer independently controls lifecycle decisions; all expiry logic uses `endAt` directly.

These are independent concerns:

- `endAt` governs **status transition** (pending → expired). The document is not deleted.
- `purgeAt` governs **physical deletion**. Records are kept approximately 7 days after the requested meeting end time, then auto-deleted by TTL index.

### 4.2 Cleanup strategy

- No manual hard-delete action is exposed to the owner.
- Countdown to purge starts from the end of the requested slot (`endAt`), not from creation or status change.
- Cleanup is fully automatic via MongoDB TTL index (`idx_booking_purgeAt_ttl`).
- This is the current default strategy. There is no owner-facing archive or manual cleanup surface at this time.

### 4.3 Pending expiry reconciliation

Stale pending bookings (whose requested slot has ended) are expired in two ways:

1. **Targeted pre-expire on public create path:** Before inserting a new booking, the system expires any pending bookings on the same card whose slot has ended (`endAt ≤ now`) and overlap the incoming slot or person key. This is the primary anti-drift guarantee.
2. **Reconciler endpoint:** `POST /api/bookings/reconcile/expired` (auth required) - batch-expires all pending bookings whose slot has ended (`endAt ≤ now`). This is a secondary safety valve, not the primary mechanism.

---

## 5. API Contracts

Base path: `/api/bookings` (mounted via `backend/src/routes/booking.routes.js`).

### 5.1 Public endpoints (unauthenticated)

| Method | Path                     | Purpose                                                                                                                            |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/availability?cardId=…` | Returns per-day slot availability for 1–14 days. Slots marked available/unavailable based on blocking bookings and business hours. |
| `POST` | `/`                      | Submit a booking **request**. Creates a `pending` booking - this is not a confirmed appointment. Returns `{ success, bookingId }`. |

**Rate limits (public):**

- IP-level: 20 requests / 15 min
- IP:cardId composite: 8 requests / 15 min

**Anti-abuse:** Honeypot field support - if triggered, returns fake 201 success with no DB write.

**Conflict handling:**

- `409 SLOT_TAKEN` - slot already has a blocking booking
- `409 PERSON_REPEAT_BLOCKED` - visitor already has an active booking on this card

### 5.2 Owner endpoints (authenticated)

| Method | Path                     | Purpose                                                                                                                                             |
| ------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/mine?cardId=…&limit=…` | List bookings across owned cards (or filtered to one card). Max 50 per request. Inline-expires stale pending (slot ended) before returning results. |
| `POST` | `/:id/approve`           | Approve a pending booking. Only valid from `pending` status.                                                                                        |
| `POST` | `/:id/cancel`            | Cancel a pending or approved booking. Frees the slot.                                                                                               |

**Auth:** JWT via `requireAuth` middleware. Owner identity verified via `assertCardOwner`.  
**Rate limit (owner):** 120 requests / 15 min per IP:userId.

### 5.3 Internal endpoint

| Method | Path                 | Purpose                                                                     |
| ------ | -------------------- | --------------------------------------------------------------------------- |
| `POST` | `/reconcile/expired` | Batch-expire stale pending bookings. Auth required. Secondary safety valve. |

### 5.4 DTO shape (listMyBookings)

The owner list endpoint returns enriched booking objects with card metadata:

- `cardMeta.cardLabel` - business name or slug
- `cardMeta.cardKind` - `"personal"` or `"org"` (uses the PERSONAL_ORG sentinel pattern)
- `phone` - alias for `customerPhoneRaw`
- Status, timing, and customer fields as stored

---

## 6. Owner Inbox IA

### 6.1 Three-category model

The owner inbox presents bookings under three tabs:

| Tab             | Hebrew label   | Contents                                                                            |
| --------------- | -------------- | ----------------------------------------------------------------------------------- |
| Requests        | בקשות תיאום    | Bookings with status `pending`, `canceled`, or `expired`                            |
| Future meetings | פגישות עתידיות | Bookings with status `approved` where `endAt > now`                                 |
| Leads           | פניות          | Lead form submissions (separate workstream, see `docs/leads-inbox-architecture.md`) |

### 6.2 No-duplication rule

A booking appears in exactly one tab at any given time. The filter logic is mutually exclusive:

- **בקשות תיאום:** `status ∈ {pending, canceled, expired}` - all non-approved bookings regardless of timing.
- **פגישות עתידיות:** `status === approved AND endAt > now` - only confirmed future meetings.
- **Approved past meetings** (`status === approved AND endAt ≤ now`) do not appear in either tab. There is no dedicated history or completed-meetings tab at this time; these records exist in the database until TTL purge but are not surfaced in the current UI.

### 6.3 Single data source

Both tabs consume the same `GET /api/bookings/mine` response. Client-side filtering separates the single payload into the two booking views. There is no separate API call per tab.

---

## 7. Owner Status Presentation

### 7.1 Hebrew status labels

| Status     | Label   |
| ---------- | ------- |
| `pending`  | ממתין   |
| `approved` | מאושר   |
| `canceled` | בוטל    |
| `expired`  | פג תוקף |

### 7.2 Color chip system

Each booking row displays a status chip with a distinct color identity:

| Status     | Color intent     | CSS class       |
| ---------- | ---------------- | --------------- |
| `pending`  | Calm gold accent | `badgePending`  |
| `approved` | Green            | `badgeApproved` |
| `canceled` | Red (danger)     | `badgeCanceled` |
| `expired`  | Muted gray       | `badgeExpired`  |

### 7.3 Timing information shown to owner

- **Request creation time** - when the visitor submitted the request (`createdAt`)
- **Requested meeting date/time** - the slot the visitor selected (`dateKeyIl`, `localStartHHmm`)

### 7.4 Retention disclosure

When viewing booking-related tabs, a brief retention note is displayed informing the owner that records are kept approximately 7 days after the requested meeting end and are then automatically deleted.

---

## 8. Owner Actions / CRUD Foundation

### 8.1 Current lifecycle-safe actions

| Action  | From status             | Effect                                                                             |
| ------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Approve | `pending`               | Transitions to `approved`. Slot and person locks remain held.                      |
| Cancel  | `pending` or `approved` | Transitions to `canceled`. Releases slot and person locks. Slot becomes available. |

### 8.2 Why no hard delete

Hard delete is not the current strategy. Rationale:

- Deleting a record while its slot is blocking would silently free a lock without proper status transition - this could create inconsistencies in the uniqueness indexes.
- The lifecycle model (status transitions + TTL purge) provides a clean, auditable path: cancel frees the slot explicitly, and TTL handles history cleanup automatically.
- Owner does not need to manually manage record lifecycle; the system handles it.

### 8.3 Cancel as the safe cleanup primitive

Cancel is the owner's primary tool for managing unwanted bookings. It:

- Transitions status to `canceled` (non-blocking)
- Frees the slot for new requests
- Preserves the record for audit/visibility until automatic purge

### 8.4 Deferred CRUD surfaces

Archive/hide, manual delete, and broader cleanup actions are not implemented. See §9.

---

## 9. Deferred / Not Yet Built

The following are recognized product directions but are **not implemented** and must not be described as current functionality:

- **Badge / nav SVG parity for bookings** - the sidebar/nav does not yet have a booking-specific unread badge comparable to the leads unread count badge.
- **Archive / hide owner cleanup surface** - no owner-facing archive or hide action for booking records.
- **Completed / history meetings tab** - approved past meetings (endAt ≤ now) are not surfaced in a dedicated tab; they age out via TTL.
- **Broader CRUD expansion** - edit, reschedule, or advanced booking management actions.
- **Reschedule / advanced scheduling** - no reschedule flow, recurring bookings, or calendar integration.
- **Hard delete strategy** - not the current default; lifecycle transitions + TTL is the accepted pattern.

---

## 10. Related Docs

| Document                                                                  | Scope                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [docs/runbooks/bookings-indexes-ops.md](runbooks/bookings-indexes-ops.md) | Booking index governance, manual index creation commands, retention vs. expiry distinction |
| [docs/leads-inbox-architecture.md](leads-inbox-architecture.md)           | Leads & Inbox architecture (separate workstream sharing the same Inbox page)               |
