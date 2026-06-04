// Marketing campaign REAL-SEND worker — per-recipient real Mailjet send.
//
// SCOPE / SAFETY:
//   - DISABLED BY DEFAULT: recurring scheduler requires
//     MARKETING_REAL_SEND_WORKER_ENABLED=true to register timers.
//     Manual runOnce gate: MARKETING_REAL_SEND_RUN_ONCE_ENABLED=true (separate).
//   - Sends exactly one real marketing email per processOneMarketingRealSend() call.
//   - Revalidates eligibility at send time (never trusts start-time snapshot).
//   - Mints a per-recipient unsubscribe token before any provider call.
//   - Fails closed: no email sent without a valid, persisted unsubscribeTokenId.
//   - Never marks a row "sent" without a confirmed ok:true provider response.
//   - Ambiguous policy: if a stale "sending" row has evidence fields
//     (providerMessageId or unsubscribeTokenId), it is marked "failed" with
//     providerErrorSafe:"AMBIGUOUS_PRIOR_SEND" — never auto-retried.
//   - Refuses to schedule if dry-run worker (MARKETING_SEND_WORKER_ENABLED) is
//     also enabled — prevents claim-pool collision.
//   - No AdminAudit (recipient row IS the audit trail).
//
// EXPORTS:
//   runMarketingRealSendOnce      — manual operator gate (RUN_ONCE flag required)
//   runMarketingRealSendSweepOnce — cardigo_ci operator smoke (WORKER_ENABLED flag)
//   startMarketingRealSendWorker  — recurring scheduler, disabled by default
//
// FORBIDDEN IMPORTS: adminAudit.service.js, server.js, app.js, routes,
//   controllers, dry-run worker, MailJob, resetMailWorker, any frontend module.

import MarketingCampaign from "../models/MarketingCampaign.model.js";
import MarketingCampaignRecipient from "../models/MarketingCampaignRecipient.model.js";
import User from "../models/User.model.js";
import { revalidateMarketingRecipientUserIds } from "../utils/marketingRecipientEligibility.util.js";
import { issueEmailUnsubscribeToken } from "../utils/issueEmailUnsubscribeToken.util.js";
import { renderMarketingEmailCore } from "../services/marketingEmailRenderer.js";
import { sendMarketingCampaignEmailBestEffort } from "../services/mailjet.service.js";

// Opaque non-secret worker identity (no host / credential material).
// Randomised per process start so parallel restarts are distinguishable.
const workerId = "mkrealsend-" + Math.random().toString(36).slice(2, 10);

// Module-level reentrancy guard: prevents concurrent sweep ticks from
// overlapping if a sweep takes longer than one interval period.
let running = false;

// ── Config helpers ────────────────────────────────────────────────────────────

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
        // How long a "sending" lock is considered fresh before reclaim.
        lockTtlMs: clampInt(process.env.MARKETING_REAL_SEND_LOCK_TTL_MS, {
            min: 60_000,
            fallback: 300_000,
        }),
        // Max claim attempts before a row is permanently failed.
        maxAttempts: clampInt(process.env.MARKETING_REAL_SEND_MAX_ATTEMPTS, {
            min: 1,
            max: 20,
            fallback: 3,
        }),
        // Cooldown between retries when re-queuing a releasable stuck row.
        cooldownMs: clampInt(process.env.MARKETING_REAL_SEND_COOLDOWN_MS, {
            min: 60_000,
            fallback: 300_000,
        }),
        // Max stale rows reclaimed per processOneMarketingRealSend invocation.
        reclaimBatchSize: clampInt(
            process.env.MARKETING_REAL_SEND_RECLAIM_BATCH_SIZE,
            { min: 1, max: 50, fallback: 10 },
        ),
        // Scheduler: max recipient rows claimed per sweep tick. Default 1 (safest).
        batchSize: clampInt(process.env.MARKETING_REAL_SEND_BATCH_SIZE, {
            min: 1,
            max: 10,
            fallback: 1,
        }),
        // Scheduler: interval between sweep ticks in ms. Default 10 min.
        intervalMs: clampInt(process.env.MARKETING_REAL_SEND_INTERVAL_MS, {
            min: 60_000,
            fallback: 600_000,
        }),
        // Scheduler: delay before first sweep after server start. Default 2m15s.
        bootDelayMs: clampInt(process.env.MARKETING_REAL_SEND_BOOT_DELAY_MS, {
            min: 0,
            fallback: 135_000,
        }),
    };
}

