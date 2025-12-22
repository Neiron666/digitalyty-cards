import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import paymentProvider from "../services/payment/index.js";

const router = Router();

/**
 * Создание платежа
 * body: { plan: "monthly" | "yearly" }
 */
router.post("/create", requireAuth, async (req, res) => {
    const { plan } = req.body;

    if (!plan) {
        return res.status(400).json({ message: "Plan is required" });
    }

    const payment = await paymentProvider.createPayment({
        userId: req.userId,
        plan,
    });

    res.json(payment);
});

/**
 * Server-to-server notify (Tranzila)
 * БЕЗ requireAuth
 */
router.post("/notify", async (req, res) => {
    try {
        await paymentProvider.handleNotify(req.body);
        res.status(200).send("OK");
    } catch (err) {
        console.error(err);
        res.status(500).send("ERROR");
    }
});

export default router;
