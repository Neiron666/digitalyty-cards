# Runbook: Image Upload Incident (Gallery / Design Assets)

> **Owner:** Frontend + Backend.  
> **Last updated:** 2026-03-01.

---

## 1. Purpose / Scope

This runbook covers diagnosis and remediation of **image upload failures** hitting the Cardigo editor - gallery originals, design assets (background/avatar), and gallery thumbnails.

### Symptoms covered

| Symptom                                          | Typical root cause                                      |
| ------------------------------------------------ | ------------------------------------------------------- |
| Mobile user sees "Upload failed" / generic error | Netlify proxy timeout or mobile slow network            |
| Netlify "Internal Error. ID: …" in response body | Netlify gateway failed before request reached Render    |
| Sporadic 500 on upload, works on retry           | Transient Netlify ↔ Render connectivity                 |
| 422 `IMAGE_DECODE_FAILED`                        | Corrupt/unsupported file or zero-byte buffer            |
| 502 on upload                                    | Supabase storage unavailable or bucket misconfiguration |

### Out of scope

- Admin blog hero upload (`POST /admin/blog/posts/:id/upload-hero`) - same pipeline, but admin-only; triage steps analogous.
- Non-image uploads.

---

## 2. Known Surfaces (SSoT)

| Endpoint                  | Controller           | What it does                                                                             |
| ------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/uploads/image` | `uploadGalleryImage` | Gallery original → processImage(kind:"gallery") → Supabase → Card.gallery push           |
| `POST /api/uploads/asset` | `uploadDesignAsset`  | Design asset (background, avatar, etc.) → processImage(kind) → Supabase → Card field set |

**Pipeline:** multer (memoryStorage, 10 MB cap) → `processImage` (sharp: WebP canonicalization, quality ladder, size-fit) → Supabase upload → DB update.

**Client-side pre-transport:** `prepareImageForUpload.js` downscales via canvas before sending through Netlify proxy (mirrors backend PROFILES).

**Source files:**

- Routes: `backend/src/routes/upload.routes.js`
- Controller: `backend/src/controllers/upload.controller.js`
- Pipeline: `backend/src/utils/processImage.js`
- Policy SSoT: `backend/src/utils/imagePolicy.js`
- Multer error handler: `backend/src/middlewares/multerError.middleware.js`
- Client downscale: `frontend/src/utils/prepareImageForUpload.js`
- Upload service: `frontend/src/services/upload.service.js`
- UI + debug box: `frontend/src/components/editor/panels/GalleryPanel.jsx`

---

## 3. Quick Triage Checklist (≤ 5 minutes)

### Step 1 - Netlify vs Render?

| Signal                                                                    | Means                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Response header `server: Netlify` + body contains "Internal Error. ID: …" | Request **never reached** Render backend             |
| Response header `x-nf-request-id` present, no `rndr-id`                   | Same - Netlify-level failure                         |
| Response header `rndr-id` or `x-render-origin-server` present             | Request **reached Render** - failure is backend-side |
| Backend log `[upload-debug] gallery-entry` / `design-entry` visible       | Confirms Render received the request                 |

### Step 2 - Error shape?

| HTTP status | Backend code                  | Interpretation                                                               |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------- |
| 422         | `IMAGE_DECODE_FAILED`         | Sharp could not decode the file - corrupt, unsupported format, or zero bytes |
| 400         | `GALLERY_LIMIT_REACHED`       | Tier-based gallery limit exceeded                                            |
| 400         | `MISSING_CARD_ID` / `NO_FILE` | Bad request payload                                                          |
| 413         | (multer) `LIMIT_FILE_SIZE`    | File exceeds 10 MB hard cap                                                  |
| 502         | Supabase error in logs        | Supabase storage service unavailable                                         |
| 500         | Unhandled                     | Check Render logs for stack trace                                            |

---

## 4. Debug Toggles (safe, temporary)

### Frontend - `?uploadDebug=1`

Add `?uploadDebug=1` to the editor URL (e.g. `https://cardigo.co.il/edit/<id>?uploadDebug=1`).

**Effects (zero-cost when disabled):**

- Yellow **Upload Debug** box appears at the bottom of the Gallery panel showing JSON entries.
- `prepareImageForUpload` logs `[prepare-image]` to console (canvas decode, downscale result, errors).
- `GalleryPanel` pushes structured debug entries: `file`, `thumb-url`, `upload-ok`, `upload-error`, `objurl-fail`.

No PII is logged. All guarded by `debugEnabled` / `isDebug()`.

### Backend - `CARDIGO_UPLOAD_DEBUG=1`

Set environment variable on Render:

```
CARDIGO_UPLOAD_DEBUG=1
```

**Effects:**

- `[upload-debug] gallery-entry` / `gallery-error` / `design-entry` / `design-error` - file meta, actor type, request ID.
- `[upload-debug] multer-error` - multer rejection details.

All guarded by `_uploadDebug` flag. No secrets/PII.

> **Rule:** After the incident is resolved, **remove or set to `0`** the env var on Render. Debug logging is for active triage only.

---

## 5. How to Capture Evidence

### 5a. What to collect

