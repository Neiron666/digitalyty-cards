import { Router } from "express";
import Card from "../models/Card.model.js";
import BlogPost from "../models/BlogPost.model.js";
import GuidePost from "../models/GuidePost.model.js";
import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { isEntitled, isTrialExpired, resolveBilling } from "../utils/trial.js";
import { resolveSeoIndexability } from "../utils/seoIndexability.js";
import { resolveOrgEntitlementBilling } from "../utils/orgEntitlement.util.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";
import { getPublicUrlForPath } from "../services/supabaseStorage.js";
import SlugRedirect from "../models/SlugRedirect.model.js";
import { toCardDTO } from "../utils/cardDTO.js";
import {
    toCardPublicSeoDTO,
    toCardPublicRenderDTO,
} from "../utils/cardPublicProjection.util.js";
import { renderCardOgHtml } from "../services/cardOgHtml.service.js";

// Canonical Cardigo OG fallback image — matches seoConstants.js and marketingMeta.config.js SSoT.
// Keep in sync manually if the path ever changes; do NOT import from frontend modules.
const DEFAULT_OG_IMAGE_SUFFIX =
    "/images/og/cardigo-home-og-1200x630.jpg?v=20260721";

const router = Router();

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isValidAbsoluteHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const u = new URL(value.trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

const GENERIC_CARD_OG_TITLES = new Set([
    "כרטיס ביקור דיגיטלי",
    "כרטיס ביקור דיגיטלי – Cardigo",
    "כרטיס ביקור דיגיטלי | Cardigo",
    "Cardigo",
]);

function normalizeMetaText(value, maxLength) {
    const text = String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!maxLength) return text;
    return text.slice(0, maxLength);
}

function isGenericCardOgTitle(value) {
    return GENERIC_CARD_OG_TITLES.has(normalizeMetaText(value));
}

function buildCardOgMetadata(card, siteUrl) {
    const rawSeoTitle = normalizeMetaText(card.seo?.title);
    const seoTitle =
        rawSeoTitle && !isGenericCardOgTitle(rawSeoTitle) ? rawSeoTitle : "";
    const businessName = normalizeMetaText(card.business?.name);

    const title =
        seoTitle ||
        (businessName
            ? businessName + " – כרטיס ביקור דיגיטלי"
            : "כרטיס ביקור דיגיטלי");

    const description =
        normalizeMetaText(card.seo?.description, 160) ||
        normalizeMetaText(card.content?.description, 160) ||
        normalizeMetaText(card.content?.aboutText, 160) ||
        "כרטיס ביקור דיגיטלי לעסקים – Cardigo";

    const fallbackImage = siteUrl + DEFAULT_OG_IMAGE_SUFFIX;
    const image = card.design?.coverImage || card.design?.logo || fallbackImage;
    const isFallbackImage = image === fallbackImage;

    const imageAlt = businessName
        ? businessName + " – Cardigo"
        : "Cardigo – כרטיס ביקור דיגיטלי לעסקים";

    const imageParts = [
        '    <meta property="og:image" content="' + escapeHtml(image) + '" />',
    ];
    if (String(image).startsWith("https://")) {
        imageParts.push(
            '    <meta property="og:image:secure_url" content="' +
                escapeHtml(image) +
                '" />',
        );
    }
    if (isFallbackImage) {
        imageParts.push(
            '    <meta property="og:image:width" content="1200" />',
        );
        imageParts.push(
            '    <meta property="og:image:height" content="630" />',
        );
        imageParts.push(
            '    <meta property="og:image:type" content="image/jpeg" />',
        );
    }
    imageParts.push(
        '    <meta property="og:image:alt" content="' +
            escapeHtml(imageAlt) +
            '" />',
    );
    imageParts.push(
        '    <meta name="twitter:image:alt" content="' +
            escapeHtml(imageAlt) +
            '" />',
    );

    return {
        title,
        description,
        image,
        imageMetaHtml: imageParts.join("\n"),
    };
}

const DEFAULT_BLOG_AUTHOR_NAME = "\u05D5\u05DC\u05E0\u05D8\u05D9\u05DF";

