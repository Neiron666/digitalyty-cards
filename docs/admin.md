# Admin Cabinet

## Temporary API gate

For the current temporary API gate (password → cookie) and how to safely open the API later, see [SECURITY_TEMP_API_GATE.md](security/SECURITY_TEMP_API_GATE.md).

## Security model

- Admin UI is a normal browser page at `/admin`.
- Access is controlled server-side by RBAC:
    - JWT must be present (`Authorization: Bearer <token>`).
    - The server loads the user from MongoDB and requires `user.role === 'admin'`.
- Anti-enumeration (enterprise):
    - UI: if not platform-admin, `/admin` must render the same NotFound as any unknown route.
    - API: `/api/admin/*` must return uniform `404` on all deny paths (no `401/403`), with `Cache-Control: no-store`.
    - UX: do not mount the Admin app or trigger admin API calls unless `me.role === 'admin'`.
- There is no “secret admin link” security; the backend check is the source of truth.
- Admin write actions are whitelisted (no generic admin patch).
- Every admin write requires a `reason` and is recorded in the admin audit log.

## Post-mortem: Admin anti-enumeration hardening (Feb 2026)

What happened:

- `/admin` was discoverable for non-admin users via distinguishable UI (“login required/access denied”).
- `/api/admin/*` returned distinguishable status codes/messages (`401/403`) for non-admin vs unauth.

Why it matters:

- Enterprise requirement: non-admin/unauth traffic must not learn that an admin surface exists.

Remediation:

- Frontend: route-level gate renders NotFound and prevents mounting the Admin page unless `me.role === 'admin'`.
- Backend: admin middleware returns uniform `404` (and `no-store`) for all deny paths.

Verification:

- Unauth user: `/admin` renders NotFound; `/api/admin/*` returns 404.
- Auth non-admin: same as unauth (UI NotFound + API 404).
- Admin: `/admin` loads normally and admin API works.

## Promote a user to admin

You must set the user role in MongoDB.

Example (mongosh):

```js
// By email
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });

// Or by _id
db.users.updateOne({ _id: ObjectId("...") }, { $set: { role: "admin" } });
```

Then login in the UI again to get a fresh token (role is always checked from DB on each admin call).

## Admin API

All routes are under `/api/admin` and require admin RBAC.

## Site analytics retention

Marketing Site Analytics daily aggregates (`SiteAnalyticsDaily`) are stored with a TTL index.

- Env: `SITE_ANALYTICS_RETENTION_DAYS`
- Default: 365
- Minimum enforced: 120 (to keep the 90-day admin range safe)

### Read

- `GET /api/admin/stats`
- `GET /api/admin/users?page=1&limit=25&q=email-fragment`
- `GET /api/admin/cards?page=1&limit=25&q=slug-fragment&owner=user|anonymous&status=draft|published`
- `GET /api/admin/users/:id`
- `GET /api/admin/cards/:id`

### Safe writes (audited)

All of these require JSON body with `reason`.

- Deactivate card:
    - `POST /api/admin/cards/:id/deactivate`
    - Body: `{ "reason": "..." }`
- Reactivate card:
    - `POST /api/admin/cards/:id/reactivate`
    - Body: `{ "reason": "..." }`
- Set trial (Israel calendar rules):
    - `POST /api/admin/cards/:id/trial/extend`
    - Body (days mode, 0..14): `{ "days": 7, "reason": "..." }`
        - `days=0` expires immediately.
        - `days>0` ends at **Israel end-of-day (23:59)** of the target Israel date.
    - Body (exact mode):
      `{ "untilLocal": { "date": "YYYY-MM-DD", "hour": 13, "minute": 5 }, "reason": "..." }`
        - `date/hour/minute` are interpreted in `Asia/Jerusalem`.
        - `minute` must be in 5-minute steps: `0,5,10,...,55`.
    - ⚠️ **Blocked for org-owned cards** — returns `409 ORG_CARD_BILLING_MANAGED_BY_ORG`.
      Org-owned card premium is managed via org annual entitlement (see **Organization Annual Entitlement** section below).
- Override plan until a future date (max +365 days):
    - `POST /api/admin/cards/:id/plan/override`
    - Body: `{ "plan": "monthly", "until": "2026-01-01T00:00:00.000Z", "reason": "..." }`

## Feature tier overrides (admin-only)

This project has two separate “truths”:

- **Billing truth** (`effectiveBilling`): drives edit/write access and payment state.
    - Controlled by real billing, trial, and `adminOverride`.
    - **Do not** treat tiers as paid.
- **Feature tier truth** (`effectiveTier`): drives feature entitlements (analytics level/retention, lead form, gallery limit, etc).
    - Controlled by admin-only tier overrides and a billing-derived fallback.

### Precedence

Feature tier resolution order:

1. `card.adminTier` (if set and not expired)
2. `user.adminTier` (if set and not expired)
3. Derived from `effectiveBilling.plan` (`free → free`, `monthly → basic`, `yearly → premium`)
4. Default `free`

### API

All of these require JSON body with `reason`.

