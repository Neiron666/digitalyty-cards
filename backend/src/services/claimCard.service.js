import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import {
    copyObjectBetweenBuckets,
    getAnonPrivateBucketName,
    getPublicBucketName,
    getPublicUrlForPath,
    removeObjects,
} from "./supabaseStorage.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";

function isPlainObject(v) {
    return (
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.prototype.toString.call(v) === "[object Object]"
    );
}

function computeUserPathFromAnonPath({ userId, cardId, path }) {
    const p = typeof path === "string" ? path.trim() : "";
    if (!p) return null;
    if (!p.startsWith("cards/anon/")) return null;

    // Format: cards/anon/{anonHash}/{cardId}/{kind}/{file}
    const parts = p.split("/").filter(Boolean);
    // parts[0]=cards, [1]=anon, [2]=hash, [3]=cardId, [4]=kind, [5..]=file segments
    if (parts.length < 6) return null;
    const kind = parts[4];
    const file = parts.slice(5).join("/");
    if (!kind || !file) return null;

    return `cards/user/${userId}/${cardId}/${kind}/${file}`;
}

async function migrateAnonMediaToUser({ card, userId }) {
    const publicBucket = getPublicBucketName();
    const anonBucket = getAnonPrivateBucketName({ allowFallback: true });

    // Source buckets: try anon-private first, then public (back-compat).
    const sourceBuckets = Array.from(
        new Set([anonBucket, publicBucket].filter(Boolean)),
    );

    const rawPaths = collectSupabasePathsFromCard(card);
    const paths = normalizeSupabasePaths(rawPaths);

    const cardId = String(card?._id || "");
    if (!cardId)
        return { ok: false, code: "INVALID_CARD", message: "Invalid card" };

    const mapping = new Map();
    for (const p of paths) {
        const next = computeUserPathFromAnonPath({ userId, cardId, path: p });
        if (next) mapping.set(p, next);
    }

    // No anon paths -> nothing to migrate.
    if (mapping.size === 0) return { ok: true, migrated: false, mapping };

    // Copy all objects first (idempotent). If any fail -> do NOT change Mongo ownership.
    for (const [fromPath, toPath] of mapping.entries()) {
        let copied = false;
        let lastErr = null;

        for (const b of sourceBuckets) {
            try {
                await copyObjectBetweenBuckets({
                    fromBucket: b,
                    toBucket: publicBucket,
                    fromPath,
                    toPath,
                });
                copied = true;
                break;
            } catch (err) {
                lastErr = err;
            }
        }

        if (!copied) {
            console.error("[claim] media copy failed", {
                cardId,
                fromPath,
                toPath,
                error: lastErr?.message || lastErr,
            });
            return {
                ok: false,
                code: "MEDIA_MIGRATION_FAILED",
                message: "Failed to migrate one or more media files",
            };
        }
    }

    return {
        ok: true,
        migrated: true,
        mapping,
        publicBucket,
        sourceBuckets,
    };
}

