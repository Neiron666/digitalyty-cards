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

function tryParseJson(text) {
    try {
        return { ok: true, value: JSON.parse(text), error: "" };
    } catch (e) {
        return {
            ok: false,
            value: null,
            error: e && e.message ? String(e.message) : "parse_error",
        };
    }
}

function normalizeEscapedJson(text) {
    // Handles bodies like: {\"password\":\"ping2026\"}
    // Also collapses double backslashes.
    return String(text)
        .replace(/\\\\/g, "\\") // \\ -> \
        .replace(/\\"/g, '"'); // \" -> "
}

function readJsonBody(event) {
    const raw = event && event.body;
    if (raw === undefined || raw === null) {
        return {
            ok: false,
            value: null,
            textHead: "",
            normHead: "",
            stage: "no_body",
            err1: "",
            err2: "",
        };
    }

    const isB64 = (event && event.isBase64Encoded) === true;

    const text = isB64
        ? Buffer.from(String(raw), "base64").toString("utf8")
        : String(raw);

    // Stage 1: normal JSON
    const p1 = tryParseJson(text);
    if (p1.ok) {
        // If it parses into a STRING that itself may be JSON, try parsing again.
        if (typeof p1.value === "string") {
            const p1b = tryParseJson(p1.value);
            if (p1b.ok) {
                return {
                    ok: true,
                    value: p1b.value,
                    textHead: text.slice(0, 16),
                    normHead: String(p1.value).slice(0, 16),
                    stage: "double_parse",
                    err1: "",
                    err2: "",
                };
            }
        }

        return {
            ok: true,
            value: p1.value,
            textHead: text.slice(0, 16),
            normHead: "",
            stage: "parse_ok",
            err1: "",
            err2: "",
        };
    }

    // Stage 2: ALWAYS try normalization (no fragile conditions)
    const norm = normalizeEscapedJson(text);
    const p2 = tryParseJson(norm);
    if (p2.ok) {
        return {
            ok: true,
            value: p2.value,
            textHead: text.slice(0, 16),
            normHead: norm.slice(0, 16),
            stage: "normalized_parse_ok",
            err1: "",
            err2: "",
        };
    }

    return {
        ok: false,
        value: null,
        textHead: text.slice(0, 16),
        normHead: norm.slice(0, 16),
        stage: "parse_failed",
        err1: p1.error,
        err2: p2.error,
    };
}

exports.handler = async function handler(event) {
    const method = String(
        event && event.httpMethod ? event.httpMethod : "",
    ).toUpperCase();
    const ver = "auth_v6";

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
    const body =
        parsed.ok && parsed.value && typeof parsed.value === "object"
            ? parsed.value
            : {};

    const providedRaw = typeof body.password === "string" ? body.password : "";
    const provided = providedRaw.trim();
    const expected = String(gatePasswordRaw).trim();

    if (provided !== expected) {
        const payload = { ok: false, code: "GATE_BAD_PASSWORD", ver };

        if (debug) {
            payload.debug = {
                expectedLen: expected.length,
                providedLen: provided.length,
                expectedHash8: hash8(expected),
                providedHash8: hash8(provided),

                parseOk: Boolean(parsed.ok),
                stage: parsed.stage,
                textHead: parsed.textHead,
                normHead: parsed.normHead,
                err1: parsed.err1,
                err2: parsed.err2,

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

    const cookieValue = String(cookieValueRaw);
    const cookie = `__Host-cardigo_gate=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;

    return json(200, { ok: true, ver }, { "set-cookie": cookie });
};
