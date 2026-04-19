export const TRANZILA_CONFIG = {
    // ── Checkout / clearing terminal ─────────────────────────────────────────
    // Used by createPayment (checkout URL) and handleNotify (supplierOk, signature).
    terminal: process.env.TRANZILA_TERMINAL,
    secret: process.env.TRANZILA_SECRET, // для hash / signature (inbound notify only)
    checkoutBase: "https://directng.tranzila.com", // DirectNG hosted checkout domain; terminal appended in path by provider
    notifyUrl: process.env.TRANZILA_NOTIFY_URL, // https://api.domain/api/payment/notify
    successUrl: process.env.TRANZILA_SUCCESS_URL, // https://domain/payment/success
    failUrl: process.env.TRANZILA_FAIL_URL, // https://domain/payment/fail

    // ── STO / token / recurring terminal ─────────────────────────────────────────────────
    // stoTerminal is a separate token/STO terminal, NOT a hosted checkout terminal.
    // stoApiUrl       = /v2/sto/create endpoint. Used by createTranzilaStoForUser.
    //                   Gated by TRANZILA_STO_CREATE_ENABLED.
    // stoUpdateApiUrl = /v2/sto/update endpoint. Reserved for future cancelTranzilaStoForUser.
    //                   NOT gated by TRANZILA_STO_CREATE_ENABLED.
    //                   NOT startup-required. Validated at call time by cancel function.
    // apiAppKey, apiPrivateKey are used for API v2 HMAC auth (both create and cancel paths).
    // pw and stoNotifyUrl are not used by STO create/cancel path today; reserved for future contours.
    stoTerminal: process.env.TRANZILA_STO_TERMINAL,
    stoApiUrl: process.env.TRANZILA_STO_API_URL,
    stoUpdateApiUrl: process.env.TRANZILA_STO_UPDATE_API_URL,
    apiAppKey: process.env.TRANZILA_API_APP_KEY,
    apiPrivateKey: process.env.TRANZILA_API_PRIVATE_KEY,
    pw: process.env.TRANZILA_PW,
    stoNotifyUrl: process.env.TRANZILA_STO_NOTIFY_URL,
};
