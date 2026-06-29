/**
 * Cards showcase — admin CRUD controller.
 *
 * All endpoints are behind requireAdmin (via admin.routes.js mount).
 * imageStoragePath stored only in DB; URL computed at read time via getPublicUrlForPath.
 * No slug — items are identified by MongoDB ObjectId.
 *
 * Activation gate: imageStoragePath, imageAlt, title, description, and ctaUrl
 * (passing validateShowcaseCtaUrl) must all be non-empty before isActive can be set.
 */

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import CardShowcaseExample from "../models/CardShowcaseExample.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import {
    getPublicUrlForPath,
    uploadBuffer,
    removeObjects,
} from "../services/supabaseStorage.js";
import { processImage } from "../utils/processImage.js";
import { validateShowcaseCtaUrl } from "../utils/cardsShowcaseUrlPolicy.util.js";
import { checkShowcaseItemReadiness } from "../utils/cardsShowcaseReadiness.util.js";
import {
    SHOWCASE_INTERNAL_NAME_MAX,
    SHOWCASE_IMAGE_ALT_MAX,
    SHOWCASE_TITLE_MAX,
    SHOWCASE_DESC_MAX,
    SHOWCASE_CTA_LABEL_MAX,
    SHOWCASE_CTA_URL_MAX,
    SHOWCASE_SORT_ORDER_MIN,
    SHOWCASE_SORT_ORDER_MAX,
    SHOWCASE_ADMIN_AUDIT_REASON,
} from "../config/cardsShowcase.js";

/* ── Helpers ──────────────────────────────────────────────────── */

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

function clampInt(value, { min, max, fallback }) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(n, max));
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, {
        min: 1,
        max: 100,
        fallback: 25,
    });
    return { page, limit, skip: (page - 1) * limit };
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSearch(req, { maxLen = 64 } = {}) {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!raw) return null;
    return new RegExp(escapeRegExp(raw.slice(0, maxLen)), "i");
}

/* ── DTO ──────────────────────────────────────────────────────── */

function pickAdminDTO(item) {
    if (!item) return null;
    const obj = typeof item.toObject === "function" ? item.toObject() : item;
    return {
        id: String(obj._id),
        internalName: obj.internalName || "",
        imageUrl:
            getPublicUrlForPath({ path: obj.imageStoragePath || "" }) || null,
        imageAlt: obj.imageAlt || "",
        title: obj.title || "",
        description: obj.description || "",
        ctaLabel: obj.ctaLabel || "",
        ctaUrl: obj.ctaUrl || "",
        isActive: Boolean(obj.isActive),
        sortOrder: obj.sortOrder ?? 0,
        createdByAdminId: obj.createdByAdminId
            ? String(obj.createdByAdminId)
            : null,
        createdAt: obj.createdAt || null,
        updatedAt: obj.updatedAt || null,
    };
}

/* ── CRUD Handlers ────────────────────────────────────────────── */

export async function getAdminShowcaseItemById(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }
        const item = await CardShowcaseExample.findById(id).lean();
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }
        return res.json(pickAdminDTO(item));
    } catch (err) {
        console.error(
            "[adminCardsShowcase] getAdminShowcaseItemById error:",
            err,
        );
        return res.status(500).json({ message: "Server error" });
    }
}

