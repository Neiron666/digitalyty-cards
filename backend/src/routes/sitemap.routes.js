import { Router } from "express";
import Card from "../models/Card.model.js";
import { isEntitled, isTrialExpired } from "../utils/trial.js";
import {
    DEFAULT_TENANT_KEY,
    resolvePublicOriginFromRequest,
    resolveTenantKeyFromRequest,
} from "../utils/tenant.util.js";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
    const tenant = resolveTenantKeyFromRequest(req);
    if (tenant?.ok === false) {
        return res.status(404).send("Not found");
    }

    const tenantKey = tenant?.tenantKey || DEFAULT_TENANT_KEY;
    const publicOrigin = resolvePublicOriginFromRequest(req);

    const siteUrl = publicOrigin.origin;

    const cards = await Card.find({
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
        $or: [
            { tenantKey },
            { tenantKey: { $exists: false } },
            { tenantKey: null },
        ],
    }).select("slug trialEndsAt billing plan");

    const now = new Date();
    const visible = cards.filter(
        (c) => !(isTrialExpired(c, now) && !isEntitled(c, now)),
    );

    const urls = visible
        .map((c) => `<url><loc>${siteUrl}/card/${c.slug}</loc></url>`)
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
});

export default router;