| Evidence           | How                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Upload Debug JSON  | Screenshot the yellow debug box in Gallery panel (with `?uploadDebug=1`)                     |
| Console lines      | DevTools → Console → filter `[prepare-image]` or `[gallery]`                                 |
| Network tab        | Request URL, Status, `x-nf-request-id`, `rndr-id`, `content-length` (request), response body |
| Render logs        | Filter by `[upload-debug]` and/or the `rndr-id` from the response                            |
| Sentry breadcrumbs | If Sentry is configured - link the issue ID                                                  |

### 5b. Example curl commands (Windows PowerShell)

> Replace `<TOKEN>` with a valid JWT. Never commit real tokens.

**Health check (verify Render is up):**

```powershell
curl.exe -s -o NUL -w "%{http_code}" https://cardigo-api.onrender.com/api/health
```

**Gallery upload (multipart, placeholder):**

```powershell
curl.exe -X POST "https://cardigo-api.onrender.com/api/uploads/image" `
  -H "Authorization: Bearer <TOKEN>" `
  -F "cardId=<CARD_ID>" `
  -F "image=@test.jpg;type=image/jpeg" `
  -D - 2>&1 | Select-String "HTTP|x-nf|rndr|content-length"
```

**Design asset upload:**

```powershell
curl.exe -X POST "https://cardigo-api.onrender.com/api/uploads/asset" `
  -H "Authorization: Bearer <TOKEN>" `
  -F "cardId=<CARD_ID>" `
  -F "kind=background" `
  -F "image=@bg.jpg;type=image/jpeg" `
  -D - 2>&1 | Select-String "HTTP|x-nf|rndr|content-length"
```

---

## 6. Root Cause Patterns

### 6a. Netlify proxy timeout / large multipart on slow mobile

**Cause:** Raw camera files (4–8 MB JPEG) sent through Netlify proxy; on slow mobile connections the proxy times out (typically 26 s default).

**Indicators:**

- `server: Netlify` in response, no `rndr-id`.
- Debug box shows `file` entry with large `origSize` but no `upload-ok` / `upload-error`.
- `[prepare-image]` console log may show downscale was skipped or returned original (fast-path).

**Resolution:** Verify client-side `prepareImageForUpload` is active and actually downscaling (check `[prepare-image] downscale result` in console). If file is already small, the proxy timeout may be a network issue - retry on better connection.

### 6b. Client-side file has empty type or no bytes

**Cause:** Some mobile browsers return `file.type === ""` or clipped files. `prepareImageForUpload` falls back gracefully (returns original), but backend multer may reject if MIME detection fails.

**Indicators:**

- Debug box `file` entry shows `type: ""` or `size: 0`.
- Backend returns 400 or multer error.

### 6c. Backend decode fail → 422 IMAGE_DECODE_FAILED

**Cause:** `processImage` sharp pipeline cannot decode the buffer - file is corrupt, truncated, or an unsupported format (e.g. HEIC without libheif).

**Indicators:**

- HTTP 422, `code: "IMAGE_DECODE_FAILED"`.
- Render logs `[upload-debug] gallery-error` with error details (if debug enabled).

**Resolution:** User should try a different image. If recurrent for valid JPEGs, check sharp/libvips version on Render.

### 6d. Supabase upload failure → 502

**Cause:** Supabase storage service returned an error (bucket doesn't exist, auth key expired, service outage).

**Indicators:**

- HTTP 502 or 500 with Supabase mentions in Render logs.
- `[upload-debug]` design-error / gallery-error shows Supabase error.

**Resolution:** Check Supabase dashboard for bucket status + service health. Verify `SUPABASE_URL` / `SUPABASE_KEY` env vars on Render.

---

## 7. Remediation Playbook

| Scenario                              | Action                                                                                                                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Netlify proxy timeout**             | 1. Verify `prepareImageForUpload` downscale is active (console log). 2. Confirm request `Content-Length` is reduced. 3. Retry on better network. 4. If persistent, consider increasing Netlify timeout (proxy config). |
| **Backend 422 IMAGE_DECODE_FAILED**   | File is corrupt/unsupported. Guide user to re-export or use a different image format (JPEG/PNG/WebP).                                                                                                                  |
| **Backend 502 (Supabase)**            | Check Supabase status page. Verify bucket env vars. Retry. If persistent, open Supabase support ticket.                                                                                                                |
| **Backend 413 LIMIT_FILE_SIZE**       | File exceeds 10 MB multer cap. Client-side downscale should prevent this - verify `prepareImageForUpload` ran.                                                                                                         |
| **Backend 400 GALLERY_LIMIT_REACHED** | Tier limit. User must upgrade plan or remove existing gallery images.                                                                                                                                                  |

---

## 8. Post-Incident Cleanup

- [ ] **Remove** `CARDIGO_UPLOAD_DEBUG` env var on Render (or set to `0` / blank).
- [ ] **Keep** `?uploadDebug=1` mechanism in code - it is zero-cost when not activated.
- [ ] Remove any temporary curl test scripts or logs from local machine.
- [ ] If a code fix was deployed, update this runbook with the new root cause entry.

---

## 9. DoD / Verification Checklist

- [ ] **No console spam in production** without `?uploadDebug=1` - verified by `npm run check:inline-styles` and manual console inspection.
- [ ] **With debug enabled**, can capture enough evidence in < 5 minutes (debug box + console + network tab).
- [ ] **README link updated** - this runbook is listed in the root `README.md` Engineering Policies section.
- [ ] **Backend README link updated** - this runbook is listed in the `backend/README.md` Runbooks section.
