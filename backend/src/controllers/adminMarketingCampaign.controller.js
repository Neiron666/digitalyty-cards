// Admin marketing campaign controller — preview only (stateless).
//
// READ-ONLY: no DB writes, no Mailjet, no send, no unsubscribe token minting.
// Renders a safe HTML + text preview from structured admin input and returns it.
// requireAdmin + CSRF are inherited from the /api/admin mount + global csrfGuard.

import {
    renderMarketingEmailPreview,
    renderMarketingEmailCore,
    normalizeMarketingEmailInput,
    MarketingInputError,
} from "../services/marketingEmailRenderer.js";
import User from "../models/User.model.js";
import {
    isMailjetEnabled,
    sendMarketingTestEmailBestEffort,
} from "../services/mailjet.service.js";
import { issueEmailUnsubscribeToken } from "../utils/issueEmailUnsubscribeToken.util.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import {
    MAX_MARKETING_DRY_RUN_USER_IDS,
    revalidateMarketingRecipientUserIds,
} from "../utils/marketingRecipientEligibility.util.js";

/**
 * POST /api/admin/marketing/campaigns/preview
 * Body: { subject, previewText?, topImageUrl?, heading?, bodyText, ctaLabel?, ctaUrl? }
 * Returns: { ok: true, html, text, warnings }
 * No side effects.
 */
export async function previewMarketingCampaign(req, res) {
    try {
        const { html, text, warnings } = renderMarketingEmailPreview(
            req.body || {},
        );
        return res.json({ ok: true, html, text, warnings });
    } catch (err) {
        if (err instanceof MarketingInputError) {
            return res.status(400).json({ ok: false, message: err.message });
        }
        // Never leak internal stack traces.
        console.error(
            "[adminMarketingCampaign] preview failed",
            err?.message || err,
        );
        return res
            .status(400)
            .json({ ok: false, message: "Invalid preview request" });
    }
}

// ---------------------------------------------------------------------------
// Test-send (admin-only, one email to the authenticated admin's own mailbox).
// ---------------------------------------------------------------------------

/**
 * Mask an email for safe inclusion in responses/audit. Never returns the full
 * address. Falls back to "unknown" on any malformed input.
 * Example: "viktor@cardigo.co.il" -> "v***@c***.co.il"
 */
function maskEmail(email) {
    if (typeof email !== "string") return "unknown";
    const value = email.trim().toLowerCase();
    const at = value.indexOf("@");
    if (at < 1 || at === value.length - 1) return "unknown";
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);
    const dot = domain.indexOf(".");
    if (dot < 1) return "unknown";
    const domainName = domain.slice(0, dot);
    const tld = domain.slice(dot); // includes leading "."
    return `${local[0]}***@${domainName[0]}***${tld}`;
}

// File-local, per-process rate limit (adminUserId + IP). Acceptable for this
// first admin-only slice; not shared across instances/workers.
const TEST_SEND_WINDOW_MS = 15 * 60 * 1000;
const TEST_SEND_MAX = 5;
const testSendHits = new Map(); // key -> { count, windowStart }
let testSendSweepCounter = 0;

function getClientIp(req) {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd.length > 0) {
        return fwd.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "unknown";
}

function testSendRateLimited(key) {
    const now = Date.now();

    // Opportunistic sweep of expired entries (bounded growth).
    testSendSweepCounter += 1;
    if (testSendSweepCounter >= 200) {
        testSendSweepCounter = 0;
        for (const [k, v] of testSendHits) {
            if (now - v.windowStart > TEST_SEND_WINDOW_MS) {
                testSendHits.delete(k);
            }
        }
    }

    const entry = testSendHits.get(key);
    if (!entry || now - entry.windowStart > TEST_SEND_WINDOW_MS) {
        testSendHits.set(key, { count: 1, windowStart: now });
        return false;
    }
    if (entry.count >= TEST_SEND_MAX) {
        return true;
    }
    entry.count += 1;
    return false;
}

