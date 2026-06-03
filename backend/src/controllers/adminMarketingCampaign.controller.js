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
import {
    MAX_MARKETING_DRY_RUN_USER_IDS,
    revalidateMarketingRecipientUserIds,
} from "../utils/marketingRecipientEligibility.util.js";
import MarketingCampaign from "../models/MarketingCampaign.model.js";
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
const DRAFT_LIST_STATUSES = new Set(["draft", "canceled"]);
const DRAFT_LIST_DEFAULT_LIMIT = 20;
const DRAFT_LIST_MAX_LIMIT = 50;

/**
 * GET /api/admin/marketing/campaigns/drafts
 * Query: status? (draft|canceled, default draft), page? (>=1), limit? (1..50).
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
