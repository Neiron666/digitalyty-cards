// Admin marketing campaign controller — preview only (stateless).
//
// READ-ONLY: no DB writes, no Mailjet, no send, no unsubscribe token minting.
// Renders a safe HTML + text preview from structured admin input and returns it.
// requireAdmin + CSRF are inherited from the /api/admin mount + global csrfGuard.

import mongoose from "mongoose";
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
import { personalizeMarketingSubject } from "../utils/marketingPersonalization.util.js";
import {
    MAX_MARKETING_DRY_RUN_USER_IDS,
    revalidateMarketingRecipientUserIds,
} from "../utils/marketingRecipientEligibility.util.js";
import MarketingCampaign from "../models/MarketingCampaign.model.js";
import MarketingCampaignRecipient from "../models/MarketingCampaignRecipient.model.js";
import {
    validateMarketingImageUrl,
    validateMarketingLinkUrl,
} from "../utils/marketingUrlPolicy.util.js";

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
        //    firstName is also fetched for subject [user] personalization.
        const admin = await User.findById(req.userId).select(
            "email isVerified role firstName",
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
        // Personalize subject for test-send: replace [user] with admin's firstName
        // so the admin sees what personalization looks like in their own inbox.
        // personalizeMarketingSubject sanitizes firstName; no subject/name logged.
        const personalizedSubject = personalizeMarketingSubject(
            normalizedInput.subject,
            admin,
        );
        const sendResult = await sendMarketingTestEmailBestEffort({
            toEmail: emailNormalized,
            subject: personalizedSubject,
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

// ---------------------------------------------------------------------------
// Create draft (admin-only, feature-flagged). Persists exactly ONE
// MarketingCampaign document in status "draft" after backend eligibility
// revalidation. NO send, NO Mailjet, NO unsubscribe token, NO rendered
// html/text, NO raw/masked email. selectionSnapshot.selectedUserIds stores
// only backend-revalidated eligibleUserIds (userId-only).
// ---------------------------------------------------------------------------

/**
 * Coerce a possibly-Map skippedByReason into a plain object for safe JSON.
 * Used on the idempotent-replay path where the value is read from Mongo.
 */
function skippedByReasonToPlainObject(value) {
    if (!value) return {};
    if (value instanceof Map) return Object.fromEntries(value);
    if (typeof value === "object") return { ...value };
    return {};
}

/**
 * POST /api/admin/marketing/campaigns/drafts
 * Body: { userIds: string[], content: {...}, requestId?: string,
 *   dryRunClientSummary?: any }
 * Returns: { ok:true, campaignId, status, selectedCount, uniqueCount,
 *   duplicateCount, eligibleCount, skippedCount, skippedByReason, warnings }
 * Feature-flagged (MARKETING_CAMPAIGN_DRAFT_ENABLED). requireAdmin + CSRF
 * inherited from the /api/admin mount + global csrfGuard.
 *
 * Order: feature flag -> userIds -> content normalize -> conditional URL policy
 * -> requestId -> dryRunClientSummary warning -> backend revalidation ->
 * 422 if zero eligible -> single create -> best-effort audit -> response.
 */
export async function createMarketingCampaignDraft(req, res) {
    // A. Feature flag first — no validation, no DB read/write, no audit.
    if (process.env.MARKETING_CAMPAIGN_DRAFT_ENABLED !== "true") {
        return res.status(409).json({
            ok: false,
            message: "Marketing campaign drafts are disabled",
        });
    }

    // B. userIds structural validation (recipients-only contract).
    const userIds = req.body?.userIds;
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

    // C. content presence + normalization.
    const content = req.body?.content;
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        return res
            .status(400)
            .json({ ok: false, message: "content is required" });
    }

    let normalized;
    try {
        normalized = normalizeMarketingEmailInput(content);
    } catch (err) {
        if (err instanceof MarketingInputError) {
            return res.status(400).json({ ok: false, message: err.message });
        }
        console.error(
            "[adminMarketingCampaign] draft content normalize failed",
            err?.message || err,
        );
        return res.status(400).json({ ok: false, message: "Invalid content" });
    }

    // D. URL policy hard-fail — ONLY when the optional field is non-empty.
    // Validators reject EMPTY_URL, so empty optional fields must be skipped.
    if (normalized.topImageUrl) {
        const imgResult = validateMarketingImageUrl(normalized.topImageUrl);
        if (!imgResult.ok) {
            return res
                .status(400)
                .json({ ok: false, message: "Invalid topImageUrl" });
        }
    }
    if (normalized.ctaUrl) {
        const ctaResult = validateMarketingLinkUrl(normalized.ctaUrl);
        if (!ctaResult.ok) {
            return res
                .status(400)
                .json({ ok: false, message: "Invalid ctaUrl" });
        }
    }

    // E. requestId — optional, string-only, trimmed, bounded. No default.
    let requestId;
    if (typeof req.body?.requestId !== "undefined") {
        if (typeof req.body.requestId !== "string") {
            return res
                .status(400)
                .json({ ok: false, message: "requestId must be a string" });
        }
        const trimmed = req.body.requestId.trim();
        if (trimmed === "") {
            return res
                .status(400)
                .json({ ok: false, message: "requestId must not be empty" });
        }
        if (trimmed.length > 200) {
            return res
                .status(400)
                .json({ ok: false, message: "requestId is too long" });
        }
        requestId = trimmed;
    }

    // F. dryRunClientSummary — never read/destructure/validate/log/echo.
    const warnings = [];
    if (typeof req.body?.dryRunClientSummary !== "undefined") {
        warnings.push("DRY_RUN_CLIENT_SUMMARY_IGNORED");
    }

    try {
        // G. Backend eligibility revalidation — never trust client dry-run.
        const result = await revalidateMarketingRecipientUserIds(userIds);
        // Normalize the null-prototype skippedByReason into a normal plain
        // object so it is safe to (a) persist into the Mongoose Map field and
        // (b) serialize in responses. Mongoose's Map cast rejects
        // Object.create(null), so this must happen before any create/response.
        const skippedByReason = skippedByReasonToPlainObject(
            result.skippedByReason,
        );

        if (result.eligibleCount === 0) {
            return res.status(422).json({
                ok: false,
                message: "No eligible recipients",
                selectedCount: result.selectedCount,
                uniqueCount: result.uniqueCount,
                duplicateCount: result.duplicateCount,
                eligibleCount: result.eligibleCount,
                skippedCount: result.skippedCount,
                skippedByReason,
                warnings,
            });
        }

        // H. Single create. selectedUserIds = backend eligibleUserIds only.
        try {
            const campaign = await MarketingCampaign.create({
                createdByAdminId: req.userId,
                status: "draft",
                source: "admin_marketing",
                contentSnapshot: {
                    subject: normalized.subject,
                    previewText: normalized.previewText,
                    topImageUrl: normalized.topImageUrl,
                    heading: normalized.heading,
                    bodyText: normalized.bodyText,
                    ctaLabel: normalized.ctaLabel,
                    ctaUrl: normalized.ctaUrl,
                },
                selectionSnapshot: {
                    selectedUserIds: result.eligibleUserIds,
                    selectedCount: result.selectedCount,
                    duplicateCount: result.duplicateCount,
                    uniqueCount: result.uniqueCount,
                    eligibleCount: result.eligibleCount,
                    skippedCount: result.skippedCount,
                    skippedByReason,
                },
                dryRunAt: new Date(),
                ...(requestId ? { requestId } : {}),
            });

            const campaignId = String(campaign._id);

            // J. Best-effort AdminAudit (non-fatal) — new create only.
            try {
                await logAdminAction({
                    adminUserId: req.userId,
                    action: "marketing_campaign_draft_created",
                    targetType: "user",
                    targetId: req.userId,
                    reason: "admin marketing campaign draft",
                    meta: {
                        campaignId,
                        selectedCount: result.selectedCount,
                        eligibleCount: result.eligibleCount,
                        skippedCount: result.skippedCount,
                    },
                });
            } catch (auditErr) {
                console.error(
                    "[adminMarketingCampaign] draft create audit failed",
                    auditErr?.message || auditErr,
                );
            }

            // K. Safe success response — no email/html/text/token/provider/ids.
            return res.status(200).json({
                ok: true,
                campaignId,
                status: "draft",
                selectedCount: result.selectedCount,
                uniqueCount: result.uniqueCount,
                duplicateCount: result.duplicateCount,
                eligibleCount: result.eligibleCount,
                skippedCount: result.skippedCount,
                skippedByReason,
                warnings,
            });
        } catch (createErr) {
            // I. Duplicate requestId (unique+sparse index) — idempotent replay.
            const isDuplicate =
                createErr?.code === 11000 &&
                (!createErr?.keyPattern ||
                    Object.prototype.hasOwnProperty.call(
                        createErr.keyPattern,
                        "requestId",
                    ));
            if (isDuplicate && requestId) {
                const existing = await MarketingCampaign.findOne({
                    requestId,
                    createdByAdminId: req.userId,
                }).lean();

                if (existing) {
                    const snap = existing.selectionSnapshot || {};
                    return res.status(200).json({
                        ok: true,
                        campaignId: String(existing._id),
                        status: existing.status,
                        selectedCount: snap.selectedCount,
                        uniqueCount: snap.uniqueCount,
                        duplicateCount: snap.duplicateCount,
                        eligibleCount: snap.eligibleCount,
                        skippedCount: snap.skippedCount,
                        skippedByReason: skippedByReasonToPlainObject(
                            snap.skippedByReason,
                        ),
                        warnings: [...warnings, "IDEMPOTENT_REPLAY"],
                    });
                }

                // requestId belongs to another admin.
                return res
                    .status(409)
                    .json({ ok: false, message: "requestId conflict" });
            }
            throw createErr;
        }
    } catch (err) {
        if (err instanceof MarketingInputError) {
            return res.status(400).json({ ok: false, message: err.message });
        }
        // Safe label only — never log req.body/userIds/content/raw mongo docs.
        console.error(
            "[adminMarketingCampaign] draft create failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to create campaign draft" });
    }
}

// ---------------------------------------------------------------------------
// Draft management v1 (admin-only, read + cancel). NOT gated by
// MARKETING_CAMPAIGN_DRAFT_ENABLED — that flag gates CREATE only; reading and
// canceling already-persisted drafts is harmless and stays available.
// All responses are built with explicit DTO whitelists: never res.json(doc),
// never spread a lean doc, never return selectionSnapshot.selectedUserIds,
// requestId, emails, tokens, or any rendered html/text/provider body.
// requireAdmin + CSRF inherited from the /api/admin mount + global csrfGuard.
// ---------------------------------------------------------------------------

// Local ObjectId validity guard (mirrors adminGuide/adminBlog/admin controllers).
// Used to convert a malformed :campaignId into an anti-enumeration 404 BEFORE
// any Mongoose query, so a CastError can never surface as a 500.
function isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}

