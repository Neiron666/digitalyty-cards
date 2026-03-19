// Complete rate-limit exhaustion test in a single script.
// User is premium → limit = 10. This sends 11 calls without interruption.
// Run with: node --env-file=.env from backend/
// No dotenv import needed — uses native --env-file.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// Resolve jsonwebtoken from backend's node_modules
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const jwtPkg = await import(
    join(__dirname, "backend", "node_modules", "jsonwebtoken", "index.js")
);
const jwt = jwtPkg.default;

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

for (let i = 1; i <= 12; i++) {
    const res = await fetch(EP, opts);
    const body = await res.text();
    if (res.status === 200) {
        console.log(`CALL ${i}: STATUS ${res.status} OK`);
    } else {
        console.log(`CALL ${i}: STATUS ${res.status} BODY: ${body}`);
    }
}

console.log("\nDONE");
process.exit(0);
