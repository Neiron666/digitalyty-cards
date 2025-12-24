import { Router } from "express";
import Card from "../models/Card.model.js";
import { isEntitled, isTrialExpired } from "../utils/trial.js";

const router = Router();

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

router.get("/og/card/:slug", async (req, res) => {
    const card = await Card.findOne({
        slug: req.params.slug,
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
    });

    if (!card) {
        return res.status(404).send("Not found");
    }

    const now = new Date();
    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).send("TRIAL_EXPIRED_PUBLIC");
    }

    const siteUrl = process.env.SITE_URL || "https://digitalyty.co.il";
    const publicUrl = `${siteUrl}/card/${card.slug}`;

    const title = card.seo?.title || "כרטיס ביקור דיגיטלי";
    const description =
        card.seo?.description || "כרטיס ביקור דיגיטלי לעסקים – Digitalyty";

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
