/**
 * Guides - public read-only controller.
 *
 * Only published guides are returned.
 * Draft / unpublished / missing → 404 (anti-enumeration).
 * heroImageUrl is computed server-side from storagePath via getPublicUrlForPath.
 */

import GuidePost from "../models/GuidePost.model.js";
import { getPublicUrlForPath } from "../services/supabaseStorage.js";

/* ── Helpers ──────────────────────────────────────────────────── */

function clampInt(value, { min, max, fallback }) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(n, max));
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 12 });
    return { page, limit, skip: (page - 1) * limit };
}

/* ── DTO ──────────────────────────────────────────────────────── */

function pickPublicDTO(post) {
    if (!post) return null;
    const heroPath =
        post.heroImage?.storagePath ||
        (post.heroImage && typeof post.heroImage === "object"
            ? post.heroImage.storagePath
            : "");
    return {
        id: String(post._id),
        slug: post.slug || "",
        title: post.title || "",
        excerpt: post.excerpt || "",
        heroImageUrl: getPublicUrlForPath({ path: heroPath }) || null,
        heroImageAlt: post.heroImage?.alt || "",
        sections: (post.sections || []).map((s) => {
            const imgPath = s.image?.storagePath || "";
            return {
                heading: s.heading || "",
                body: s.body || "",
                imageUrl: getPublicUrlForPath({ path: imgPath }) || null,
                imageAlt: s.image?.alt || "",
            };
        }),
        seo: {
            title: post.seo?.title || "",
            description: post.seo?.description || "",
        },
        publishedAt: post.publishedAt || null,
        updatedAt: post.updatedAt || null,
        ogPath: `/og/guides/${post.slug}`,

        // Author (optional - empty strings when not set)
        authorName: post.authorName || "",
        authorImageUrl: post.authorImageUrl || "",
        authorImageAlt: post.authorImageAlt || "",
        authorBio: post.authorBio || "",
    };
}

/* ── Handlers ─────────────────────────────────────────────────── */

export async function listPublishedGuides(req, res) {
    try {
        const { page, limit, skip } = parsePagination(req);
        const filter = { status: "published" };

        const [items, total] = await Promise.all([
            GuidePost.find(filter)
                .select("-sections")
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GuidePost.countDocuments(filter),
        ]);

        return res.json({
            page,
            limit,
            total,
            items: items.map(pickPublicDTO),
        });
    } catch (err) {
        console.error("[guides] listPublishedGuides error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function getPublishedGuide(req, res) {
    try {
        const { slug } = req.params;
        if (!slug || typeof slug !== "string") {
            return res.status(404).json({ message: "Not found" });
        }

        const normalized = slug.toLowerCase().trim();

        const post = await GuidePost.findOne({
            $or: [{ slug: normalized }, { previousSlugs: normalized }],
            status: "published",
        }).lean();

        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        return res.json(pickPublicDTO(post));
    } catch (err) {
        console.error("[guides] getPublishedGuide error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

// Reserved public-content path segments. Duplicated independently in
// blog.controller.js and frontend SSG validation; check-ssg-output enforces
// drift detection at build time.
const RESERVED_PUBLIC_CONTENT_SEGMENTS = new Set(["page", "aliases"]);
const ALIAS_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function listGuideAliases(req, res) {
    res.setHeader("Cache-Control", "no-store");
    try {
        const [withAliases, allPublished] = await Promise.all([
            GuidePost.find({
                status: "published",
                previousSlugs: { $exists: true, $not: { $size: 0 } },
            })
                .select("slug previousSlugs")
                .lean(),
            GuidePost.find({ status: "published" }).select("slug").lean(),
        ]);

        const currentSlugs = new Set(
            allPublished
                .map((p) => String(p.slug || "").toLowerCase())
                .filter(Boolean),
        );

        const accepted = new Map();
        const conflicts = new Set();

        for (const post of withAliases) {
            const to = String(post.slug || "")
                .toLowerCase()
                .trim();
            if (!to || !ALIAS_SLUG_RE.test(to)) continue;
            if (RESERVED_PUBLIC_CONTENT_SEGMENTS.has(to)) continue;
            const list = Array.isArray(post.previousSlugs)
                ? post.previousSlugs
                : [];
            for (const raw of list) {
                if (typeof raw !== "string") continue;
                const from = raw.toLowerCase().trim();
                if (!from || !ALIAS_SLUG_RE.test(from)) continue;
                if (RESERVED_PUBLIC_CONTENT_SEGMENTS.has(from)) continue;
                if (from === to) continue;
                if (currentSlugs.has(from)) continue;
                if (accepted.has(from)) {
                    if (accepted.get(from) !== to) conflicts.add(from);
                    continue;
                }
                accepted.set(from, to);
            }
        }

        for (const f of conflicts) {
            console.warn(
                `[guides] listGuideAliases: alias ambiguity skipped from="${f}"`,
            );
            accepted.delete(f);
        }

        const aliases = [];
        for (const [from, to] of accepted.entries()) {
            aliases.push({ from, to });
        }
        return res.json(aliases);
    } catch (err) {
        console.error("[guides] listGuideAliases error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
