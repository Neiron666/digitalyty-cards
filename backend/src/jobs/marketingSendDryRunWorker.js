import { randomBytes } from "node:crypto";
import MarketingCampaign from "../models/MarketingCampaign.model.js";
import MarketingCampaignRecipient from "../models/MarketingCampaignRecipient.model.js";
import { revalidateMarketingRecipientUserIds } from "../utils/marketingRecipientEligibility.util.js";

// Marketing send DRY-RUN server worker — disabled-by-default rehearsal sweep.
//
// SCOPE / SAFETY (Phase 2A skeleton):
//   - DRY-RUN ONLY. This worker NEVER sends email, NEVER calls Mailjet, NEVER
//     mints unsubscribe tokens, NEVER renders email, and NEVER marks a real
//     recipient row as truly "sent" (no status:"sent", no sentAt, no provider
//     fields). It also NEVER mutates campaign status.
//   - It only rehearses the claim -> campaign-recheck -> eligibility-revalidate
//     -> skip/suppress/cancel -> RELEASE-eligible-back-to-pending mechanics, and
//     reclaims stuck "sending" rows. Eligible rows are released back to pending
//     with a cooldown so the campaign safely stays "queued" and send-status
//     never shows a misleading sent count.
//   - Disabled by default: schedules NO timers unless explicitly enabled AND in
//     dry-run mode AND send-to-list enabled. No new required env in disabled
//     mode; no startup fail-fast.
//
// FORBIDDEN (must never be imported here): mailjet.service.js,
// issueEmailUnsubscribeToken.util.js, marketingEmailRenderer.js,
// adminAudit.service.js, and any server/app/controller/route module.

const BOOT_DELAY_MS = 135 * 1000;

// ── Clamp helpers ─────────────────────────────────────────────────────────
function clampInt(raw, { min, max, fallback }) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    const floored = Math.floor(n);
    if (typeof min === "number" && floored < min) return min;
    if (typeof max === "number" && floored > max) return max;
    return floored;
}

function readConfig() {
    return {
        batchSize: clampInt(process.env.MARKETING_SEND_BATCH_SIZE, {
            min: 1,
            max: 50,
            fallback: 10,
        }),
        intervalMs: clampInt(process.env.MARKETING_SEND_WORKER_INTERVAL_MS, {
            min: 60_000,
            fallback: 300_000,
        }),
        lockTtlMs: clampInt(process.env.MARKETING_SEND_LOCK_TTL_MS, {
            min: 60_000,
            fallback: 300_000,
        }),
        maxAttempts: clampInt(process.env.MARKETING_SEND_MAX_ATTEMPTS, {
            min: 1,
            max: 20,
            fallback: 3,
        }),
        cooldownMs: clampInt(process.env.MARKETING_SEND_DRYRUN_COOLDOWN_MS, {
            min: 60_000,
            fallback: 300_000,
        }),
    };
}

// Module-level reentrancy guard — a tick already in flight is never doubled.
let running = false;

// Opaque, non-secret worker identity (no host/credential material).
const workerId = "mksend-dry-" + randomBytes(6).toString("hex");

// Map an eligibility skip reason to a recipient terminal status.
// OPTED_OUT -> suppressed; everything else -> skipped.
function statusForSkipReason(reason) {
    return reason === "OPTED_OUT" ? "suppressed" : "skipped";
}

/**
 * Reclaim rows stuck in "sending" past the lock TTL.
 * attempts < max  -> released back to pending with a cooldown.
 * attempts >= max -> failed with lastErrorCode "DRYRUN_STUCK".
 * Returns { reclaimed, failed } counts only.
 */
async function reclaimStuckSending(now, cfg) {
    const cutoff = new Date(now.getTime() - cfg.lockTtlMs);
    let reclaimed = 0;
    let failed = 0;

    // Bounded scan of stuck "sending" rows (lockedAt older than TTL). In
    // dry-run, eligible rows are released immediately, so "sending" cardinality
    // is tiny; a bounded lockedAt scan is acceptable for this slice.
    const stuck = await MarketingCampaignRecipient.find({
        status: "sending",
        lockedAt: { $ne: null, $lte: cutoff },
    })
        .select({ _id: 1, attempts: 1 })
        .sort({ lockedAt: 1 })
        .limit(cfg.batchSize)
        .lean();

    for (const row of stuck) {
        const attempts = Number(row?.attempts) || 0;
        if (attempts >= cfg.maxAttempts) {
            const res = await MarketingCampaignRecipient.updateOne(
                { _id: row._id, status: "sending" },
                {
                    $set: {
                        status: "failed",
                        failedAt: now,
                        lastErrorCode: "DRYRUN_STUCK",
                    },
                    $unset: { lockedAt: "", claimedBy: "" },
                },
            );
            if (res?.modifiedCount) failed += 1;
        } else {
            const res = await MarketingCampaignRecipient.updateOne(
                { _id: row._id, status: "sending" },
                {
                    $set: {
                        status: "pending",
                        nextAttemptAt: new Date(now.getTime() + cfg.cooldownMs),
                    },
                    $unset: { lockedAt: "", claimedBy: "" },
                },
            );
            if (res?.modifiedCount) reclaimed += 1;
        }
    }

    return { reclaimed, failed };
}

/**
 * Atomically claim one pending, due recipient row.
 * Returns the claimed row (lean-like doc) or null.
 */
