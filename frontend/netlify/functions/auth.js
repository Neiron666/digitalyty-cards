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

// frontend/netlify/functions/auth.js
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

function stripBomAndTrim(s) {
    // Remove UTF-8 BOM if present + trim whitespace/CRLF.
    return String(s)
        .replace(/^\uFEFF/, "")
        .trim();
}

function tryParseJson(text) {
    try {
        return { ok: true, value: JSON.parse(text), error: "" };
    } catch (e) {
        return {
            ok: false,
            value: null,
            error:
                e && e.message
                    ? String(e.message).slice(0, 120)
                    : "parse_error",
        };
    }
}

function safeB64Head(str, maxBytes = 64) {
    try {
        const buf = Buffer.from(String(str), "utf8");
        return buf.slice(0, maxBytes).toString("base64");
    } catch {
        return "";
    }
}

function charCodesHead(str, n = 12) {
    const s = String(str);
    const out = [];
    for (let i = 0; i < Math.min(n, s.length); i++) out.push(s.charCodeAt(i));
    return out;
}

function parseFormUrlEncoded(text) {
    try {
        const params = new URLSearchParams(String(text));
        const password = params.get("password") || "";
        return { ok: true, value: { password } };
    } catch {
        return { ok: false, value: null };
    }
}

function readBody(event) {
    const raw = event && event.body;
    if (raw === undefined || raw === null) {
        return { ok: false, value: null, stage: "no_body" };
    }

    const isB64 = (event && event.isBase64Encoded) === true;

    const decoded = isB64
        ? Buffer.from(String(raw), "base64").toString("utf8")
        : String(raw);

    const cleaned = stripBomAndTrim(decoded);

    // 1) JSON
    const j = tryParseJson(cleaned);
    if (j.ok && j.value && typeof j.value === "object") {
        return { ok: true, value: j.value, stage: "json_ok" };
    }

    // 2) Fallback: x-www-form-urlencoded
    const f = parseFormUrlEncoded(cleaned);
    if (f.ok) {
        return { ok: true, value: f.value, stage: "form_ok" };
    }

    return {
        ok: false,
        value: null,
        stage: "parse_failed",
        errJson: j.error,
    };
}

exports.handler = async function handler(event) {
    const method = String(
        event && event.httpMethod ? event.httpMethod : "",
    ).toUpperCase();
    const ver = "auth_v7";

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
        return json(500, { ok: false, code: "GATE_MISCONFIG", ver });
    }

    const parsed = readBody(event);
    const body =
        parsed.ok && parsed.value && typeof parsed.value === "object"
            ? parsed.value
            : {};

    const provided =
        typeof body.password === "string" ? body.password.trim() : "";
    const expected = String(gatePasswordRaw).trim();

    if (provided !== expected) {
        const payload = { ok: false, code: "GATE_BAD_PASSWORD", ver };

        if (debug) {
            const ct =
                (event &&
                    event.headers &&
                    (event.headers["content-type"] ||
                        event.headers["Content-Type"])) ||
                "";

            payload.debug = {
                // compare signals
                expectedLen: expected.length,
                providedLen: provided.length,
                expectedHash8: hash8(expected),
                providedHash8: hash8(provided),

                // parse stage
                parseOk: Boolean(parsed.ok),
                stage: parsed.stage,
                errJson: parsed.errJson || "",

                // raw-body proofs (not affected by JSON escaping)
                contentType: String(ct),
                rawBodyB64Head: safeB64Head(
                    event && event.body != null ? String(event.body) : "",
                ),
                charCodesHead: charCodesHead(
                    event && event.body != null ? String(event.body) : "",
                    12,
                ),
                // note: if BOM exists in decoded string, charCodesHead should start with 65279.
            };
        }

        return json(401, payload);
    }

    const cookieValue = String(cookieValueRaw);
    const cookie = `__Host-cardigo_gate=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;

    return json(200, { ok: true, ver }, { "set-cookie": cookie });
};