// Allowlisted list-filter statuses. No "all", no arbitrary status injection.
const DRAFT_LIST_STATUSES = new Set([
    "draft",
    "canceled",
    "queued",
    "completed",
]);
const DRAFT_LIST_DEFAULT_LIMIT = 20;
const DRAFT_LIST_MAX_LIMIT = 50;

/**
 * GET /api/admin/marketing/campaigns/drafts
 * Query: status? (draft|canceled|queued|completed, default draft), page? (>=1), limit? (1..50).
 * Returns: { ok, page, limit, total, items:[{ campaignId, status, createdAt,
 *   updatedAt, subject, heading, selectedCount, eligibleCount, skippedCount }] }
 * Metadata/counts only — no bodyText, no selectedUserIds, no requestId.
 */
export async function listMarketingCampaignDrafts(req, res) {
    // A. status allowlist (default "draft").
    const statusRaw =
        typeof req.query?.status === "undefined" ? "draft" : req.query.status;
    if (typeof statusRaw !== "string" || !DRAFT_LIST_STATUSES.has(statusRaw)) {
        return res.status(400).json({ ok: false, message: "Invalid status" });
    }
    const status = statusRaw;

    // B. page — integer >= 1 (default 1).
    let page = 1;
    if (typeof req.query?.page !== "undefined") {
        const parsed = Number(req.query.page);
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ ok: false, message: "Invalid page" });
        }
        page = parsed;
    }

    // C. limit — integer 1..50 (default 20).
    let limit = DRAFT_LIST_DEFAULT_LIMIT;
    if (typeof req.query?.limit !== "undefined") {
        const parsed = Number(req.query.limit);
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res
                .status(400)
                .json({ ok: false, message: "Invalid limit" });
        }
        if (parsed > DRAFT_LIST_MAX_LIMIT) {
            return res
                .status(400)
                .json({ ok: false, message: "limit is too large" });
        }
        limit = parsed;
    }

    // D. Own-admin scope only.
    const filter = { createdByAdminId: req.userId, status };

    try {
        // E. Inclusion projection — only the fields the DTO needs. Uses the
        // createdByAdminId+createdAt index; status is a small residual filter.
        const [docs, total] = await Promise.all([
            MarketingCampaign.find(filter)
                .select({
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    "contentSnapshot.subject": 1,
                    "contentSnapshot.heading": 1,
                    "selectionSnapshot.selectedCount": 1,
                    "selectionSnapshot.eligibleCount": 1,
                    "selectionSnapshot.skippedCount": 1,
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            MarketingCampaign.countDocuments(filter),
        ]);

        // F. Explicit per-item DTO builder — never spread the lean doc.
        const items = docs.map((doc) => {
            const content = doc.contentSnapshot || {};
            const selection = doc.selectionSnapshot || {};
            return {
                campaignId: String(doc._id),
                status: doc.status,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                subject: content.subject,
                heading: content.heading,
                selectedCount: selection.selectedCount,
                eligibleCount: selection.eligibleCount,
                skippedCount: selection.skippedCount,
            };
        });

        return res.json({ ok: true, page, limit, total, items });
    } catch (err) {
        // Safe label only — never log req.query or raw mongo docs.
        console.error(
            "[adminMarketingCampaign] list drafts failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to list campaign drafts" });
    }
}

