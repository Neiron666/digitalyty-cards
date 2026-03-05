import mockProvider from "./mock.provider.js";
import tranzilaProvider from "./tranzila.provider.js";

const isTranjila = process.env.PAYMENT_PROVIDER === "tranzila";

if (isTranjila) {
    const required = [
        "TRANZILA_TERMINAL",
        "TRANZILA_SECRET",
        "TRANZILA_NOTIFY_URL",
        "TRANZILA_SUCCESS_URL",
        "TRANZILA_FAIL_URL",
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(
            `[payment] PAYMENT_PROVIDER=tranzila but missing env: ${missing.join(", ")}`,
        );
    }
}

const provider = isTranjila ? tranzilaProvider : mockProvider;

export default {
    createPayment: provider.createPayment,
    handleNotify: provider.handleNotify,
};