async function resolvePublishedBySlugOrAlias(Model, rawSlug) {
    const slug = String(rawSlug || "")
        .trim()
        .toLowerCase();
    if (!slug) return null;

    const exact = await Model.findOne({
        slug,
        status: "published",
    }).lean();
    if (exact) return exact;

    return Model.findOne({
        previousSlugs: slug,
        status: "published",
    }).lean();
}

/* ── OG redirect resolver ─────────────────────────────────────── */

async function resolveOgRedirectTarget(
    routeType,
    orgId,
    slug,
    now,
    options = {},
) {
    const record = await SlugRedirect.findOne({
        routeType,
        orgId,
        slug,
        status: "redirect_quarantine",
    })
        .select(
            "targetCardId expiresAt permanentQuarantine manualReleaseRequired",
        )
        .lean();

    if (!record) return null;

    const isForever =
        record.permanentQuarantine === true ||
        record.manualReleaseRequired === true;
    if (!isForever && record.expiresAt <= now) return null;

    if (!record.targetCardId) return null;

    // Load full document — OG rendering needs seo, business, content, design.
    // Do NOT use a limited visibility-only select (would produce generic fallback OG).
    const targetCard = await Card.findById(record.targetCardId).lean();

    if (!targetCard) return null;
    if (!targetCard.isActive) return null;
    if (targetCard.status !== "published") return null;
    // Defense: anon-only cards must not be reachable via redirect.
    if (targetCard.anonymousId && !targetCard.user) return null;
    if (!targetCard.user) return null;

    if (isTrialExpired(targetCard, now) && !isEntitled(targetCard, now))
        return null;

    if (routeType === "orgCard") {
        const { org } = options;
        if (!org?._id) return null;

        // Target card must still belong to the same org namespace.
        if (String(targetCard.orgId) !== String(org._id)) return null;

        // Anti-enumeration: owner membership must still be active.
        const ownerMember = await OrganizationMember.findOne({
            orgId: org._id,
            userId: String(targetCard.user),
            status: "active",
        })
            .select("_id")
            .lean();

        if (!ownerMember?._id) return null;
    }

    return { targetCard };
}

/* ── Blog OG ──────────────────────────────────────────────────── */

