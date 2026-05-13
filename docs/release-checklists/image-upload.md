# Image Upload - Release Checklist

## Purpose & Scope

- **Max upload**: 10 MB (multer `memoryStorage`, SSoT in `imagePolicy.js → MAX_UPLOAD_BYTES`).
- **Server-side canonicalization**: all uploads pass through `processImage()` → always output **WebP**, EXIF stripped, auto-oriented.
- **Decode-based allowlist**: `sharp.metadata().format` must be `jpeg | png | webp`. Rejects everything else (SVG, TIFF, GIF, HEIC, etc.) regardless of `Content-Type` header.
- **Hard caps**: `MAX_DIMENSION = 8000 px` per side, `MAX_PIXELS = 24 MP`.
- **Output budget**: two encoding modes, chosen per-upload at runtime (SSoT: `backend/src/utils/imagePolicy.js` profiles + constants, `backend/src/utils/processImage.js` logic):
    - **(a) Gentle** – single encode at `profile.gentleQuality ?? GENTLE_QUALITY`. Triggers when `inBytes < 1.5 MB` **and** `inPixels < 8 MP` **and** `longSide ≤ maxLongSide`. Current per-profile gentleQuality values: `gallery = 83`; all other roles (background, avatar, gallerythumb, bloghero, blogsectionimage, guidehero, guidesectionimage) fall back to the global `GENTLE_QUALITY = 90`.
    - **(b) Aggressive** – quality ladder (82 → 78 → 74) + dimension step-down (15% per step, floor = `profile.minLongSide`), targets ≤ 1.5 MB best-effort. Triggers when any gentle threshold is exceeded.

## Expected Error Contracts

| Status  | Code                        | Trigger                                              |
| ------- | --------------------------- | ---------------------------------------------------- |
| **413** | _(multer)_                  | File exceeds 10 MB                                   |
| **422** | `IMAGE_DECODE_FAILED`       | Corrupt file, unsupported format, or MIME-type spoof |
| **422** | `IMAGE_DIMENSIONS_EXCEEDED` | Width or height > 8 000 px                           |

## Before Deploy

- **CI gates**: backend sanity scripts (`slug-policy`, `ownership-consistency`, `org-access`, `org-membership`, `card-index-drift`) + frontend gates (`check:inline-styles`, `check:skins`, `check:contract`, `build`) must pass.
- **Manual UI smoke**:
    1. Upload a 5–10 MB JPEG/PNG → image displays correctly; Supabase object has `content-type: image/webp`.
    2. Upload a file > 10 MB → rejected by UI pre-check **and** by backend (413).
    3. Upload a corrupt/spoofed file (e.g. `.jpg` with random bytes) → backend returns `422 IMAGE_DECODE_FAILED`.
    4. Upload a gallery image ~1 MB → backend log must show `mode='gentle'`, `quality=83` (not 90). Confirms per-profile `gentleQuality` is active for gallery.
    5. Upload a background image → backend log must show `quality=90` (no blast-radius from gallery change).
    6. Confirm gallerythumb crop produces a `~77 KB` WebP at 480×480.

## Quick QA Commands (PowerShell + curl.exe)

```powershell
# Variables - fill in before running
$base = "http://localhost:5000"
$jwt  = "<YOUR_JWT>"
$cardId = "<CARD_ID>"
$img  = "C:\path\to\test-image.jpg"

# 1. Health check
curl.exe -s -o NUL -w "%{http_code}" "$base/api/health"

# 2. Gallery upload (expect 200, stored as webp)
curl.exe -X POST "$base/api/uploads/image" `
  -H "Authorization: Bearer $jwt" `
  -F "cardId=$cardId" -F "image=@$img"

# 3. HEAD - verify content-type on returned URL
curl.exe -I "<RETURNED_URL>"

# 4. Oversize → 413
fsutil file createnew _tmp_oversize.bin 11000000
curl.exe -s -o NUL -w "%{http_code}" -X POST "$base/api/uploads/image" `
  -H "Authorization: Bearer $jwt" `
  -F "cardId=$cardId" -F "image=@_tmp_oversize.bin;type=image/jpeg"

# 5. Corrupt → 422 IMAGE_DECODE_FAILED
[System.IO.File]::WriteAllBytes("_tmp_corrupt.jpg", (1..1024 | ForEach-Object { Get-Random -Max 256 }))
curl.exe -s -w "`n%{http_code}" -X POST "$base/api/uploads/image" `
  -H "Authorization: Bearer $jwt" `
  -F "cardId=$cardId" -F "image=@_tmp_corrupt.jpg;type=image/jpeg"
```

## Known Endpoint Surfaces

| Flow          | Method | Path                                    | Auth                       |
| ------------- | ------ | --------------------------------------- | -------------------------- |
| Gallery image | `POST` | `/api/uploads/image`                    | Bearer JWT (or anon actor) |
| Design asset  | `POST` | `/api/uploads/asset`                    | Bearer JWT (or anon actor) |
| Blog hero     | `POST` | `/api/admin/blog/posts/:id/upload-hero` | Admin only                 |

> Source of truth: route files (`upload.routes.js`, `admin.routes.js`) + `app.js` mounts. Do not hardcode in clients.

## Rollback

- Revert backend changes: `imagePolicy.js`, `processImage.js`, controller `HttpError` pass-through in `upload.controller.js` + `adminBlog.controller.js`. **Do not restore multer limit to 2 MB — current production limit is 10 MB; reverting to 2 MB would break large legitimate uploads.**
- No DB migration involved - rollback is code-only.
