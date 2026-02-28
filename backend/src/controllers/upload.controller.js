import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import crypto from "crypto";
import {
    uploadBuffer,
    getAnonPrivateBucketName,
    getPublicBucketName,
    getSignedUrlTtlSeconds,
} from "../services/supabaseStorage.js";
import { normalizeReviews } from "../utils/reviews.util.js";
import { removeObjects } from "../services/supabaseStorage.js";
import { resolveActor, assertCardOwner } from "../utils/actor.js";
import {
    ensureTrialStarted,
    assertNotLocked,
    isTrialDeleteDue,
    isEntitled,
    resolveBilling,
} from "../utils/trial.js";
import { HttpError } from "../utils/httpError.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { computeEntitlements } from "../utils/cardDTO.js";
import { processImage } from "../utils/processImage.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import { deleteCardCascade } from "../utils/cardDeleteCascade.js";

function extFromMime(mime) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "jpg";
}

function hashAnonymousId(anonId) {
    // Avoid leaking raw anonymousId in storage paths (still deterministic for cleanup).
    return crypto
        .createHash("sha256")
        .update(String(anonId))
        .digest("hex")
        .slice(0, 16);
}

function buildStoragePath({ actor, cardId, kind, mime }) {
    const safeKind = kind ? String(kind).trim().toLowerCase() : "asset";
    const ext = extFromMime(mime);
    const id = crypto.randomUUID();

    if (actor?.type === "user") {
        return `cards/user/${actor.id}/${cardId}/${safeKind}/${id}.${ext}`;
    }

    const anon =
        actor?.type === "anonymous" ? hashAnonymousId(actor.id) : "unknown";
    return `cards/anon/${anon}/${cardId}/${safeKind}/${id}.${ext}`;
}

function galleryCount(gallery) {
    return Array.isArray(gallery) ? gallery.length : 0;
}

function resolveUploadBucketForActor(actor) {
    if (actor?.type === "anonymous") {
        // Anonymous media must be private + accessed via signed URLs.
        return getAnonPrivateBucketName({ allowFallback: false });
    }
    return getPublicBucketName();
}

function resolveCleanupBucketsForActor(actor) {
    if (actor?.type !== "anonymous") return [getPublicBucketName()];
    const anon = getAnonPrivateBucketName({ allowFallback: true });
    const pub = getPublicBucketName();
    return Array.from(new Set([anon, pub].filter(Boolean)));
}

