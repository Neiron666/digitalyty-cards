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
 * БЕЗ requireAuth - defense-in-depth via x-cardigo-notify-token (MUST-if-set)
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

/**
 * STO server-to-server notify (Tranzila recurring)
 * БЕЗ requireAuth - fail-closed via CARDIGO_STO_NOTIFY_TOKEN (must be set, else 503)
 */
router.post("/sto-notify", async (req, res) => {
    try {
        // A. Read expected token — fail-closed: 503 if not configured
        const expectedStoToken = process.env.CARDIGO_STO_NOTIFY_TOKEN?.trim();
        if (!expectedStoToken) {
            console.error(
                "[sto-notify] CARDIGO_STO_NOTIFY_TOKEN is not configured",
            );
            return res.status(503).send("ERROR");
        }

        // B. Validate provided token from header
        const provided = req.header("x-cardigo-sto-notify-token")?.trim();
        if (provided !== expectedStoToken) {
            // Anti-oracle: do not reveal mismatch to caller
            return res.status(200).send("OK");
        }

        // C. Token matched — call handler
        await paymentProvider.handleStoNotify(req.body);
        res.status(200).send("OK");
    } catch (err) {
        // Only infra failures (DB down, network) reach here.
        // Business failures are handled inside handleStoNotify (no throw).
        console.error("[sto-notify] infra failure:", err.message);
        res.status(500).send("ERROR");
    }
});

export default router;