/**
 * GET /api/admin/marketing/campaigns/drafts/:campaignId
 * Anti-enumeration: invalid id / not found / not owned all return 404.
 * Returns: { ok, draft:{ campaignId, status, createdAt, updatedAt, canceledAt,
 *   contentSnapshot{...}, selectionSummary{ counts + skippedByReason } } }
 * Never returns selectedUserIds, requestId, emails, tokens, or html/text.
 */
export async function getMarketingCampaignDraft(req, res) {
    const { campaignId } = req.params;

    // A. ObjectId guard BEFORE any query (CastError -> 404, not 500).
    if (!isValidObjectId(campaignId)) {
        return res.status(404).json({ ok: false, message: "Draft not found" });
    }

    try {
        // B. Own-admin scope + inclusion projection.
        const doc = await MarketingCampaign.findOne({
            _id: campaignId,
            createdByAdminId: req.userId,
        })
            .select({
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                canceledAt: 1,
                "contentSnapshot.subject": 1,
                "contentSnapshot.previewText": 1,
                "contentSnapshot.topImageUrl": 1,
                "contentSnapshot.heading": 1,
                "contentSnapshot.bodyText": 1,
                "contentSnapshot.ctaLabel": 1,
                "contentSnapshot.ctaUrl": 1,
                "selectionSnapshot.selectedCount": 1,
                "selectionSnapshot.duplicateCount": 1,
                "selectionSnapshot.uniqueCount": 1,
                "selectionSnapshot.eligibleCount": 1,
                "selectionSnapshot.skippedCount": 1,
                "selectionSnapshot.skippedByReason": 1,
            })
            .lean();

        // C. Not found / not owned -> 404 (no existence leak).
        if (!doc) {
            return res
                .status(404)
                .json({ ok: false, message: "Draft not found" });
        }

        // D. Explicit DTO builder — never spread the lean doc.
        const content = doc.contentSnapshot || {};
        const selection = doc.selectionSnapshot || {};
        const draft = {
            campaignId: String(doc._id),
            status: doc.status,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            canceledAt: doc.canceledAt ?? null,
            contentSnapshot: {
                subject: content.subject,
                previewText: content.previewText,
                topImageUrl: content.topImageUrl,
                heading: content.heading,
                bodyText: content.bodyText,
                ctaLabel: content.ctaLabel,
                ctaUrl: content.ctaUrl,
            },
            selectionSummary: {
                selectedCount: selection.selectedCount,
                duplicateCount: selection.duplicateCount,
                uniqueCount: selection.uniqueCount,
                eligibleCount: selection.eligibleCount,
                skippedCount: selection.skippedCount,
                skippedByReason: skippedByReasonToPlainObject(
                    selection.skippedByReason,
                ),
            },
        };

        return res.json({ ok: true, draft });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] get draft failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to load campaign draft" });
    }
}

/**
 * PATCH /api/admin/marketing/campaigns/drafts/:campaignId/cancel
 * Atomic draft -> canceled transition. Anti-enumeration 404 for invalid id /
 * not found / not owned; 409 if the draft is not in "draft" status. Body is
 * ignored. No send, no Mailjet, no token. Best-effort audit after success.
 * Returns: { ok, campaignId, status:"canceled", canceledAt }.
 */
export async function cancelMarketingCampaignDraft(req, res) {
    const { campaignId } = req.params;

    // A. ObjectId guard BEFORE any query.
    if (!isValidObjectId(campaignId)) {
        return res.status(404).json({ ok: false, message: "Draft not found" });
    }

    try {
        // B. Atomic transition — only flips when currently "draft" and owned.
        const updated = await MarketingCampaign.findOneAndUpdate(
            {
                _id: campaignId,
                createdByAdminId: req.userId,
                status: "draft",
            },
            { $set: { status: "canceled", canceledAt: new Date() } },
            { new: true },
        ).lean();

        // C. Disambiguate the null case: 404 (absent/not owned) vs 409 (exists
        // but not in draft status). Does not mutate content/selection snapshots.
        if (!updated) {
            const existing = await MarketingCampaign.findOne({
                _id: campaignId,
                createdByAdminId: req.userId,
            })
                .select("status")
                .lean();

            if (!existing) {
                return res
                    .status(404)
                    .json({ ok: false, message: "Draft not found" });
            }
            return res
                .status(409)
                .json({ ok: false, message: "Draft is not cancelable" });
        }

        // D. Best-effort AdminAudit (non-fatal) — after a successful flip only.
        try {
            await logAdminAction({
                adminUserId: req.userId,
                action: "marketing_campaign_draft_canceled",
                targetType: "user",
                targetId: req.userId,
                reason: "admin marketing campaign draft canceled",
                meta: {
                    campaignId: String(updated._id),
                    previousStatus: "draft",
                    nextStatus: "canceled",
                },
            });
        } catch (auditErr) {
            console.error(
                "[adminMarketingCampaign] draft cancel audit failed",
                auditErr?.message || auditErr,
            );
        }

        // E. Safe DTO — campaignId + status + canceledAt only.
        return res.json({
            ok: true,
            campaignId: String(updated._id),
            status: "canceled",
            canceledAt: updated.canceledAt,
        });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] cancel draft failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to cancel campaign draft" });
    }
}

// ---------------------------------------------------------------------------
// Send-readiness (admin-only, feature-flagged, READ-ONLY). Re-runs the backend
// eligibility SSoT against the stored selectionSnapshot.selectedUserIds of an
// owned "draft" campaign and returns fresh safe counts. This is the read-only
// precondition probe for a future start/enqueue endpoint: it NEVER writes,
// NEVER enqueues, NEVER sends, NEVER touches Mailjet, NEVER mints unsubscribe
// tokens, NEVER renders html/text, and NEVER echoes selectedUserIds, emails,
// tokens, or provider data. The stored draft dry-run is intentionally NOT
// trusted — eligibility is always re-derived live.
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/marketing/campaigns/:campaignId/send-readiness
 * Body: ignored (no userIds/content/provider fields are read).
 * Returns: { ok:true, campaignId, status, selectedCount, duplicateCount,
 *   uniqueCount, eligibleCount, skippedCount, skippedByReason, ready, warnings }
 * Feature-flagged (MARKETING_SEND_READINESS_ENABLED). requireAdmin + CSRF
 * inherited from the /api/admin mount + global csrfGuard.
 *
 * Order: feature flag -> ObjectId guard -> own-admin scope (404) -> draft-only
 * precondition (409) -> non-empty selection (422) -> content validation (422)
 * -> live revalidation -> counts-only response. No DB write at any step.
 */
