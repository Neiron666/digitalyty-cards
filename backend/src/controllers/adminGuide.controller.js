/**
 * Guides - admin CRUD controller.
 *
 * All endpoints are behind requireAdmin (via admin.routes.js mount).
 * heroImage stores only { storagePath, alt }; URL is computed via getPublicUrlForPath.
 * Slug is generated via slugify with uniqueness loop (-2/-3 suffixes).
 * AdminAudit reasons use server constant GUIDE_ADMIN_AUDIT_REASON.
 */

import mongoose from "mongoose";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import GuidePost from "../models/GuidePost.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import {
    getPublicUrlForPath,
    uploadBuffer,
    removeObjects,
} from "../services/supabaseStorage.js";
import { processImage } from "../utils/processImage.js";
import { HttpError } from "../utils/httpError.js";
import {
    GUIDE_TITLE_MAX,
    GUIDE_EXCERPT_MAX,
    GUIDE_SECTION_HEADING_MAX,
    GUIDE_SECTION_BODY_MAX,
    GUIDE_SECTIONS_MAX,
    GUIDE_SEO_TITLE_MAX,
    GUIDE_SEO_DESC_MAX,
    GUIDE_HERO_ALT_MAX,
    GUIDE_SECTION_IMAGE_ALT_MAX,
    GUIDE_SLUG_MAX,
    GUIDE_PREVIOUS_SLUGS_MAX,
    GUIDE_RESERVED_SLUGS,
    GUIDE_ADMIN_AUDIT_REASON,
    GUIDE_AUTHOR_NAME_MAX,
    GUIDE_AUTHOR_BIO_MAX,
    GUIDE_AUTHOR_IMAGE_ALT_MAX,
} from "../config/guide.js";

/* ── Helpers ──────────────────────────────────────────────────── */

function clampInt(value, { min, max, fallback }) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(n, max));
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 25 });
    return { page, limit, skip: (page - 1) * limit };
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSearch(req, { maxLen = 64 } = {}) {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!raw) return null;
    const safe = raw.slice(0, maxLen);
    return new RegExp(escapeRegExp(safe), "i");
}

function isValidObjectId(val) {
    return mongoose.Types.ObjectId.isValid(val);
}

function getAdminId(req) {
    return req.user?.id || req.userId || null;
}

function truncate(str, max) {
    const s = typeof str === "string" ? str.trim() : "";
    return s.slice(0, max);
}

/* ── Slug ─────────────────────────────────────────────────────── */

function buildBaseSlug(title) {
    const raw = slugify(title || "", { lower: true, strict: true, trim: true });
    return raw.slice(0, GUIDE_SLUG_MAX);
}

async function generateUniqueGuideSlug(baseSlug) {
    let candidate = baseSlug;
    let counter = 2;

    while (await isSlugTaken(candidate)) {
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }
    return candidate;
}

function validateSlugFormat(slug) {
    if (!slug) return "Slug is required";
    if (slug.length > GUIDE_SLUG_MAX)
        return `Slug exceeds ${GUIDE_SLUG_MAX} chars`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        return "Slug must be lowercase alphanumeric with hyphens";
    if (GUIDE_RESERVED_SLUGS.has(slug)) return `Slug "${slug}" is reserved`;
    return null;
}

/**
 * Check if a slug is already taken - either as a current slug or as a
 * historical alias (previousSlugs) on any guide post.
 * @param {string} candidate
 * @param {import('mongoose').Types.ObjectId|string} [excludePostId] - skip this post's current slug from the check (used during update)
 */
async function isSlugTaken(candidate, excludePostId) {
    const currentSlugFilter = excludePostId
        ? { slug: candidate, _id: { $ne: excludePostId } }
        : { slug: candidate };
    return GuidePost.exists({
        $or: [currentSlugFilter, { previousSlugs: candidate }],
    });
}

/* ── DTO ──────────────────────────────────────────────────────── */

