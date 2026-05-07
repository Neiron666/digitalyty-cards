import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_HTML = path.resolve(__dirname, "..", "index.html");

const content = fs.readFileSync(INDEX_HTML, "utf8");

// Check 1: Static canonical must be absent
const canonicalLinkPattern = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
if (canonicalLinkPattern.test(content)) {
    console.error(
        'FAIL: static canonical found in frontend/index.html. Do not add rel="canonical" to the SPA shell; route canonicals are owned by SeoHelmet.',
    );
    process.exit(1);
}

// Check 2: Static homepage og:url must exist exactly once
const ogUrlTagPattern = /<meta\s+[^>]*property=["']og:url["'][^>]*>/gi;
const ogUrlTags = content.match(ogUrlTagPattern) ?? [];

if (ogUrlTags.length === 0) {
    console.error(
        "FAIL: og:url missing from frontend/index.html. Homepage social preview fallback requires exactly one static og:url.",
    );
    process.exit(1);
}

if (ogUrlTags.length > 1) {
    console.error(
        "FAIL: multiple og:url tags found in frontend/index.html. Expected exactly one homepage fallback og:url.",
    );
    process.exit(1);
}

// Check 3: og:url value must be the homepage URL (applied to the single matched tag)
const homepageOgUrlPattern = /content=["']https:\/\/cardigo\.co\.il\/["']/i;
if (!homepageOgUrlPattern.test(ogUrlTags[0])) {
    console.error(
        "FAIL: static og:url must remain the homepage fallback: https://cardigo.co.il/",
    );
    process.exit(1);
}

console.log(
    "PASS: SEO static shell policy satisfied. No static canonical found; homepage og:url fallback is present exactly once.",
);