export async function claimAnonymousCardForUser({
    userId,
    anonymousId,
    strict,
}) {
    const uid = typeof userId === "string" ? userId : String(userId || "");
    const aid =
        typeof anonymousId === "string"
            ? anonymousId
            : String(anonymousId || "");

    if (!uid) {
        return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
    }

    if (!aid) {
        if (strict)
            return {
                ok: false,
                code: "MISSING_ANON_ID",
                message: "Missing anonymousId",
            };
        return { ok: true, claimed: false, card: null };
    }

    const user = await User.findById(uid);
    if (!user) {
        return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
    }

    if (user.cardId) {
        if (strict) {
            return {
                ok: false,
                code: "USER_ALREADY_HAS_CARD",
                message: "User already has a card",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    const card = await Card.findOne({ anonymousId: aid });
    if (!card) {
        if (strict) {
            return {
                ok: false,
                code: "NO_ANON_CARD",
                message: "No anonymous card to claim",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    if (card.user) {
        if (strict) {
            return {
                ok: false,
                code: "CARD_ALREADY_CLAIMED",
                message: "Card already claimed",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    // Migrate media BEFORE switching ownership.
    const media = await migrateAnonMediaToUser({
        card,
        userId: String(user._id),
    });
    if (!media.ok) return media;

    // If we migrated media, rewrite paths + rewrite URLs to permanent public URLs.
    if (media.migrated && media.mapping && media.mapping.size) {
        const mapping = media.mapping;
        const publicBucket = media.publicBucket;

        const design = isPlainObject(card.design) ? card.design : {};
        for (const k of [
            "backgroundImagePath",
            "coverImagePath",
            "avatarImagePath",
            "logoPath",
        ]) {
            const p = typeof design[k] === "string" ? design[k].trim() : "";
            if (p && mapping.get(p)) design[k] = mapping.get(p);
        }

        // Promote URL fields to stable public URLs when we have a path.
        const bgPath =
            typeof design.backgroundImagePath === "string"
                ? design.backgroundImagePath.trim()
                : typeof design.coverImagePath === "string"
                  ? design.coverImagePath.trim()
                  : "";
        const avPath =
            typeof design.avatarImagePath === "string"
                ? design.avatarImagePath.trim()
                : typeof design.logoPath === "string"
                  ? design.logoPath.trim()
                  : "";

        const bgUrl = bgPath
            ? getPublicUrlForPath({ bucket: publicBucket, path: bgPath })
            : null;
        const avUrl = avPath
            ? getPublicUrlForPath({ bucket: publicBucket, path: avPath })
            : null;
        if (bgUrl) {
            design.backgroundImage = bgUrl;
            design.coverImage = bgUrl;
        }
        if (avUrl) {
            design.avatarImage = avUrl;
            design.logo = avUrl;
        }

        card.design = { ...design };

        if (Array.isArray(card.gallery)) {
            card.gallery = card.gallery.map((item) => {
                const base =
                    item && typeof item.toObject === "function"
                        ? item.toObject()
                        : item;
                if (!isPlainObject(base)) return item;
                const next = { ...base };
                const p = typeof next.path === "string" ? next.path.trim() : "";
                const t =
                    typeof next.thumbPath === "string"
                        ? next.thumbPath.trim()
                        : "";
                if (p && mapping.get(p)) next.path = mapping.get(p);
                if (t && mapping.get(t)) next.thumbPath = mapping.get(t);

                const fullPath =
                    typeof next.path === "string" ? next.path.trim() : "";
                const thumbPath =
                    typeof next.thumbPath === "string"
                        ? next.thumbPath.trim()
                        : "";
                const fullUrl = fullPath
                    ? getPublicUrlForPath({
                          bucket: publicBucket,
                          path: fullPath,
                      })
                    : null;
                const thumbUrl = thumbPath
                    ? getPublicUrlForPath({
                          bucket: publicBucket,
                          path: thumbPath,
                      })
                    : null;
                if (fullUrl) next.url = fullUrl;
                if (thumbUrl) next.thumbUrl = thumbUrl;
                return next;
            });
        }

        if (Array.isArray(card.uploads)) {
            card.uploads = card.uploads.map((u) => {
                const base =
                    u && typeof u.toObject === "function" ? u.toObject() : u;
                if (!isPlainObject(base)) return u;
                const next = { ...base };
                const p = typeof next.path === "string" ? next.path.trim() : "";
                if (p && mapping.get(p)) next.path = mapping.get(p);
                const newPath =
                    typeof next.path === "string" ? next.path.trim() : "";
                const url = newPath
                    ? getPublicUrlForPath({
                          bucket: publicBucket,
                          path: newPath,
                      })
                    : null;
                if (url) next.url = url;
                return next;
            });
        }
    }

    card.user = user._id;
    card.anonymousId = undefined;
    await card.save();

    user.cardId = card._id;
    await user.save();

    // Best-effort cleanup of old anon objects AFTER Mongo commit.
    if (media.migrated && media.mapping && media.mapping.size) {
        try {
            const oldPaths = Array.from(media.mapping.keys());
            const buckets = Array.isArray(media.sourceBuckets)
                ? media.sourceBuckets
                : [];
            await removeObjects({ paths: oldPaths, buckets });
        } catch {
            // ignore
        }
    }

    return { ok: true, claimed: true, card };
}
