# Cardigo Enterprise Handoff — 2026-06-27

## Owner Email Notifications: Leads & Bookings

**Date:** 2026-06-27
**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Production smoke:** PASS — both lead and booking notification emails confirmed in production.

---

## 1. Contours Closed

1. `OWNER_EMAIL_NOTIFICATIONS_LEADS_P2B_CONTROLLER_WIRING`
2. `OWNER_EMAIL_NOTIFICATIONS_BOOKING_P2C_CONTROLLER_WIRING`

---

## 2. Executive Summary

Card owners now receive best-effort transactional Mailjet emails when a new public lead or booking request is successfully created on their card. Both notifications fire after the relevant DB write succeeds, are fully fire-and-forget (public response is independent of email result), and contain no customer phone, email address, message body, or internal identifiers.

Lead notifications were manually smoked in production first; booking notifications were added in a follow-up wiring phase and also production-smoked.

---

## 3. Production Behavior

### 3.1 Lead notification (פנייה)

- **Trigger:** After successful `Lead.create` in `createLead` (`lead.controller.js`).
- **Recipient:** The card owner resolved via `card.user → User.findById(card.user).select("email firstName isVerified")`. Skipped if `card.user` is null, owner document not found, `owner.email` missing, or `owner.isVerified !== true`.
- **Subject:** `"קיבלת פנייה חדשה מ-{visitorName} ב-Cardigo"` or generic fallback.
- **Body contains:** ownerFirstName (greeting), visitorName, cardLabel, CTA button.
- **Body does NOT contain:** customer phone, customer email, customer message body, lead.\_id, card.\_id, IP, personKey.
- **CTA:** פתח את תיבת הפניות → `{getSiteUrl()}/inbox`.
- **Response independence:** `res.status(201)` executes unconditionally. Email failure cannot delay or fail lead creation.

### 3.2 Booking notification (בקשת תיאום)

- **Trigger:** After successful `Booking.create` (status `"pending"`) in `createPublicBooking` (`booking.controller.js`). Does NOT fire on approve, cancel, expire, reconcile, or availability checks.
- **Recipient:** Same resolution pattern as leads — `card.user → User.findById`. Skipped if `card.user` is null/missing or owner not verified.
- **Subject:** `"בקשת תיאום חדשה מ-{customerName}"` or generic fallback.
- **Body contains:** ownerFirstName (greeting), customerName, dateKeyIl (Israel-local date), localStartHHmm (Israel-local time), cardLabel, CTA button.
- **Body does NOT contain:** customerPhoneRaw, customerPhoneNormalized, personKey, publicIpHash, slotKey, consentAcceptedAt, consentVersions, booking.\_id, IP.
- **CTA:** פתח את תיבת הפניות → `{getSiteUrl()}/inbox`.
- **Response independence:** `res.status(201)` executes unconditionally. Email failure cannot delay or fail booking creation.

### 3.3 Shared behavior (both notifications)

- **Best-effort:** Mailjet HTTP failure → `{ok: false}` + safe log. Never throws. Never blocks the public response.
- **Fire-and-forget:** Notification chain is not awaited. Promise `.catch()` is attached to prevent unhandled rejection.
- **Verified owner only:** `owner.isVerified !== true` → notification skipped silently.
- **No org-admin fanout:** Only the card's direct owner (`card.user`) is notified. No fanout to org admins in this phase.
- **Trusted inboxUrl:** Built server-side from `getSiteUrl()` (reads `SITE_URL` / `PUBLIC_ORIGIN` / `PUBLIC_URL` env; never from request body, query, or headers).
- **Transactional email:** No `List-Unsubscribe` header. These are operational notifications, not marketing.

---

## 4. Architecture

### 4.1 Sender foundation

**File:** `backend/src/services/mailjet.service.js`

| Export                                          | Purpose                                       |
| ----------------------------------------------- | --------------------------------------------- |
| `sendLeadNotificationEmailMailjetBestEffort`    | Lead owner transactional email (line 1312)    |
| `sendBookingNotificationEmailMailjetBestEffort` | Booking owner transactional email (line 1499) |

Both senders share:

- `normalizeSafeInboxUrl` — accepts only `http/https`, rejects `javascript:`, `data:`, `mailto:`, malformed, empty, non-string. Returns normalized `href` or `null`.
- `safeDisplayText(value, maxLen)` — strips control chars, collapses whitespace, trims, bounds to `maxLen`.
- Input validation before `cfg.enabled` check — `INVALID_INPUT` returned regardless of Mailjet config state.
- Hebrew RTL HTML + plaintext email bodies (`lang="he" dir="rtl"`).
- `escapeHtml` applied to all dynamic values in HTMLPart.
- 10-second timeout on Mailjet HTTP call.

### 4.2 Lead wiring

**File:** `backend/src/controllers/lead.controller.js`

- New imports (lines 14–15): `sendLeadNotificationEmailMailjetBestEffort`, `getSiteUrl`.
- Notification block: after `Lead.create` (lines 113–119), before `res.status(201)` (lines 157–160). Lines ~121–155.
- `User` was already imported (line 4).
- Error log includes only: `leadId`, `cardId`, `ownerId`, `error.message`. No PII.

### 4.3 Booking wiring

**File:** `backend/src/controllers/booking.controller.js`

- New imports (lines 23–24): `sendBookingNotificationEmailMailjetBestEffort`, `getSiteUrl`.
- Notification block: after `Booking.create` (lines 471–496), before `res.status(201)` (line 533). Lines 498–531.
- `User` and `Card` were already imported (lines 13, 2).
- Error log includes only: `bookingId`, `cardId`, `ownerId`, `error.message`. No PII.

