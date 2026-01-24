import { hasAccess } from "./planAccess.js";
import { resolveBilling } from "./trial.js";
import { resolveEffectiveTier } from "./tier.js";
import { formatIsrael } from "./time.util.js";
import { GALLERY_LIMIT } from "../config/galleryLimit.js";
import { normalizeAboutParagraphs } from "./about.js";

function planFromTier(tier) {
    if (tier === "premium") return "yearly";
    if (tier === "basic") return "monthly";
    return "free";
}

function isTrialExpiredForWrite(card, now = new Date()) {
    const endsAt = card?.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (!endsAt) return false;
    return new Date(now).getTime() >= endsAt;
}

export function resolveEffectiveBilling(card, now = new Date()) {
    // Single source of truth: the billing resolver returns the effectiveBilling contract.
    return resolveBilling(card, now);
}

export function computeEntitlements(
    card,
    effectiveBilling,
    effectiveTier,
    now = new Date(),
) {
    const tier = effectiveTier?.tier || "free";
    const featurePlan = planFromTier(tier);
    const isEntitled = Boolean(effectiveBilling?.isEntitled);

    // Billing truth: edit/write access.
    const trialExpired = !isEntitled && isTrialExpiredForWrite(card, now);
    const lockedReason = trialExpired ? "TRIAL_EXPIRED" : null;
    const canEdit = isEntitled;

    // Feature truth: derived from effective tier.
    // Special case: trial shows a demo (fake premium) analytics view.
    let analyticsLevel = "none";
    if (tier === "premium") {
        analyticsLevel = "premium";
    } else if (tier === "basic") {
        analyticsLevel = "basic";
    } else if (
        tier === "free" &&
        effectiveBilling?.source === "trial" &&
        effectiveBilling?.isEntitled &&
        !effectiveBilling?.isPaid
    ) {
        analyticsLevel = "demo";
    }

    const analyticsRetentionDays =
        analyticsLevel === "basic"
            ? 7
            : analyticsLevel === "premium" || analyticsLevel === "demo"
              ? 30
              : 0;

    const canViewAnalytics = analyticsLevel !== "none";

    const galleryLimit = GALLERY_LIMIT;
    const canUploadGallery = canEdit && galleryLimit > 0;

    return {
        canEdit,
        lockedReason,
        galleryLimit,
        canUploadGallery,
        canUseLeads: hasAccess(featurePlan, "leadForm"),
        canUseVideo: hasAccess(featurePlan, "video"),
        canUseReviews: hasAccess(featurePlan, "reviews"),
        analyticsLevel,
        canViewAnalytics,
        analyticsRetentionDays,
        design: {
            customColors: tier !== "free",
            customFonts: tier !== "free",
        },
    };
}

function pickSafeCardFields(cardObj) {
    return {
        _id: cardObj._id,
        slug: cardObj.slug,
        status: cardObj.status,
        isActive: cardObj.isActive,
        business: cardObj.business,
        contact: cardObj.contact,
        content: cardObj.content,
        faq: cardObj.faq,
        design: cardObj.design,
        gallery: cardObj.gallery,
        reviews: cardObj.reviews,
        seo: cardObj.seo,
        flags: cardObj.flags,
        trialStartedAt: cardObj.trialStartedAt || null,
        trialEndsAt: cardObj.trialEndsAt || null,
        createdAt: cardObj.createdAt,
        updatedAt: cardObj.updatedAt,
        // IMPORTANT: do NOT expose raw billing/adminOverride/user/anonymousId by default.
    };
}

export function toCardDTO(
    card,
    now = new Date(),
    { includePrivate = false, minimal = false, user = null } = {},
) {
    if (!card) return null;

    const cardObj =
        typeof card.toObject === "function" ? card.toObject() : card;

    const effectiveBillingRaw = resolveEffectiveBilling(cardObj, now);
    const effectiveBilling = {
        ...effectiveBillingRaw,
        untilIsrael: effectiveBillingRaw?.until
            ? formatIsrael(effectiveBillingRaw.until)
            : null,
    };
    const effectiveTier = resolveEffectiveTier({
        card: cardObj,
        user,
        effectiveBilling,
        now,
    });
    const entitlements = computeEntitlements(
        cardObj,
        effectiveBilling,
        effectiveTier,
        now,
    );

    const base = minimal
        ? {
              _id: cardObj._id,
              slug: cardObj.slug,
              status: cardObj.status,
              isActive: cardObj.isActive,
              updatedAt: cardObj.updatedAt,
              createdAt: cardObj.createdAt,
              trialEndsAt: cardObj.trialEndsAt || null,
          }
        : pickSafeCardFields(cardObj);

    const dto = {
        ...base,
        effectiveBilling,
        effectiveTier: effectiveTier?.tier || "free",
        tierSource: effectiveTier?.source || "default",
        tierUntil: effectiveTier?.until
            ? new Date(effectiveTier.until).toISOString()
            : null,
        trialEndsAtIsrael: cardObj?.trialEndsAt
            ? formatIsrael(cardObj.trialEndsAt)
            : null,
        entitlements,
    };

    if (includePrivate) {
        dto.user = cardObj.user || null;
        dto.anonymousId = cardObj.anonymousId || null;
        dto.plan = cardObj.plan;
        dto.billing = cardObj.billing;
        dto.adminOverride = cardObj.adminOverride;
        dto.adminTier = cardObj.adminTier || null;
        dto.adminTierUntil = cardObj.adminTierUntil || null;
        dto.adminTierByAdmin = cardObj.adminTierByAdmin || null;
        dto.adminTierReason = cardObj.adminTierReason || null;
        dto.adminTierCreatedAt = cardObj.adminTierCreatedAt || null;
        dto.ownerAdminTier = user?.adminTier || null;
        dto.ownerAdminTierUntil = user?.adminTierUntil || null;
        dto.trialDeleteAt = cardObj.trialDeleteAt || null;
        dto.uploads = cardObj.uploads;
    }

    // Tolerant reader/writer for About:
    // - Always expose content.aboutParagraphs as an array
    // - Keep content.aboutText as a legacy string (joined paragraphs)
    if (dto.content && typeof dto.content === "object") {
        const content = dto.content || {};
        const paragraphs = normalizeAboutParagraphs(
            content.aboutParagraphs ?? content.aboutText,
        );

        dto.content = {
            ...content,
            aboutParagraphs: paragraphs,
            aboutText: paragraphs.join("\n\n"),
        };
    }

    return dto;
}
