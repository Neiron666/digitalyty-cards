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
 * БЕЗ requireAuth — defense-in-depth via x-cardigo-notify-token (MUST-if-set)
 */
router.post("/notify", async (req, res) => {
    try {
        // Defense-in-depth: x-cardigo-notify-token (MUST-if-set)
        const expected = process.env.CARDIGO_NOTIFY_TOKEN?.trim();
        if (expected) {
            const provided = req.header("x-cardigo-notify-token")?.trim();
            if (provided !== expected) {
                // Anti-oracle: do not leak token mismatch
                return res.status(200).send("OK");
            }
        }

        await paymentProvider.handleNotify(req.body);
        res.status(200).send("OK");
    } catch (err) {
        // Only infra failures (DB down, network) reach here.
        // Signature/business failures are handled inside handleNotify (no throw).
        console.error("[notify] infra failure:", err.message);
        res.status(500).send("ERROR");
    }
});

export default router;
