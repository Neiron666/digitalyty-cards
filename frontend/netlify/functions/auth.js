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

function hash8(v) {
    if (typeof v !== "string" || v.length === 0) return "";
    return crypto.createHash("sha256").update(v).digest("hex").slice(0, 8);
}

function readJsonBody(event) {
    const raw = event && event.body;
    if (raw === undefined || raw === null) {
        return { ok: false, value: null, textHead: "" };
    }

    // Decode base64 ONLY when strictly boolean true.
    const isB64 = (event && event.isBase64Encoded) === true;

    const text = isB64
        ? Buffer.from(String(raw), "base64").toString("utf8")
        : String(raw);

    try {
        return {
            ok: true,
            value: JSON.parse(text),
            textHead: text.slice(0, 16),
        };
    } catch {
        return { ok: false, value: null, textHead: text.slice(0, 16) };
    }
}

exports.handler = async function handler(event) {
    const method = String(
        event && event.httpMethod ? event.httpMethod : "",
    ).toUpperCase();

    // Version marker to prove deploy updated (safe).
    const ver = "auth_v3";

    if (method !== "POST") {
        return json(
            405,
            { ok: false, code: "METHOD_NOT_ALLOWED", ver },
            { Allow: "POST" },
        );
    }

    const gatePasswordRaw = process.env.CARDIGO_GATE_PASSWORD;
    const cookieValueRaw = process.env.CARDIGO_GATE_COOKIE_VALUE;
    const debug = String(process.env.CARDIGO_GATE_DEBUG || "") === "1";

    if (!gatePasswordRaw || !cookieValueRaw) {
        const payload = { ok: false, code: "GATE_MISCONFIG", ver };
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

    const parsed = readJsonBody(event);
    const body = parsed && parsed.ok ? parsed.value : {};

    const providedRaw = typeof body.password === "string" ? body.password : "";

    // Normalize to eliminate invisible whitespace.
    const provided = providedRaw.trim();
    const expected = String(gatePasswordRaw).trim();

    if (provided !== expected) {
        const payload = { ok: false, code: "GATE_BAD_PASSWORD", ver };

        if (debug) {
            payload.debug = {
                // compare signals
                expectedLen: expected.length,
                providedLen: provided.length,
                expectedHash8: hash8(expected),
                providedHash8: hash8(provided),

                // parser signals
                parseOk: Boolean(parsed && parsed.ok),
                textHead: parsed ? parsed.textHead : "",

                // raw event/body telemetry (safe)
                hasBody: Boolean(event && event.body != null),
                bodyType: event ? typeof event.body : "no_event",
                bodyLen:
                    event && event.body != null ? String(event.body).length : 0,
                isBase64Flag: event ? event.isBase64Encoded : undefined,
                bodyHead:
                    event && event.body != null
                        ? String(event.body).slice(0, 16)
                        : "",
            };
        }

        return json(401, payload);
    }

    // __Host- prefix rules: Secure + Path=/ + no Domain attribute
    const cookieValue = String(cookieValueRaw);
    const cookie = `__Host-cardigo_gate=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;

    return json(200, { ok: true, ver }, { "set-cookie": cookie });
};
