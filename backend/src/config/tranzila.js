export const TRANZILA_CONFIG = {
    terminal: process.env.TRANZILA_TERMINAL,
    secret: process.env.TRANZILA_SECRET, // для hash / signature
    baseUrl: "https://secure5.tranzila.com/cgi-bin/tranzila71.cgi",
    notifyUrl: process.env.TRANZILA_NOTIFY_URL, // https://api.domain/api/payment/notify
    successUrl: process.env.TRANZILA_SUCCESS_URL, // https://domain/payment/success
    failUrl: process.env.TRANZILA_FAIL_URL, // https://domain/payment/fail
};
