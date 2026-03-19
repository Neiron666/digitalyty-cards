// Rate-limit smoke test
// After 2 successful calls already, this sends 2 more to verify limiter triggers.
import "dotenv/config";
import jwt from "jsonwebtoken";

const BASE = "http://127.0.0.1:5000";
const CARD_ID = "698ecab41b54f48162d29096";
const EP = `${BASE}/api/cards/${CARD_ID}/ai/about-suggestion`;

const TOKEN = jwt.sign(
    { userId: "698ecb591b54f48162d290bf" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
);

const opts = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mode: "create", language: "he" }),
};

// Call 3 (should be last allowed for free tier, limit=3)
console.log("===== CALL 3 (expect 200 — last free) =====");
let res = await fetch(EP, opts);
console.log(`STATUS: ${res.status}`);
let body = await res.text();
console.log(`BODY_PREFIX: ${body.substring(0, 120)}`);

// Call 4 (should be rate-limited, limit=3)
console.log("\n===== CALL 4 (expect 429 — rate limited) =====");
res = await fetch(EP, opts);
console.log(`STATUS: ${res.status}`);
body = await res.text();
console.log(`BODY: ${body}`);

console.log("\n===== RATE LIMIT DONE =====");
process.exit(0);
