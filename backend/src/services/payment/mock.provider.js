import User from "../../models/User.model.js";
import Card from "../../models/Card.model.js";

export default {
    async createPayment({ userId, plan }) {
        return {
            paymentUrl: `/mock-payment-success?plan=${plan}`,
        };
    },

    async handleNotify({ userId, plan }) {
        const user = await User.findById(userId);
        if (!user) return;

        user.plan = plan;
        user.subscription = {
            status: "active",
            provider: "mock",
            expiresAt:
                plan === "monthly"
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };

        await user.save();

        if (user.cardId) {
            const paidUntil = user.subscription?.expiresAt || null;

            // Phase 2C: never overwrite billing wholesale (preserve billing.features + billing.payer).
            // 1) Dot-path update for normal cases (billing missing or object).
            await Card.updateOne(
                {
                    _id: user.cardId,
                    $or: [
                        { billing: { $exists: false } },
                        { billing: { $type: "object" } },
                    ],
                },
                {
                    $set: {
                        plan,
                        "billing.status": "active",
                        "billing.plan": plan,
                        "billing.paidUntil": paidUntil,
                    },
                },
            );

            // 2) Fallback for billing === null (dot-path would fail). Do NOT set payer/features.
            await Card.updateOne(
                { _id: user.cardId, billing: null },
                {
                    $set: {
                        plan,
                        billing: {
                            status: "active",
                            plan,
                            paidUntil,
                        },
                    },
                },
            );
        }
    },
};
