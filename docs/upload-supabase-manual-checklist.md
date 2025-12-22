# Manual Integration Checklist — Supabase Upload Chain

This is a minimal manual checklist to validate the upload chain locally (no route changes required).

## Prereqs

-   Backend `.env` contains valid:
    -   `SUPABASE_URL`
    -   `SUPABASE_SERVICE_ROLE_KEY` (server-only)
    -   `SUPABASE_STORAGE_BUCKET`
-   Supabase bucket is **PUBLIC**.
-   Run apps:
    -   Backend: `cd backend` → `npm install` → `npm run dev` (or your start script)
    -   Frontend: `cd frontend` → `npm install` → `npm run dev`

## 1) Gallery upload

1. Login and open the card editor.
2. Go to Gallery panel and upload a JPG/PNG/WebP under 2MB.
3. Verify UI shows the new thumbnail.
4. Save/persist the card (whatever your editor uses) and refresh the page.
5. Verify gallery still renders after refresh.

Expected:

-   Card JSON in Mongo has `gallery[]` containing either:
    -   a legacy string URL (older cards), or
    -   an object `{ url, path, createdAt }` for newly uploaded items.
-   Backend response for upload returns `{ url, path, total, limit }`.

## 2) Background upload

1. In Design editor, upload a background image.
2. Refresh page and confirm background persists.

Expected:

-   Frontend sends `kind=background` to `POST /api/uploads/asset`.
-   Backend stores path hints in `card.design.backgroundImagePath` (and `coverImagePath`).

## 3) Avatar upload

1. In Design editor, upload an avatar.
2. Refresh page and confirm avatar persists.

Expected:

-   Frontend sends `kind=avatar` to `POST /api/uploads/asset`.
-   Backend stores path hints in `card.design.avatarImagePath` (and `logoPath`).

## 4) Replace cleanup (best-effort)

Background:

1. Upload a background image.
2. Upload a different background image.
3. In Supabase Storage dashboard, confirm the **previous** background object was removed (best-effort).

Avatar:

1. Upload an avatar image.
2. Upload a different avatar image.
3. In Supabase Storage dashboard, confirm the **previous** avatar object was removed (best-effort).

Notes:

-   Cleanup only works when the previous upload already stored a `design.*Path` field.
-   Failures should not block upload; check backend logs for `[supabase] replace cleanup failed`.

## 5) Delete card cleanup

1. Upload at least one gallery image and one avatar/background.
2. Delete the card.
3. In Supabase Storage dashboard, confirm the folder `cards/user/<userId>/<cardId>/...` objects were removed.

Expected:

-   Backend deletes Supabase objects by collecting paths from:
    -   `gallery[]` object entries
    -   `uploads[]`
    -   `design.*Path` fields
