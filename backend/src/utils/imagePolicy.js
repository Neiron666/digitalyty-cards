/**
 * Image processing policy — Single Source of Truth.
 *
 * All upload endpoints (gallery, design assets, blog hero) share these caps,
 * thresholds, and per-kind profiles.  Nothing else in the codebase should
 * hard-code image size/quality constants.
 */

// ── Hard security caps (reject if exceeded) ────────────────────
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (multer cap)
export const MAX_PIXELS = 24_000_000; // 24 MP — sharp limitInputPixels
export const MAX_DIMENSION = 8000; // px, any single side

// ── Aggressive-mode triggers ───────────────────────────────────
export const AGGRESSIVE_THRESHOLD_BYTES = 1_500_000; // 1.5 MB
export const AGGRESSIVE_THRESHOLD_PIXELS = 8_000_000; // 8 MP

// ── Output budget ──────────────────────────────────────────────
export const MAX_OUTPUT_BYTES = 1_500_000; // hard ceiling we try to honour
export const TARGET_BYTES = 1_200_000; // quality-ladder stop threshold

// ── Quality ladder ─────────────────────────────────────────────
export const GENTLE_QUALITY = 90;
export const AGGRESSIVE_QUALITIES = [82, 78, 74];

// ── Per-kind processing profiles ───────────────────────────────
const PROFILES = {
    gallery: { maxLongSide: 2048, minLongSide: 1024 },
    blogHero: { maxLongSide: 2048, minLongSide: 1024 },
    background: { maxLongSide: 1920, minLongSide: 800 },
    avatar: { maxLongSide: 800, minLongSide: 400 },
    galleryThumb: { maxLongSide: 600, minLongSide: 400 },
};

const DEFAULT_PROFILE = { maxLongSide: 2048, minLongSide: 1024 };

/**
 * Returns the processing profile for a given upload kind.
 * @param {string} kind
 * @returns {{ maxLongSide: number, minLongSide: number }}
 */
export function resolveProfile(kind) {
    const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
    return PROFILES[k] || DEFAULT_PROFILE;
}
