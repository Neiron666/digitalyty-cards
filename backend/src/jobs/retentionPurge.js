import Card from "../models/Card.model.js";
import { resolveBilling } from "../utils/trial.js";
import {
    removeObjects,
    getPublicBucketName,
} from "../services/supabaseStorage.js";
import { normalizeSupabasePaths } from "../utils/supabasePaths.js";
import {
    RETENTION_GRACE_MS,
    PREMIUM_CONTACT_FIELDS,
} from "../config/retention.js";
import * as Sentry from "@sentry/node";

const MONITOR_SLUG = "retention-purge";
let monitorIntervalMs = 6 * 60 * 60 * 1000;

let running = false;
let lastHeartbeatAt = 0;
const DEFAULT_HEARTBEAT_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.RETENTION_PURGE_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

/**
 * Collect Supabase storage paths from gallery items that will be removed.
 * Only items with concrete .path / .thumbPath can be deleted from storage.
 * Legacy string-only items are trimmed from DB but not from storage.
 */
function collectGalleryOverflowPaths(galleryItems) {
    const paths = [];
    for (const item of galleryItems) {
        if (!item || typeof item !== "object") continue;
        if (typeof item.path === "string" && item.path.trim()) {
            paths.push(item.path.trim());
        }
        if (typeof item.thumbPath === "string" && item.thumbPath.trim()) {
            paths.push(item.thumbPath.trim());
        }
    }
    return normalizeSupabasePaths(paths);
}

/**
 * Build the set of Supabase paths from overflow gallery items,
 * so we can filter uploads[] ledger entries that reference them.
 */
function collectGalleryOverflowPathSet(galleryItems) {
    const pathSet = new Set();
    for (const item of galleryItems) {
        if (!item || typeof item !== "object") continue;
        if (typeof item.path === "string" && item.path.trim()) {
            pathSet.add(item.path.trim());
        }
        if (typeof item.thumbPath === "string" && item.thumbPath.trim()) {
            pathSet.add(item.thumbPath.trim());
        }
    }
    return pathSet;
}

