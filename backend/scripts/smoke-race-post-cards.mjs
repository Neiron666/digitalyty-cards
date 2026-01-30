import crypto from "node:crypto";

function env(name, fallback = "") {
    const v = process.env[name];
    return typeof v === "string" ? v : fallback;
}

function parseIntEnv(name, fallback) {
    const n = Number(env(name, ""));
    return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuid() {
    // Node 18+: crypto.randomUUID() exists.
    return crypto.randomUUID();
}

async function readJsonSafe(res) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { _raw: text };
    }
}

function isCreateInFlight(resStatus, body) {
    return (
        resStatus === 503 &&
        body &&
        typeof body === "object" &&
        body.code === "CARD_CREATE_IN_FLIGHT"
    );
}

async function checkHealth(baseUrl) {
    const url = new URL("/api/health", baseUrl);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
        throw new Error(`Health check failed: ${res.status}`);
    }
}

async function getMine({ baseUrl, headers }) {
    const url = new URL("/api/cards/mine", baseUrl);
    const res = await fetch(url, { method: "GET", headers });
    const body = await readJsonSafe(res);

    if (!res.ok) {
        const err = new Error(`GET /cards/mine failed: ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
    }

    return body;
}

async function postCards({ baseUrl, headers }) {
    const url = new URL("/api/cards", baseUrl);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify({}),
    });

    const body = await readJsonSafe(res);
    return { status: res.status, body };
}

function extractCardId(dto) {
    const id = dto && typeof dto === "object" ? dto._id : null;
    return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function main() {
    const baseUrl = env("BASE_URL", "http://localhost:5000");
    const concurrency = Math.max(2, parseIntEnv("CONCURRENCY", 20));

    const authToken = env("AUTH_TOKEN", "").trim();
    const explicitAnon = env("ANON_ID", "").trim();

    const mode = authToken ? "auth" : "anonymous";

    const headers = {};
    if (authToken) {
        headers.authorization = `Bearer ${authToken}`;
    } else {
        // anonymousMiddleware only accepts UUIDs.
        headers["x-anonymous-id"] = explicitAnon || uuid();
    }

    console.log("[smoke] starting", {
        baseUrl,
        mode,
        concurrency,
        ...(mode === "anonymous"
            ? { anonymousId: headers["x-anonymous-id"] }
            : {}),
    });

    // 0) Ensure backend is reachable.
    await checkHealth(baseUrl);

    // 1) Baseline mine (may be null).
    const mine0 = await getMine({ baseUrl, headers });
    const mine0Id = extractCardId(mine0);
    console.log("[smoke] mine before", {
        hasCard: Boolean(mine0Id),
        id: mine0Id || null,
    });

    // 2) Fire a burst of concurrent creates.
    const results = await Promise.allSettled(
        Array.from({ length: concurrency }, () =>
            postCards({ baseUrl, headers }),
        ),
    );

    const okStatuses = new Set([200, 201, 503]);
    const returnedIds = [];
    let inFlightCount = 0;

    for (const r of results) {
        if (r.status !== "fulfilled") {
            throw new Error(
                `POST /cards request rejected: ${r.reason?.message || String(r.reason)}`,
            );
        }

        const { status, body } = r.value;
        if (!okStatuses.has(status)) {
            throw new Error(
                `Unexpected POST /cards status: ${status} body=${JSON.stringify(body)}`,
            );
        }

        if (isCreateInFlight(status, body)) {
            inFlightCount += 1;
            continue;
        }

        const id = extractCardId(body);
        if (!id) {
            throw new Error(
                `POST /cards returned ${status} without _id: ${JSON.stringify(body)}`,
            );
        }
        returnedIds.push(id);
    }

    const uniqueReturned = [...new Set(returnedIds)];

    // 3) Wait for eventual consistency via GET /cards/mine.
    let mine = null;
    for (let i = 0; i < 40; i += 1) {
        mine = await getMine({ baseUrl, headers });
        if (extractCardId(mine)) break;
        await sleep(50);
    }

    const mineId = extractCardId(mine);
    if (!mineId) {
        throw new Error("GET /cards/mine did not return a card after retries");
    }

    // 4) Assertions.
    if (uniqueReturned.length > 1) {
        throw new Error(
            `Race detected: multiple different card ids returned: ${uniqueReturned.join(", ")}`,
        );
    }

    if (uniqueReturned.length === 1 && uniqueReturned[0] !== mineId) {
        throw new Error(
            `Mismatch: returned id=${uniqueReturned[0]} but mine id=${mineId}`,
        );
    }

    console.log("[smoke] PASS", {
        mineId,
        returnedIds: returnedIds.length,
        uniqueReturned: uniqueReturned.length,
        inFlightCount,
    });
}

main().catch((err) => {
    // Keep output compact but actionable.
    const msg = err?.message || String(err);

    // Special-case: backend not running.
    if (/fetch failed/i.test(msg) || /ECONNREFUSED/i.test(msg)) {
        console.error(
            "[smoke] FAILED: backend unreachable. Start backend and retry.",
        );
        console.error("Hint: cd backend && npm.cmd run start");
    } else {
        console.error("[smoke] FAILED", msg);
    }

    process.exitCode = 1;
});
