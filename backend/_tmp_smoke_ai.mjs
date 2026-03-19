// Runtime smoke tests for POST /api/cards/:id/ai/about-suggestion
// Run from backend/ directory: node _tmp_smoke_ai.mjs

const BASE = "http://127.0.0.1:5000";
const CARD_ID = "698ecab41b54f48162d29096";
const EP = `${BASE}/api/cards/${CARD_ID}/ai/about-suggestion`;

import "dotenv/config";
import jwt from "jsonwebtoken";

const TOKEN = jwt.sign(
    { userId: "698ecb591b54f48162d290bf" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
);

async function test(label, url, opts) {
    console.log(`\n===== ${label} =====`);
    try {
        const res = await fetch(url, opts);
        const body = await res.text();
        console.log(`STATUS: ${res.status}`);
        console.log(`BODY: ${body}`);
    } catch (err) {
        console.log(`ERROR: ${err.message}`);
    }
}

// Case A — no auth
await test("CASE A: no-auth", EP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "create", language: "he" }),
});

// Case C — invalid body (garbage mode + language)
await test("CASE C: invalid body", EP, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
        mode: "GARBAGE",
        language: "xx",
        extra: "<script>alert(1)</script>",
    }),
});

// Case D — valid request (success or AI_UNAVAILABLE depending on key)
await test("CASE D: valid request", EP, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mode: "create", language: "he" }),
});

console.log("\n===== DONE =====");
process.exit(0);
