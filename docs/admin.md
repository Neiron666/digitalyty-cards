# Admin Cabinet

## Security model

- Admin UI is a normal browser page at `/admin`.
- Access is controlled server-side by RBAC:
  - JWT must be present (`Authorization: Bearer <token>`).
  - The server loads the user from MongoDB and requires `user.role === 'admin'`.
- There is no “secret admin link” security; the backend check is the source of truth.
- Admin write actions are whitelisted (no generic admin patch).
- Every admin write requires a `reason` and is recorded in the admin audit log.

## Promote a user to admin

You must set the user role in MongoDB.

Example (mongosh):

```js
// By email
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)

// Or by _id
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { role: "admin" } }
)
```

Then login in the UI again to get a fresh token (role is always checked from DB on each admin call).

## Admin API

All routes are under `/api/admin` and require admin RBAC.

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
- Extend trial (1..14 days):
  - `POST /api/admin/cards/:id/trial/extend`
  - Body: `{ "days": 7, "reason": "..." }`
- Override plan until a future date (max +365 days):
  - `POST /api/admin/cards/:id/plan/override`
  - Body: `{ "plan": "monthly", "until": "2026-01-01T00:00:00.000Z", "reason": "..." }`

## Admin audit log

Admin write actions are stored in the `AdminAudit` collection.

- Each record includes: admin user id, action, target type/id, reason, and before/after meta.
- This is intended for accountability and incident review.

## Manual test checklist

1. Login with a normal user and open `/admin` → should show “Access denied”.
2. Promote that user to `role=admin` in MongoDB.
3. Login again and open `/admin` → should load stats + lists.
4. Select a card and try:
   - Deactivate / reactivate (requires reason)
   - Extend trial with invalid days (0 or 999) → should get a validation error
   - Override plan with invalid plan → should get a validation error
5. Verify audit records were created in MongoDB for each write action.
