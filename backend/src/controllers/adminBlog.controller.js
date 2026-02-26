/**
 * Blog — admin CRUD controller.
 *
 * All endpoints are behind requireAdmin (via admin.routes.js mount).
 * heroImage stores only { storagePath, alt }; URL is computed via getPublicUrlForPath.
 * Slug is generated via slugify with uniqueness loop (-2/-3 suffixes).
 * AdminAudit reasons use server constant BLOG_ADMIN_AUDIT_REASON.
 */

import mongoose from "mongoose";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import BlogPost from "../models/BlogPost.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import {
    getPublicUrlForPath,
    uploadBuffer,
    removeObjects,
} from "../services/supabaseStorage.js";
import {
    BLOG_TITLE_MAX,
    BLOG_EXCERPT_MAX,
    BLOG_SECTION_HEADING_MAX,
    BLOG_SECTION_BODY_MAX,
    BLOG_SECTIONS_MAX,
    BLOG_SEO_TITLE_MAX,
    BLOG_SEO_DESC_MAX,
    BLOG_HERO_ALT_MAX,
    BLOG_SLUG_MAX,
    BLOG_RESERVED_SLUGS,
    BLOG_ADMIN_AUDIT_REASON,
} from "../config/blog.js";

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
    return raw.slice(0, BLOG_SLUG_MAX);
}

async function generateUniqueBlogSlug(baseSlug) {
    let candidate = baseSlug;
    let counter = 2;

    while (await BlogPost.exists({ slug: candidate })) {
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }
    return candidate;
}

function validateSlugFormat(slug) {
    if (!slug) return "Slug is required";
    if (slug.length > BLOG_SLUG_MAX)
        return `Slug exceeds ${BLOG_SLUG_MAX} chars`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        return "Slug must be lowercase alphanumeric with hyphens";
    if (BLOG_RESERVED_SLUGS.has(slug)) return `Slug "${slug}" is reserved`;
    return null;
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
        sections: (obj.sections || []).map((s) => ({
            heading: s.heading || "",
            body: s.body || "",
        })),
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
    };
}

/* ── Normalize sections (defensive) ──────────────────────────── */

function normalizeSections(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, BLOG_SECTIONS_MAX).map((s) => ({
        heading: truncate(s?.heading, BLOG_SECTION_HEADING_MAX),
        body: truncate(s?.body, BLOG_SECTION_BODY_MAX),
    }));
}

function normalizeSeo(raw) {
    if (!raw || typeof raw !== "object") return {};
    return {
        title: truncate(raw.title, BLOG_SEO_TITLE_MAX),
        description: truncate(raw.description, BLOG_SEO_DESC_MAX),
    };
}

/* ── CRUD Handlers ────────────────────────────────────────────── */

