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
import { resolveBilling } from "../utils/trial.js";
import * as Sentry from "@sentry/node";

const MONITOR_SLUG = "trial-cleanup";
let monitorIntervalMs = 60 * 60 * 1000;

let running = false;
let lastHeartbeatAt = 0;
const DEFAULT_HEARTBEAT_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_MS = Math.max(
    DEFAULT_HEARTBEAT_MS,
    Number(process.env.TRIAL_CLEANUP_HEARTBEAT_MS) || DEFAULT_HEARTBEAT_MS,
);

async function cleanupOnce() {
    if (running) return;
    running = true;

    const now = new Date();
    const anonTtlDaysRaw = Number(process.env.ANON_CARD_TTL_DAYS);
    const anonTtlDays = Number.isFinite(anonTtlDaysRaw) ? anonTtlDaysRaw : 14;
    const anonTtlMs = Math.max(1, anonTtlDays) * 24 * 60 * 60 * 1000;
    const anonCutoff = new Date(now.getTime() - anonTtlMs);

    const sweep = async () => {
        // Select only what we need.
        const candidates = await Card.find({
            isActive: true,
            // Never clean up user-owned cards.
            // Note: in Mongo, { user: null } matches null OR missing fields.
            user: null,
            // Only anonymous-owned cards are eligible for cleanup.
            anonymousId: { $exists: true, $ne: null },
            // Safety guard: never delete published cards.
            status: { $ne: "published" },
            // Policy B: delete only by inactivity TTL (updatedAt cutoff).
            updatedAt: { $lte: anonCutoff },
        }).select(
            "billing plan uploads gallery design anonymousId user status updatedAt",
        );

        let deletedCount = 0;
        let deletedAnonStaleCount = 0;
        let failedStorageDeletesCount = 0;
        let skippedPaid = 0;
        let removedObjectCount = 0;

        for (const card of candidates) {
            // IMPORTANT: do NOT use isEntitled() gating here.
            // Policy B deletes anonymous cards by inactivity TTL regardless of trial/entitlement.
            // Safety-net: skip only if a malformed user:null doc somehow has paid/admin override.
            const billing = resolveBilling(card, now);
            if (
                billing?.source === "billing" ||
                billing?.source === "adminOverride"
            ) {
                skippedPaid += 1;
                continue;
            }

            const isAnonStale = Boolean(card?.updatedAt)
                ? new Date(card.updatedAt).getTime() <= anonCutoff.getTime()
                : false;

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
                    failedStorageDeletesCount += 1;
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

            if (isAnonStale) deletedAnonStaleCount += 1;
        }

        if (candidates.length) {
            console.log("[trial-cleanup] done", {
                candidates: candidates.length,
                deletedCount,
                deletedAnonStaleCount,
                failedStorageDeletesCount,
                skippedPaid,
                removedObjectCount,
                anonTtlDays: Math.max(1, anonTtlDays),
            });
        } else {
            const nowMs = Date.now();
            if (nowMs - lastHeartbeatAt >= HEARTBEAT_MS) {
                console.log("[trial-cleanup] heartbeat", {
                    candidates: 0,
                    anonTtlDays: Math.max(1, anonTtlDays),
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
            maxRuntime: 10,
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
        console.error("[trial-cleanup] failed", err?.message || err);
    } finally {
        running = false;
    }
}

export function startTrialCleanupJob({ intervalMs = 60 * 60 * 1000 } = {}) {
    monitorIntervalMs = intervalMs;

    // Run once shortly after boot, then periodically.
    setTimeout(() => {
        cleanupOnce();
    }, 15 * 1000);

    setInterval(() => {
        cleanupOnce();
    }, intervalMs);

    console.log("[trial-cleanup] scheduled", { intervalMs });
}