export async function getMarketingCampaignSendReadiness(req, res) {
    // A. Feature flag first — no validation, no DB read, no audit. This is a
    // dedicated READ-ONLY readiness flag, independent from the future
    // start/enqueue flag.
    if (process.env.MARKETING_SEND_READINESS_ENABLED !== "true") {
        return res.status(409).json({
            ok: false,
            message: "Marketing send readiness is disabled",
        });
    }

    const { campaignId } = req.params;

    // B. ObjectId guard BEFORE any query (CastError -> 404, not 500).
    if (!isValidObjectId(campaignId)) {
        return res
            .status(404)
            .json({ ok: false, message: "Campaign not found" });
    }

    try {
        // C. Own-admin scope + minimal projection (status + selectedUserIds +
        // contentSnapshot for validation only; contentSnapshot is NEVER returned).
        const doc = await MarketingCampaign.findOne({
            _id: campaignId,
            createdByAdminId: req.userId,
        })
            .select({
                status: 1,
                "selectionSnapshot.selectedUserIds": 1,
                contentSnapshot: 1,
            })
            .lean();

        // D. Not found / not owned -> 404 (no existence leak).
        if (!doc) {
            return res
                .status(404)
                .json({ ok: false, message: "Campaign not found" });
        }

        // E. Draft-only precondition (v1). Any other status is not startable.
        if (doc.status !== "draft") {
            return res.status(409).json({
                ok: false,
                message: "Campaign is not in a startable state",
                status: doc.status,
            });
        }

        // F. Non-empty selection precondition. Nothing to enqueue otherwise.
        const selectedUserIds = Array.isArray(
            doc.selectionSnapshot?.selectedUserIds,
        )
            ? doc.selectionSnapshot.selectedUserIds
            : [];
        if (selectedUserIds.length === 0) {
            return res.status(422).json({
                ok: false,
                message: "Campaign has no selected recipients",
                status: doc.status,
            });
        }

        // G. Content validation only — fail-closed if the stored content
        // snapshot is not send-ready. The normalized result is intentionally
        // discarded: no render, no storage, no echo of any content field.
        try {
            normalizeMarketingEmailInput(doc.contentSnapshot || {});
        } catch (contentErr) {
            // Both MarketingInputError and any unexpected validation error map
            // to the same opaque 422 — never expose contentErr.message here.
            return res.status(422).json({
                ok: false,
                message: "Campaign content is not send-ready",
                status: doc.status,
            });
        }

        // H. Live backend eligibility revalidation — never trust stored dry-run.
        const result =
            await revalidateMarketingRecipientUserIds(selectedUserIds);
        const skippedByReason = skippedByReasonToPlainObject(
            result.skippedByReason,
        );

        // I. Counts-only response. ready = at least one eligible recipient.
        // No selectedUserIds / emails / tokens / provider / html / text echoed.
        return res.json({
            ok: true,
            campaignId: String(doc._id),
            status: doc.status,
            selectedCount: result.selectedCount,
            duplicateCount: result.duplicateCount,
            uniqueCount: result.uniqueCount,
            eligibleCount: result.eligibleCount,
            skippedCount: result.skippedCount,
            skippedByReason,
            ready: result.eligibleCount > 0,
            warnings: [],
        });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] send-readiness failed",
            err?.message || err,
        );
        return res.status(500).json({
            ok: false,
            message: "Failed to evaluate campaign send readiness",
        });
    }
}

// ---------------------------------------------------------------------------
// Start send (admin-only, feature-flagged, MUTATING). Atomically promotes an
// owned "draft" campaign to "queued" and materializes one MarketingCampaignRecipient
// "pending" ledger row per backend-revalidated eligible user, inside a single
// transaction. Idempotent on startRequestId. This is the enqueue boundary ONLY:
// it NEVER sends, NEVER touches Mailjet, NEVER mints unsubscribe tokens, NEVER
// renders html/text, NEVER starts a worker, and NEVER echoes selectedUserIds,
// emails, tokens, or provider data. Eligibility is always re-derived live (the
// stored draft snapshot is NOT trusted). requireAdmin + CSRF inherited from the
// /api/admin mount + global csrfGuard.
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/marketing/campaigns/:campaignId/start
 * Body: { requestId: string } (required idempotency key).
 * Returns counts-only: { ok, campaignId, status:"queued", selectedCount,
 *   duplicateCount, uniqueCount, eligibleCount, skippedCount, skippedByReason,
 *   recipientRowsCreated, warnings } (+ replayed:true on idempotent replay).
 * Feature-flagged (MARKETING_SEND_TO_LIST_ENABLED).
 *
 * Order: feature flag -> requestId validation -> ObjectId guard -> own-admin
 * scope (404) -> same-campaign idempotent replay -> draft-only (409) ->
 * non-empty selection (422) -> content validation (422) -> live eligibility
 * revalidation (422 if zero) -> transaction (draft->queued CAS + recipient
 * inserts) -> best-effort audit -> counts-only response.
 */