// ── Reclaim stale "sending" rows ─────────────────────────────────────────────
//
// Key difference from dry-run worker:
//   - Evidence present (providerMessageId or unsubscribeTokenId non-null):
//     unknown provider delivery state → mark failed AMBIGUOUS_PRIOR_SEND,
//     do NOT auto-retry.
//   - No evidence + attempts >= maxAttempts → mark failed REAL_SEND_STUCK.
//   - No evidence + attempts < maxAttempts → release to pending with cooldown.

async function reclaimStaleRows(now, cfg) {
    const cutoff = new Date(now.getTime() - cfg.lockTtlMs);
    let reclaimed = 0;
    let ambiguous = 0;
    let failedFromReclaim = 0;

    const stuckRows = await MarketingCampaignRecipient.find({
        status: "sending",
        lockedAt: { $ne: null, $lte: cutoff },
    })
        .select({
            _id: 1,
            attempts: 1,
            providerMessageId: 1,
            unsubscribeTokenId: 1,
        })
        .sort({ lockedAt: 1 })
        .limit(cfg.reclaimBatchSize)
        .lean();

    for (const stuckRow of stuckRows) {
        // Check for any evidence that a provider call may have been attempted.
        const hasEvidence =
            stuckRow.providerMessageId != null ||
            stuckRow.unsubscribeTokenId != null;

        if (hasEvidence) {
            // We cannot know if the email was delivered. Fail closed; no retry.
            const r = await MarketingCampaignRecipient.updateOne(
                { _id: stuckRow._id, status: "sending" },
                {
                    $set: {
                        status: "failed",
                        failedAt: now,
                        lastErrorCode: "AMBIGUOUS_PRIOR_SEND",
                        providerErrorSafe: "AMBIGUOUS_PRIOR_SEND",
                    },
                    $unset: { lockedAt: "", claimedBy: "" },
                },
            );
            if (r?.modifiedCount) ambiguous += 1;
            continue;
        }

        const attempts = Number(stuckRow.attempts) || 0;
        if (attempts >= cfg.maxAttempts) {
            // Exhausted attempts with no evidence — give up.
            const r = await MarketingCampaignRecipient.updateOne(
                { _id: stuckRow._id, status: "sending" },
                {
                    $set: {
                        status: "failed",
                        failedAt: now,
                        lastErrorCode: "REAL_SEND_STUCK",
                        providerErrorSafe: "REAL_SEND_STUCK",
                    },
                    $unset: { lockedAt: "", claimedBy: "" },
                },
            );
            if (r?.modifiedCount) failedFromReclaim += 1;
        } else {
            // No evidence + attempts remaining — release back to pending.
            const r = await MarketingCampaignRecipient.updateOne(
                { _id: stuckRow._id, status: "sending" },
                {
                    $set: {
                        status: "pending",
                        nextAttemptAt: new Date(now.getTime() + cfg.cooldownMs),
                    },
                    $unset: { lockedAt: "", claimedBy: "" },
                },
            );
            if (r?.modifiedCount) reclaimed += 1;
        }
    }

    return { reclaimed, ambiguous, failedFromReclaim };
}

// ── Core: process exactly one real-send claim cycle ──────────────────────────
//
// Internal, non-exported. No env gate — callers are responsible for gating.
// Contains the full reclaim → claim → eligibility → token → render → send
// pipeline with zero behavior drift from the original runMarketingRealSendOnce
// body.

/**
 * @param {{ now?: Date }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   claimed: number,
 *   sent: number,
 *   failed: number,
 *   skipped: number,
 *   suppressed: number,
 *   canceled: number,
 *   reclaimed: number,
 *   ambiguous: number,
 * }>}
 */
