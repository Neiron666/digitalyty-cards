# Cardigo Enterprise Handoff — Gallery Upload Optimization

**Date:** 2026-05-14
**Status:** CLOSED / PASS / PRODUCTION VERIFIED
**Contours closed:** IMAGE_UPLOAD_GALLERY_THUMB_BUDGET_P1A, IMAGE_UPLOAD_GALLERY_FULL_PER_PROFILE_QUALITY_P1B
**Files changed (code):** 4 (2 backend, 2 frontend)
**Files changed (docs):** 3 updated + this handoff

---

## Section 1: What Was Done

### Contour 1 — IMAGE_UPLOAD_GALLERY_THUMB_BUDGET_P1A

**Problem:** Gallery thumbnail crops were being generated at 600×600 pixels. The crop UI used 600×600 canvas output and the backend gallerythumb profile had `maxLongSide: 600`. This produced unnecessary oversize thumbnails for a gallery grid that displays at display sizes well below 600px on most screens.

**Fix:** Reduced gallerythumb to 480×480 on both the client (crop canvas output) and the server (imagePolicy.js profile).

**Result:** gallerythumb WebP outputs are now ~77 KB for a typical 480×480 crop, down from ~120 KB at 600×600. All new uploads and re-crops use 480×480. Existing stored gallerythumb images are unchanged (Supabase objects are immutable UUID paths).

### Contour 2 — IMAGE_UPLOAD_GALLERY_FULL_PER_PROFILE_QUALITY_P1B

**Problem:** Gallery full images entering the `processImage` gentle path (inputs under 1.5 MB / 8 MP threshold) were encoded at `GENTLE_QUALITY = 90`. For inputs that arrived as already-compressed JPEG, this caused the WebP output to _expand_ relative to the input — the production example showed 880 KB JPEG → 928 KB WebP (+5.3%). The expansion happened because re-encoding compressed JPEG artifacts at q90 faithfully preserved quantization noise at higher fidelity than the original JPEG tables used.

**Fix:** Added `gentleQuality: 83` to the `gallery` profile in `imagePolicy.js`. Updated `processImage.js` gentle path to resolve quality as `profile.gentleQuality ?? GENTLE_QUALITY` for **both** the assignment variable and the `.webp()` Sharp encoder call (both changed atomically to prevent log-shows-83 / encoder-runs-90 drift).

**Result:** Production smoke showed 880 KB JPEG → 699 KB WebP at quality 83 (reduction: 20.7%). Dimensions unchanged (1536×2048 → 1536×2048). All non-gallery roles continue at `GENTLE_QUALITY = 90`.

---

## Section 2: Backend Files Changed

### `backend/src/utils/imagePolicy.js`

- `gallery` profile: `{ maxLongSide: 2048, minLongSide: 1024, gentleQuality: 83 }` — added `gentleQuality: 83`
- `gallerythumb` profile: `{ maxLongSide: 480, minLongSide: 320 }` — changed from `600/400` to `480/320`
- `GENTLE_QUALITY = 90` — unchanged
- `AGGRESSIVE_QUALITIES = [82, 78, 74]` — unchanged
- All other profiles (background, avatar, bloghero, blogsectionimage, guidehero, guidesectionimage) — unchanged, no `gentleQuality` field

### `backend/src/utils/processImage.js`

- Gentle path quality assignment: `chosenQuality = profile.gentleQuality ?? GENTLE_QUALITY` — was `chosenQuality = GENTLE_QUALITY`
- Gentle path encoder call: `.webp({ quality: chosenQuality })` — was `.webp({ quality: GENTLE_QUALITY })` (both changed atomically)
- Aggressive path (quality ladder + dimension step-down): unchanged
- Output MIME (`image/webp`): unchanged
- EXIF stripping (`.rotate()`): unchanged

---

## Section 3: Frontend Files Changed

### `frontend/src/utils/prepareImageForUpload.js`

- `gallerythumb` client profile: `{ maxLongSide: 480, targetBytes: 120_000, qualityStart: 0.9 }` — changed `maxLongSide` from 600 to 480
- All other client profiles (gallery, background, avatar): unchanged

### `frontend/src/components/editor/panels/GalleryPanel.jsx`

- `CropModal` crop canvas output: `outputWidth: 480, outputHeight: 480` — changed from 600/600
- All other GalleryPanel logic: unchanged

---

## Section 4: Production Smoke Results

No secrets, no real user IDs, no signed URLs included. Values are from backend structured `[image-processing]` log entries.

**gallerythumb (Contour 1):**

```
kind='gallerythumb'
inBytes=88521
outBytes=77676
inWxH='480x480'
outWxH='480x480'
mode='gentle'
quality=90
```

**gallery full — BEFORE fix (Contour 2 baseline):**

```
kind='gallery'
inBytes=880774
outBytes=927922
inWxH='1536x2048'
outWxH='1536x2048'
mode='gentle'
quality=90
delta=+47148 bytes (+5.3%)
Supabase visible size: 906.17 KB
```