### 4.4 Trusted URL helper

**File:** `backend/src/utils/siteUrl.util.js` (line 7)

`getSiteUrl()` reads `process.env.SITE_URL || PUBLIC_ORIGIN || PUBLIC_URL`, strips trailing slash, fallback `"https://cardigo.co.il"`. Never reads `req`, `req.body`, `req.query`, or `req.headers`.

---

## 5. Security / Privacy Decisions

| Decision                                                       | Rationale                                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| No customer phone in any notification email                    | Phone is PII; owner sees it in /inbox directly                                               |
| No customer email in lead notification                         | Owner sees it in /inbox                                                                      |
| No customer message body in lead notification                  | Body can be long and sensitive; owner reads it in /inbox                                     |
| No personKey / publicIpHash / slotKey in booking notification  | Internal dedup/anti-abuse keys; not useful to owner                                          |
| No consentAcceptedAt / consentVersions in booking notification | Internal evidence fields; not owner-facing                                                   |
| Error logs contain only internal ObjectId keys + error.message | Prevents PII leakage in server logs                                                          |
| No owner.email in error logs                                   | Prevents email address exposure in log aggregators                                           |
| Transactional category, no List-Unsubscribe                    | These are operational events directly related to owner's paid service; not bulk or marketing |
| Verified owner gate                                            | Prevents notifications to unconfirmed email addresses                                        |
| inboxUrl built server-side only                                | Prevents open-redirect via crafted booking/lead payload                                      |

---

## 6. Verification Summary

| Phase                                                          | Scope                                                                 | Verdict                                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Phase 3A                                                       | Mailjet sender foundation (URL safety, display text, disabled config) | PASS — 19/19 URL safety tests passed                                                      |
| Phase 3B                                                       | Lead controller wiring                                                | PASS — scope containment, response independence, PII, gates all verified                  |
| Lead manual smoke                                              | Production                                                            | PASS — Hebrew email received, CTA opens /inbox, no phone in body                          |
| Phase 3C                                                       | Booking controller wiring                                             | PASS — scope containment, response independence, PII, gates all verified                  |
| Booking manual smoke                                           | Production                                                            | PASS — Hebrew email received, date/time/name in body, CTA opens /inbox, no phone          |
| Frontend gates                                                 | check:inline-styles, check:skins, check:contract, build               | All EXIT:0                                                                                |
| backend sanity:imports                                         | importedCount:20 failedCount:0                                        | EXIT:0                                                                                    |
| backend sanity:ownership-consistency / sanity:card-index-drift | Atlas IP whitelist blocked during verification runs                   | EXPECTED ENV BLOCK — not a code regression; no model/schema/index changes in this feature |

---

## 7. Deferred Contours

The following notification types are **not implemented** and must not be described as current functionality.

### 7.1 Click / action notifications

- **Phone click email notification:** DEFERRED
- **WhatsApp click email notification:** DEFERRED
- **Google Maps / Waze navigation click email notification:** DEFERRED

**Reason:** Click actions are noisy interaction metrics, not guaranteed leads. Immediate per-click emails require significant safeguards not yet in place.

**Required prerequisites before implementation:**

- `NotificationLog` or durable throttle/dedupe store
- Bot suppression (crawler and automated click suppression)
- Owner/self-click suppression (already tracked in analytics exclusion key, but notification path needs separate gate)
- Opt-in notification preference in owner settings UI
- Per-action rate limits / hourly/daily caps
- Preferably digest delivery model (batch per period) rather than immediate per-click email

**Current recommendation:** Keep immediate transactional emails only for definitive customer-intent events (lead submission, booking request). Keep click actions in the analytics / future optional digest contour.

---

## 8. Optional Future Phases

| Phase                               | Description                                       | Prerequisites                                       |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Notification preferences UI         | Owner toggle per-notification type                | Settings schema, frontend settings panel            |
| Click action digest / notifications | Aggregate click notifications (batched, opt-in)   | NotificationLog, dedupe, bot suppression, opt-in UI |
| Org admin fanout                    | Notify org admins on bookings/leads for org cards | Org notification policy audit, member role policy   |
| Durable NotificationLog             | Track delivery attempts for idempotency / retry   | DB schema, migration, TTL policy                    |

---

## 9. Files Changed

| File                                            | Change                                                                                                                                                                                         | Role              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `backend/src/services/mailjet.service.js`       | Added `sendLeadNotificationEmailMailjetBestEffort` (line 1312) and `sendBookingNotificationEmailMailjetBestEffort` (line 1499) plus private helpers `normalizeSafeInboxUrl`, `safeDisplayText` | Sender foundation |
| `backend/src/controllers/lead.controller.js`    | Added 2 imports (lines 14–15) + fire-and-forget notification block (~lines 121–155)                                                                                                            | Lead wiring       |
| `backend/src/controllers/booking.controller.js` | Added 2 imports (lines 23–24) + fire-and-forget notification block (lines 498–531)                                                                                                             | Booking wiring    |

No model, route, frontend, migration, env, or schema files were modified.

---

## 10. Manual Smoke Notes (Owner-Observed)

**Lead email:**

- Hebrew transactional notification received at owner email.
- Body includes visitor name and card name.
- CTA "פתח את תיבת הפניות" opens `/inbox`.
- No customer phone, email address, or message body in email.

**Booking email:**

- Hebrew transactional notification received at owner email.
- Body includes customer name, requested date, requested time, card name.
- CTA "פתח את תיבת הפניות" opens `https://cardigo.co.il/inbox`.
- No customer phone number in email.
- Lead notifications still arrive correctly (no regression).
- Phone/WhatsApp/navigation clicks do not trigger any email (deferred behavior confirmed).