async function processOneMarketingRealSend({ now: nowArg } = {}) {
    const cfg = readConfig();
    const now =
        nowArg instanceof Date && !isNaN(nowArg.getTime())
            ? nowArg
            : new Date();

    const counts = {
        claimed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        suppressed: 0,
        canceled: 0,
        reclaimed: 0,
        ambiguous: 0,
    };

    // A. Reclaim stale "sending" rows before claiming a new one.
    const reclaim = await reclaimStaleRows(now, cfg);
    counts.reclaimed = reclaim.reclaimed;
    counts.ambiguous = reclaim.ambiguous;
    counts.failed += reclaim.failedFromReclaim;

    // B. Claim exactly one pending row that is not a dry-run row.
    //    dryRunOnly:{$ne:true} guards against processing rows the dry-run
    //    worker may have stamped — real-send must never process dry-run rows.
    const row = await MarketingCampaignRecipient.findOneAndUpdate(
        {
            status: "pending",
            nextAttemptAt: { $lte: now },
            dryRunOnly: { $ne: true },
        },
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

    if (!row) {
        // Nothing to do — return counts (may include reclaim numbers).
        return { ok: true, ...counts };
    }
    counts.claimed = 1;

    // ── Per-row helpers (close over row, now, counts) ─────────────────────

    async function failRow(lastErrorCode, providerErrorSafe) {
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: {
                    status: "failed",
                    failedAt: now,
                    lastErrorCode,
                    providerErrorSafe,
                },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        counts.failed += 1;
    }

    async function skipRow(skipReason, suppress) {
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: {
                    status: suppress ? "suppressed" : "skipped",
                    skipReason,
                },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        if (suppress) counts.suppressed += 1;
        else counts.skipped += 1;
    }

    // C. Campaign status check — cancel row if campaign is no longer active.
    const campaign = await MarketingCampaign.findById(row.campaignId)
        .select({ status: 1, contentSnapshot: 1 })
        .lean();

    if (
        !campaign ||
        (campaign.status !== "queued" && campaign.status !== "sending")
    ) {
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: { status: "canceled", canceledAt: now },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        counts.canceled += 1;
        return { ok: true, ...counts };
    }

    // D. Send-time eligibility revalidation — never trust start-time snapshot.
    let eligibility;
    try {
        eligibility = await revalidateMarketingRecipientUserIds([
            String(row.userId),
        ]);
    } catch (eligErr) {
        console.error("[marketing-real-send] eligibility check failed", {
            rowId: String(row._id),
            error: eligErr?.message || eligErr,
        });
        await failRow("ELIGIBILITY_CHECK_FAILED", "ELIGIBILITY_CHECK_FAILED");
        return { ok: true, ...counts };
    }

    if (eligibility.eligibleCount === 0) {
        const skipEntry = eligibility.skipped?.[0];
        const reason =
            typeof skipEntry?.reason === "string"
                ? skipEntry.reason
                : "UNKNOWN";
        // OPTED_OUT → suppressed (removes from future retries via suppression list).
        // All other reasons → skipped.
        const isOptOut = reason === "OPTED_OUT";
        await skipRow(reason, isOptOut);
        return { ok: true, ...counts };
    }

    // E. Fetch user email at send time — never stored on the recipient row.
    //    email is resolved from User model; never logged.
    const user = await User.findById(row.userId).select({ email: 1 }).lean();
    const emailRaw = user?.email;
    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
        await skipRow(user ? "EMAIL_MISSING" : "USER_NOT_FOUND", false);
        return { ok: true, ...counts };
    }
    // Normalize defensively even though User model stores lowercase/trim.
    const emailNormalized = emailRaw.trim().toLowerCase();
    // emailNormalized held in memory only; never logged, never stored.

    // F. Mint per-recipient unsubscribe token — fail closed if this fails.
    //    No email sent unless we have a valid, soon-to-be-persisted tokenId.
    let unsubscribeUrl;
    let tokenId;
    try {
        ({ unsubscribeUrl, tokenId } = await issueEmailUnsubscribeToken({
            emailNormalized,
        }));
        if (!tokenId) {
            throw new Error("tokenId missing from issueEmailUnsubscribeToken");
        }
    } catch (tokenErr) {
        console.error("[marketing-real-send] token mint failed", {
            rowId: String(row._id),
            error: tokenErr?.message || tokenErr,
        });
        await failRow("UNSUBSCRIBE_TOKEN_FAILED", "UNSUBSCRIBE_TOKEN_FAILED");
        return { ok: true, ...counts };
    }

    // G. Render email in send mode with the real unsubscribe link.
    //    Fail closed if renderer warns that the unsubscribe URL was rejected.
    let html, text;
    try {
        const rendered = renderMarketingEmailCore(campaign.contentSnapshot, {
            mode: "send",
            unsubscribeUrl,
        });
        html = rendered.html;
        text = rendered.text;
        const warnings = Array.isArray(rendered.warnings)
            ? rendered.warnings
            : [];
        // Any "rejected unsubscribeUrl" warning means the real link was not
        // embedded — fail closed rather than send without an unsubscribe link.
        const unsubRejected = warnings.some(
            (w) =>
                typeof w === "string" &&
                w.startsWith("rejected unsubscribeUrl"),
        );
        if (unsubRejected) {
            await failRow("UNSUBSCRIBE_URL_INVALID", "UNSUBSCRIBE_URL_INVALID");
            return { ok: true, ...counts };
        }
    } catch (renderErr) {
        console.error("[marketing-real-send] render failed", {
            rowId: String(row._id),
            error: renderErr?.message || renderErr,
        });
        await failRow("RENDER_FAILED", "RENDER_FAILED");
        return { ok: true, ...counts };
    }

    // H. Persist unsubscribeTokenId BEFORE any provider call.
    //    This is the cleanup evidence check: if this row has a non-null
    //    unsubscribeTokenId, it is considered potentially sent and any
    //    stale reclaim will mark it AMBIGUOUS_PRIOR_SEND.
    const tokenWriteResult = await MarketingCampaignRecipient.updateOne(
        { _id: row._id, status: "sending" },
        { $set: { unsubscribeTokenId: tokenId } },
    );
    if (!tokenWriteResult?.modifiedCount) {
        // Row is no longer in "sending" — another process or manual
        // intervention changed it. Fail safe; the minted token expires naturally.
        console.error("[marketing-real-send] unsubscribeTokenId write raced", {
            rowId: String(row._id),
        });
        counts.failed += 1;
        return { ok: true, ...counts };
    }

    // I. Provider call — one recipient only, with defensive try-catch even
    //    though the adapter catches internally.
    const subject = String(campaign.contentSnapshot?.subject || "").trim();
    const customId = String(row._id);

    let sendResult;
    try {
        sendResult = await sendMarketingCampaignEmailBestEffort({
            toEmail: emailNormalized,
            subject,
            htmlPart: html,
            textPart: text,
            customId,
            unsubscribeUrl,
        });
    } catch (sendErr) {
        console.error("[marketing-real-send] provider call threw", {
            rowId: String(row._id),
            error: sendErr?.message || sendErr,
        });
        await failRow("PROVIDER_CALL_FAILED", "PROVIDER_CALL_FAILED");
        return { ok: true, ...counts };
    }

    // J. Handle provider result.
    //    ok:true  → mark sent (confirmed delivery acceptance by provider).
    //    ok:false → mark failed; do not retry automatically (operator must
    //               inspect providerErrorSafe before manual re-queue).
    if (sendResult?.ok === true) {
        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: {
                    status: "sent",
                    sentAt: now,
                    providerMessageId: sendResult.providerMessageId ?? null,
                    providerStatus: "accepted",
                    providerErrorSafe: null,
                },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        counts.sent += 1;
    } else {
        const providerErrorSafe =
            typeof sendResult?.providerErrorSafe === "string" &&
            sendResult.providerErrorSafe
                ? sendResult.providerErrorSafe.slice(0, 200)
                : "PROVIDER_CALL_FAILED";

        const providerStatus =
            typeof sendResult?.providerStatus === "string"
                ? sendResult.providerStatus
                : "failed";

        await MarketingCampaignRecipient.updateOne(
            { _id: row._id, status: "sending" },
            {
                $set: {
                    status: "failed",
                    failedAt: now,
                    providerStatus,
                    providerErrorSafe,
                    lastErrorCode: "PROVIDER_REJECTED",
                },
                $unset: { lockedAt: "", claimedBy: "" },
            },
        );
        counts.failed += 1;
    }

    return { ok: true, ...counts };
}