**gallery full — AFTER fix (Contour 2):**

```
kind='gallery'
inBytes=880774
outBytes=699012
inWxH='1536x2048'
outWxH='1536x2048'
mode='gentle'
quality=83
delta=-181762 bytes (-20.7%)
Supabase visible size: 682.63 KB
```

**gallerythumb — unaffected by Contour 2:**

```
kind='gallerythumb'
quality=90 (profile.gentleQuality not set → GENTLE_QUALITY=90)
480x480
~77KB
```

**Visual check:** Gallery grid loaded thumbs from `/gallerythumb/` paths. Lightbox opened full `/gallery/` image. Visual quality PASS on desktop and mobile. No 404 or CORS errors.

---

## Section 5: What Did NOT Change

- `GENTLE_QUALITY` global constant remains 90
- `gallery` maxLongSide remains 2048, minLongSide remains 1024
- Aggressive mode (quality ladder 82→78→74 + dimension step-down): unchanged
- All non-gallery upload roles (background, avatar, gallerythumb, bloghero, blogsectionimage, guidehero, guidesectionimage): `gentleQuality` not set → fall back to `GENTLE_QUALITY = 90`; behavior unchanged
- Existing Supabase images: immutable UUID paths; not re-encoded, not moved, not deleted
- Render chain: `GallerySection.jsx`, `CardLayout`, `CardRenderer`, `TemplateRenderer`: unchanged
- Upload controller, upload routes, upload service: unchanged
- DTO serialization (`cardDTO.js`): unchanged
- `Card.model.js` gallery schema (Mixed type): unchanged
- `sanitizeWritablePatch` in `card.controller.js`: unchanged (already preserved `thumbUrl`/`thumbPath`)
- No new API endpoints created
- No DB migration required

---

## Section 6: Anti-Overclaim Block

These two contours do **NOT** claim or imply:

- Re-encoding of existing Supabase images (Supabase objects are immutable; no retroactive transformation occurred)
- A universal ~25% size reduction for all gallery images (reduction is input-dependent; q83 vs q90 savings vary by image content)
- A fix for the desktop retina/srcset problem (no responsive variant system was implemented)
- Any optimization of blog hero, guide hero, or section images (blog/guide profiles were not changed)
- Any change to background or avatar upload quality
- Cache-control or CDN header changes
- A srcset or responsive image variant system

Future bounded contours to consider separately if needed:

- background/avatar per-profile `gentleQuality` tuning
- blog/guide per-profile quality tuning
- CDN cache-control and immutability headers
- Responsive image variants (srcset, retina 2×)

---

## Section 7: Verification Gates Passed

All static verification gates run post-Phase-2 implementation:

**Backend:**

- `sanity:imports`: `{"ok":true,"importedCount":20,"failedCount":0,"failures":[]}` — EXIT 0

**Frontend (all run from `frontend/`):**

- `check:inline-styles`: PASS (no inline styles in scoped files) — EXIT 0
- `check:skins`: PASS (28 files scanned, token-only) — EXIT 0
- `check:contract`: PASS (25 templates, consistent) — EXIT 0
- `build`: 370 modules transformed, built in 2.99s — EXIT 0

**Public route smoke:**

- `curl.exe https://cardigo.co.il/c/digitalyty/digital-card` → HTTP 200 — EXIT 0

**Static atomic drift guards:**

- `processImage.js` gentle path: `chosenQuality = profile.gentleQuality ?? GENTLE_QUALITY` — CONFIRMED line 102
- `processImage.js` encoder: `.webp({ quality: chosenQuality })` — CONFIRMED line 111
- Hard negative grep `.webp({ quality: GENTLE_QUALITY })`: 0 matches — CONFIRMED

---

## Section 8: Production Smoke — COMPLETE

Production smoke was completed after deploy and confirmed the live runtime behavior.

Confirmed:

- Full gallery gentle path uses quality=83.
- Full gallery dimensions stayed unchanged at 1536×2048 for the representative image.
- Full gallery output decreased from 927922 bytes to 699012 bytes for the representative image.
- Supabase visible size decreased from 906.17 KB to 682.63 KB for the representative image.
- Gallery thumbnail remained isolated at 480×480 and quality=90.
- Visual lightbox check passed.
- Existing gallery images continued to render normally.

This section supersedes the earlier pre-smoke operator checklist. No operator/manual upload smoke is pending for these closed contours.

---

## Section 9: Docs Updated

- `docs/upload-supabase-contract.md`: fixed stale 2 MB limit; added gallerythumb storage path; extended gallery Mongo schema to include `thumbUrl?`/`thumbPath?`; added Section 3 (Upload gallery thumbnail crop); updated frontend usage and rendering sections.
- `docs/release-checklists/image-upload.md`: expanded output budget to document both gentle and aggressive modes; added manual smoke steps 4–6; fixed rollback text (do not regress multer to 2 MB).
- `docs/upload-supabase-manual-checklist.md`: fixed stale "under 2MB" → "under 10MB".