function pickAdminDTO(post) {
    if (!post) return null;
    const obj = typeof post.toObject === "function" ? post.toObject() : post;
    const heroPath = obj.heroImage?.storagePath || "";
    return {
        id: String(obj._id),
        slug: obj.slug || "",
        title: obj.title || "",
        excerpt: obj.excerpt || "",
        heroImageUrl: getPublicUrlForPath({ path: heroPath }) || null,
        heroImageAlt: obj.heroImage?.alt || "",
        sections: (obj.sections || []).map((s) => {
            const imgPath = s.image?.storagePath || "";
            return {
                heading: s.heading || "",
                body: s.body || "",
                imageUrl: getPublicUrlForPath({ path: imgPath }) || null,
                imageAlt: s.image?.alt || "",
            };
        }),
        seo: {
            title: obj.seo?.title || "",
            description: obj.seo?.description || "",
        },
        status: obj.status || "draft",
        publishedAt: obj.publishedAt || null,
        createdByAdminId: obj.createdByAdminId
            ? String(obj.createdByAdminId)
            : null,
        createdAt: obj.createdAt || null,
        updatedAt: obj.updatedAt || null,

        // Author (optional)
        authorName: obj.authorName || "",
        authorImageUrl: obj.authorImageUrl || "",
        authorImageAlt: obj.authorImageAlt || "",
        authorBio: obj.authorBio || "",
    };
}

/* ── Normalize sections (defensive) ──────────────────────────── */

function normalizeSections(raw, existingSections) {
    if (!Array.isArray(raw)) return [];
    const existing = Array.isArray(existingSections) ? existingSections : [];
    return raw.slice(0, GUIDE_SECTIONS_MAX).map((s, i) => {
        const section = {
            heading: truncate(s?.heading, GUIDE_SECTION_HEADING_MAX),
            body: truncate(s?.body, GUIDE_SECTION_BODY_MAX),
        };
        // Preserve existing image data (upload is a separate endpoint)
        if (s?.image && typeof s.image === "object" && s.image.storagePath) {
            section.image = {
                storagePath: String(s.image.storagePath).trim(),
                alt: truncate(s.image.alt, GUIDE_SECTION_IMAGE_ALT_MAX),
            };
        } else if (existing[i]?.image?.storagePath) {
            // Frontend payload lacks storagePath - preserve DB image
            section.image = {
                storagePath: existing[i].image.storagePath,
                alt: truncate(
                    existing[i].image.alt,
                    GUIDE_SECTION_IMAGE_ALT_MAX,
                ),
            };
        }
        return section;
    });
}

function normalizeSeo(raw) {
    if (!raw || typeof raw !== "object") return {};
    return {
        title: truncate(raw.title, GUIDE_SEO_TITLE_MAX),
        description: truncate(raw.description, GUIDE_SEO_DESC_MAX),
    };
}

/* ── CRUD Handlers ────────────────────────────────────────────── */

