import crypto from "crypto";
import { TRANZILA_CONFIG } from "../../config/tranzila.js";
import User from "../../models/User.model.js";
import Card from "../../models/Card.model.js";

/**
 * Единый источник цен
 */
const PRICES = {
    monthly: 29.9,
    yearly: 299,
};

/**
 * Подпись Tranzila
 */
function sign(payload) {
    return crypto
        .createHash("sha256")
        .update(payload + TRANZILA_CONFIG.secret)
        .digest("hex");
}

export default {
    /**
     * Создание платежа (redirect пользователя на Tranzila)
     */
    async createPayment({ userId, plan }) {
        if (!PRICES[plan]) {
            throw new Error("Invalid plan");
        }

        const amount = PRICES[plan];
        const description = `Digitalyty Cards – ${plan} plan`;

        const payload = [
            `terminal=${TRANZILA_CONFIG.terminal}`,
            `sum=${amount}`,
            `currency=1`,
            `lang=il`,
            `description=${encodeURIComponent(description)}`,
            `notify_url=${encodeURIComponent(TRANZILA_CONFIG.notifyUrl)}`,
            `success_url=${encodeURIComponent(TRANZILA_CONFIG.successUrl)}`,
            `fail_url=${encodeURIComponent(TRANZILA_CONFIG.failUrl)}`,
            `udf1=${userId}`, // userId
            `udf2=${plan}`, // plan
        ].join("&");

        const signature = sign(payload);

        return {
            paymentUrl: `${TRANZILA_CONFIG.baseUrl}?${payload}&signature=${signature}`,
        };
    },

    /**
     * Server-to-server notify от Tranzila
     * Здесь принимается РЕШЕНИЕ о подписке
     */
    async handleNotify(payload) {
        const { signature, ...data } = payload;

        /**
         * Безопасная проверка подписи
         * (минимальный стабильный набор полей)
         */
        const signaturePayload = [
            `terminal=${TRANZILA_CONFIG.terminal}`,
            `sum=${data.sum}`,
            `Response=${data.Response}`,
            `udf1=${data.udf1}`,
            `udf2=${data.udf2}`,
        ].join("&");

        const expectedSignature = sign(signaturePayload);

        if (signature !== expectedSignature) {
            throw new Error("Invalid Tranzila signature");
        }

        const { udf1: userId, udf2: plan, Response: responseCode } = data;

        // Платёж неуспешен
        if (responseCode !== "000") {
            return;
        }

        if (!PRICES[plan]) {
            return;
        }

        const user = await User.findById(userId);
        if (!user) return;

        /**
         * Защита от повторных notify
         */
        if (
            user.subscription?.provider === "tranzila" &&
            user.subscription?.expiresAt &&
            user.subscription.expiresAt > new Date()
        ) {
            return;
        }

        /**
         * Расчёт срока подписки
         */
        const expiresAt =
            plan === "monthly"
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        user.plan = plan;
        user.subscription = {
            status: "active",
            provider: "tranzila",
            expiresAt,
        };

        await user.save();

        if (user.cardId) {
            await Card.findByIdAndUpdate(user.cardId, {
                plan,
                billing: {
                    status: "active",
                    plan,
                    paidUntil: expiresAt,
                },
            });
        }
    },
};