// ── Manual operator gate (one-shot, explicit flag required) ───────────────────

/**
 * Run exactly one real-send attempt.
 *
 * Manual gate: MARKETING_REAL_SEND_RUN_ONCE_ENABLED must be "true".
 * Delegates to processOneMarketingRealSend after the gate passes.
 *
 * @param {{ now?: Date }} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   claimed: number,
 *   sent: number,
 *   failed: number,
 *   skipped: number,
 *   suppressed: number,
 *   canceled: number,
 *   reclaimed: number,
 *   ambiguous: number,
 * }>}
 */
export async function runMarketingRealSendOnce({ now: nowArg } = {}) {
    // Feature gate — disabled by default; must be explicitly enabled.
    // Behavior and return shape unchanged from before the R3 refactor.
    if (process.env.MARKETING_REAL_SEND_RUN_ONCE_ENABLED !== "true") {
        return { ok: false, reason: "REAL_SEND_RUN_ONCE_DISABLED" };
    }
    return processOneMarketingRealSend({ now: nowArg });
}

// ── Recurring scheduler internals ─────────────────────────────────────────────

// Execute one sweep batch. Called by both sweepOnce (scheduler tick) and
// runMarketingRealSendSweepOnce (operator gate — same logic, no boot delay).
// Returns aggregate counts for up to batchSize processed rows. Stops early
// when no pending row was claimed on an iteration (result.claimed === 0).
async function performSweep() {
    const cfg = readConfig();
    const aggregateCounts = {
        claimed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        suppressed: 0,
        canceled: 0,
        reclaimed: 0,
        ambiguous: 0,
    };
    for (let i = 0; i < cfg.batchSize; i += 1) {
        const result = await processOneMarketingRealSend();
        aggregateCounts.claimed += result.claimed || 0;
        aggregateCounts.sent += result.sent || 0;
        aggregateCounts.failed += result.failed || 0;
        aggregateCounts.skipped += result.skipped || 0;
        aggregateCounts.suppressed += result.suppressed || 0;
        aggregateCounts.canceled += result.canceled || 0;
        aggregateCounts.reclaimed += result.reclaimed || 0;
        aggregateCounts.ambiguous += result.ambiguous || 0;
        // Stop early: no pending rows available for remainder of this batch.
        if (result.claimed === 0) break;
    }
    return aggregateCounts;
}