export async function listAdminShowcaseItems(req, res) {
    try {
        const { page, limit, skip } = parsePagination(req);
        const q = parseSearch(req);
        const filter = q
            ? {
                  $or: [
                      { internalName: q },
                      { title: q },
                      { description: q },
                      { ctaUrl: q },
                      { imageAlt: q },
                  ],
              }
            : {};

        const [items, total] = await Promise.all([
            CardShowcaseExample.find(filter)
                .sort({ sortOrder: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            CardShowcaseExample.countDocuments(filter),
        ]);

        return res.json({
            page,
            limit,
            total,
            items: items.map(pickAdminDTO),
        });
    } catch (err) {
        console.error(
            "[adminCardsShowcase] listAdminShowcaseItems error:",
            err,
        );
        return res.status(500).json({ message: "Server error" });
    }
}

export async function createShowcaseItem(req, res) {
    try {
        const adminId = getAdminId(req);
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const body = req.body || {};
        const internalName = truncate(
            body.internalName,
            SHOWCASE_INTERNAL_NAME_MAX,
        );
        const imageAlt = truncate(body.imageAlt, SHOWCASE_IMAGE_ALT_MAX);
        const title = truncate(body.title, SHOWCASE_TITLE_MAX);
        const description = truncate(body.description, SHOWCASE_DESC_MAX);
        const ctaLabel = truncate(body.ctaLabel, SHOWCASE_CTA_LABEL_MAX);

        // ctaUrl: optional at creation, validated if provided.
        let ctaUrl = "";
        if (Object.prototype.hasOwnProperty.call(body, "ctaUrl")) {
            const raw = truncate(body.ctaUrl, SHOWCASE_CTA_URL_MAX);
            if (raw) {
                const urlResult = validateShowcaseCtaUrl(raw);
                if (!urlResult.ok) {
                    return res.status(422).json({
                        code: "VALIDATION",
                        message: `ctaUrl is invalid (${urlResult.reason}) — use format /card/{slug} or /c/{orgSlug}/{slug}`,
                    });
                }
                ctaUrl = urlResult.href;
            }
        }

        // sortOrder: optional at creation, default 0.
        let sortOrder = 0;
        if (Object.prototype.hasOwnProperty.call(body, "sortOrder")) {
            const parsed = parseInt(body.sortOrder, 10);
            if (
                !Number.isInteger(parsed) ||
                parsed < SHOWCASE_SORT_ORDER_MIN ||
                parsed > SHOWCASE_SORT_ORDER_MAX
            ) {
                return res.status(422).json({
                    code: "VALIDATION",
                    message: `sortOrder must be an integer between ${SHOWCASE_SORT_ORDER_MIN} and ${SHOWCASE_SORT_ORDER_MAX}`,
                });
            }
            sortOrder = parsed;
        }

        const item = await CardShowcaseExample.create({
            internalName,
            imageAlt,
            title,
            description,
            ctaLabel,
            ctaUrl,
            sortOrder,
            isActive: false,
            createdByAdminId: adminId,
        });

        void logAdminAction({
            adminUserId: adminId,
            action: "create-showcase-item",
            targetType: "cards-showcase",
            targetId: item._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { internalName: item.internalName, title: item.title },
        }).catch((auditErr) =>
            console.error("[adminCardsShowcase] audit create error:", auditErr),
        );

        return res.status(201).json(pickAdminDTO(item));
    } catch (err) {
        console.error("[adminCardsShowcase] createShowcaseItem error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function updateShowcaseItem(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const item = await CardShowcaseExample.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }

        const body = req.body || {};
        const $set = {};

        if (Object.prototype.hasOwnProperty.call(body, "internalName")) {
            $set.internalName = truncate(
                body.internalName,
                SHOWCASE_INTERNAL_NAME_MAX,
            );
        }
        if (Object.prototype.hasOwnProperty.call(body, "imageAlt")) {
            $set.imageAlt = truncate(body.imageAlt, SHOWCASE_IMAGE_ALT_MAX);
        }
        if (Object.prototype.hasOwnProperty.call(body, "title")) {
            $set.title = truncate(body.title, SHOWCASE_TITLE_MAX);
        }
        if (Object.prototype.hasOwnProperty.call(body, "description")) {
            $set.description = truncate(body.description, SHOWCASE_DESC_MAX);
        }
        if (Object.prototype.hasOwnProperty.call(body, "ctaLabel")) {
            $set.ctaLabel = truncate(body.ctaLabel, SHOWCASE_CTA_LABEL_MAX);
        }

        if (Object.prototype.hasOwnProperty.call(body, "ctaUrl")) {
            const raw = truncate(body.ctaUrl, SHOWCASE_CTA_URL_MAX);
            if (raw) {
                const urlResult = validateShowcaseCtaUrl(raw);
                if (!urlResult.ok) {
                    return res.status(422).json({
                        code: "VALIDATION",
                        message: `ctaUrl is invalid (${urlResult.reason}) — use format /card/{slug} or /c/{orgSlug}/{slug}`,
                    });
                }
                $set.ctaUrl = urlResult.href;
            } else {
                $set.ctaUrl = "";
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, "sortOrder")) {
            const parsed = parseInt(body.sortOrder, 10);
            if (
                !Number.isInteger(parsed) ||
                parsed < SHOWCASE_SORT_ORDER_MIN ||
                parsed > SHOWCASE_SORT_ORDER_MAX
            ) {
                return res.status(422).json({
                    code: "VALIDATION",
                    message: `sortOrder must be an integer between ${SHOWCASE_SORT_ORDER_MIN} and ${SHOWCASE_SORT_ORDER_MAX}`,
                });
            }
            $set.sortOrder = parsed;
        }

        if (Object.keys($set).length === 0) {
            return res.json(pickAdminDTO(item));
        }

        // Active-item invariant: if the item is currently active, project the
        // merged state and run the activation readiness check before committing.
        // imageStoragePath is upload-only and cannot be changed via PATCH,
        // so it is always taken from the persisted item.
        if (item.isActive) {
            const projected = {
                imageStoragePath: item.imageStoragePath,
                imageAlt: Object.prototype.hasOwnProperty.call($set, "imageAlt")
                    ? $set.imageAlt
                    : item.imageAlt,
                title: Object.prototype.hasOwnProperty.call($set, "title")
                    ? $set.title
                    : item.title,
                description: Object.prototype.hasOwnProperty.call(
                    $set,
                    "description",
                )
                    ? $set.description
                    : item.description,
                ctaUrl: Object.prototype.hasOwnProperty.call($set, "ctaUrl")
                    ? $set.ctaUrl
                    : item.ctaUrl,
            };
            const readiness = checkShowcaseItemReadiness(projected);
            if (!readiness.ok) {
                return res.status(422).json({
                    code: "ACTIVE_ITEM_INVARIANT_VIOLATION",
                    message: `Update would leave active item in invalid state: ${readiness.reason}`,
                });
            }
        }

        const updated = await CardShowcaseExample.findByIdAndUpdate(
            id,
            { $set },
            { new: true, runValidators: true },
        );

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "update-showcase-item",
            targetType: "cards-showcase",
            targetId: updated._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { changedFields: Object.keys($set) },
        }).catch((auditErr) =>
            console.error("[adminCardsShowcase] audit update error:", auditErr),
        );

        return res.json(pickAdminDTO(updated));
    } catch (err) {
        console.error("[adminCardsShowcase] updateShowcaseItem error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function activateShowcaseItem(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const item = await CardShowcaseExample.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }

        const readiness = checkShowcaseItemReadiness(item);
        if (!readiness.ok) {
            return res.status(422).json({
                code: "ACTIVATION_PRECONDITION_FAILED",
                message: readiness.reason,
            });
        }

        const updated = await CardShowcaseExample.findByIdAndUpdate(
            id,
            { $set: { isActive: true } },
            { new: true, runValidators: true },
        );

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "activate-showcase-item",
            targetType: "cards-showcase",
            targetId: updated._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { title: updated.title },
        }).catch((auditErr) =>
            console.error(
                "[adminCardsShowcase] audit activate error:",
                auditErr,
            ),
        );

        return res.json(pickAdminDTO(updated));
    } catch (err) {
        console.error("[adminCardsShowcase] activateShowcaseItem error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function deactivateShowcaseItem(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const updated = await CardShowcaseExample.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true, runValidators: true },
        );
        if (!updated) {
            return res.status(404).json({ message: "Not found" });
        }

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "deactivate-showcase-item",
            targetType: "cards-showcase",
            targetId: updated._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { title: updated.title },
        }).catch((auditErr) =>
            console.error(
                "[adminCardsShowcase] audit deactivate error:",
                auditErr,
            ),
        );

        return res.json(pickAdminDTO(updated));
    } catch (err) {
        console.error(
            "[adminCardsShowcase] deactivateShowcaseItem error:",
            err,
        );
        return res.status(500).json({ message: "Server error" });
    }
}

