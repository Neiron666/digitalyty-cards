/**
 * Phase 2C: Build-time enumeration of all published slugs for a content family
 * (blog or guides). Pure Node ESM, dependency-free, fail-open.
 *
 * Paginates the public list endpoint until total is reached or a hard page cap
 * is hit. Returns a unique, validated array of slug strings. Never throws.
 */

const HARD_PAGE_CAP = 50;

function isNonEmptyString(v) {
    return typeof v === "string" && v.length > 0;
}

async function fetchOnePage({
    origin,
    endpoint,
    page,
    limit,
    timeoutMs,
    logger,
    key,
}) {
    const url = `${origin}${endpoint}?page=${page}&limit=${encodeURIComponent(String(limit))}`;
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
                `[ssg] fetchAllSlugsForSsg(${key}): HTTP ${res.status} from ${url}`,
            );
            return { ok: false };
        }
        const data = await res.json();
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
            return { ok: false };
        }
        if (
            typeof data.page !== "number" ||
            typeof data.total !== "number" ||
            !Array.isArray(data.items)
        ) {
            return { ok: false };
        }
        return {
            ok: true,
            page: data.page,
            total: data.total,
            items: data.items,
        };
    } catch (err) {
        logger?.warn?.(
            `[ssg] fetchAllSlugsForSsg(${key}): error ${err?.name || ""} ${err?.message || err}`,
        );
        return { ok: false };
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchAllSlugsForSsg({
    key,
    endpoint,
    origin,
    limit = 50,
    timeoutMs = 8000,
    logger = console,
}) {
    if (!isNonEmptyString(key))
        return { ok: false, slugs: [], reason: "bad-key" };
    if (!isNonEmptyString(endpoint) || !endpoint.startsWith("/")) {
        return { ok: false, slugs: [], reason: "bad-endpoint" };
    }
    if (!isNonEmptyString(origin) || !/^https?:\/\//.test(origin)) {
        return { ok: false, slugs: [], reason: "bad-origin" };
    }

    const collected = new Set();
    let total = 0;
    let page = 1;

    while (page <= HARD_PAGE_CAP) {
        const r = await fetchOnePage({
            origin,
            endpoint,
            page,
            limit,
            timeoutMs,
            logger,
            key,
        });
        if (!r.ok) {
            return { ok: false, slugs: [], reason: "fetch-failed" };
        }
        total = r.total;
        for (const raw of r.items) {
            if (raw && typeof raw === "object" && !Array.isArray(raw)) {
                const slug = raw.slug;
                if (
                    isNonEmptyString(slug) &&
                    /^[a-z0-9][a-z0-9-]*$/i.test(slug)
                ) {
                    collected.add(slug);
                }
            }
        }
        if (collected.size >= total) break;
        if (r.items.length === 0) break;
        page += 1;
    }

    return { ok: true, slugs: [...collected], total };
}
