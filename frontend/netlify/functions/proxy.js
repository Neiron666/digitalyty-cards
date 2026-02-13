const BACKEND_ORIGIN = "https://cardigo-backend.onrender.com";
const FUNCTION_PREFIX = "/.netlify/functions/proxy";

function isAllowedPath(pathname) {
    if (pathname === "/sitemap.xml") return true;
    if (pathname.startsWith("/api/")) return true;
    if (pathname.startsWith("/og/")) return true;
    return false;
}

function normalizeTargetPath(eventPath) {
    const raw = String(eventPath || "/");
    if (raw.startsWith(FUNCTION_PREFIX)) {
        const sliced = raw.slice(FUNCTION_PREFIX.length);
        return sliced.startsWith("/") ? sliced : `/${sliced}`;
    }
    return raw.startsWith("/") ? raw : `/${raw}`;
}

function getQueryString(event) {
    if (typeof event.rawQueryString === "string") return event.rawQueryString;

    const params = event.queryStringParameters || {};
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        usp.append(key, String(value));
    }
    return usp.toString();
}

function stripHopByHop(headers) {
    const lower = Object.create(null);
    for (const [k, v] of Object.entries(headers || {})) {
        lower[String(k).toLowerCase()] = v;
    }

    delete lower.host;
    delete lower.connection;
    delete lower["content-length"];
    delete lower["transfer-encoding"];

    return lower;
}

function isTextLikeContentType(contentType) {
    const ct = String(contentType || "").toLowerCase();
    if (!ct) return true;
    if (ct.startsWith("text/")) return true;
    if (ct.includes("json")) return true;
    if (ct.includes("xml")) return true;
    if (ct.includes("html")) return true;
    if (ct.includes("javascript")) return true;
    if (ct.includes("x-www-form-urlencoded")) return true;
    return false;
}

exports.handler = async function handler(event) {
    try {
        const targetPath = normalizeTargetPath(event.path);
        if (!isAllowedPath(targetPath)) {
            return { statusCode: 404, body: "Not found" };
        }

        const expectedGateCookie = String(
            process.env.CARDIGO_GATE_COOKIE_VALUE || "",
        ).trim();
        const headers = event && event.headers ? event.headers : {};
        const cookieHeader = String(headers.cookie || headers.Cookie || "");

        if (!expectedGateCookie) {
            return {
                statusCode: 500,
                headers: {
                    "content-type": "application/json; charset=utf-8",
                    "cache-control": "no-store",
                    vary: "Cookie",
                },
                body: JSON.stringify({ ok: false, code: "GATE_MISCONFIG" }),
            };
        }

        let providedGateCookie = "";
        for (const part of cookieHeader.split(";")) {
            const [name, ...rest] = String(part).split("=");
            if (String(name || "").trim() !== "__Host-cardigo_gate") continue;
            providedGateCookie = rest.join("=").trim();
            break;
        }

        if (providedGateCookie !== expectedGateCookie) {
            return {
                statusCode: 401,
                headers: {
                    "content-type": "application/json; charset=utf-8",
                    "cache-control": "no-store",
                    vary: "Cookie",
                },
                body: JSON.stringify({ ok: false, code: "GATE_REQUIRED" }),
            };
        }

        const qs = getQueryString(event);
        const url = `${BACKEND_ORIGIN}${targetPath}${qs ? `?${qs}` : ""}`;

        const sharedSecret =
            process.env.CARDIGO_PROXY_SHARED_SECRET === undefined
                ? ""
                : String(process.env.CARDIGO_PROXY_SHARED_SECRET);

        const method = String(event.httpMethod || "GET").toUpperCase();
        const requestHeaders = stripHopByHop(event.headers);
        requestHeaders["accept-encoding"] = "identity";
        requestHeaders["x-cardigo-proxy-secret"] = sharedSecret;

        const hasBody =
            method !== "GET" &&
            method !== "HEAD" &&
            event.body !== undefined &&
            event.body !== null;

        const body = hasBody
            ? event.isBase64Encoded
                ? Buffer.from(event.body, "base64")
                : event.body
            : undefined;

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body,
            redirect: "manual",
        });

        const responseHeaders = {};
        const blacklist = [
            "content-encoding",
            "content-length",
            "transfer-encoding",
        ];
        for (const [key, value] of response.headers.entries()) {
            if (blacklist.includes(String(key).toLowerCase())) continue;
            responseHeaders[key] = value;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return {
            statusCode: response.status,
            headers: responseHeaders,
            body: buffer.toString("base64"),
            isBase64Encoded: true,
        };
    } catch (err) {
        return {
            statusCode: 502,
            body: JSON.stringify({ ok: false, code: "PROXY_UPSTREAM_ERROR" }),
            headers: { "content-type": "application/json; charset=utf-8" },
        };
    }
};