// Scheduler tick with reentrancy guard. Called only by timers registered in
// startMarketingRealSendWorker — never called in the disabled/refused paths.
async function sweepOnce() {
    if (running) return;
    running = true;
    try {
        const counts = await performSweep();
        // Aggregate counts only — no email, token, provider body, user docs.
        console.log("[marketing-real-send] sweep done", counts);
    } catch (err) {
        console.error("[marketing-real-send] sweep failed", {
            error: err?.message || err,
        });
    } finally {
        running = false;
    }
}

// ── Operator-gated sweep export (cardigo_ci verification) ─────────────────────

/**
 * Run one sweep batch — same logic as the scheduler tick, without the boot
 * delay. Gated by the same flags as startMarketingRealSendWorker.
 * Does NOT require MARKETING_REAL_SEND_RUN_ONCE_ENABLED.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   claimed: number,
 *   sent: number,
 *   failed: number,
 *   skipped: number,
 *   suppressed: number,
 *   canceled: number,
 *   reclaimed: number,
 *   ambiguous: number,
 * }>}
 */
export async function runMarketingRealSendSweepOnce(_opts = {}) {
    if (process.env.MARKETING_REAL_SEND_WORKER_ENABLED !== "true") {
        return { ok: false, reason: "REAL_SEND_WORKER_DISABLED" };
    }
    if (process.env.MARKETING_SEND_WORKER_ENABLED === "true") {
        return { ok: false, reason: "DRY_RUN_WORKER_ENABLED" };
    }
    const counts = await performSweep();
    return { ok: true, ...counts };
}

// ── Recurring scheduler entry point ───────────────────────────────────────────

/**
 * Schedule the real-send server worker. Disabled by default: returns WITHOUT
 * registering any timer unless MARKETING_REAL_SEND_WORKER_ENABLED=true AND
 * the dry-run worker (MARKETING_SEND_WORKER_ENABLED) is not also enabled.
 *
 * @param {{ intervalMs?: number }} [options]
 */
export function startMarketingRealSendWorker({ intervalMs } = {}) {
    // Guard 1: worker disabled by default — zero timers when flag is absent.
    if (process.env.MARKETING_REAL_SEND_WORKER_ENABLED !== "true") {
        console.log("[marketing-real-send] disabled");
        return;
    }

    // Guard 2: refuse if dry-run worker is also enabled. Both workers compete
    // for the same claim pool; enabling both risks dry-run stamping
    // dryRunOnly:true on rows before real-send claims them.
    if (process.env.MARKETING_SEND_WORKER_ENABLED === "true") {
        console.log(
            "[marketing-real-send] refused: dry-run worker enabled — " +
                "disable MARKETING_SEND_WORKER_ENABLED before enabling real-send worker",
        );
        return;
    }

    const cfg = readConfig();
    const effectiveIntervalMs =
        Number.isFinite(intervalMs) && intervalMs >= 60_000
            ? Math.floor(intervalMs)
            : cfg.intervalMs;

    // Boot delay: no Mailjet calls in the first cfg.bootDelayMs after startup.
    // Gives the server time to warm up and avoids an immediate send burst on
    // process restart.
    setTimeout(() => {
        sweepOnce();
    }, cfg.bootDelayMs);

    setInterval(() => {
        sweepOnce();
    }, effectiveIntervalMs);

    // Log only non-sensitive config values.
    console.log("[marketing-real-send] worker scheduled", {
        bootDelayMs: cfg.bootDelayMs,
        intervalMs: effectiveIntervalMs,
        batchSize: cfg.batchSize,
    });
}
