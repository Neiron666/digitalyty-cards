import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import { createTranzilaPayment } from "../services/payment/tranzila.provider.js";

const PRICES = {
    monthly: 29.9,
    yearly: 200,
};

export async function createPayment(req, res) {
    const { plan } = req.body;
    const userId = req.userId;

    if (!PRICES[plan]) {
        return res.status(400).json({ message: "Invalid plan" });
    }

    const payment = createTranzilaPayment({
        amount: PRICES[plan],
        description: `Cardigo — ${plan}`,
        userId,
        plan,
    });

    res.json(payment);
}

export async function tranzilaNotify(req, res) {
    try {
        const { udf1: userId, udf2: plan, Response } = req.body;

        // Response === "000" — успех
        if (Response !== "000") {
            return res.status(200).send("IGNORED");
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        user.plan = plan;
        user.planExpiresAt =
            plan === "monthly"
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        await user.save();

        if (user.cardId) {
            await Card.findByIdAndUpdate(user.cardId, { plan });
        }

        res.status(200).send("OK");
    } catch (err) {
        console.error(err);
        res.status(500).send("ERROR");
    }
}
