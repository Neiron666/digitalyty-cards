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
            await Card.findByIdAndUpdate(user.cardId, {
                plan,
                billing: {
                    status: "active",
                    plan,
                    paidUntil,
                },
            });
        }
    },
};
