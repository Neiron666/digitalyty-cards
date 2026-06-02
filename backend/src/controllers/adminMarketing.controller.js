import User from "../models/User.model.js";
import { findSuppressedEmails } from "../utils/marketingOptOut.util.js";

// ── Local query helpers ───────────────────────────────────────────
// Mirror the constraints used by admin.controller.js (parsePagination /
// parseSearch) without importing private internals, so the existing listUsers
// endpoint contract is untouched.

function clampInt(value, { min, max, fallback }) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 25 });
    return { page, limit, skip: (page - 1) * limit };
}

function parseSearch(req, { maxLen = 64 } = {}) {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!raw) return null;
    const q = raw.slice(0, maxLen);
    return new RegExp(escapeRegExp(q), "i");
}

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

/**
 * GET /api/admin/marketing/recipients?q=&cohort=&page=&limit=
 *
 * Read-only. Returns ONLY marketing-eligible recipients:
 *   emailMarketingConsent === true AND isVerified === true AND non-empty email
 *   AND not suppressed in MarketingOptOut (page-level exclusion).
 *
 * No DB writes. No Mailjet. No campaign/send logic. requireAdmin is inherited
 * from the /api/admin mount.
 */
export async function listMarketingRecipients(req, res) {
    const { skip, limit, page } = parsePagination(req);
    const q = parseSearch(req);
    const cohort =
        typeof req.query.cohort === "string" ? req.query.cohort.trim() : "";

    // ── Base eligibility predicate (consent + verified + real email) ──
    const emailCond = { $type: "string", $ne: "" };
    if (q) emailCond.$regex = q;

    const filter = {
        emailMarketingConsent: true,
        isVerified: true,
        email: emailCond,
    };

    // ── Cohort narrowing (mirrors admin.controller.js listUsers semantics) ──
    const now = new Date();
    if (cohort === "trial") {
        filter.trialActivatedAt = { $ne: null };
        filter.trialEndsAt = { $gt: now };
        filter["subscription.status"] = { $ne: "active" };
    } else if (cohort === "paying") {
        filter["subscription.status"] = "active";
    } else if (cohort === "non-paying") {
        filter["subscription.status"] = { $ne: "active" };
        filter.$nor = [
            { trialActivatedAt: { $ne: null }, trialEndsAt: { $gt: now } },
        ];
    }

    // Minimal projection — real User fields only, never secrets/virtuals.
    const projection = {
        email: 1,
        firstName: 1,
        plan: 1,
        "subscription.status": 1,
        isVerified: 1,
        emailMarketingConsent: 1,
        emailMarketingConsentAt: 1,
        emailMarketingConsentSource: 1,
        trialActivatedAt: 1,
        trialEndsAt: 1,
        createdAt: 1,
    };

    const [candidates, totalCandidates] = await Promise.all([
        User.find(filter)
            .select(projection)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);

    // ── Page-level suppression exclusion (HMAC batch lookup, server-only) ──
    const suppressed = await findSuppressedEmails(
        candidates.map((u) => normalizeEmail(u.email)),
    );

    const nowMs = Date.now();
    const items = [];
    let suppressedOnPage = 0;

    for (const u of candidates) {
        const norm = normalizeEmail(u.email);
        if (norm && suppressed.has(norm)) {
            suppressedOnPage += 1;
            continue;
        }

        const isTrialActive = Boolean(
            u.trialActivatedAt &&
            u.trialEndsAt &&
            new Date(u.trialEndsAt).getTime() > nowMs &&
            u?.subscription?.status !== "active",
        );

        items.push({
            userId: String(u._id),
            email: u.email,
            firstName: u.firstName ?? null,
            plan: u.plan ?? null,
            subscriptionStatus: u?.subscription?.status ?? null,
            isVerified: Boolean(u.isVerified),
            emailMarketingConsent: u.emailMarketingConsent === true,
            emailMarketingConsentAt: u.emailMarketingConsentAt ?? null,
            emailMarketingConsentSource: u.emailMarketingConsentSource ?? null,
            trialActivatedAt: u.trialActivatedAt ?? null,
            trialEndsAt: u.trialEndsAt ?? null,
            isTrialActive,
        });
    }

    return res.json({
        page,
        limit,
        // Pre-suppression eligible count. Visible items below are post page-level
        // suppression exclusion — totalCandidates is intentionally NOT the exact
        // net mailable count for this slice.
        totalCandidates,
        returnedCount: items.length,
        suppressedOnPage,
        items,
    });
}