export async function uploadGalleryImage(req, res) {
    try {
        const { cardId } = req.body;

        if (!cardId) {
            return res.status(400).json({ message: "cardId is required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }

        const actor = resolveActor(req);
        try {
            assertCardOwner(card, actor);
        } catch (err) {
            if (err instanceof HttpError) {
                return res
                    .status(err.statusCode)
                    .json({ code: err.code, message: err.message });
            }
            throw err;
        }

        const now = new Date();

        // If deletion date reached and still not entitled -> delete card and block uploads.
        if (isTrialDeleteDue(card, now) && !isEntitled(card, now)) {
            try {
                const rawPaths = collectSupabasePathsFromCard(card);
                const paths = normalizeSupabasePaths(rawPaths);
                if (paths.length) {
                    const buckets = resolveCleanupBucketsForActor(actor);
                    await removeObjects({ paths, buckets });
                }
            } catch (err) {
                console.error("[uploadGalleryImage] supabase cleanup failed", {
                    cardId: String(card._id),
                    error: err?.message || err,
                });
                return res
                    .status(502)
                    .json({ message: "Failed to delete media" });
            }

            try {
                await deleteCardCascade({ cardId: card._id });
            } catch (err) {
                console.error("[uploadGalleryImage] cascade delete failed", {
                    cardId: String(card._id),
                    error: err?.message || err,
                });
                return res
                    .status(500)
                    .json({ message: "Failed to delete related data" });
            }

            await Card.deleteOne({ _id: card._id });
            return res.status(410).json({
                code: "TRIAL_DELETED",
                message: "Trial expired and card was deleted",
            });
        }

        // Block writes after expiry when not paid.
        try {
            assertNotLocked(card, now);
        } catch (err) {
            if (err instanceof HttpError) {
                return res
                    .status(err.statusCode)
                    .json({ code: err.code, message: err.message });
            }
            throw err;
        }

        // Gallery limit: driven by effective tier entitlements.
        const effectiveBilling = resolveBilling(card, now);
        const userTier =
            actor?.type === "user"
                ? await User.findById(String(actor.id))
                      .select("adminTier adminTierUntil")
                      .lean()
                : null;
        const effectiveTier = resolveEffectiveTier({
            card,
            user: userTier,
            effectiveBilling,
            now,
        });
        const entitlements = computeEntitlements(
            card,
            effectiveBilling,
            effectiveTier,
            now,
        );
        const limit = Number(entitlements?.galleryLimit) || 0;

        const currentCount = galleryCount(card.gallery);

        if (currentCount >= limit) {
            console.debug("[gallery] limit reached", {
                cardId: String(card._id),
                effectiveTier: effectiveTier?.tier,
                tierSource: effectiveTier?.source,
                billingPlan: effectiveBilling?.plan,
                limit,
                galleryCount: currentCount,
            });
            return res.status(422).json({
                message: `Gallery limit reached (${limit})`,
                code: "GALLERY_LIMIT_REACHED",
                limit,
            });
        }

        // ── Image canonicalization (sharp) ──
        const processed = await processImage(req.file.buffer, {
            kind: "gallery",
        });

        const storagePath = buildStoragePath({
            actor,
            cardId,
            kind: "gallery",
            mime: processed.mime,
        });

        const bucket = resolveUploadBucketForActor(actor);
        if (actor?.type === "anonymous" && !bucket) {
            return res.status(500).json({
                code: "ANON_PRIVATE_BUCKET_NOT_CONFIGURED",
                message: "Anonymous private media bucket is not configured",
            });
        }
        const signedUrlExpiresIn =
            actor?.type === "anonymous" ? getSignedUrlTtlSeconds() : null;

        const uploaded = await uploadBuffer({
            buffer: processed.buffer,
            mime: processed.mime,
            path: storagePath,
            bucket,
            signedUrlExpiresIn,
        });

        if (!uploaded?.url || !uploaded?.path) {
            return res.status(502).json({ message: "Upload failed" });
        }

        const item = {
            url: uploaded.url,
            path: uploaded.path,
            createdAt: new Date(),
        };

        console.debug("[supabase] upload", {
            cardId,
            kind: "gallery",
            path: uploaded.path,
        });

        // Ensure every uploaded asset has a deletion path tracked on the card.
        card.uploads = Array.isArray(card.uploads) ? card.uploads : [];
        card.uploads.push({
            kind: "gallery",
            url: uploaded.url,
            path: uploaded.path,
            createdAt: new Date(),
        });

        // Trial starts on first successful write (upload counts).
        ensureTrialStarted(card, now);

        card.gallery.push(item);

        // Safety net: prevent unrelated dirty reviews from failing uploads.
        if (Array.isArray(card.reviews)) {
            card.reviews = normalizeReviews(card.reviews);
        }
        await card.save();

        res.json({
            url: uploaded.url,
            path: uploaded.path,
            total: galleryCount(card.gallery),
            limit,
        });
    } catch (err) {
        if (err instanceof HttpError) {
            return res
                .status(err.statusCode)
                .json({ code: err.code, message: err.message });
        }
        console.error("[supabase] upload gallery failed", {
            cardId: req?.body?.cardId,
            error: err?.message || err,
        });
        res.status(500).json({ message: "Upload failed" });
    }
}

export async function uploadDesignAsset(req, res) {
    try {
        const { cardId, kind } = req.body;

        if (!cardId) {
            return res.status(400).json({ message: "cardId is required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }

        const actor = resolveActor(req);
        try {
            assertCardOwner(card, actor);
        } catch (err) {
            if (err instanceof HttpError) {
                return res
                    .status(err.statusCode)
                    .json({ code: err.code, message: err.message });
            }
            throw err;
        }

        const now = new Date();

        if (isTrialDeleteDue(card, now) && !isEntitled(card, now)) {
            try {
                const rawPaths = collectSupabasePathsFromCard(card);
                const paths = normalizeSupabasePaths(rawPaths);
                if (paths.length) {
                    const buckets = resolveCleanupBucketsForActor(actor);
                    await removeObjects({ paths, buckets });
                }
            } catch (err) {
                console.error("[uploadDesignAsset] supabase cleanup failed", {
                    cardId: String(card._id),
                    error: err?.message || err,
                });
                return res
                    .status(502)
                    .json({ message: "Failed to delete media" });
            }

            try {
                await deleteCardCascade({ cardId: card._id });
            } catch (err) {
                console.error("[uploadDesignAsset] cascade delete failed", {
                    cardId: String(card._id),
                    error: err?.message || err,
                });
                return res
                    .status(500)
                    .json({ message: "Failed to delete related data" });
            }

            await Card.deleteOne({ _id: card._id });
            return res.status(410).json({
                code: "TRIAL_DELETED",
                message: "Trial expired and card was deleted",
            });
        }

        try {
            assertNotLocked(card, now);
        } catch (err) {
            if (err instanceof HttpError) {
                return res
                    .status(err.statusCode)
                    .json({ code: err.code, message: err.message });
            }
            throw err;
        }

        // Supported `kind` values for this endpoint are intentionally flexible.
        // We normalize to keep storage paths and tracked upload kinds stable.
        // This now explicitly supports `kind=galleryThumb` for gallery thumbnails.
        const normalizedKind = kind ? String(kind).trim().toLowerCase() : "";
        const kindForStorage = normalizedKind || "design";

        // ── Image canonicalization (sharp) ──
        const processed = await processImage(req.file.buffer, {
            kind: normalizedKind || "design",
        });

        const storagePath = buildStoragePath({
            actor,
            cardId,
            kind: kindForStorage,
            mime: processed.mime,
        });

        const bucket = resolveUploadBucketForActor(actor);
        if (actor?.type === "anonymous" && !bucket) {
            return res.status(500).json({
                code: "ANON_PRIVATE_BUCKET_NOT_CONFIGURED",
                message: "Anonymous private media bucket is not configured",
            });
        }
        const signedUrlExpiresIn =
            actor?.type === "anonymous" ? getSignedUrlTtlSeconds() : null;

        const uploaded = await uploadBuffer({
            buffer: processed.buffer,
            mime: processed.mime,
            path: storagePath,
            bucket,
            signedUrlExpiresIn,
        });

        if (!uploaded?.url || !uploaded?.path) {
            return res.status(502).json({ message: "Upload failed" });
        }

        // Record for later deletion/cleanup even if client only persists URL fields.
        card.uploads = Array.isArray(card.uploads) ? card.uploads : [];
        card.uploads.push({
            kind: normalizedKind || null,
            url: uploaded.url,
            path: uploaded.path,
            createdAt: new Date(),
        });

        // Trial starts on first successful write (upload counts).
        ensureTrialStarted(card, now);

        console.debug("[supabase] upload", {
            cardId,
            kind: kindForStorage,
            path: uploaded.path,
        });

        // Optional: if client provides kind, store path hints on design for easier cleanup.

        // Best-effort cleanup: when replacing avatar/background, delete the previous object.
        // This only works when the previous upload stored a path hint on the card.
        if (normalizedKind === "background" || normalizedKind === "avatar") {
            const prevPath =
                normalizedKind === "background"
                    ? card?.design?.backgroundImagePath ||
                      card?.design?.coverImagePath
                    : card?.design?.avatarImagePath || card?.design?.logoPath;

            const safePrev =
                typeof prevPath === "string" ? prevPath.trim() : "";
            if (
                safePrev &&
                safePrev !== uploaded.path &&
                safePrev.startsWith("cards/")
            ) {
                try {
                    const buckets = resolveCleanupBucketsForActor(actor);
                    await removeObjects({ paths: [safePrev], buckets });
                    console.debug("[supabase] replaced", {
                        cardId,
                        kind: normalizedKind,
                        removedPath: safePrev,
                    });
                } catch (err) {
                    console.error("[supabase] replace cleanup failed", {
                        cardId,
                        kind: normalizedKind,
                        removedPath: safePrev,
                        error: err?.message || err,
                    });
                }
            }
        }

        if (normalizedKind === "background") {
            card.design = card.design || {};
            card.design.backgroundImagePath = uploaded.path;
            card.design.coverImagePath = uploaded.path;
        }
        if (normalizedKind === "avatar") {
            card.design = card.design || {};
            card.design.avatarImagePath = uploaded.path;
            card.design.logoPath = uploaded.path;
        }

        // Prune upload ledger for background/avatar to keep storage bounded.
        // Note: storage paths are UUID-based (new object per upload). We keep the latest N
        // and best-effort delete older Supabase objects.
        if (normalizedKind === "background" || normalizedKind === "avatar") {
            const MAX_KIND_UPLOADS = 5;
            const kindKey = normalizedKind;
            const uploads = Array.isArray(card.uploads) ? card.uploads : [];

            const kindUploads = uploads.filter(
                (u) =>
                    u &&
                    typeof u === "object" &&
                    u.kind === kindKey &&
                    typeof u.path === "string" &&
                    u.path.trim(),
            );

            if (kindUploads.length > MAX_KIND_UPLOADS) {
                const createdAtMs = (u) => {
                    try {
                        return u?.createdAt
                            ? new Date(u.createdAt).getTime()
                            : 0;
                    } catch {
                        return 0;
                    }
                };

                const sorted = [...kindUploads].sort(
                    (a, b) => createdAtMs(a) - createdAtMs(b),
                );
                const toDrop = sorted.slice(
                    0,
                    kindUploads.length - MAX_KIND_UPLOADS,
                );

                const dropKeys = new Set(
                    toDrop.map((u) => {
                        const p =
                            typeof u.path === "string" ? u.path.trim() : "";
                        const t = createdAtMs(u);
                        return `${p}|${t}`;
                    }),
                );

                const dropPaths = toDrop
                    .map((u) =>
                        typeof u.path === "string" ? u.path.trim() : "",
                    )
                    .filter(
                        (p) =>
                            p && p !== uploaded.path && p.startsWith("cards/"),
                    );

                if (dropPaths.length) {
                    try {
                        const buckets = resolveCleanupBucketsForActor(actor);
                        await removeObjects({ paths: dropPaths, buckets });
                        console.debug("[supabase] prune", {
                            cardId,
                            kind: kindKey,
                            removedCount: dropPaths.length,
                        });
                    } catch (err) {
                        console.error("[supabase] prune failed", {
                            cardId,
                            kind: kindKey,
                            error: err?.message || err,
                        });
                    }
                }

                // Remove pruned entries from the ledger (best-effort, bounded).
                card.uploads = uploads.filter((u) => {
                    if (!u || typeof u !== "object") return true;
                    if (u.kind !== kindKey) return true;
                    const p = typeof u.path === "string" ? u.path.trim() : "";
                    if (!p) return true;
                    const t = createdAtMs(u);
                    return !dropKeys.has(`${p}|${t}`);
                });
            }
        }

        // Safety net: prevent unrelated dirty reviews from failing uploads.
        if (Array.isArray(card.reviews)) {
            card.reviews = normalizeReviews(card.reviews);
        }

        await card.save();

        return res.json({ url: uploaded.url, path: uploaded.path });
    } catch (err) {
        if (err instanceof HttpError) {
            return res
                .status(err.statusCode)
                .json({ code: err.code, message: err.message });
        }
        console.error("[supabase] upload design failed", {
            cardId: req?.body?.cardId,
            kind: req?.body?.kind,
            error: err?.message || err,
        });
        return res.status(500).json({ message: "Upload failed" });
    }
}