export async function listAdminBlogPosts(req, res) {
    try {
        const { page, limit, skip } = parsePagination(req);
        const q = parseSearch(req);
        const filter = q ? { $or: [{ title: q }, { slug: q }] } : {};

        const [items, total] = await Promise.all([
            BlogPost.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BlogPost.countDocuments(filter),
        ]);

        return res.json({
            page,
            limit,
            total,
            items: items.map(pickAdminDTO),
        });
    } catch (err) {
        console.error("[adminBlog] listAdminBlogPosts error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function createBlogPost(req, res) {
    try {
        const adminId = getAdminId(req);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const title = truncate(req.body.title, BLOG_TITLE_MAX);
        const excerpt = truncate(req.body.excerpt, BLOG_EXCERPT_MAX);

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

        // Slug
        const baseSlug = buildBaseSlug(title);
        if (!baseSlug) {
            return res
                .status(422)
                .json({
                    code: "VALIDATION",
                    message: "Cannot generate slug from title",
                });
        }
        const slug = await generateUniqueBlogSlug(baseSlug);
        const slugErr = validateSlugFormat(slug);
        if (slugErr) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: slugErr });
        }

        const sections = normalizeSections(req.body.sections);
        const seo = normalizeSeo(req.body.seo);

        const post = await BlogPost.create({
            slug,
            title,
            excerpt,
            sections,
            seo,
            status: "draft",
            createdByAdminId: adminId,
        });

        return res.status(201).json(pickAdminDTO(post));
    } catch (err) {
        // Mongo duplicate key
        if (err.code === 11000) {
            return res
                .status(409)
                .json({
                    code: "DUPLICATE_SLUG",
                    message: "Slug already exists",
                });
        }
        console.error("[adminBlog] createBlogPost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function updateBlogPost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await BlogPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        const body = req.body || {};
        const $set = {};

        // Allowlisted fields only
        if (Object.prototype.hasOwnProperty.call(body, "title")) {
            const v = truncate(body.title, BLOG_TITLE_MAX);
            if (!v)
                return res
                    .status(422)
                    .json({
                        code: "VALIDATION",
                        message: "title cannot be empty",
                    });
            $set.title = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "excerpt")) {
            const v = truncate(body.excerpt, BLOG_EXCERPT_MAX);
            if (!v)
                return res
                    .status(422)
                    .json({
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
            }).slice(0, BLOG_SLUG_MAX);
            const slugErr = validateSlugFormat(candidate);
            if (slugErr)
                return res
                    .status(422)
                    .json({ code: "VALIDATION", message: slugErr });

            // If slug changed, check uniqueness
            if (candidate !== post.slug) {
                const exists = await BlogPost.exists({ slug: candidate });
                if (exists) {
                    return res
                        .status(409)
                        .json({
                            code: "DUPLICATE_SLUG",
                            message: "Slug already exists",
                        });
                }
            }
            $set.slug = candidate;
        }

        if (Object.prototype.hasOwnProperty.call(body, "sections")) {
            $set.sections = normalizeSections(body.sections);
        }

        if (Object.prototype.hasOwnProperty.call(body, "seo")) {
            $set.seo = normalizeSeo(body.seo);
        }

        if (Object.keys($set).length === 0) {
            return res.json(pickAdminDTO(post));
        }

        const updated = await BlogPost.findByIdAndUpdate(
            id,
            { $set },
            { new: true, runValidators: true },
        );

        return res.json(pickAdminDTO(updated));
    } catch (err) {
        if (err.code === 11000) {
            return res
                .status(409)
                .json({
                    code: "DUPLICATE_SLUG",
                    message: "Slug already exists",
                });
        }
        console.error("[adminBlog] updateBlogPost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function publishBlogPost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await BlogPost.findByIdAndUpdate(
            id,
            { $set: { status: "published", publishedAt: new Date() } },
            { new: true, runValidators: true },
        );
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        // Audit
        try {
            await logAdminAction({
                adminUserId: getAdminId(req),
                action: "publish-blog-post",
                targetType: "blog",
                targetId: post._id,
                reason: BLOG_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug },
            });
        } catch (auditErr) {
            console.error("[adminBlog] audit publish error:", auditErr);
        }

        return res.json(pickAdminDTO(post));
    } catch (err) {
        console.error("[adminBlog] publishBlogPost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function unpublishBlogPost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await BlogPost.findByIdAndUpdate(
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
                action: "unpublish-blog-post",
                targetType: "blog",
                targetId: post._id,
                reason: BLOG_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug },
            });
        } catch (auditErr) {
            console.error("[adminBlog] audit unpublish error:", auditErr);
        }

        return res.json(pickAdminDTO(post));
    } catch (err) {
        console.error("[adminBlog] unpublishBlogPost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function deleteBlogPost(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await BlogPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        // Best-effort hero cleanup
        const heroPath = post.heroImage?.storagePath;
        if (heroPath) {
            try {
                await removeObjects({ paths: [heroPath] });
            } catch (cleanupErr) {
                console.error("[adminBlog] hero cleanup error:", cleanupErr);
            }
        }

        await BlogPost.deleteOne({ _id: post._id });

        try {
            await logAdminAction({
                adminUserId: getAdminId(req),
                action: "delete-blog-post",
                targetType: "blog",
                targetId: post._id,
                reason: BLOG_ADMIN_AUDIT_REASON,
                meta: { slug: post.slug, title: post.title },
            });
        } catch (auditErr) {
            console.error("[adminBlog] audit delete error:", auditErr);
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error("[adminBlog] deleteBlogPost error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

/* ── Hero image upload ────────────────────────────────────────── */

export async function uploadBlogHeroImage(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const post = await BlogPost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Not found" });
        }

        if (!req.file) {
            return res
                .status(422)
                .json({
                    code: "VALIDATION",
                    message: "Image file is required",
                });
        }

        // Alt text is required
        const alt = truncate(req.body?.alt, BLOG_HERO_ALT_MAX);
        if (!alt) {
            return res
                .status(422)
                .json({ code: "VALIDATION", message: "alt text is required" });
        }

        // Build Supabase path: blog/{postId}/hero/{uuid}.{ext}
        const mimeToExt = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const ext = mimeToExt[req.file.mimetype] || "jpg";
        const storagePath = `blog/${id}/hero/${uuidv4()}.${ext}`;

        const result = await uploadBuffer({
            buffer: req.file.buffer,
            mime: req.file.mimetype,
            path: storagePath,
        });

        // Best-effort delete old hero if exists
        const oldPath = post.heroImage?.storagePath;
        if (oldPath && oldPath !== storagePath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminBlog] old hero cleanup error:",
                    cleanupErr,
                );
            }
        }

        // Update post
        post.heroImage = { storagePath, alt };
        await post.save();

        const heroImageUrl =
            getPublicUrlForPath({ path: storagePath }) || result?.url || null;

        return res.json({ storagePath, heroImageUrl, alt });
    } catch (err) {
        console.error("[adminBlog] uploadBlogHeroImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
