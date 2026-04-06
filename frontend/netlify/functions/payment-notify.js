const BACKEND_ORIGIN = "https://cardigo-backend.onrender.com";
const MAX_BODY_BYTES = 16 * 1024;
const FETCH_TIMEOUT_MS = 9000;

function stripBomAndTrim(s) {
    return String(s)
        .replace(/^\uFEFF/, "")
        .trim();
}

function tryParseJson(text) {
    try {
        const v = JSON.parse(text);
        if (v && typeof v === "object") return { ok: true, value: v };
        return { ok: false, value: null };
    } catch {
        return { ok: false, value: null };
    }
}

function parseFormUrlEncoded(text) {
    try {
        const params = new URLSearchParams(String(text));
        // URLSearchParams accepts any string; verify at least one key exists.
        const entries = [...params.entries()];
        if (entries.length === 0) return { ok: false, value: null };
        return { ok: true, value: Object.fromEntries(entries) };
    } catch {
        return { ok: false, value: null };
    }
}

function readBody(event) {
    const raw = event && event.body;
    if (raw === undefined || raw === null) {
        return { rawBody: "", parseError: true };
    }

    const isB64 = (event && event.isBase64Encoded) === true;
    const decoded = isB64
        ? Buffer.from(String(raw), "base64").toString("utf8")
        : String(raw);

    const cleaned = stripBomAndTrim(decoded);

    // 1) JSON
    const j = tryParseJson(cleaned);
    if (j.ok) return j.value;

    // 2) x-www-form-urlencoded
    const f = parseFormUrlEncoded(cleaned);
    if (f.ok) return f.value;

    // 3) fallback
    return { rawBody: cleaned, parseError: true };
}

exports.handler = async function handler(event) {
    try {
        // 1. POST only
        const method = String(
            event && event.httpMethod ? event.httpMethod : "",
        ).toUpperCase();
        if (method !== "POST") {
            return {
                statusCode: 405,
                headers: { Allow: "POST" },
                body: "ERROR",
            };
        }

        // 2. Body size cap
        if (event.body != null && String(event.body).length > MAX_BODY_BYTES) {
            return { statusCode: 413, body: "ERROR" };
        }

        // 3. nt query token (Layer 1 - defense-in-depth)
        const expected = String(process.env.CARDIGO_NOTIFY_TOKEN || "").trim();
        if (!expected) {
            return { statusCode: 500, body: "ERROR" };
        }

        const provided = String(
            (event.queryStringParameters && event.queryStringParameters.nt) ||
                "",
        ).trim();
        if (provided !== expected) {
            return { statusCode: 403, body: "ERROR" };
        }

        // 4. Parse cascade (best-effort)
        const parsedBody = readBody(event);

        // 5. Forward to backend
        const proxySecret = String(
            process.env.CARDIGO_PROXY_SHARED_SECRET === undefined
                ? ""
                : process.env.CARDIGO_PROXY_SHARED_SECRET,
        );

        const url = `${BACKEND_ORIGIN}/api/payments/notify`;

        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=utf-8",
                "x-cardigo-proxy-secret": proxySecret,
                "x-cardigo-notify-token": expected,
            },
            body: JSON.stringify(parsedBody),
            signal: ac.signal,
        });

        clearTimeout(timer);

        // 6. ACK policy: upstream status code, generic body
        const status = response.status;
        const outwardBody = status >= 200 && status < 300 ? "OK" : "ERROR";

        return { statusCode: status, body: outwardBody };
    } catch {
        // 7. Network / infra failure
        return { statusCode: 502, body: "ERROR" };
    }
};
