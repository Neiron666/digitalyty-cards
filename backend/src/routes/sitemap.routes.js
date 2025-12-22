import { Router } from "express";
import Card from "../models/Card.model.js";
import { isPaid, isTrialExpired } from "../utils/trial.js";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
    const cards = await Card.find({
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
    }).select("slug trialEndsAt billing plan");

    const now = new Date();
    const visible = cards.filter(
        (c) => !(isTrialExpired(c, now) && !isPaid(c, now))
    );

    const urls = visible
        .map(
            (c) =>
                `<url><loc>https://digitalyty.co.il/card/${c.slug}</loc></url>`
        )
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
});

export default router;