export async function getAdminGuidePostById(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await GuidePost.findById(id).lean();
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        return res.json(pickAdminDTO(post));
    } catch (err) {
        console.error("[adminGuide] getAdminGuidePostById error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function listAdminGuidePosts(req, res) {
    try {
        const { page, limit, skip } = parsePagination(req);
        const q = parseSearch(req);
        const filter = q ? { $or: [{ title: q }, { slug: q }] } : {};

        const [items, total] = await Promise.all([
            GuidePost.find(filter)
                .select("-sections")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            GuidePost.countDocuments(filter),
        ]);

        return res.json({
            page,
            limit,
            total,
            items: items.map(pickAdminDTO),
        });
    } catch (err) {
        console.error("[adminGuide] listAdminGuidePosts error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function createGuidePost(req, res) {
    try {
        const adminId = getAdminId(req);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const title = truncate(req.body.title, GUIDE_TITLE_MAX);
        const excerpt = truncate(req.body.excerpt, GUIDE_EXCERPT_MAX);

        if (!title) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "title is required" });
        }
        if (!excerpt) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "excerpt is required" });
        }

        // Slug: accept explicit body.slug, auto-generate from title,
        // or fallback to "guide-<shortId>" for non-Latin titles.
        const requestedSlug =
            typeof req.body.slug === "string"
                ? req.body.slug.trim().toLowerCase()
                : "";

        let baseSlug;
        if (requestedSlug) {
            const reqSlugErr = validateSlugFormat(requestedSlug);
            if (reqSlugErr) {
                return res
                    .status(422)
                    .json({ code: "VALIDATION", message: reqSlugErr });
            }
            baseSlug = requestedSlug;
        } else {
            baseSlug = buildBaseSlug(title) || `guide-${uuidv4().slice(0, 8)}`;
        }
        baseSlug = baseSlug.slice(0, GUIDE_SLUG_MAX);

        const slug = await generateUniqueGuideSlug(baseSlug);
        const slugErr = validateSlugFormat(slug);
        if (slugErr) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: slugErr });
        }

        const sections = normalizeSections(req.body.sections);
        const seo = normalizeSeo(req.body.seo);

        // Author (optional)
        const authorName = truncate(req.body.authorName, GUIDE_AUTHOR_NAME_MAX);
        const authorBio = truncate(req.body.authorBio, GUIDE_AUTHOR_BIO_MAX);
        const authorImageAlt = truncate(
            req.body.authorImageAlt,
            GUIDE_AUTHOR_IMAGE_ALT_MAX,
        );

        const post = await GuidePost.create({
            slug,
            title,
            excerpt,
            sections,
            seo,
            authorName,
            authorBio,
            authorImageAlt,
            status: "draft",
            createdByAdminId: adminId,
        });

        // Best-effort audit (fire-and-forget)
        void logAdminAction({
            adminUserId: adminId,
            action: "create-guide-post",
            targetType: "guide",
            targetId: post._id,
            reason: GUIDE_ADMIN_AUDIT_REASON,
            meta: { slug: post.slug, title: post.title },
        }).catch((auditErr) =>
            console.error("[adminGuide] audit create error:", auditErr),
        );

        return res.status(201).json(pickAdminDTO(post));
    } catch (err) {
        // Mongo duplicate key
        if (err.code === 11000) {
            return res.status(409).json({
                code: "DUPLICATE_SLUG",
                message: "Slug already exists",
            });
        }
        console.error("[adminGuide] createGuidePost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function updateGuidePost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await GuidePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        const body = req.body || {};
        const $set = {};
        let slugChanged = false;
        let oldSlug = null;

        // Allowlisted fields only
        if (Object.prototype.hasOwnProperty.call(body, "title")) {
            const v = truncate(body.title, GUIDE_TITLE_MAX);
            if (!v)
                return res.status(422).json({
                    code: "VALIDATION",
                    message: "title cannot be empty",
                });
            $set.title = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "excerpt")) {
            const v = truncate(body.excerpt, GUIDE_EXCERPT_MAX);
            if (!v)
                return res.status(422).json({
                    code: "VALIDATION",
                    message: "excerpt cannot be empty",
                });
            $set.excerpt = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "slug")) {
            const raw =
                typeof body.slug === "string"
                    ? body.slug.trim().toLowerCase()
                    : "";
            const candidate = slugify(raw, {
                lower: true,
                strict: true,
                trim: true,
            }).slice(0, GUIDE_SLUG_MAX);
            const slugErr = validateSlugFormat(candidate);
            if (slugErr)
                return res
                    .status(422)
                    .json({ code: "VALIDATION", message: slugErr });

            // If slug changed, check uniqueness across current + historical
            if (candidate !== post.slug) {
                const taken = await isSlugTaken(candidate, post._id);
                if (taken) {
                    return res.status(409).json({
                        code: "DUPLICATE_SLUG",
                        message: "Slug already exists or is a reserved alias",
                    });
                }
                slugChanged = true;
                oldSlug = post.slug;

                // Alias cap: only if post has ever been public
                const everPublished = Boolean(post.firstPublishedAt);
                if (everPublished) {
                    const currentCount = post.previousSlugs?.length || 0;
                    if (currentCount >= GUIDE_PREVIOUS_SLUGS_MAX) {
                        return res.status(422).json({
                            code: "SLUG_ALIAS_LIMIT",
                            message: `Cannot change slug - alias history limit (${GUIDE_PREVIOUS_SLUGS_MAX}) reached`,
                        });
                    }
                }
            }
            $set.slug = candidate;
        }

        if (Object.prototype.hasOwnProperty.call(body, "sections")) {
            $set.sections = normalizeSections(body.sections, post.sections);
        }

        if (Object.prototype.hasOwnProperty.call(body, "seo")) {
            $set.seo = normalizeSeo(body.seo);
        }

        // Author (optional, allowlisted)
        if (Object.prototype.hasOwnProperty.call(body, "authorName")) {
            $set.authorName = truncate(body.authorName, GUIDE_AUTHOR_NAME_MAX);
        }
        if (Object.prototype.hasOwnProperty.call(body, "authorBio")) {
            $set.authorBio = truncate(body.authorBio, GUIDE_AUTHOR_BIO_MAX);
        }
        if (Object.prototype.hasOwnProperty.call(body, "authorImageAlt")) {
            $set.authorImageAlt = truncate(
                body.authorImageAlt,
                GUIDE_AUTHOR_IMAGE_ALT_MAX,
            );
        }

        if (Object.keys($set).length === 0) {
            return res.json(pickAdminDTO(post));
        }

        // Build atomic update ops - preserve alias if ever-published
        const updateOps = { $set };
        const everPublished = Boolean(post.firstPublishedAt);
        if (slugChanged && oldSlug && everPublished) {
            updateOps.$push = { previousSlugs: oldSlug };
        }

        const updated = await GuidePost.findByIdAndUpdate(id, updateOps, {
            new: true,
            runValidators: true,
        });

        // Best-effort audit (fire-and-forget)
        const auditMeta = {
            slug: updated.slug,
            changedFields: Object.keys($set),
        };
        if (slugChanged && oldSlug && everPublished) {
            auditMeta.aliasPreserved = oldSlug;
        }
        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "update-guide-post",
            targetType: "guide",
            targetId: updated._id,
            reason: GUIDE_ADMIN_AUDIT_REASON,
            meta: auditMeta,
        }).catch((auditErr) =>
            console.error("[adminGuide] audit update error:", auditErr),
        );

        return res.json(pickAdminDTO(updated));
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                code: "DUPLICATE_SLUG",
                message: "Slug already exists",
            });
        }
        console.error("[adminGuide] updateGuidePost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function publishGuidePost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const now = new Date();
        const existing = await GuidePost.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "Not found" });
        }

        const $setFields = { status: "published", publishedAt: now };
        // Immutable lifecycle marker: set firstPublishedAt only on first publication
        if (!existing.firstPublishedAt) {
            $setFields.firstPublishedAt = now;
        }

        const post = await GuidePost.findByIdAndUpdate(
            id,
            { $set: $setFields },
            { new: true, runValidators: true },
        );
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        // Audit
        try {
            await logAdminAction({
                adminUserId: getAdminId(req),
                action: "publish-guide-post",
                targetType: "guide",
                targetId: post._id,
                reason: GUIDE_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug },
            });
        } catch (auditErr) {
            console.error("[adminGuide] audit publish error:", auditErr);
        }

        return res.json(pickAdminDTO(post));
    } catch (err) {
        console.error("[adminGuide] publishGuidePost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function unpublishGuidePost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await GuidePost.findByIdAndUpdate(
            id,
            { $set: { status: "draft", publishedAt: null } },
            { new: true, runValidators: true },
        );
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        try {
            await logAdminAction({
                adminUserId: getAdminId(req),
                action: "unpublish-guide-post",
                targetType: "guide",
                targetId: post._id,
                reason: GUIDE_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug },
            });
        } catch (auditErr) {
            console.error("[adminGuide] audit unpublish error:", auditErr);
        }

        return res.json(pickAdminDTO(post));
    } catch (err) {
        console.error("[adminGuide] unpublishGuidePost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function deleteGuidePost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await GuidePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        // Best-effort hero cleanup
        const heroPath = post.heroImage?.storagePath;
        const sectionImagePaths = (post.sections || [])
            .map((s) => s.image?.storagePath)
            .filter(Boolean);
        const allImagePaths = [heroPath, ...sectionImagePaths].filter(Boolean);
        if (allImagePaths.length) {
            try {
                await removeObjects({ paths: allImagePaths });
            } catch (cleanupErr) {
                console.error("[adminGuide] image cleanup error:", cleanupErr);
            }
        }

        await GuidePost.deleteOne({ _id: post._id });

        try {
            await logAdminAction({
                adminUserId: getAdminId(req),
                action: "delete-guide-post",
                targetType: "guide",
                targetId: post._id,
                reason: GUIDE_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug, title: post.title },
            });
        } catch (auditErr) {
            console.error("[adminGuide] audit delete error:", auditErr);
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error("[adminGuide] deleteGuidePost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

/* ── Hero image upload ────────────────────────────────────────── */

export async function uploadGuideHeroImage(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await GuidePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        if (!req.file) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "Image file is required",
            });
        }

        // Alt text is required
        const alt = truncate(req.body?.alt, GUIDE_HERO_ALT_MAX);
        if (!alt) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "alt text is required" });
        }

        // ── Image canonicalization (sharp) ──
        const processed = await processImage(req.file.buffer, {
            kind: "guideHero",
        });

        // Build Supabase path: guides/{postId}/hero/{uuid}.{ext}
        const mimeToExt = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const ext = mimeToExt[processed.mime] || "jpg";
        const storagePath = `guides/${id}/hero/${uuidv4()}.${ext}`;

        const result = await uploadBuffer({
            buffer: processed.buffer,
            mime: processed.mime,
            path: storagePath,
        });

        // Best-effort delete old hero if exists
        const oldPath = post.heroImage?.storagePath;
        if (oldPath && oldPath !== storagePath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminGuide] old hero cleanup error:",
                    cleanupErr,
                );
            }
        }

        // Update post
        post.heroImage = { storagePath, alt };
        await post.save();

        // Best-effort audit (fire-and-forget)
        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "upload-guide-hero",
            targetType: "guide",
            targetId: post._id,
            reason: GUIDE_ADMIN_AUDIT_REASON,
            meta: {
                slug: post.slug,
                storagePath,
                alt,
                replacedPath: oldPath || null,
            },
        }).catch((auditErr) =>
            console.error("[adminGuide] audit upload-hero error:", auditErr),
        );

        const heroImageUrl =
            getPublicUrlForPath({ path: storagePath }) || result?.url || null;

        return res.json({ storagePath, heroImageUrl, alt });
    } catch (err) {
        if (err instanceof HttpError) {
            return res
                .status(err.statusCode)
                .json({ code: err.code, message: err.message });
        }
        console.error("[adminGuide] uploadGuideHeroImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

/* ── Section image upload ─────────────────────────────────────── */

export async function uploadGuideSectionImage(req, res) {
    try {
        const { id, sectionIdx } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const idx = parseInt(sectionIdx, 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= GUIDE_SECTIONS_MAX) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "Invalid section index" });
        }

        const post = await GuidePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        if (idx >= (post.sections || []).length) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "Section index out of range",
            });
        }

        if (!req.file) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "Image file is required",
            });
        }

        const alt = truncate(req.body?.alt, GUIDE_SECTION_IMAGE_ALT_MAX);
        if (!alt) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "alt text is required" });
        }

        const processed = await processImage(req.file.buffer, {
            kind: "guideSectionImage",
        });

        const mimeToExt = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const ext = mimeToExt[processed.mime] || "jpg";
        const storagePath = `guides/${id}/sections/${uuidv4()}.${ext}`;

        await uploadBuffer({
            buffer: processed.buffer,
            mime: processed.mime,
            path: storagePath,
        });

        // Best-effort delete old section image if exists
        const oldPath = post.sections[idx].image?.storagePath;
        if (oldPath && oldPath !== storagePath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminGuide] old section image cleanup error:",
                    cleanupErr,
                );
            }
        }

        post.sections[idx].image = { storagePath, alt };
        post.markModified("sections");
        await post.save();

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "upload-guide-section-image",
            targetType: "guide",
            targetId: post._id,
            reason: GUIDE_ADMIN_AUDIT_REASON,
            meta: { slug: post.slug, sectionIdx: idx, storagePath, alt },
        }).catch((auditErr) =>
            console.error(
                "[adminGuide] audit upload-section-image error:",
                auditErr,
            ),
        );

        const imageUrl = getPublicUrlForPath({ path: storagePath }) || null;
        return res.json({ imageUrl, imageAlt: alt });
    } catch (err) {
        if (err instanceof HttpError) {
            return res
                .status(err.statusCode)
                .json({ code: err.code, message: err.message });
        }
        console.error("[adminGuide] uploadGuideSectionImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

/* ── Section image remove ─────────────────────────────────────── */

export async function removeGuideSectionImage(req, res) {
    try {
        const { id, sectionIdx } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const idx = parseInt(sectionIdx, 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= GUIDE_SECTIONS_MAX) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "Invalid section index" });
        }

        const post = await GuidePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        if (idx >= (post.sections || []).length) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "Section index out of range",
            });
        }

        const oldPath = post.sections[idx].image?.storagePath;
        if (oldPath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminGuide] section image remove cleanup error:",
                    cleanupErr,
                );
            }
        }

        post.sections[idx].image = { storagePath: "", alt: "" };
        post.markModified("sections");
        await post.save();

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "remove-guide-section-image",
            targetType: "guide",
            targetId: post._id,
            reason: GUIDE_ADMIN_AUDIT_REASON,
            meta: {
                slug: post.slug,
                sectionIdx: idx,
                removedPath: oldPath || null,
            },
        }).catch((auditErr) =>
            console.error(
                "[adminGuide] audit remove-section-image error:",
                auditErr,
            ),
        );

        return res.json({ ok: true });
    } catch (err) {
        console.error("[adminGuide] removeGuideSectionImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