async function claimOnePending(now) {
    return MarketingCampaignRecipient.findOneAndUpdate(
        { status: "pending", nextAttemptAt: { $lte: now } },
        {
            $set: {
                status: "sending",
                lockedAt: now,
                claimedBy: workerId,
                lastAttemptAt: now,
            },
            $inc: { attempts: 1 },
        },
        { new: true, sort: { nextAttemptAt: 1 } },
    );
}

/**
 * Resolve a single claimed row under dry-run semantics.
 * Returns one of: "canceled" | "skipped" | "suppressed" | "released".
 */
async function resolveClaimedRow(row, now, cfg) {
    // Load campaign status ONLY — no content/selection snapshots.
    const campaign = await MarketingCampaign.findById(row.campaignId)
        .select({ status: 1 })
        .lean();

    const campaignStatus = campaign?.status;

    // Campaign no longer active -> cancel the row. No eligibility check.
    if (campaignStatus !== "queued" && campaignStatus !== "sending") {
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: { status: "canceled", canceledAt: now },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        return "canceled";
    }

    // Campaign active -> re-check eligibility via the SSoT predicate.
    const result = await revalidateMarketingRecipientUserIds([
        String(row.userId),
    ]);

    const isEligible =
        Array.isArray(result?.eligibleUserIds) &&
        result.eligibleUserIds.includes(String(row.userId));

    if (!isEligible) {
        const reason = result?.skipped?.[0]?.reason || "UNKNOWN";
        const status = statusForSkipReason(reason);
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: { status, skipReason: reason },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        return status === "suppressed" ? "suppressed" : "skipped";
    }

    // Eligible in DRY-RUN -> RELEASE back to pending with cooldown. NEVER mark
    // sent; NEVER set sentAt/provider fields; NEVER touch campaign status.
    await MarketingCampaignRecipient.updateOne(
        { _id: row._id, status: "sending" },
        {
            $set: {
                status: "pending",
                nextAttemptAt: new Date(now.getTime() + cfg.cooldownMs),
                dryRunOnly: true,
                lastErrorCode: "DRYRUN_VERIFIED",
            },
            $unset: { lockedAt: "", claimedBy: "" },
        },
    );
    return "released";
}

/**
 * One dry-run sweep. Reclaims stuck rows first, then claims up to batchSize
 * pending rows and resolves each. Returns counts-only summary.
 *
 * Exported for Phase 3 runtime smoke. Still respects all dry-run boundaries and
 * imports no Mailjet/token/render module.
 */
export async function runMarketingSendDryRunOnce() {
    const cfg = readConfig();
    const now = new Date();

    const counts = {
        claimed: 0,
        released: 0,
        skipped: 0,
        suppressed: 0,
        canceled: 0,
        reclaimed: 0,
        failed: 0,
    };

    // 1. Reclaim stuck "sending" rows first so they can re-enter the pool.
    const reclaim = await reclaimStuckSending(now, cfg);
    counts.reclaimed = reclaim.reclaimed;
    counts.failed = reclaim.failed;

    // 2. Claim + resolve up to batchSize pending rows.
    for (let i = 0; i < cfg.batchSize; i += 1) {
        const row = await claimOnePending(now);
        if (!row) break;
        counts.claimed += 1;

        const outcome = await resolveClaimedRow(row, now, cfg);
        if (outcome === "canceled") counts.canceled += 1;
        else if (outcome === "skipped") counts.skipped += 1;
        else if (outcome === "suppressed") counts.suppressed += 1;
        else if (outcome === "released") counts.released += 1;
    }

    return counts;
}

async function sweepOnce() {
    if (running) return;
    running = true;
    try {
        const counts = await runMarketingSendDryRunOnce();
        console.log("[marketing-send-dry-run] sweep done", counts);
    } catch (err) {
        console.error(
            "[marketing-send-dry-run] sweep failed",
            err?.message || err,
        );
    } finally {
        running = false;
    }
}

/**
 * Schedule the dry-run server worker. Disabled by default: returns WITHOUT
 * registering any timer unless explicitly enabled, in dry-run mode, and with
 * send-to-list enabled. No new required env in disabled mode; no fail-fast.
 */
export function startMarketingSendDryRunWorker({ intervalMs } = {}) {
    if (process.env.MARKETING_SEND_WORKER_ENABLED !== "true") {
        console.log("[marketing-send-dry-run] disabled");
        return;
    }
    if (process.env.MARKETING_SEND_WORKER_DRY_RUN_ONLY === "false") {
        console.log(
            "[marketing-send-dry-run] refused: real mode not supported",
        );
        return;
    }
    // Belt-and-braces: this worker is a rehearsal only and must not schedule
    // while the list-send capability is disabled.
    if (process.env.MARKETING_SEND_TO_LIST_ENABLED !== "true") {
        console.log("[marketing-send-dry-run] disabled: send-to-list disabled");
        return;
    }

    const cfg = readConfig();
    const effectiveIntervalMs =
        Number.isFinite(intervalMs) && intervalMs >= 60_000
            ? Math.floor(intervalMs)
            : cfg.intervalMs;

    setTimeout(() => {
        sweepOnce();
    }, BOOT_DELAY_MS);

    setInterval(() => {
        sweepOnce();
    }, effectiveIntervalMs);

    console.log("[marketing-send-dry-run] scheduled", {
        intervalMs: effectiveIntervalMs,
        bootDelayMs: BOOT_DELAY_MS,
        batchSize: cfg.batchSize,
    });
}