export async function startMarketingCampaignSend(req, res) {
    // A. Feature flag first — no validation, no DB read/write, no audit.
    if (process.env.MARKETING_SEND_TO_LIST_ENABLED !== "true") {
        return res.status(409).json({
            ok: false,
            message: "Marketing send-to-list is disabled",
        });
    }

    // B. requestId — REQUIRED, string-only, trimmed, bounded. Stored as
    // startRequestId (NEVER the draft requestId).
    const rawRequestId = req.body?.requestId;
    if (typeof rawRequestId === "undefined" || rawRequestId === null) {
        return res
            .status(400)
            .json({ ok: false, message: "requestId is required" });
    }
    if (typeof rawRequestId !== "string") {
        return res
            .status(400)
            .json({ ok: false, message: "requestId must be a string" });
    }
    const requestId = rawRequestId.trim();
    if (requestId === "") {
        return res
            .status(400)
            .json({ ok: false, message: "requestId must not be empty" });
    }
    if (requestId.length > 200) {
        return res
            .status(400)
            .json({ ok: false, message: "requestId is too long" });
    }

    const { campaignId } = req.params;

    // C. ObjectId guard BEFORE any query (CastError -> 404, not 500).
    if (!isValidObjectId(campaignId)) {
        return res
            .status(404)
            .json({ ok: false, message: "Campaign not found" });
    }

    // Builds the counts-only idempotent-replay DTO from a campaign's stored
    // selection snapshot + the actual recipient-row count. Best-effort replay
    // audit. No transaction, no recipient writes. Counts-only — never echoes
    // selectedUserIds/emails/tokens/provider/html/text.
    const respondReplay = async (campaign) => {
        const snap = campaign.selectionSnapshot || {};
        const recipientRowsCreated =
            await MarketingCampaignRecipient.countDocuments({
                campaignId: campaign._id,
            });
        try {
            await logAdminAction({
                adminUserId: req.userId,
                action: "marketing_campaign_send_start_replayed",
                targetType: "campaign",
                targetId: String(campaign._id),
                reason: "admin marketing campaign send start",
                meta: {
                    status: campaign.status,
                    selectedCount: snap.selectedCount,
                    eligibleCount: snap.eligibleCount,
                    skippedCount: snap.skippedCount,
                    recipientRowsCreated,
                    requestIdPresent: true,
                },
            });
        } catch (auditErr) {
            console.error(
                "[adminMarketingCampaign] start replay audit failed",
                auditErr?.message || auditErr,
            );
        }
        return res.status(200).json({
            ok: true,
            campaignId: String(campaign._id),
            status: campaign.status,
            selectedCount: snap.selectedCount,
            duplicateCount: snap.duplicateCount,
            uniqueCount: snap.uniqueCount,
            eligibleCount: snap.eligibleCount,
            skippedCount: snap.skippedCount,
            skippedByReason: skippedByReasonToPlainObject(snap.skippedByReason),
            recipientRowsCreated,
            replayed: true,
            warnings: ["IDEMPOTENT_REPLAY"],
        });
    };

    try {
        // C2. Own-admin scope load. contentSnapshot is for validation only and
        // is NEVER returned; selectionSnapshot is counts/ids for internal use.
        const doc = await MarketingCampaign.findOne({
            _id: campaignId,
            createdByAdminId: req.userId,
        })
            .select({
                status: 1,
                startRequestId: 1,
                contentSnapshot: 1,
                selectionSnapshot: 1,
            })
            .lean();

        // C3. Not found / not owned -> 404 (no existence leak).
        if (!doc) {
            return res
                .status(404)
                .json({ ok: false, message: "Campaign not found" });
        }

        // D. Same-campaign idempotent replay BEFORE status rejection. Only the
        // SAME owned campaign carrying the SAME startRequestId replays; a
        // cross-campaign startRequestId reuse is caught by the unique index at
        // CAS time (-> 409 "requestId conflict").
        if (doc.startRequestId === requestId && doc.status !== "draft") {
            return await respondReplay(doc);
        }

        // E. Draft-only precondition (v1). "ready" is unused in v1.
        if (doc.status !== "draft") {
            return res.status(409).json({
                ok: false,
                message: "Campaign is not in a startable state",
                status: doc.status,
            });
        }

        // F. Non-empty selection precondition. Nothing to enqueue otherwise.
        const selectedUserIds = Array.isArray(
            doc.selectionSnapshot?.selectedUserIds,
        )
            ? doc.selectionSnapshot.selectedUserIds
            : [];
        if (selectedUserIds.length === 0) {
            return res
                .status(422)
                .json({ ok: false, message: "No selected recipients" });
        }

        // G. Content validation only — fail-closed if the stored content
        // snapshot is not send-ready. Result discarded (no render, no storage,
        // no echo). Never expose the underlying normalize error text.
        try {
            normalizeMarketingEmailInput(doc.contentSnapshot || {});
        } catch (contentErr) {
            return res.status(422).json({
                ok: false,
                message: "Campaign content is not send-ready",
            });
        }

        // H. Live backend eligibility revalidation — SSoT. Never trust the
        // stored draft snapshot counts or any readiness probe result.
        const result =
            await revalidateMarketingRecipientUserIds(selectedUserIds);
        const skippedByReason = skippedByReasonToPlainObject(
            result.skippedByReason,
        );
        if (result.eligibleCount === 0) {
            return res
                .status(422)
                .json({ ok: false, message: "No eligible recipients" });
        }

        // I. Transaction: atomic draft->queued CAS + recipient row inserts.
        const now = new Date();
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // I.1 CAS — flips ONLY when still owned + status "draft". The
                // {status:"draft"} predicate is the race guard; the loser of a
                // concurrent double-start matches no doc here.
                const cas = await MarketingCampaign.findOneAndUpdate(
                    {
                        _id: campaignId,
                        createdByAdminId: req.userId,
                        status: "draft",
                    },
                    {
                        $set: {
                            status: "queued",
                            queuedAt: now,
                            sendStartedByAdminId: req.userId,
                            startRequestId: requestId,
                        },
                    },
                    { new: true, session },
                );
                // I.2 No match -> controlled conflict, resolved post-abort.
                if (!cas) {
                    const conflict = new Error("START_CAS_NO_MATCH");
                    conflict.casNoMatch = true;
                    throw conflict;
                }
                // I.3 Materialize one pending recipient row per ELIGIBLE user
                // only. nextAttemptAt = now per the recipient model R2 contract
                // (a worker claim query would never select null-scheduled rows).
                // No skipped/suppressed rows. No email/token/provider/html/text.
                const rows = result.eligibleUserIds.map((userId) => ({
                    campaignId: cas._id,
                    userId,
                    status: "pending",
                    nextAttemptAt: now,
                    dryRunOnly: false,
                }));
                await MarketingCampaignRecipient.insertMany(rows, {
                    session,
                    ordered: false,
                });
            });
        } catch (txErr) {
            await session.endSession();

            // J.a CAS matched no doc — a concurrent winner already moved the
            // campaign out of "draft". Re-read to decide replay vs conflict.
            if (txErr?.casNoMatch) {
                const after = await MarketingCampaign.findOne({
                    _id: campaignId,
                    createdByAdminId: req.userId,
                })
                    .select({
                        status: 1,
                        startRequestId: 1,
                        selectionSnapshot: 1,
                    })
                    .lean();
                if (!after) {
                    return res
                        .status(404)
                        .json({ ok: false, message: "Campaign not found" });
                }
                if (after.startRequestId === requestId) {
                    return await respondReplay(after);
                }
                return res.status(409).json({
                    ok: false,
                    message: "Campaign is not in a startable state",
                    status: after.status,
                });
            }

            // J.b Duplicate startRequestId (unique+sparse index) or a recipient
            // (campaignId,userId) duplicate from a racing winner. Resolve to a
            // same-campaign replay or a cross-campaign requestId conflict.
            if (txErr?.code === 11000) {
                const byId = await MarketingCampaign.findOne({
                    _id: campaignId,
                    createdByAdminId: req.userId,
                })
                    .select({
                        status: 1,
                        startRequestId: 1,
                        selectionSnapshot: 1,
                    })
                    .lean();
                if (
                    byId &&
                    byId.startRequestId === requestId &&
                    byId.status !== "draft"
                ) {
                    return await respondReplay(byId);
                }
                const byReq = await MarketingCampaign.findOne({
                    startRequestId: requestId,
                    createdByAdminId: req.userId,
                })
                    .select({
                        _id: 1,
                        status: 1,
                        startRequestId: 1,
                        selectionSnapshot: 1,
                    })
                    .lean();
                if (byReq && String(byReq._id) === String(campaignId)) {
                    return await respondReplay(byReq);
                }
                return res
                    .status(409)
                    .json({ ok: false, message: "requestId conflict" });
            }

            console.error(
                "[adminMarketingCampaign] start send transaction failed",
                txErr?.message || txErr,
            );
            return res
                .status(500)
                .json({ ok: false, message: "Failed to start campaign send" });
        }
        await session.endSession();

        const recipientRowsCreated = result.eligibleUserIds.length;

        // K. Best-effort AdminAudit (non-fatal) — counts only. A failed audit
        // must NEVER roll back the committed enqueue.
        try {
            await logAdminAction({
                adminUserId: req.userId,
                action: "marketing_campaign_send_start_accepted",
                targetType: "campaign",
                targetId: campaignId,
                reason: "admin marketing campaign send start",
                meta: {
                    selectedCount: result.selectedCount,
                    eligibleCount: result.eligibleCount,
                    skippedCount: result.skippedCount,
                    recipientRowsCreated,
                    requestIdPresent: true,
                },
            });
        } catch (auditErr) {
            console.error(
                "[adminMarketingCampaign] start accepted audit failed",
                auditErr?.message || auditErr,
            );
        }

        // L. Counts-only success response. No selectedUserIds/eligibleUserIds/
        // skipped list/userIds/emails/tokens/provider/html/text/raw docs.
        return res.status(200).json({
            ok: true,
            campaignId,
            status: "queued",
            selectedCount: result.selectedCount,
            duplicateCount: result.duplicateCount,
            uniqueCount: result.uniqueCount,
            eligibleCount: result.eligibleCount,
            skippedCount: result.skippedCount,
            skippedByReason,
            recipientRowsCreated,
            warnings: [],
        });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] start send failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to start campaign send" });
    }
}