router.get("/og/blog/:slug", async (req, res) => {
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();
    if (!slug) return res.status(404).send("Not found");

    const post = await resolvePublishedBySlugOrAlias(BlogPost, slug);
    if (!post) return res.status(404).send("Not found");

    const siteUrl = getSiteUrl();
    // publicUrl built from resolved post.slug — alias requests get canonical URL.
    const publicUrl = `${siteUrl}/blog/${post.slug}/`;

    // Collapse newlines → single space so meta content="..." stays single-line.
    const collapseWs = (s) =>
        String(s || "")
            .replace(/[\r\n]+/g, " ")
            .trim();

    const title =
        collapseWs(post.seo?.title || post.title) ||
        "\u05D1\u05DC\u05D5\u05D2 | Cardigo";
    const description = collapseWs(post.seo?.description || post.excerpt || "");

    const articlePublishedTime = post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : "";
    const articleModifiedTime =
        post.updatedAt || post.publishedAt
            ? new Date(post.updatedAt || post.publishedAt).toISOString()
            : "";
    const articleAuthor =
        collapseWs(post.authorName) || DEFAULT_BLOG_AUTHOR_NAME;

    const heroPath =
        post.heroImage?.storagePath ||
        (post.heroImage && typeof post.heroImage === "object"
            ? post.heroImage.storagePath
            : "");
    const image =
        getPublicUrlForPath({ path: heroPath }) ||
        siteUrl + DEFAULT_OG_IMAGE_SUFFIX;

    const imageAlt = image
        ? collapseWs(post.heroImage?.alt) || collapseWs(post.title) || ""
        : "";

    const imageMeta = image
        ? "\n" +
          [
              `    <meta property="og:image" content="${escapeHtml(image)}" />`,
              imageAlt
                  ? `    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`
                  : "",
              `    <meta name="twitter:image" content="${escapeHtml(image)}" />`,
              imageAlt
                  ? `    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`
                  : "",
          ]
              .filter(Boolean)
              .join("\n")
        : "";

    const articleMeta = [
        articlePublishedTime
            ? `    <meta property="article:published_time" content="${escapeHtml(articlePublishedTime)}" />`
            : "",
        articleModifiedTime
            ? `    <meta property="article:modified_time" content="${escapeHtml(articleModifiedTime)}" />`
            : "",
        articleAuthor
            ? `    <meta property="article:author" content="${escapeHtml(articleAuthor)}" />`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Cardigo" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(publicUrl)}" />${imageMeta}
${articleMeta ? "\n" + articleMeta : ""}
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />

    <meta http-equiv="refresh" content="0; url=${escapeHtml(publicUrl)}" />
  </head>
  <body>
    <a href="${escapeHtml(publicUrl)}">${escapeHtml(publicUrl)}</a>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

/* ── Guide OG ─────────────────────────────────────────────────── */

router.get("/og/guides/:slug", async (req, res) => {
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();
    if (!slug) return res.status(404).send("Not found");

    const post = await resolvePublishedBySlugOrAlias(GuidePost, slug);
    if (!post) return res.status(404).send("Not found");

    const siteUrl = getSiteUrl();
    // publicUrl built from resolved post.slug — alias requests get canonical URL.
    const publicUrl = `${siteUrl}/guides/${post.slug}/`;

    const collapseWs = (s) =>
        String(s || "")
            .replace(/[\r\n]+/g, " ")
            .trim();

    const title =
        collapseWs(post.seo?.title || post.title) ||
        "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD | Cardigo";
    const description = collapseWs(post.seo?.description || post.excerpt || "");

    const articlePublishedTime = post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : "";
    const articleModifiedTime =
        post.updatedAt || post.publishedAt
            ? new Date(post.updatedAt || post.publishedAt).toISOString()
            : "";
    const articleAuthor =
        collapseWs(post.authorName) || DEFAULT_BLOG_AUTHOR_NAME;

    const heroPath =
        post.heroImage?.storagePath ||
        (post.heroImage && typeof post.heroImage === "object"
            ? post.heroImage.storagePath
            : "");
    const image =
        getPublicUrlForPath({ path: heroPath }) ||
        siteUrl + DEFAULT_OG_IMAGE_SUFFIX;

    const imageAlt = image
        ? collapseWs(post.heroImage?.alt) || collapseWs(post.title) || ""
        : "";

    const imageMeta = image
        ? "\n" +
          [
              `    <meta property="og:image" content="${escapeHtml(image)}" />`,
              imageAlt
                  ? `    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`
                  : "",
              `    <meta name="twitter:image" content="${escapeHtml(image)}" />`,
              imageAlt
                  ? `    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`
                  : "",
          ]
              .filter(Boolean)
              .join("\n")
        : "";

    const articleMeta = [
        articlePublishedTime
            ? `    <meta property="article:published_time" content="${escapeHtml(articlePublishedTime)}" />`
            : "",
        articleModifiedTime
            ? `    <meta property="article:modified_time" content="${escapeHtml(articleModifiedTime)}" />`
            : "",
        articleAuthor
            ? `    <meta property="article:author" content="${escapeHtml(articleAuthor)}" />`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Cardigo" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(publicUrl)}" />${imageMeta}
${articleMeta ? "\n" + articleMeta : ""}
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />

    <meta http-equiv="refresh" content="0; url=${escapeHtml(publicUrl)}" />
  </head>
  <body>
    <a href="${escapeHtml(publicUrl)}">${escapeHtml(publicUrl)}</a>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

/* ── Card OG (personal) ───────────────────────────────────────── */

router.get("/og/card/:slug", async (req, res) => {
    const siteUrl = getSiteUrl();
    const personalOrgId = await getPersonalOrgId();
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();
    const now = new Date();

    let card = await Card.findOne({
        slug,
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
        $or: [
            { orgId: personalOrgId },
            { orgId: { $exists: false } },
            { orgId: null },
        ],
    });

    if (!card) {
        const ogRedirect = await resolveOgRedirectTarget(
            "card",
            personalOrgId,
            slug,
            now,
        );
        if (!ogRedirect) return res.status(404).send("Not found");
        card = ogRedirect.targetCard;
    }

    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).send("TRIAL_EXPIRED_PUBLIC");
    }

    const publicUrl = `${siteUrl}/card/${card.slug}`;

    const effectiveBilling = resolveBilling(card, now);
    const { platformForcedNoindex } = resolveSeoIndexability(
        card,
        effectiveBilling,
        now,
    );
    const robotsValue = platformForcedNoindex
        ? "noindex"
        : String(card.seo?.robots || "").trim();
    // Card-route canonical is always self publicUrl.
    // seo.canonicalUrl is ignored: same-origin and same-domain cross-card canonicals
    // are both forbidden — the only valid canonical for a card route is the card's own URL.

    const dto = toCardDTO(card, now, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const dtoForProjection = {
        ...dto,
        seo: { ...(dto.seo || {}), robots: robotsValue },
    };
    const seo = toCardPublicSeoDTO(dtoForProjection, { siteUrl, publicUrl });
    const render = toCardPublicRenderDTO(dtoForProjection, {
        siteUrl,
        publicUrl,
    });
    const ogLang = dtoForProjection.language === "ru" ? "ru" : "he";
    const ogDir = ogLang === "ru" ? "ltr" : "rtl";
    const html = renderCardOgHtml({ seo, render, lang: ogLang, dir: ogDir });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

router.get("/og/c/:orgSlug/:slug", async (req, res) => {
    const siteUrl = getSiteUrl();
    const orgSlug = String(req.params.orgSlug || "")
        .trim()
        .toLowerCase();
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();

    if (!orgSlug || !slug) {
        return res.status(404).send("Not found");
    }

    const org = await Organization.findOne({ slug: orgSlug, isActive: true })
        .select("_id orgEntitlement isActive")
        .lean();
    if (!org?._id) {
        return res.status(404).send("Not found");
    }

    const now = new Date();

    let card = await Card.findOne({
        orgId: org._id,
        slug,
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
    });

    if (!card) {
        const ogRedirect = await resolveOgRedirectTarget(
            "orgCard",
            org._id,
            slug,
            now,
            { org },
        );
        if (!ogRedirect) return res.status(404).send("Not found");
        card = ogRedirect.targetCard;
    }

    // Anti-enumeration: revoked members must not be publicly resolvable.
    // IMPORTANT: membership-gate MUST happen before any distinguishable public responses (e.g., 410).
    const ownerMember = await OrganizationMember.findOne({
        orgId: org._id,
        userId: String(card.user),
        status: "active",
    })
        .select("_id")
        .lean();

    if (!ownerMember?._id) {
        return res.status(404).send("Not found");
    }

    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).send("TRIAL_EXPIRED_PUBLIC");
    }

    const publicUrl = `${siteUrl}/c/${orgSlug}/${card.slug}`;

    const orgBilling = resolveOrgEntitlementBilling(org, now);
    const effectiveBilling = orgBilling || resolveBilling(card, now);
    const { platformForcedNoindex } = resolveSeoIndexability(
        card,
        effectiveBilling,
        now,
    );
    const robotsValue = platformForcedNoindex
        ? "noindex"
        : String(card.seo?.robots || "").trim();
    // Card-route canonical is always self publicUrl.
    // seo.canonicalUrl is ignored: same-origin and same-domain cross-card canonicals
    // are both forbidden — the only valid canonical for a card route is the card's own URL.

    const dto = toCardDTO(card, now, {
        includePrivate: false,
        org,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const dtoForProjection = {
        ...dto,
        seo: { ...(dto.seo || {}), robots: robotsValue },
    };
    const seo = toCardPublicSeoDTO(dtoForProjection, { siteUrl, publicUrl });
    const render = toCardPublicRenderDTO(dtoForProjection, {
        siteUrl,
        publicUrl,
    });
    const ogLang = dtoForProjection.language === "ru" ? "ru" : "he";
    const ogDir = ogLang === "ru" ? "ltr" : "rtl";
    const html = renderCardOgHtml({ seo, render, lang: ogLang, dir: ogDir });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

export default router;
