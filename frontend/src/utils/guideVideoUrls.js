/**
 * guideVideoUrls.js
 *
 * Pure URL validation helpers for the editor guide dropdown.
 * No React imports. No side effects.
 *
 * Accepted embed URL shapes:
 *   https://www.youtube.com/embed/<videoId>[?<safeParams>]
 *   https://www.youtube-nocookie.com/embed/<videoId>[?<safeParams>]
 *
 * All other shapes (watch, youtu.be, http, arbitrary hosts, extra path
 * segments, missing/invalid video ID, unknown query params) are rejected.
 */

const ALLOWED_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);

// Allowed query param names and their value validators.
// Each validator returns true if the value is acceptable.
const ALLOWED_PARAMS = {
    rel: (v) => v === "0" || v === "1",
    modestbranding: (v) => v === "0" || v === "1",
    playsinline: (v) => v === "0" || v === "1",
    start: (v) => /^\d+$/.test(v),
    end: (v) => /^\d+$/.test(v),
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

/**
 * Validates a YouTube embed URL and returns the canonical URL string, or null.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function validateYouTubeEmbedUrl(raw) {
    if (!raw || typeof raw !== "string") return null;

    let url;
    try {
        url = new URL(raw);
    } catch {
        return null;
    }

    // Must be https.
    if (url.protocol !== "https:") return null;

    // Must be an allowed hostname (exact match, www required).
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;

    // Path must be exactly /embed/<videoId> — split("/"").filter(Boolean)
    // gives ["embed", "<videoId>"] for a valid path.
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    if (parts[0] !== "embed") return null;

    const videoId = parts[1];
    if (!VIDEO_ID_RE.test(videoId)) return null;

    // Validate every query param against the strict allowlist.
    for (const [key, value] of url.searchParams) {
        const validator = ALLOWED_PARAMS[key];
        if (!validator) return null; // unknown param — reject
        if (!validator(value)) return null; // invalid value — reject
    }

    return url.toString();
}

/**
 * Reads VITE_GUIDE_URL_MOBILE and VITE_GUIDE_URL_DESKTOP from the provided
 * env-like object (pass `import.meta.env`), validates both, and returns an
 * object with the validated canonical URLs or null for each.
 *
 * Call this once at module level outside your component:
 *   const GUIDE_URLS = getGuideVideoUrls(import.meta.env);
 *
 * @param {{ VITE_GUIDE_URL_MOBILE?: string; VITE_GUIDE_URL_DESKTOP?: string }} envLike
 * @returns {{ mobile: string | null; desktop: string | null }}
 */
export function getGuideVideoUrls(envLike) {
    return {
        mobile: validateYouTubeEmbedUrl(envLike?.VITE_GUIDE_URL_MOBILE),
        desktop: validateYouTubeEmbedUrl(envLike?.VITE_GUIDE_URL_DESKTOP),
    };
}

/**
 * Given a validated YouTube embed URL (output of validateYouTubeEmbedUrl),
 * returns a safe https://www.youtube.com/watch?v=<videoId> URL.
 *
 * - Reuses validateYouTubeEmbedUrl for defense-in-depth.
 * - Extracts videoId from /embed/<videoId> path only.
 * - Does NOT forward query params.
 * - Output host is hardcoded to www.youtube.com (never youtu.be, nocookie, etc).
 * - Returns null for any invalid input.
 *
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function getYouTubeWatchUrlFromEmbedUrl(raw) {
    const canonical = validateYouTubeEmbedUrl(raw);
    if (!canonical) return null;
    const parts = new URL(canonical).pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "embed") return null;
    const videoId = parts[1];
    return "https://www.youtube.com/watch?v=" + videoId;
}
