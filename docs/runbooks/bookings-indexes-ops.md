# Runbook: Bookings - Index Governance & Retention

> **Owner:** Backend / DevOps.
>
> **⚠ Security:** Never paste real secrets, tokens, or credentials into documentation.

---

## 1. Manual Indexes

> **autoIndex is OFF** (project index governance). Indexes must be created manually in production.

### 1.1 Required indexes

Run these commands in `mongosh` connected to the production database:

```js
// #1 - Slot lock (blocking only): one booking per card + slotKey while status in (pending, approved)
db.bookings.createIndex(
    { card: 1, slotKey: 1 },
    {
        name: "uniq_booking_blocking_slot",
        unique: true,
        partialFilterExpression: { status: { $in: ["pending", "approved"] } },
    },
);

// #2 - Same-person lock (blocking only): one booking per card + personKey while status in (pending, approved)
db.bookings.createIndex(
    { card: 1, personKey: 1 },
    {
        name: "uniq_booking_blocking_person",
        unique: true,
        partialFilterExpression: { status: { $in: ["pending", "approved"] } },
    },
);

// #3 - Owner list view
db.bookings.createIndex(
    { card: 1, startAt: 1, _id: 1 },
    { name: "idx_booking_card_startAt" },
);

// #4 - Pending slot-end reconciler scan
db.bookings.createIndex(
    { status: 1, endAt: 1, _id: 1 },
    { name: "idx_booking_pending_endAt" },
);

// #5 - TTL purge (history deletion): delete docs when purgeAt < now
// expireAfterSeconds: 0 means expire at the time in the field.
db.bookings.createIndex(
    { purgeAt: 1 },
    { name: "idx_booking_purgeAt_ttl", expireAfterSeconds: 0 },
);
```

### 1.2 Verify indexes exist

```js
db.bookings.getIndexes().forEach((idx) => {
    printjson({
        name: idx.name,
        key: idx.key,
        unique: !!idx.unique,
        partialFilterExpression: idx.partialFilterExpression || null,
        expireAfterSeconds: idx.expireAfterSeconds || null,
    });
});
```

---

## 2. Retention vs Expiry (critical distinction)

- `endAt`: slot end time - the runtime lifecycle clock. Pending bookings auto-expire when `endAt ≤ now`. Bookings are not deleted at expiry.
- `expiresAt`: legacy-compatible field, now set equal to `endAt` at creation time. No longer independently controls lifecycle decisions.
- `purgeAt`: history deletion. Documents are removed by TTL after `purgeAt`.

---

## 3. Source of truth

- Model + schema-level index declarations: `backend/src/models/Booking.model.js`.
