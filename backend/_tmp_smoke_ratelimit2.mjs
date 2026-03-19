// Exhaust premium rate limit (10/day). Already used 4 calls.
// This sends calls 5-10 (6 calls), then call 11 should be 429.
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

// Calls 5-10 (burn through the remaining quota)
for (let i = 5; i <= 10; i++) {
    const res = await fetch(EP, opts);
    console.log(`CALL ${i}: STATUS ${res.status}`);
    if (res.status !== 200) {
        const body = await res.text();
        console.log(`  BODY: ${body}`);
    } else {
        await res.text(); // consume body
    }
}

// Call 11 — should be rate limited
console.log("\n===== CALL 11 (expect 429) =====");
const res = await fetch(EP, opts);
const body = await res.text();
console.log(`STATUS: ${res.status}`);
console.log(`BODY: ${body}`);

console.log("\n===== RATE LIMIT EXHAUSTION DONE =====");
process.exit(0);
