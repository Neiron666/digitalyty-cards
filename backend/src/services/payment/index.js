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

// ── STO create vars: gated validation ─────────────────────────────────────────
// Only required when PAYMENT_PROVIDER=tranzila AND TRANZILA_STO_CREATE_ENABLED=true.
// TRANZILA_STO_UPDATE_API_URL is cancel-only and must not be startup-required here.
if (isTranjila && process.env.TRANZILA_STO_CREATE_ENABLED === "true") {
    const stoRequired = [
        "TRANZILA_STO_TERMINAL",
        "TRANZILA_STO_API_URL",
        "TRANZILA_API_APP_KEY",
        "TRANZILA_API_PRIVATE_KEY",
    ];
    const stoMissing = stoRequired.filter((k) => !process.env[k]);

    if (stoMissing.length) {
        throw new Error(
            `[payment] TRANZILA_STO_CREATE_ENABLED=true but missing STO create vars: ${stoMissing.join(", ")}`,
        );
    }
}

// ── YeshInvoice vars: gated validation ──────────────────────────────────────
// YESH_INVOICE_ENABLED is independent of PAYMENT_PROVIDER.
// YeshInvoice is a document/receipt provider, not a payment terminal.
if (process.env.YESH_INVOICE_ENABLED === "true") {
    const yiRequired = ["YESH_INVOICE_SECRET", "YESH_INVOICE_USERKEY"];
    const yiMissing = yiRequired.filter((k) => !process.env[k]);
    if (yiMissing.length) {
        throw new Error(
            `[payment] YESH_INVOICE_ENABLED=true but missing vars: ${yiMissing.join(", ")}`,
        );
    }
}

const provider = isTranjila ? tranzilaProvider : mockProvider;

export default {
    createPayment: provider.createPayment,
    handleNotify: provider.handleNotify,
    handleStoNotify: provider.handleStoNotify,
};
