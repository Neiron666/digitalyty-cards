/**
 * Phase 2C: Build-time single-detail DTO fetch for SSG (blog post or guide).
 * Pure Node ESM, dependency-free, fail-open. Never throws.
 *
 * Whitelist enforced — only the 15 public detail fields are forwarded into the
 * data island, and `sections` is itself filtered to { heading, body, imageUrl,
 * imageAlt } per element. Drops every other field. 200 JSON = success, 404 =
 * ok:false skipped. previousSlugs / internal fields are never included.
 */

const ALLOWED_FIELDS = [
    "id",
    "slug",
    "title",
    "excerpt",
    "heroImageUrl",
    "heroImageAlt",
    "sections",
    "seo",
    "publishedAt",
    "updatedAt",
    "ogPath",
    "authorName",
    "authorImageUrl",
    "authorImageAlt",
    "authorBio",
];

const ALLOWED_SECTION_FIELDS = ["heading", "body", "imageUrl", "imageAlt"];

const ALLOWED_SEO_FIELDS = ["title", "description"];

function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pickSection(raw) {
    if (!isPlainObject(raw)) return null;
    const out = {};
    for (const k of ALLOWED_SECTION_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(raw, k)) {
            const v = raw[k];
            if (typeof v === "string") out[k] = v;
        }
    }
    return out;
}

function pickSeo(raw) {
    if (!isPlainObject(raw)) return undefined;
    const out = {};
    for (const k of ALLOWED_SEO_FIELDS) {
        if (typeof raw[k] === "string") out[k] = raw[k];
    }
    return out;
}

function pickDetail(raw) {
    if (!isPlainObject(raw)) return null;
    const out = {};
    for (const k of ALLOWED_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
        const v = raw[k];
        if (k === "sections") {
            out.sections = Array.isArray(v)
                ? v.map(pickSection).filter(Boolean)
                : [];
            continue;
        }
        if (k === "seo") {
            const seo = pickSeo(v);
            if (seo) out.seo = seo;
            continue;
        }
        if (typeof v === "string" || typeof v === "number") {
            out[k] = v;
        }
    }
    if (typeof out.slug !== "string" || out.slug.length === 0) return null;
    if (typeof out.title !== "string") return null;
    return out;
}

export async function fetchDetailForSsg({
    key,
    slug,
    origin,
    timeoutMs = 8000,
    logger = console,
}) {
    if (key !== "blog" && key !== "guides") return { ok: false };
    if (typeof slug !== "string" || slug.length === 0) return { ok: false };
    if (typeof origin !== "string" || !/^https?:\/\//.test(origin)) {
        return { ok: false };
    }

    const endpoint = key === "blog" ? "/api/blog" : "/api/guides";
    const url = `${origin}${endpoint}/${encodeURIComponent(slug)}`;
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
        if (res.status === 404) {
            return { ok: false, status: 404 };
        }
        if (!res.ok) {
            logger?.warn?.(
                `[ssg] fetchDetailForSsg(${key}/${slug}): HTTP ${res.status}`,
            );
            return { ok: false, status: res.status };
        }
        const data = await res.json();
        const picked = pickDetail(data);
        if (!picked) {
            logger?.warn?.(
                `[ssg] fetchDetailForSsg(${key}/${slug}): invalid DTO shape`,
            );
            return { ok: false };
        }
        return { ok: true, key, detail: picked };
    } catch (err) {
        logger?.warn?.(
            `[ssg] fetchDetailForSsg(${key}/${slug}): error ${err?.name || ""} ${err?.message || err}`,
        );
        return { ok: false };
    } finally {
        clearTimeout(timer);
    }
}