- Set/clear card tier:
    - `POST /api/admin/cards/:id/tier`
    - Body (set): `{ "tier": "premium", "until": "2026-01-01T00:00:00.000Z", "reason": "..." }`
    - Body (clear): `{ "tier": null, "reason": "..." }`
    - Notes:
        - `until` is normalized to **end-of-day UTC**.
        - `until` is optional; omit or pass empty string for “no expiry”.

- Set/clear user tier:
    - `POST /api/admin/users/:id/tier`
    - Body (set): `{ "tier": "basic", "until": "2026-01-01T00:00:00.000Z", "reason": "..." }`
    - Body (clear): `{ "tier": null, "reason": "..." }`
    - Notes:
        - `until` is normalized to **end-of-day UTC**.
        - User tier acts as a default for their card(s), but card tier wins.

## Admin audit log

Admin write actions are stored in the `AdminAudit` collection.

- Each record includes: admin user id, action, target type/id, reason, and before/after meta.
- This is intended for accountability and incident review.

## Manual test checklist

1. Login with a normal user and open `/admin` → should show NotFound (looks like a normal 404).
2. Promote that user to `role=admin` in MongoDB.
3. Login again and open `/admin` → should load stats + lists.
4. Select a card and try:
    - Deactivate / reactivate (requires reason)
    - Set trial with invalid days (-1 or 999) → should get a validation error
    - Set trial exact to tomorrow **13:05 Israel** → API returns `trialEndsAtIsrael` with `YYYY-MM-DD 13:05`
    - Set trial days=1 → should end at Israel **23:59** (displayed in `trialEndsAtIsrael`)
    - Set trial days=0 → should expire immediately and editor should lock (if gated by trial)
    - Override plan with invalid plan → should get a validation error
    - Set **card tier** to `basic/premium` with a reason and until date
    - Set **user tier** for the owner user with a reason and until date
    - Verify `effectiveBilling` stays unchanged, but `effectiveTier` and entitlements update
5. Verify audit records were created in MongoDB for each write action.

Note: This change set is trial-only and does not modify analytics day bucketing.

---

## Organization Annual Entitlement

Platform admin can grant, extend, or revoke annual premium access for an organization. All org-owned cards under an active entitlement receive premium automatically.

This is **not** a personal billing operation. No Tranzila, STO, YeshInvoice, PaymentTransaction, Receipt, or `User.subscription` mutation is involved.

For the full operator runbook (flows, error codes, troubleshooting):
→ `docs/runbooks/org-annual-entitlement-admin-grant.md`

### Endpoints

- `GET /api/admin/orgs/:id` — returns org detail including `entitlement` subdocument.

- `POST /api/admin/orgs/:id/entitlement/grant`
    - Body: `{ "expiresAt": "<ISO 8601>", "reason": "<5–500 chars>", "confirmOrgAnnualGrant": true, "paymentReference": "<optional, max 120>", "adminNote": "<optional, max 500>" }`
    - Blocks if entitlement already active: `409 ENTITLEMENT_ALREADY_ACTIVE`.

- `POST /api/admin/orgs/:id/entitlement/extend`
    - Body: `{ "newExpiresAt": "<ISO 8601>", "reason": "<5–500 chars>", "paymentReference": "<optional>", "adminNote": "<optional>" }`
    - `newExpiresAt` must be after current `expiresAt`.
    - Blocks if no active entitlement: `409 NOT_ACTIVE`.

- `POST /api/admin/orgs/:id/entitlement/revoke`
    - Body: `{ "reason": "<5–500 chars>" }`
    - Blocks if no entitlement: `409 NO_ENTITLEMENT`.

### Key error codes

| Code                         | Meaning                                      |
| ---------------------------- | -------------------------------------------- |
| `ENTITLEMENT_ALREADY_ACTIVE` | Use Extend instead of Grant                  |
| `NOT_ACTIVE`                 | No active entitlement to extend; Grant first |
| `NO_ENTITLEMENT`             | Nothing to revoke                            |
| `INACTIVE_ORG`               | Org is not active                            |
| `CONFIRM_REQUIRED`           | `confirmOrgAnnualGrant: true` required       |
| `INVALID_REASON`             | 5–500 chars required                         |
| `INVALID_EXPIRES_AT`         | Must be a valid future ISO date              |
| `INVALID_DATE_RANGE`         | Extend date must be after current expiry     |
| `INVALID_PAYMENT_REFERENCE`  | Max 120 chars                                |
| `INVALID_ADMIN_NOTE`         | Max 500 chars                                |

### `ORG_CARD_BILLING_MANAGED_BY_ORG` guard

The following legacy card billing/trial operations are **blocked** for org-owned cards (`409 ORG_CARD_BILLING_MANAGED_BY_ORG`):

- `POST /api/admin/cards/:id/trial/extend`
- `adminSetCardBilling` (direct card billing admin override)
- `adminSyncCardBillingFromUser`
- `adminRevokeCardBilling` (via adminSetCardBilling delegation)

`adminOverride` remains an explicit platform-admin escape hatch and is reviewed separately; it is not the org annual entitlement grant mechanism.

### AdminAudit actions

| Operation | Action                   |
| --------- | ------------------------ |
| Grant     | `ORG_ENTITLEMENT_GRANT`  |
| Extend    | `ORG_ENTITLEMENT_EXTEND` |
| Revoke    | `ORG_ENTITLEMENT_REVOKE` |