async function purgeOnce() {
    if (running) return;
    running = true;

    const now = new Date();
    const cutoff = new Date(now.getTime() - RETENTION_GRACE_MS);

    const sweep = async () => {
        // Find downgraded cards past the retention window that haven't been purged yet.
        const candidates = await Card.find({
            downgradedAt: { $ne: null, $lte: cutoff },
            retentionPurgedAt: null,
            user: { $ne: null },
        }).select(
            "_id billing adminOverride user content businessHours bookingSettings contact gallery uploads",
        );

        let purgedCount = 0;
        let skippedPaidOrOverride = 0;
        let storageDeletedCount = 0;
        let storageFailedCount = 0;

        for (const card of candidates) {
            // Defense-in-depth: if the card has been re-upgraded or admin-overridden,
            // skip - do NOT purge legitimate premium data.
            const billing = resolveBilling(card, now);
            if (
                billing?.source === "billing" ||
                billing?.source === "adminOverride"
            ) {
                skippedPaidOrOverride += 1;
                continue;
            }

            // --- Build $set and $unset operations ---
            const $set = {};
            const $unset = {};

            // 1) content.aboutParagraphs → keep first only
            const paragraphs = card?.content?.aboutParagraphs;
            if (Array.isArray(paragraphs) && paragraphs.length > 1) {
                $set["content.aboutParagraphs"] = paragraphs.slice(0, 1);
            }

            // 2) content.services → remove
            if (card?.content?.services != null) {
                $unset["content.services"] = "";
            }

            // 3) content.videoUrl → remove
            if (card?.content?.videoUrl != null) {
                $unset["content.videoUrl"] = "";
            }

            // 4) businessHours → remove
            if (card?.businessHours != null) {
                $unset.businessHours = "";
            }

            // 5) bookingSettings → remove
            if (card?.bookingSettings != null) {
                $unset.bookingSettings = "";
            }

            // 6) premium contact/social fields → remove
            for (const field of PREMIUM_CONTACT_FIELDS) {
                // field is "contact.facebook" etc.
                const [, key] = field.split(".");
                if (key && card?.contact?.[key] != null) {
                    $unset[field] = "";
                }
            }

            // 7) gallery is premium-only - purge all items on free.
            const gallery = card?.gallery;
            let purgedGalleryItems = [];
            if (Array.isArray(gallery) && gallery.length > 0) {
                purgedGalleryItems = gallery;
                $set.gallery = [];
            }

            // 8) uploads[] ledger cleanup for purged gallery items
            const purgedPathSet =
                collectGalleryOverflowPathSet(purgedGalleryItems);
            const uploads = card?.uploads;
            if (purgedPathSet.size > 0 && Array.isArray(uploads)) {
                const keptUploads = uploads.filter((u) => {
                    if (!u || typeof u !== "object") return true;
                    const p = typeof u.path === "string" ? u.path.trim() : "";
                    if (!p) return true;
                    return !purgedPathSet.has(p);
                });
                if (keptUploads.length !== uploads.length) {
                    $set.uploads = keptUploads;
                }
            }

            // --- Supabase deletion for gallery overflow ---
            // If removable storage paths exist, deletion MUST succeed before
            // DB purge proceeds. Failure → skip this card, retry next run.
            let storageDeleteFailed = false;
            if (purgedGalleryItems.length > 0) {
                const storagePaths =
                    collectGalleryOverflowPaths(purgedGalleryItems);
                if (storagePaths.length > 0) {
                    try {
                        // User-owned cards use the public bucket.
                        await removeObjects({
                            paths: storagePaths,
                            bucket: getPublicBucketName(),
                        });
                        storageDeletedCount += storagePaths.length;
                    } catch (err) {
                        console.error(
                            "[retention-purge] supabase remove failed, skipping card",
                            {
                                cardId: String(card._id),
                                error: err?.message || err,
                            },
                        );
                        storageFailedCount += 1;
                        storageDeleteFailed = true;
                    }
                }
            }

            // If storage deletion failed for this card, do NOT stamp
            // retentionPurgedAt and do NOT apply DB purge - retry next run.
            if (storageDeleteFailed) continue;

            // Stamp retentionPurgedAt.
            $set.retentionPurgedAt = now;

            // Build final update.
            const update = {};
            if (Object.keys($set).length > 0) update.$set = $set;
            if (Object.keys($unset).length > 0) update.$unset = $unset;

            // Guard: only update if still not purged (race protection).
            await Card.updateOne(
                { _id: card._id, retentionPurgedAt: null },
                update,
            );
            purgedCount += 1;
        }

        if (candidates.length) {
            console.log("[retention-purge] done", {
                candidates: candidates.length,
                purgedCount,
                skippedPaidOrOverride,
                storageDeletedCount,
                storageFailedCount,
            });
        } else {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[retention-purge] heartbeat", {
                    candidates: 0,
                    heartbeatMs: HEARTBEAT_MS,
                    sinceLastHeartbeatMs: lastHeartbeatAt
                        ? nowMs - lastHeartbeatAt
                        : null,
                });
                lastHeartbeatAt = nowMs;
            }
        }
    };

    try {
        const intervalMinutes = Math.max(
            1,
            Math.round(monitorIntervalMs / 60000),
        );
        const monitorConfig = {
            schedule: {
                type: "interval",
                value: intervalMinutes,
                unit: "minute",
            },
            checkinMargin: 5,
            maxRuntime: 15,
            timezone: "UTC",
            failureIssueThreshold: 2,
            recoveryThreshold: 1,
        };

        const sentryActive =
            typeof Sentry.getClient === "function" && !!Sentry.getClient();

        if (sentryActive) {
            await Sentry.withMonitor(MONITOR_SLUG, sweep, monitorConfig);
        } else {
            await sweep();
        }
    } catch (err) {
        console.error("[retention-purge] failed", err?.message || err);
    } finally {
        running = false;
    }
}

export function startRetentionPurgeJob({
    intervalMs = 6 * 60 * 60 * 1000,
} = {}) {
    monitorIntervalMs = intervalMs;

    // Run once shortly after boot (staggered after existing workers), then periodically.
    setTimeout(() => {
        purgeOnce();
    }, 60 * 1000);

    setInterval(() => {
        purgeOnce();
    }, intervalMs);

    console.log("[retention-purge] scheduled", { intervalMs });
}
