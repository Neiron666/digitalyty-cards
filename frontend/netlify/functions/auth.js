// function json(statusCode, payload, extraHeaders = {}) {
//     return {
//         statusCode,
//         headers: {
//             "content-type": "application/json; charset=utf-8",
//             ...extraHeaders,
//         },
//         body: JSON.stringify(payload),
//     };
// }

// function readJsonBody(event) {
//     const raw = event?.body;
//     if (raw === undefined || raw === null) return null;

//     const text = event?.isBase64Encoded
//         ? Buffer.from(String(raw), "base64").toString("utf8")
//         : String(raw);

//     try {
//         return JSON.parse(text);
//     } catch {
//         return null;
//     }
// }

// exports.handler = async function handler(event) {
//     if (String(event?.httpMethod || "").toUpperCase() !== "POST") {
//         return json(
//             405,
//             { ok: false, code: "METHOD_NOT_ALLOWED" },
//             { Allow: "POST" },
//         );
//     }

//     const gatePassword = process.env.CARDIGO_GATE_PASSWORD;
//     const cookieValue = process.env.CARDIGO_GATE_COOKIE_VALUE;

//     if (!gatePassword || !cookieValue) {
//         return json(500, { ok: false, code: "GATE_MISCONFIG" });
//     }

//     const body = readJsonBody(event) || {};
//     const provided = typeof body.password === "string" ? body.password : "";

//     if (provided !== String(gatePassword)) {
//         return json(401, { ok: false, code: "GATE_BAD_PASSWORD" });
//     }

//     const cookie = `__Host-cardigo_gate=${String(cookieValue)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;

//     return json(200, { ok: true }, { "set-cookie": cookie });
// };

const crypto = require("crypto");

function json(statusCode, payload, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...extraHeaders,
        },
        body: JSON.stringify(payload),
    };
}

function readJsonBody(event) {
    const raw = event && event.body;
    if (raw === undefined || raw === null) return null;

    const text =
        event && event.isBase64Encoded
            ? Buffer.from(String(raw), "base64").toString("utf8")
            : String(raw);

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function hash8(v) {
    // Safe fingerprint for debugging without leaking the value.
    // Empty string stays empty.
    if (typeof v !== "string" || v.length === 0) return "";
    return crypto.createHash("sha256").update(v).digest("hex").slice(0, 8);
}

exports.handler = async function handler(event) {
    const method = String(
        event && event.httpMethod ? event.httpMethod : "",
    ).toUpperCase();
    if (method !== "POST") {
        return json(
            405,
            { ok: false, code: "METHOD_NOT_ALLOWED" },
            { Allow: "POST" },
        );
    }

    const gatePasswordRaw = process.env.CARDIGO_GATE_PASSWORD;
    const cookieValueRaw = process.env.CARDIGO_GATE_COOKIE_VALUE;

    const debug = String(process.env.CARDIGO_GATE_DEBUG || "") === "1";

    // Hard misconfig: env not present at all
    if (!gatePasswordRaw || !cookieValueRaw) {
        // Optional safe debug to confirm env presence/length (still no value)
        const payload = { ok: false, code: "GATE_MISCONFIG" };
        if (debug) {
            payload.debug = {
                hasGatePassword: Boolean(gatePasswordRaw),
                hasCookieValue: Boolean(cookieValueRaw),
                gatePasswordLen:
                    typeof gatePasswordRaw === "string"
                        ? gatePasswordRaw.length
                        : 0,
                cookieValueLen:
                    typeof cookieValueRaw === "string"
                        ? cookieValueRaw.length
                        : 0,
            };
        }
        return json(500, payload);
    }

    const body = readJsonBody(event) || {};
    const providedRaw = typeof body.password === "string" ? body.password : "";

    // Normalize: removes invisible leading/trailing spaces from both sides
    const provided = providedRaw.trim();
    const expected = String(gatePasswordRaw).trim();

    if (provided !== expected) {
        const payload = { ok: false, code: "GATE_BAD_PASSWORD" };
        if (debug) {
            payload.debug = {
                expectedLen: expected.length,
                providedLen: provided.length,
                expectedHash8: hash8(expected),
                providedHash8: hash8(provided),
            };
        }
        return json(401, payload);
    }

    // __Host- prefix rules: Secure + Path=/ + no Domain attribute
    const cookieValue = String(cookieValueRaw);
    const cookie = `__Host-cardigo_gate=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;

    return json(200, { ok: true }, { "set-cookie": cookie });
};
