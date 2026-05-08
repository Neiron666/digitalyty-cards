/**
 * SEO Indexability Utility — PUBLIC_CARD_SEO_INDEXABILITY_POLICY_V1
 *
 * Pure utility: no DB access, no model imports, no imports from trial.js /
 * tier.js / orgEntitlement.util.js / cardDTO.js. No side effects.
 *
 * SEO state model:
 *   trial-premium  => platformForcedNoindex (premium features, not SEO indexable)
 *   free           => platformForcedNoindex
 *   anonymous      => platformForcedNoindex
 *   paid billing   => indexable
 *   org entitlement => indexable
 *   adminOverride  => indexable
 *   card.adminTier => indexable
 */

/**
 * Resolve SEO indexability for a public card.
 *
 * @param {object} card - plain card object (lean or toObject); fields accessed:
 *   status, isActive, adminTier, adminTierUntil
 * @param {object} effectiveBilling - result of resolveBilling / resolveOrgEntitlementBilling;
 *   fields accessed: source, isPaid
 * @param {Date} [now]
 * @returns {{ indexable: boolean, source: string, platformForcedNoindex: boolean }}
 */
export function resolveSeoIndexability(
    card,
    effectiveBilling,
    now = new Date(),
) {
    const nowMs = new Date(now).getTime();

    // 0. Defense-in-depth inactive/draft gate FIRST.
    //    Callers already query isActive:true + status:"published" at DB level,
    //    but this guards against future call-sites without that precondition.
    if (card?.status !== undefined && card.status !== "published") {
        return {
            indexable: false,
            source: "inactive",
            platformForcedNoindex: true,
        };
    }
    if (card?.isActive !== undefined && card.isActive !== true) {
        return {
            indexable: false,
            source: "inactive",
            platformForcedNoindex: true,
        };
    }

    // 1. adminOverride active.
    if (
        effectiveBilling?.source === "adminOverride" &&
        effectiveBilling?.isPaid === true
    ) {
        return {
            indexable: true,
            source: "adminOverride",
            platformForcedNoindex: false,
        };
    }

    // 2. card.adminTier active (inline helper — no import).
    //    "basic" is treated as premium/indexable, matching freezeBasicTier behavior.
    if (_isCardAdminTierActive(card, nowMs)) {
        return {
            indexable: true,
            source: "adminTier",
            platformForcedNoindex: false,
        };
    }

    // 3. Active org entitlement.
    if (
        effectiveBilling?.source === "organization" &&
        effectiveBilling?.isPaid === true
    ) {
        return {
            indexable: true,
            source: "organization",
            platformForcedNoindex: false,
        };
    }

    // 4. Real paid billing (billing.status active/paid, paidUntil future).
    if (
        effectiveBilling?.source === "billing" &&
        effectiveBilling?.isPaid === true
    ) {
        return {
            indexable: true,
            source: "billing",
            platformForcedNoindex: false,
        };
    }

    // 5. Everything else: free, trial-premium, expired trial, anonymous,
    //    missing billing, isPaid false.
    //    NOTE: trial-premium has isPaid:true — intentionally NOT indexable.
    return {
        indexable: false,
        source: effectiveBilling?.source || "unknown",
        platformForcedNoindex: true,
    };
}

/**
 * Inline helper — not exported. No import needed.
 * adminTier values "premium" and "basic" are indexable.
 * Permanent (no adminTierUntil) or future adminTierUntil = active.
 */
function _isCardAdminTierActive(card, nowMs) {
    const t =
        typeof card?.adminTier === "string"
            ? card.adminTier.trim().toLowerCase()
            : "";
    if (t !== "premium" && t !== "basic") return false;
    if (!card.adminTierUntil) return true; // permanent grant
    const untilMs = new Date(card.adminTierUntil).getTime();
    return Number.isFinite(untilMs) && untilMs > nowMs;
}

/**
 * Token-aware check for "noindex" in a robots meta value.
 * Splits by comma, trims and lowercases each token, then checks for exact
 * "noindex" — NOT a substring/regex match.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function robotsContainsNoindex(value) {
    if (!value || typeof value !== "string") return false;
    return value
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes("noindex");
}
