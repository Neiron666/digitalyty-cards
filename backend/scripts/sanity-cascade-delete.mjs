import "dotenv/config";
import { pathToFileURL } from "url";
import mongoose from "mongoose";

import Card from "../src/models/Card.model.js";
import Lead from "../src/models/Lead.model.js";
import CardAnalyticsDaily from "../src/models/CardAnalyticsDaily.model.js";
import { connectDB } from "../src/config/db.js";
import { deleteCardCascade } from "../src/utils/cardDeleteCascade.js";

function makeSlug() {
    const rand = Math.random().toString(16).slice(2, 8);
    return `sanity-cascade-${Date.now()}-${rand}`;
}

async function main() {
    try {
        await connectDB(process.env.MONGO_URI);

        const slug = makeSlug();

        const card = await Card.create({ slug });

        await Lead.create({
            card: card._id,
            name: "Sanity Lead",
            email: "sanity@example.com",
            phone: "+10000000000",
            message: "Sanity cascade delete test",
        });

        const day = "2099-01-01";
        await CardAnalyticsDaily.create({
            cardId: card._id,
            day,
            views: 1,
            clicksTotal: 1,
        });

        const leadsBefore = await Lead.countDocuments({ card: card._id });
        const analyticsBefore = await CardAnalyticsDaily.countDocuments({
            cardId: card._id,
        });

        if (leadsBefore !== 1 || analyticsBefore !== 1) {
            throw new Error(
                `Fixture counts unexpected: leads=${leadsBefore} analytics=${analyticsBefore}`,
            );
        }

        const cascade = await deleteCardCascade({ cardId: card._id });

        const leadsAfter = await Lead.countDocuments({ card: card._id });
        const analyticsAfter = await CardAnalyticsDaily.countDocuments({
            cardId: card._id,
        });

        if (leadsAfter !== 0 || analyticsAfter !== 0) {
            throw new Error(
                `Cascade failed: leads=${leadsAfter} analytics=${analyticsAfter} (meta: ${JSON.stringify(
                    cascade,
                )})`,
            );
        }

        await Card.deleteOne({ _id: card._id });

        console.log("OK", {
            cardId: String(card._id),
            slug,
            cascade,
        });
    } finally {
        // critical: иначе Node будет висеть после OK
        try {
            await mongoose.disconnect();
        } catch (_) {
            // best-effort
        }
    }
}

const argv1 = process?.argv?.[1];
if (
    typeof argv1 === "string" &&
    import.meta.url === pathToFileURL(argv1).href
) {
    main().catch((err) => {
        console.error("FAILED", err?.message || err);
        process.exitCode = 1;
    });
}