/**
 * POST /api/admin/marketing/campaigns/test-send
 * Sends exactly ONE real email through Mailjet to the authenticated admin's
 * own verified email. Feature-flagged, rate-limited, fail-closed.
 *
 * Order: feature flag -> rate-limit -> validate content -> target check ->
 * load/verify admin -> Mailjet-enabled check -> issue token -> render ->
 * pre-send audit -> send -> result audit -> response.
 */
export async function testSendMarketingCampaign(req, res) {
    // A. Feature flag first — no validation, no token, no Mailjet, no audit.
    if (process.env.MARKETING_TEST_SEND_ENABLED !== "true") {
        return res.status(409).json({
            ok: false,
            sent: false,
            message: "Marketing test send is disabled",
        });
    }

    // B. File-local rate limit (adminUserId + IP), per-process.
    const rateKey = `${String(req.userId)}|${getClientIp(req)}`;
    if (testSendRateLimited(rateKey)) {
        return res.status(429).json({
            ok: false,
            sent: false,
            message: "Too many test sends, please wait",
        });
    }

    try {
        // C. Validate content before issuing any token.
        const normalizedInput = normalizeMarketingEmailInput(req.body || {});

        // D. Target policy — admin_self only. Ignore any client-supplied
        // recipient fields entirely.
        const target = req.body?.target;
        if (typeof target !== "undefined" && target !== "admin_self") {
            return res.status(400).json({
                ok: false,
                sent: false,
                message: "Unsupported target",
            });
        }

        // E. Load/verify admin — destination is ALWAYS the admin's own email.
        const admin = await User.findById(req.userId).select(
            "email isVerified role",
        );
        const adminEmail =
            typeof admin?.email === "string" ? admin.email.trim() : "";
        if (
            !admin ||
            admin.role !== "admin" ||
            admin.isVerified !== true ||
            !adminEmail ||
            !adminEmail.includes("@")
        ) {
            return res.status(400).json({
                ok: false,
                sent: false,
                message: "Admin account is not eligible for test send",
            });
        }

        const emailNormalized = adminEmail.toLowerCase();
        const deliveredToMasked = maskEmail(emailNormalized);
        const subjectLength =
            typeof normalizedInput.subject === "string"
                ? normalizedInput.subject.length
                : 0;

        // F. Mailjet-enabled check BEFORE token issuance. Disabled -> soft skip,
        // no token, no Mailjet, no audit (minimal DB writes).
        if (!isMailjetEnabled()) {
            return res.status(200).json({
                ok: true,
                sent: false,
                deliveredToMasked,
                providerStatus: "skipped",
                providerReason: "MAILJET_NOT_CONFIGURED",
                warnings: [],
            });
        }

        // G. Issue unsubscribe token (fail-closed).
        let unsubscribeUrl;
        try {
            ({ unsubscribeUrl } = await issueEmailUnsubscribeToken({
                emailNormalized,
            }));
        } catch (tokenErr) {
            console.error(
                "[adminMarketingCampaign] test-send token issue failed",
                tokenErr?.message || tokenErr,
            );
            return res
                .status(500)
                .json({ ok: false, sent: false, message: "Test send failed" });
        }

        // H. Render in send mode with the real unsubscribe link.
        const { html, text, warnings } = renderMarketingEmailCore(
            req.body || {},
            { mode: "send", unsubscribeUrl },
        );

        // I. Pre-send AdminAudit (before Mailjet). Failure -> do not send.
        let attemptAuditId = null;
        try {
            const attemptAudit = await logAdminAction({
                adminUserId: req.userId,
                action: "marketing_test_send_attempt",
                targetType: "user",
                targetId: req.userId,
                reason: "admin marketing test-send",
                meta: {
                    testSend: true,
                    target: "admin_self",
                    deliveredToMasked,
                    subjectLength,
                    unsubscribeTokenIssued: true,
                },
            });
            attemptAuditId = attemptAudit?._id
                ? String(attemptAudit._id)
                : null;
        } catch (auditErr) {
            console.error(
                "[adminMarketingCampaign] test-send pre-send audit failed",
                auditErr?.message || auditErr,
            );
            return res
                .status(500)
                .json({ ok: false, sent: false, message: "Test send failed" });
        }

        // J. Send via Mailjet (best effort).
        const sendResult = await sendMarketingTestEmailBestEffort({
            toEmail: emailNormalized,
            subject: normalizedInput.subject,
            htmlPart: html,
            textPart: text,
        });

        let providerStatus;
        let providerReason;
        if (sendResult?.skipped) {
            providerStatus = "skipped";
            providerReason =
                typeof sendResult.reason === "string"
                    ? sendResult.reason
                    : undefined;
        } else if (sendResult?.ok) {
            providerStatus = "accepted";
        } else {
            providerStatus = "failed";
        }
        const sentAccepted = providerStatus === "accepted";

        // K. Result AdminAudit (best effort — never retries the send).
        try {
            await logAdminAction({
                adminUserId: req.userId,
                action: "marketing_test_send_result",
                targetType: "user",
                targetId: req.userId,
                reason: "admin marketing test-send result",
                meta: {
                    testSend: true,
                    target: "admin_self",
                    deliveredToMasked,
                    providerStatus,
                    ...(providerReason ? { providerReason } : {}),
                    sentAccepted,
                    attemptAuditId,
                },
            });
        } catch (resultAuditErr) {
            console.error(
                "[adminMarketingCampaign] test-send result audit failed",
                resultAuditErr?.message || resultAuditErr,
            );
        }

        // L. Response — masked, no raw email/token/url/html/text/provider body.
        return res.status(200).json({
            ok: true,
            sent: sentAccepted,
            deliveredToMasked,
            warnings,
            providerStatus,
            ...(providerReason ? { providerReason } : {}),
            auditId: attemptAuditId,
        });
    } catch (err) {
        if (err instanceof MarketingInputError) {
            return res
                .status(400)
                .json({ ok: false, sent: false, message: err.message });
        }
        console.error(
            "[adminMarketingCampaign] test-send failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, sent: false, message: "Test send failed" });
    }
}

// ---------------------------------------------------------------------------
// Dry-run (admin-only, read-only). Revalidates selected userIds against current
// backend eligibility and returns safe counts + skip reasons. NO send, NO
// Mailjet, NO token, NO campaign row, NO DB write, NO raw/masked email.
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/marketing/campaigns/dry-run
 * Body: { userIds: string[], payload?: any }
 * Returns: { ok:true, selectedCount, duplicateCount, uniqueCount,
 *   eligibleCount, skippedCount, skippedByReason, skipped, warnings }
 * requireAdmin + CSRF inherited from the /api/admin mount + global csrfGuard.
 */
export async function dryRunMarketingCampaign(req, res) {
    const userIds = req.body?.userIds;

    // Structural validation only (recipients-only contract).
    if (typeof userIds === "undefined" || userIds === null) {
        return res
            .status(400)
            .json({ ok: false, message: "userIds is required" });
    }
    if (!Array.isArray(userIds)) {
        return res
            .status(400)
            .json({ ok: false, message: "userIds must be an array" });
    }
    if (userIds.length === 0) {
        return res
            .status(400)
            .json({ ok: false, message: "userIds must not be empty" });
    }
    if (userIds.length > MAX_MARKETING_DRY_RUN_USER_IDS) {
        return res.status(400).json({ ok: false, message: "too many userIds" });
    }

    // Content payload is NOT part of dry-run. Detect presence only; never
    // destructure/read/validate/log/echo it.
    const warnings = [];
    if (typeof req.body?.payload !== "undefined") {
        warnings.push("PAYLOAD_IGNORED");
    }

    try {
        const result = await revalidateMarketingRecipientUserIds(userIds);
        return res.json({
            ok: true,
            selectedCount: result.selectedCount,
            duplicateCount: result.duplicateCount,
            uniqueCount: result.uniqueCount,
            eligibleCount: result.eligibleCount,
            skippedCount: result.skippedCount,
            skippedByReason: result.skippedByReason,
            skipped: result.skipped,
            warnings,
        });
    } catch (err) {
        // Safe label only — never log req.body or the raw userIds array.
        console.error(
            "[adminMarketingCampaign] dry-run failed",
            err?.message || err,
        );
        return res.status(500).json({ ok: false, message: "Dry run failed" });
    }
}
