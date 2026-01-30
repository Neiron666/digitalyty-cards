import Card from "../models/Card.model.js";
import {
    removeObjects,
    getAnonPrivateBucketName,
    getPublicBucketName,
} from "../services/supabaseStorage.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import { deleteCardCascade } from "../utils/cardDeleteCascade.js";
import { isEntitled } from "../utils/trial.js";

let running = false;

async function cleanupOnce() {
    if (running) return;
    running = true;

    const now = new Date();

    try {
        // Select only what we need.
        const candidates = await Card.find({
            isActive: true,
            trialDeleteAt: { $ne: null, $lte: now },
        }).select(
            "trialDeleteAt trialEndsAt billing plan uploads gallery design anonymousId user",
        );

        let deletedCount = 0;
        let skippedPaid = 0;
        let removedObjectCount = 0;

        for (const card of candidates) {
            if (isEntitled(card, now)) {
                skippedPaid += 1;
                continue;
            }

            const rawPaths = collectSupabasePathsFromCard(card);
            const paths = normalizeSupabasePaths(rawPaths);

            if (paths.length) {
                try {
                    const isAnonymousOwned =
                        !card?.user && Boolean(card?.anonymousId);
                    const buckets = isAnonymousOwned
                        ? Array.from(
                              new Set(
                                  [
                                      getAnonPrivateBucketName({
                                          allowFallback: true,
                                      }),
                                      getPublicBucketName(),
                                  ].filter(Boolean),
                              ),
                          )
                        : [getPublicBucketName()];

                    await removeObjects({ paths, buckets });
                    removedObjectCount += paths.length;
                } catch (err) {
                    console.error("[trial-cleanup] supabase remove failed", {
                        cardId: String(card._id),
                        error: err?.message || err,
                    });
                    // Do not delete the card if media removal failed.
                    continue;
                }
            }

            try {
                await deleteCardCascade({ cardId: card._id });
            } catch (err) {
                console.error("[trial-cleanup] cascade delete failed", {
                    cardId: String(card._id),
                    error: err?.message || err,
                });
                // Do not delete the card if related data removal failed.
                continue;
            }

            await Card.deleteOne({ _id: card._id });
            deletedCount += 1;
        }

        if (candidates.length) {
            console.log("[trial-cleanup] done", {
                candidates: candidates.length,
                deletedCount,
                skippedPaid,
                removedObjectCount,
            });
        }
    } catch (err) {
        console.error("[trial-cleanup] failed", err?.message || err);
    } finally {
        running = false;
    }
}

export function startTrialCleanupJob({ intervalMs = 60 * 60 * 1000 } = {}) {
    // Run once shortly after boot, then periodically.
    setTimeout(() => {
        cleanupOnce();
    }, 15 * 1000);

    setInterval(() => {
        cleanupOnce();
    }, intervalMs);

    console.log("[trial-cleanup] scheduled", { intervalMs });
}
