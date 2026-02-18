import fs from "node:fs";
import path from "node:path";

function pickBaseDir() {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, "src"))) return cwd;
    if (fs.existsSync(path.join(cwd, "frontend", "src")))
        return path.join(cwd, "frontend");
    return cwd;
}

const BASE_DIR = pickBaseDir();
const SRC_DIR = path.join(BASE_DIR, "src");

const STRICT = String(process.env.TYPO_STRICT || "").trim() === "1";

const REQUIRED_TOKENS = [
    "--fs-scale",

    "--fs-h1",
    "--fs-h2",
    "--fs-h3",
    "--fs-h4",
    "--fs-h5",
    "--fs-h6",

    "--fs-body",
    "--fs-body-sm",
    "--fs-caption",
    "--fs-ui",

    "--lh-tight",
    "--lh-normal",
    "--lh-relaxed",

    "--fw-regular",
    "--fw-medium",
    "--fw-semibold",
    "--fw-bold",
    "--fw-extrabold",
];

function walk(dirPath) {
    /** @type {string[]} */
    const results = [];

    if (!fs.existsSync(dirPath)) return results;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === "dist")
                continue;
            results.push(...walk(full));
            continue;
        }
        if (entry.isFile() && entry.name.endsWith(".css")) {
            results.push(full);
        }
    }

    return results;
}

function lineOfIndex(text, index) {
    let line = 1;
    for (let i = 0; i < index && i < text.length; i++) {
        if (text[i] === "\n") line++;
    }
    return line;
}

function lineExcerpt(text, index) {
    const start = text.lastIndexOf("\n", index - 1) + 1;
    const endNl = text.indexOf("\n", index);
    const end = endNl === -1 ? text.length : endNl;
    const raw = text.slice(start, end);
    const trimmed = raw.trimEnd();
    return trimmed.length > 220 ? trimmed.slice(0, 220) + "…" : trimmed;
}

function maskBlockComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, (m) =>
        m
            .split("")
            .map((ch) => (ch === "\n" ? "\n" : " "))
            .join(""),
    );
}

function pickBoundarySources(relCssFiles) {
    const sources = new Set();

    // Heuristic A: any CSS containing the boundary selector.
    for (const rel of relCssFiles) {
        const abs = path.join(BASE_DIR, rel);
        const text = fs.readFileSync(abs, "utf8");
        if (text.includes('[data-cardigo-scope="card"]')) sources.add(rel);
    }

    // Heuristic B: include current default token source if present.
    const cardLayoutRel = path.join(
        "src",
        "templates",
        "layout",
        "CardLayout.module.css",
    );
    if (relCssFiles.includes(cardLayoutRel)) sources.add(cardLayoutRel);

    return [...sources].sort((a, b) => a.localeCompare(b));
}

const relCssFiles = walk(SRC_DIR)
    .map((abs) => path.relative(BASE_DIR, abs))
    .sort((a, b) => a.localeCompare(b));

const sources = pickBoundarySources(relCssFiles);

/** @type {Map<string, {file: string, line: number, excerpt: string}>} */
const found = new Map();

for (const rel of sources) {
    const abs = path.join(BASE_DIR, rel);
    const original = fs.readFileSync(abs, "utf8");
    const masked = maskBlockComments(original);

    for (const token of REQUIRED_TOKENS) {
        if (found.has(token)) continue;

        const re = new RegExp(
            `${token.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\s*:`,
            "g",
        );
        const m = re.exec(masked);
        if (!m) continue;

        const idx = m.index;
        found.set(token, {
            file: rel,
            line: lineOfIndex(original, idx),
            excerpt: lineExcerpt(original, idx),
        });
    }
}

const missing = REQUIRED_TOKENS.filter((t) => !found.has(t));

if (missing.length) {
    console.error(
        `FAIL: card boundary typography tokens missing (${missing.length}/${REQUIRED_TOKENS.length}). Mode: ${
            STRICT ? "STRICT" : "REPORT_ONLY"
        }`,
    );
    console.error(`Boundary sources scanned (${sources.length}):`);
    for (const s of sources) console.error(`- ${s}`);

    console.error("Missing tokens:");
    for (const t of missing) console.error(`- ${t}`);

    console.error("Found tokens:");
    for (const t of REQUIRED_TOKENS) {
        const hit = found.get(t);
        if (!hit) continue;
        console.error(`- ${t}: ${hit.file}:${hit.line}`);
        console.error(`  > ${hit.excerpt}`);
    }

    if (STRICT) process.exit(1);
    process.exit(0);
}

console.log(
    `PASS: card boundary typography tokens complete (${REQUIRED_TOKENS.length}/${REQUIRED_TOKENS.length}). Mode: ${
        STRICT ? "STRICT" : "REPORT_ONLY"
    }`,
);
console.log(`Boundary sources scanned (${sources.length}):`);
for (const s of sources) console.log(`- ${s}`);

process.exit(0);
