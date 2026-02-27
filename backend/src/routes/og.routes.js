import { Router } from "express";
import Card from "../models/Card.model.js";
import BlogPost from "../models/BlogPost.model.js";
import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { isEntitled, isTrialExpired } from "../utils/trial.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";
import { getPublicUrlForPath } from "../services/supabaseStorage.js";

const router = Router();

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ── Blog OG ──────────────────────────────────────────────────── */

router.get("/og/blog/:slug", async (req, res) => {
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();
    if (!slug) return res.status(404).send("Not found");

    const post = await BlogPost.findOne({ slug, status: "published" }).lean();
    if (!post) return res.status(404).send("Not found");

    const siteUrl = getSiteUrl();
    const publicUrl = `${siteUrl}/blog/${slug}`;

    const title =
        post.seo?.title || post.title || "\u05D1\u05DC\u05D5\u05D2 | Cardigo";
    const description = post.seo?.description || post.excerpt || "";

    const heroPath =
        post.heroImage?.storagePath ||
        (post.heroImage && typeof post.heroImage === "object"
            ? post.heroImage.storagePath
            : "");
    const image = getPublicUrlForPath({ path: heroPath }) || "";

    const imageMeta = image
        ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />`
        : "";

    const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Cardigo" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(publicUrl)}" />${imageMeta}

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

    const card = await Card.findOne({
        slug: req.params.slug,
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
        return res.status(404).send("Not found");
    }

    const now = new Date();
    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).send("TRIAL_EXPIRED_PUBLIC");
    }

    const publicUrl = `${siteUrl}/card/${card.slug}`;

    const title = card.seo?.title || "כרטיס ביקור דיגיטלי";
    const description =
        card.seo?.description || "כרטיס ביקור דיגיטלי לעסקים – Cardigo";

    const image =
        card.design?.coverImage ||
        card.design?.logo ||
        `${siteUrl}/og-default.jpg`;

    const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Cardigo" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(publicUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <meta http-equiv="refresh" content="0; url=${escapeHtml(publicUrl)}" />
  </head>
  <body>
    <a href="${escapeHtml(publicUrl)}">${escapeHtml(publicUrl)}</a>
  </body>
</html>`;

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
        .select("_id")
        .lean();
    if (!org?._id) {
        return res.status(404).send("Not found");
    }

    const card = await Card.findOne({
        orgId: org._id,
        slug,
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
    });

    if (!card) {
        return res.status(404).send("Not found");
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

    const now = new Date();
    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).send("TRIAL_EXPIRED_PUBLIC");
    }

    const publicUrl = `${siteUrl}/c/${orgSlug}/${card.slug}`;

    const title = card.seo?.title || "כרטיס ביקור דיגיטלי";
    const description =
        card.seo?.description || "כרטיס ביקור דיגיטלי לעסקים – Cardigo";

    const image =
        card.design?.coverImage ||
        card.design?.logo ||
        `${siteUrl}/og-default.jpg`;

    const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Cardigo" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(publicUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />

    <meta http-equiv="refresh" content="0; url=${escapeHtml(publicUrl)}" />
  </head>
  <body>
    <a href="${escapeHtml(publicUrl)}">${escapeHtml(publicUrl)}</a>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
});

export default router;
