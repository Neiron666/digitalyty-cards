/**
 * Phase 2C: Build-time cards showcase fetch helper for SSG.
 *
 * Pure Node ESM, dependency-free. Uses global fetch (Node 20+) only.
 * fail-open semantics: NEVER throws. On any error (network, timeout, HTTP non-2xx,
 * malformed JSON, invalid shape) returns { ok: false } and caller proceeds with
 * an empty data island (fallback to SHOWCASE_CARDS constant).
 *
 * No slug requirement — items are identified by MongoDB ObjectId (id).
 *
 * DTO whitelist enforced — only these 9 fields are forwarded to the data island:
 *   id, imageUrl, imageAlt, title, description, ctaLabel, ctaUrl, ctaTargetBlank, sortOrder
 * Everything else is dropped before serialization.
 *
 * Render-required fields (items missing any of these are dropped):
 *   imageUrl, imageAlt, title, description, ctaUrl  (all must be non-empty strings)
 *
 * Defense-in-depth:
 *   imageUrl — must start with https://  (Supabase storage always returns https)
 *   ctaUrl   — must match /card/{slug} or /c/{orgSlug}/{slug} exactly;
 *              rejects all external/protocol/query/fragment forms
 */

const ALLOWED_ITEM_FIELDS = [
    "id",
    "imageUrl",
    "imageAlt",
    "title",
    "description",
    "ctaLabel",
    "ctaUrl",
    "ctaTargetBlank",
    "sortOrder",
];

/**
 * Accept only HTTPS image URLs.
 * Supabase public storage always returns https:// URLs.
 * Rejects: data:, javascript:, blob:, file:, vbscript:, http://, relative paths.
 */
function isSafeImageUrl(url) {
    if (typeof url !== "string" || !url) return false;
    return /^https:\/\/./.test(url);
}

/**
 * Accept only the two canonical showcase ctaUrl forms:
 *   /card/{slug}          — personal card
 *   /c/{orgSlug}/{slug}   — org card
 *
 * slug and orgSlug must match [a-z0-9][a-z0-9-]* (lowercase, start with alphanumeric).
 * No query strings, fragments, encoded sequences, or extra path segments allowed.
 */
const CARD_URL_RE = /^\/card\/[a-z0-9][a-z0-9-]*$/;
const ORG_CARD_URL_RE = /^\/c\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

function isSafeCtaUrl(url) {
    if (typeof url !== "string" || !url) return false;
    // Reject anything containing query string or fragment before regex test.
    if (url.includes("?") || url.includes("#") || url.includes("%")) {
        return false;
    }
    return CARD_URL_RE.test(url) || ORG_CARD_URL_RE.test(url);
}

function pickItemFields(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const out = {};
    for (const k of ALLOWED_ITEM_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(raw, k)) {
            out[k] = raw[k];
        }
    }
    // Minimum identity invariant: id must be present.
    if (typeof out.id !== "string" && typeof out.id !== "number") return null;
    // imageUrl: non-empty string, https:// only.
    if (!isSafeImageUrl(out.imageUrl)) return null;
    // Text fields must be non-empty strings.
    if (typeof out.imageAlt !== "string" || !out.imageAlt) return null;
    if (typeof out.title !== "string" || !out.title) return null;
    if (typeof out.description !== "string" || !out.description) return null;
    // ctaUrl: non-empty, must match allowed path patterns only.
    if (!isSafeCtaUrl(out.ctaUrl)) return null;
    return out;
}

export async function fetchCardsShowcaseForSsg({
    key,
    endpoint,
    origin,
    timeoutMs = 8000,
    logger = console,
}) {
    const FAIL = { ok: false, key, page: 1, total: 0, items: [] };

    if (typeof key !== "string" || key.length === 0) {
        return FAIL;
    }
    if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
        return FAIL;
    }
    if (typeof origin !== "string" || !/^https?:\/\//.test(origin)) {
        return FAIL;
    }

    const url = `${origin}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "User-Agent": "cardigo-ssg/1.0",
            },
            signal: controller.signal,
        });

        if (!res.ok) {
            logger?.warn?.(
                `[ssg] fetchCardsShowcaseForSsg(${key}): HTTP ${res.status} from ${url}`,
            );
            return FAIL;
        }

        const data = await res.json();
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
            logger?.warn?.(
                `[ssg] fetchCardsShowcaseForSsg(${key}): response is not a plain object`,
            );
            return FAIL;
        }
        if (typeof data.page !== "number" || typeof data.total !== "number") {
            logger?.warn?.(
                `[ssg] fetchCardsShowcaseForSsg(${key}): response missing page/total numbers`,
            );
            return FAIL;
        }
        if (!Array.isArray(data.items)) {
            logger?.warn?.(
                `[ssg] fetchCardsShowcaseForSsg(${key}): response.items is not an array`,
            );
            return FAIL;
        }

        const items = [];
        for (const raw of data.items) {
            const picked = pickItemFields(raw);
            if (picked) items.push(picked);
        }

        return {
            ok: true,
            key,
            page: 1,
            total: items.length,
            items,
        };
    } catch (err) {
        logger?.warn?.(
            `[ssg] fetchCardsShowcaseForSsg(${key}): error ${err?.name || ""} ${err?.message || err}`,
        );
        return FAIL;
    } finally {
        clearTimeout(timer);
    }
}
