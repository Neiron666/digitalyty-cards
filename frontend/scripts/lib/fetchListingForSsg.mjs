/**
 * Phase 2B: Build-time public listing fetch helper for SSG.
 *
 * Pure Node ESM, dependency-free. Uses global fetch (Node 20+) only.
 * fail-open semantics: NEVER throws. On any error (network, timeout, HTTP non-2xx,
 * malformed JSON, invalid shape) returns { ok: false } and caller proceeds with
 * an empty data island (DEGRADED build).
 *
 * DTO whitelist enforced — only these 7 fields are forwarded to the data island:
 *   id, slug, title, excerpt, heroImageUrl, heroImageAlt, publishedAt
 * Everything else (sections, seo, author*, ogPath, updatedAt, internal fields)
 * is dropped before serialization.
 */

const ALLOWED_ITEM_FIELDS = [
    "id",
    "slug",
    "title",
    "excerpt",
    "heroImageUrl",
    "heroImageAlt",
    "publishedAt",
];

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
    // Minimum identity invariant: id and slug must both be present as strings.
    if (typeof out.id !== "string" && typeof out.id !== "number") return null;
    if (typeof out.slug !== "string" || out.slug.length === 0) return null;
    return out;
}

export async function fetchListingForSsg({
    key,
    endpoint,
    origin,
    page = 1,
    limit = 12,
    timeoutMs = 8000,
    logger = console,
}) {
    if (typeof key !== "string" || key.length === 0) {
        return { ok: false };
    }
    if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
        return { ok: false };
    }
    if (typeof origin !== "string" || !/^https?:\/\//.test(origin)) {
        return { ok: false };
    }

    const url = `${origin}${endpoint}?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`;
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
                `[ssg] fetchListingForSsg(${key}): HTTP ${res.status} from ${url}`,
            );
            return { ok: false };
        }

        const data = await res.json();
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
            logger?.warn?.(
                `[ssg] fetchListingForSsg(${key}): response is not a plain object`,
            );
            return { ok: false };
        }
        if (typeof data.page !== "number" || typeof data.total !== "number") {
            logger?.warn?.(
                `[ssg] fetchListingForSsg(${key}): response missing page/total numbers`,
            );
            return { ok: false };
        }
        if (!Array.isArray(data.items)) {
            logger?.warn?.(
                `[ssg] fetchListingForSsg(${key}): response.items is not an array`,
            );
            return { ok: false };
        }

        const items = [];
        for (const raw of data.items) {
            const picked = pickItemFields(raw);
            if (picked) items.push(picked);
        }

        return {
            ok: true,
            key,
            page: data.page,
            total: data.total,
            items,
        };
    } catch (err) {
        logger?.warn?.(
            `[ssg] fetchListingForSsg(${key}): error ${err?.name || ""} ${err?.message || err}`,
        );
        return { ok: false };
    } finally {
        clearTimeout(timer);
    }
}
