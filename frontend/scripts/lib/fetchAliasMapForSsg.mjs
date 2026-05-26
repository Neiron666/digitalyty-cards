/**
 * Phase 2 (PUBLIC_CONTENT_PREVIOUS_SLUGS_ALIAS_REDIRECTS): Build-time alias-map
 * fetcher. Pure Node ESM, dependency-free, fail-open.
 *
 * Consumes /api/blog/aliases or /api/guides/aliases.
 * Validates every item against slug regex; rejects reserved segments and any
 * control/scheme/path characters; deduplicates from; downgrades to ok:false on
 * ambiguous mapping. Never throws.
 */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED_PUBLIC_CONTENT_SEGMENTS = new Set(["page", "aliases"]);
// Disallow any character that could break out of the slug segment in a
// _redirects source/target line (slash, query, fragment, scheme separators,
// whitespace, control characters).
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHAR_RE = /[\s/?#:\\"'`<>\u0000-\u001F\u007F]/;

function isCleanSlug(value) {
    if (typeof value !== "string") return false;
    if (value.length === 0) return false;
    if (FORBIDDEN_CHAR_RE.test(value)) return false;
    if (!SLUG_RE.test(value)) return false;
    if (RESERVED_PUBLIC_CONTENT_SEGMENTS.has(value)) return false;
    return true;
}

export async function fetchAliasMapForSsg({
    key,
    endpoint,
    origin,
    timeoutMs = 8000,
    logger = console,
}) {
    if (typeof key !== "string" || key.length === 0) {
        return { ok: false, aliases: [], reason: "bad-key" };
    }
    if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
        return { ok: false, aliases: [], reason: "bad-endpoint" };
    }
    if (typeof origin !== "string" || !/^https?:\/\//.test(origin)) {
        return { ok: false, aliases: [], reason: "bad-origin" };
    }

    const url = `${origin}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let data;
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
                `[ssg] fetchAliasMapForSsg(${key}): HTTP ${res.status} from ${url}`,
            );
            return { ok: false, aliases: [], reason: `http-${res.status}` };
        }
        data = await res.json();
    } catch (err) {
        logger?.warn?.(
            `[ssg] fetchAliasMapForSsg(${key}): error ${err?.name || ""} ${err?.message || err}`,
        );
        return { ok: false, aliases: [], reason: "fetch-failed" };
    } finally {
        clearTimeout(timer);
    }

    if (!Array.isArray(data)) {
        logger?.warn?.(
            `[ssg] fetchAliasMapForSsg(${key}): response is not an array`,
        );
        return { ok: false, aliases: [], reason: "bad-shape" };
    }

    const accepted = new Map();
    const conflicts = new Set();
    for (const raw of data) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const from = typeof raw.from === "string" ? raw.from : null;
        const to = typeof raw.to === "string" ? raw.to : null;
        if (!isCleanSlug(from)) continue;
        if (!isCleanSlug(to)) continue;
        if (from === to) continue;
        if (accepted.has(from)) {
            if (accepted.get(from) !== to) conflicts.add(from);
            continue;
        }
        accepted.set(from, to);
    }

    if (conflicts.size > 0) {
        for (const f of conflicts) {
            logger?.warn?.(
                `[ssg] fetchAliasMapForSsg(${key}): ambiguous from="${f}" \u2014 dropping`,
            );
            accepted.delete(f);
        }
    }

    const aliases = [];
    for (const [from, to] of accepted.entries()) {
        aliases.push({ from, to });
    }
    return { ok: true, aliases };
}