// ---------------------------------------------------------------------------
// Cancel send (admin-only, MUTATING, NOT feature-flagged). Atomically rolls a
// "queued" campaign back to "canceled" and flips its still-"pending" recipient
// rows to "canceled" inside a single transaction. Intentionally NOT gated by
// MARKETING_SEND_TO_LIST_ENABLED: rollback/cancel must remain available even if
// the start flag is turned off. Never touches sent/sending/failed rows. NEVER
// sends, NEVER touches Mailjet/tokens/renderer/worker, NEVER echoes PII.
// requireAdmin + CSRF inherited from the /api/admin mount + global csrfGuard.
// ---------------------------------------------------------------------------

/**
 * PATCH /api/admin/marketing/campaigns/:campaignId/cancel-send
 * Body: ignored. Returns: { ok, campaignId, status:"canceled",
 *   recipientsCanceled, canceledAt }. Anti-enumeration 404; 409 if not queued.
 */
export async function cancelMarketingCampaignSend(req, res) {
    const { campaignId } = req.params;

    // A. ObjectId guard BEFORE any query (CastError -> 404, not 500).
    if (!isValidObjectId(campaignId)) {
        return res
            .status(404)
            .json({ ok: false, message: "Campaign not found" });
    }

    const now = new Date();
    const session = await mongoose.startSession();
    let canceledCampaign = null;
    let recipientsCanceled = 0;
    try {
        await session.withTransaction(async () => {
            // C.1 CAS — flips ONLY when still owned + status "queued".
            const cas = await MarketingCampaign.findOneAndUpdate(
                {
                    _id: campaignId,
                    createdByAdminId: req.userId,
                    status: "queued",
                },
                { $set: { status: "canceled", canceledAt: now } },
                { new: true, session },
            );
            if (!cas) {
                const conflict = new Error("CANCEL_CAS_NO_MATCH");
                conflict.casNoMatch = true;
                throw conflict;
            }
            // C.2 Flip ONLY still-pending recipient rows. sent/sending/failed
            // rows are never touched (in no-worker v1 only pending can exist).
            const upd = await MarketingCampaignRecipient.updateMany(
                { campaignId: cas._id, status: "pending" },
                { $set: { status: "canceled", canceledAt: now } },
                { session },
            );
            recipientsCanceled = upd?.modifiedCount || 0;
            canceledCampaign = cas;
        });
    } catch (txErr) {
        await session.endSession();

        // B. CAS matched no doc — disambiguate 404 (absent/not owned) vs 409
        // (exists but not in "queued" status).
        if (txErr?.casNoMatch) {
            const existing = await MarketingCampaign.findOne({
                _id: campaignId,
                createdByAdminId: req.userId,
            })
                .select("status")
                .lean();
            if (!existing) {
                return res
                    .status(404)
                    .json({ ok: false, message: "Campaign not found" });
            }
            return res.status(409).json({
                ok: false,
                message: "Campaign send is not cancelable",
                status: existing.status,
            });
        }

        console.error(
            "[adminMarketingCampaign] cancel send transaction failed",
            txErr?.message || txErr,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to cancel campaign send" });
    }
    await session.endSession();

    // D. Best-effort AdminAudit (non-fatal) — counts only.
    try {
        await logAdminAction({
            adminUserId: req.userId,
            action: "marketing_campaign_send_canceled",
            targetType: "campaign",
            targetId: campaignId,
            reason: "admin marketing campaign send canceled",
            meta: {
                recipientsCanceled,
                previousStatus: "queued",
                nextStatus: "canceled",
            },
        });
    } catch (auditErr) {
        console.error(
            "[adminMarketingCampaign] cancel send audit failed",
            auditErr?.message || auditErr,
        );
    }

    // E. Counts-only DTO. No selectedUserIds/emails/tokens/provider/raw docs.
    return res.json({
        ok: true,
        campaignId,
        status: "canceled",
        recipientsCanceled,
        canceledAt: canceledCampaign.canceledAt,
    });
}

// ---------------------------------------------------------------------------
// Send-status (admin-only, READ-ONLY). Returns a counts-only rollup of the
// recipient ledger for one owned campaign. Recipient rows are the source of
// truth — no campaign counters are read or written. No DB writes, no User
// lookup, no Mailjet, no token mint, no render, no audit. Anti-enumeration 404
// for an invalid id or a campaign not owned by the requesting admin.
// requireAdmin + CSRF inherited from the /api/admin mount + global csrfGuard.
// ---------------------------------------------------------------------------

// Frozen recipient-status vocabulary mirrored from
// MarketingCampaignRecipient.model.js RECIPIENT_STATUSES. Used to seed every
// status key to 0 so the response shape is stable regardless of which states
// currently have rows.
const SEND_STATUS_RECIPIENT_KEYS = Object.freeze([
    "pending",
    "sending",
    "sent",
    "failed",
    "skipped",
    "suppressed",
    "canceled",
]);

/**
 * GET /api/admin/marketing/campaigns/:campaignId/send-status
 * Returns: { ok, campaignId, campaignStatus, queuedAt, canceledAt, updatedAt,
 *   counts:{ pending, sending, sent, failed, skipped, suppressed, canceled,
 *   total }, hasActiveRows, isTerminal }. Counts-only; anti-enumeration 404.
 */
export async function getMarketingCampaignSendStatus(req, res) {
    const { campaignId } = req.params;

    // A. ObjectId guard BEFORE any query (CastError -> 404, not 500).
    if (!isValidObjectId(campaignId)) {
        return res
            .status(404)
            .json({ ok: false, message: "Campaign not found" });
    }

    try {
        // Own-admin scope load. Only the safe campaign-level fields are
        // selected — contentSnapshot/selectionSnapshot are NEVER read here.
        const campaign = await MarketingCampaign.findOne({
            _id: campaignId,
            createdByAdminId: req.userId,
        })
            .select({ status: 1, queuedAt: 1, canceledAt: 1, updatedAt: 1 })
            .lean();

        // Not found / not owned -> 404 (no existence leak).
        if (!campaign) {
            return res
                .status(404)
                .json({ ok: false, message: "Campaign not found" });
        }

        // B. Read-only recipient rollup grouped by status (uses the governed
        // { campaignId:1, status:1 } index). No recipient docs returned, no
        // User lookup, no emails/tokens/provider data.
        const grouped = await MarketingCampaignRecipient.aggregate([
            { $match: { campaignId: campaign._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        // C. Seed every known status to 0, then overlay actual counts. Unknown
        // statuses (should not occur given the model enum) are ignored to keep
        // the response shape frozen.
        const counts = {};
        for (const key of SEND_STATUS_RECIPIENT_KEYS) {
            counts[key] = 0;
        }
        let total = 0;
        for (const row of grouped) {
            const status = row?._id;
            const count = Number(row?.count) || 0;
            if (
                typeof status === "string" &&
                Object.prototype.hasOwnProperty.call(counts, status)
            ) {
                counts[status] = count;
            }
            total += count;
        }
        counts.total = total;

        // D. Counts-only response. No selectionSnapshot/selectedUserIds/emails/
        // tokens/provider/html/text/raw docs.
        const activeRows = counts.pending + counts.sending;
        return res.status(200).json({
            ok: true,
            campaignId,
            campaignStatus: campaign.status,
            queuedAt: campaign.queuedAt ?? null,
            canceledAt: campaign.canceledAt ?? null,
            updatedAt: campaign.updatedAt ?? null,
            counts,
            hasActiveRows: activeRows > 0,
            isTerminal: activeRows === 0 && total > 0,
        });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] send-status failed",
            err?.message || err,
        );
        return res.status(500).json({
            ok: false,
            message: "Failed to load campaign send status",
        });
    }
}

/**
 * DELETE /api/admin/marketing/campaigns/:campaignId
 * Two-branch hard-delete. Branch A (draft): owned status:"draft" campaign with
 * ZERO recipient rows — no cascade. Branch B (canceled cleanup): owned
 * status:"canceled" campaign whose ALL recipient rows are safe technical
 * canceled rows with no send-evidence fields; cascade-deletes all rows then
 * the campaign in one transaction. Non-deletable: queued/sending/completed/
 * failed, draft with rows, canceled with any unsafe or evidence row.
 * Fail-closed AdminAudit written BEFORE each destructive branch, in-session.
 * Returns counts-only DTO; anti-enumeration 404. No Mailjet, no token, no
 * render, no email, no worker.
 */
export async function deleteMarketingCampaign(req, res) {
    const { campaignId } = req.params;

    // A. ObjectId guard BEFORE any query (CastError -> 404, not 500). Matches
    // start/cancel-send/send-status anti-enumeration style.
    if (!isValidObjectId(campaignId)) {
        return res
            .status(404)
            .json({ ok: false, message: "Campaign not found" });
    }

    try {
        // B. Cheap pre-transaction owner-scope read (better 404/409 errors).
        // Only the safe fields needed for the guards are selected —
        // contentSnapshot/selectionSnapshot are NEVER read here. The
        // authoritative checks are re-done inside the transaction below.
        const campaign = await MarketingCampaign.findOne({
            _id: campaignId,
            createdByAdminId: req.userId,
        })
            .select({ status: 1, createdByAdminId: 1 })
            .lean();

        // Not found / not owned -> 404 (no existence leak).
        if (!campaign) {
            return res
                .status(404)
                .json({ ok: false, message: "Campaign not found" });
        }

        // C. Status guard — deletable statuses: "draft" (zero-row hard-delete,
        // no cascade) and "canceled" (cascade cleanup of owned canceled
        // campaigns with only safe technical rows and no send evidence). All
        // other statuses (queued/sending/completed/failed) are non-deletable.
        if (campaign.status !== "draft" && campaign.status !== "canceled") {
            return res.status(409).json({
                ok: false,
                message: "Campaign is not deletable",
                status: campaign.status,
            });
        }

        // E. Canceled cleanup branch — early-return path. Cascade-deletes all
        // recipient rows that are safe technical canceled rows (no send
        // evidence), then deletes the campaign, all inside ONE transaction.
        // Fail-closed AdminAudit is written BEFORE the destructive operations,
        // in-session. The unsafe-count predicate (E.3) and the deleteMany
        // predicate (E.5) are kept identical so a concurrent evidence write
        // between those steps (impossible in v1 no-worker build, guarded here
        // for defense-in-depth) would fail the deletedCount assertion and abort
        // the whole transaction. No Mailjet, no token, no render, no email.
        if (campaign.status === "canceled") {
            let deletedRecipients = 0;
            const cancelSession = await mongoose.startSession();
            try {
                await cancelSession.withTransaction(async () => {
                    // E.1 Re-read campaign inside session for race guard. If a
                    // concurrent mutation changed the status away from
                    // "canceled" between the pre-transaction read (step B) and
                    // now, this catches it before any destructive operation.
                    const liveDoc = await MarketingCampaign.findOne({
                        _id: campaignId,
                        createdByAdminId: req.userId,
                    })
                        .select({ status: 1 })
                        .session(cancelSession)
                        .lean();
                    if (!liveDoc || liveDoc.status !== "canceled") {
                        const conflict = new Error("CANCELED_CAS_NO_MATCH");
                        conflict.deleteConflict = true;
                        throw conflict;
                    }

                    // E.2 Count all recipient rows (used for audit meta and the
                    // deleteMany assertion in E.6).
                    const totalCount =
                        await MarketingCampaignRecipient.countDocuments(
                            { campaignId: campaign._id },
                            { session: cancelSession },
                        );

                    // E.3 Count unsafe rows. A row is unsafe if it has a
                    // non-canceled status OR any send-evidence field non-null.
                    // This predicate must stay in sync with the deleteMany safe
                    // predicate in E.5.
                    const unsafeCount =
                        await MarketingCampaignRecipient.countDocuments(
                            {
                                campaignId: campaign._id,
                                $or: [
                                    { status: { $ne: "canceled" } },
                                    { providerMessageId: { $ne: null } },
                                    { providerStatus: { $ne: null } },
                                    { providerErrorSafe: { $ne: null } },
                                    { unsubscribeTokenId: { $ne: null } },
                                    { sentAt: { $ne: null } },
                                    { failedAt: { $ne: null } },
                                    { lockedAt: { $ne: null } },
                                    { claimedBy: { $ne: null } },
                                ],
                            },
                            { session: cancelSession },
                        );
                    if (unsafeCount > 0) {
                        const conflict = new Error("DELETE_UNSAFE_ROWS");
                        conflict.deleteConflict = true;
                        throw conflict;
                    }

                    // E.4 Fail-closed AdminAudit BEFORE the destructive
                    // operations, in-session. Meta is counts/status only — no
                    // selectedUserIds/userIds/emails/tokens/contentSnapshot/
                    // subject/bodyText/html/text/provider.
                    await logAdminAction({
                        adminUserId: req.userId,
                        action: "marketing_campaign_canceled_cleanup",
                        targetType: "campaign",
                        targetId: campaignId,
                        reason: "admin marketing canceled campaign cleanup",
                        meta: {
                            status: "canceled",
                            recipientRowsBefore: totalCount,
                            deletedRecipients: totalCount,
                        },
                        session: cancelSession,
                    });

                    // E.5 Cascade delete recipient rows using the same safe
                    // predicate as E.3. Explicit null-equality checks mean any
                    // row with a non-null evidence field does NOT match and is
                    // NOT deleted — it would surface as a count mismatch below.
                    const recipientDel =
                        await MarketingCampaignRecipient.deleteMany(
                            {
                                campaignId: campaign._id,
                                status: "canceled",
                                providerMessageId: null,
                                providerStatus: null,
                                providerErrorSafe: null,
                                unsubscribeTokenId: null,
                                sentAt: null,
                                failedAt: null,
                                lockedAt: null,
                                claimedBy: null,
                            },
                            { session: cancelSession },
                        );
                    if (recipientDel?.deletedCount !== totalCount) {
                        const conflict = new Error(
                            "DELETE_RECIPIENT_COUNT_MISMATCH",
                        );
                        conflict.deleteConflict = true;
                        throw conflict;
                    }

                    // E.6 Campaign delete CAS — {status:"canceled"} guards
                    // against a concurrent mutation that raced past E.1. If
                    // deletedCount !== 1 the whole transaction (audit + all
                    // recipient deletes + campaign delete) rolls back — no
                    // orphaned rows, no false audit entry.
                    const campaignDel = await MarketingCampaign.deleteOne(
                        {
                            _id: campaignId,
                            createdByAdminId: req.userId,
                            status: "canceled",
                        },
                        { session: cancelSession },
                    );
                    if (campaignDel?.deletedCount !== 1) {
                        const conflict = new Error(
                            "CANCELED_CAMPAIGN_CAS_NO_MATCH",
                        );
                        conflict.deleteConflict = true;
                        throw conflict;
                    }

                    deletedRecipients = totalCount;
                });
            } catch (txErr) {
                if (txErr?.deleteConflict) {
                    return res.status(409).json({
                        ok: false,
                        message: "Campaign is not deletable",
                    });
                }
                throw txErr;
            } finally {
                await cancelSession.endSession();
            }

            // E.7 Counts-only response. No raw docs/selectionSnapshot/
            // contentSnapshot/userIds/emails/tokens/provider/html/text.
            return res.status(200).json({
                ok: true,
                campaignId,
                deletedCampaign: true,
                deletedRecipients,
            });
        }

        // D. Draft branch — atomic audit + delete. The fail-closed AdminAudit
        // row and the delete CAS run inside ONE transaction so they commit or
        // roll back together: if the audit write fails the delete never
        // happens, and if the delete CAS fails (e.g. a concurrent draft ->
        // queued race) the audit row is rolled back — no false
        // "marketing_campaign_deleted".
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // D.1 Authoritative recipient-row guard inside the session. A
                // draft must have zero ledger rows; if any exist, refuse rather
                // than cascade (no cascade delete for drafts).
                const recipientCount =
                    await MarketingCampaignRecipient.countDocuments(
                        { campaignId: campaign._id },
                        { session },
                    );
                if (recipientCount > 0) {
                    const conflict = new Error("DELETE_RECIPIENT_ROWS");
                    conflict.deleteConflict = true;
                    conflict.recipientRows = recipientCount;
                    throw conflict;
                }

                // D.2 Fail-closed AdminAudit BEFORE the delete, in-session.
                // Meta is counts/status only — no selectedUserIds/userIds/
                // emails/tokens/contentSnapshot/subject/bodyText/html/text/
                // provider.
                await logAdminAction({
                    adminUserId: req.userId,
                    action: "marketing_campaign_deleted",
                    targetType: "campaign",
                    targetId: campaignId,
                    reason: "admin marketing campaign deleted",
                    meta: {
                        status: "draft",
                        recipientRowsBefore: 0,
                        deletedRecipients: 0,
                    },
                    session,
                });

                // D.3 Race-safe delete CAS in the same session. The
                // {status:"draft"} predicate means a concurrent start that
                // flipped draft -> queued loses the race; deletedCount is then
                // 0 and the whole transaction (including the audit) aborts.
                const del = await MarketingCampaign.deleteOne(
                    {
                        _id: campaignId,
                        createdByAdminId: req.userId,
                        status: "draft",
                    },
                    { session },
                );
                if (del?.deletedCount !== 1) {
                    const conflict = new Error("DELETE_CAS_NO_MATCH");
                    conflict.deleteConflict = true;
                    throw conflict;
                }
            });
        } catch (txErr) {
            if (txErr?.deleteConflict) {
                const body = {
                    ok: false,
                    message: "Campaign is not deletable",
                };
                if (typeof txErr.recipientRows === "number") {
                    body.recipientRows = txErr.recipientRows;
                }
                return res.status(409).json(body);
            }
            throw txErr;
        } finally {
            await session.endSession();
        }

        // F. Counts-only response (draft branch). No raw docs/
        // selectionSnapshot/contentSnapshot/userIds/emails/tokens/provider/
        // html/text.
        return res.status(200).json({
            ok: true,
            campaignId,
            deletedCampaign: true,
            deletedRecipients: 0,
        });
    } catch (err) {
        console.error(
            "[adminMarketingCampaign] delete failed",
            err?.message || err,
        );
        return res
            .status(500)
            .json({ ok: false, message: "Failed to delete campaign" });
    }
}