export async function deleteShowcaseItem(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const item = await CardShowcaseExample.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }

        // Best-effort Supabase cleanup before deletion.
        const imagePath = item.imageStoragePath;
        if (imagePath) {
            try {
                await removeObjects({ paths: [imagePath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminCardsShowcase] image cleanup error:",
                    cleanupErr,
                );
            }
        }

        await CardShowcaseExample.deleteOne({ _id: item._id });

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "delete-showcase-item",
            targetType: "cards-showcase",
            targetId: item._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { internalName: item.internalName, title: item.title },
        }).catch((auditErr) =>
            console.error("[adminCardsShowcase] audit delete error:", auditErr),
        );

        return res.json({ ok: true });
    } catch (err) {
        console.error("[adminCardsShowcase] deleteShowcaseItem error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function uploadShowcaseImage(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const item = await CardShowcaseExample.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }

        if (!req.file) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "Image file is required",
            });
        }

        // alt text is required — drives imageAlt on the item.
        const alt = truncate(req.body?.alt, SHOWCASE_IMAGE_ALT_MAX);
        if (!alt) {
            return res.status(422).json({
                code: "VALIDATION",
                message: "alt text is required",
            });
        }

        // Canonicalize via sharp pipeline.
        const processed = await processImage(req.file.buffer, {
            kind: "showcaseImage",
        });

        // Build Supabase path: cards-showcase/{itemId}/image/{uuid}.{ext}
        const mimeToExt = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const ext = mimeToExt[processed.mime] || "jpg";
        const storagePath = `cards-showcase/${id}/image/${uuidv4()}.${ext}`;

        // Active-item invariant: project the post-upload state and verify
        // readiness BEFORE uploading to Supabase. Fail-fast: if the invariant
        // would be violated we never issue the upload, so no orphaned objects.
        // In practice this check always passes because: (a) storagePath is
        // freshly computed and non-empty, (b) alt was validated non-empty above,
        // (c) title/description/ctaUrl are unchanged from the active item which
        // already passed the activation gate. Guards against corrupted DB state.
        if (item.isActive) {
            const projected = {
                imageStoragePath: storagePath,
                imageAlt: alt,
                title: item.title,
                description: item.description,
                ctaUrl: item.ctaUrl,
            };
            const readiness = checkShowcaseItemReadiness(projected);
            if (!readiness.ok) {
                return res.status(422).json({
                    code: "ACTIVE_ITEM_INVARIANT_VIOLATION",
                    message: `Upload would leave active item in invalid state: ${readiness.reason}`,
                });
            }
        }

        await uploadBuffer({
            buffer: processed.buffer,
            mime: processed.mime,
            path: storagePath,
        });

        // Best-effort remove old image if one existed.
        const oldPath = item.imageStoragePath;
        if (oldPath && oldPath !== storagePath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminCardsShowcase] old image cleanup error:",
                    cleanupErr,
                );
            }
        }

        item.imageStoragePath = storagePath;
        item.imageAlt = alt;
        await item.save();

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "upload-showcase-image",
            targetType: "cards-showcase",
            targetId: item._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: {
                storagePath,
                alt,
                replacedPath: oldPath || null,
            },
        }).catch((auditErr) =>
            console.error("[adminCardsShowcase] audit upload error:", auditErr),
        );

        return res.json(pickAdminDTO(item));
    } catch (err) {
        console.error("[adminCardsShowcase] uploadShowcaseImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}

export async function removeShowcaseImage(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const item = await CardShowcaseExample.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Not found" });
        }

        if (item.isActive) {
            return res.status(422).json({
                code: "IMAGE_REMOVE_REQUIRES_DEACTIVATION",
                message: "יש להשבית את הפריט לפני מחיקת התמונה.",
            });
        }

        const oldPath = item.imageStoragePath;
        if (oldPath) {
            try {
                await removeObjects({ paths: [oldPath] });
            } catch (cleanupErr) {
                console.error(
                    "[adminCardsShowcase] remove image cleanup error:",
                    cleanupErr,
                );
            }
        }

        // Clear storage path only; keep imageAlt so admin can reuse it on
        // next upload.
        item.imageStoragePath = "";
        await item.save();

        void logAdminAction({
            adminUserId: getAdminId(req),
            action: "remove-showcase-image",
            targetType: "cards-showcase",
            targetId: item._id,
            reason: SHOWCASE_ADMIN_AUDIT_REASON,
            meta: { removedPath: oldPath || null },
        }).catch((auditErr) =>
            console.error(
                "[adminCardsShowcase] audit remove-image error:",
                auditErr,
            ),
        );

        return res.json(pickAdminDTO(item));
    } catch (err) {
        console.error("[adminCardsShowcase] removeShowcaseImage error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
