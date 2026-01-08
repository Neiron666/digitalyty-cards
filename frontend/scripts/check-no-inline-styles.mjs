import fs from "node:fs";
import path from "node:path";

// Default scope is intentionally limited to the surfaces touched by this PR.
// (There are known legacy inline styles elsewhere in the codebase.)
const DEFAULT_PATHS = [
    // Public render chain
    "src/pages/PublicCard.jsx",
    "src/components/card/CardRenderer.jsx",

    "src/templates/TemplateRenderer.jsx",
    "src/templates/layout",
    "src/templates/skins",
    "src/templates/seed",

    // Editor preview chain + template selection surface
    "src/components/editor/EditorPreview.jsx",
    "src/components/editor/panels/DesignPanel.jsx",
];

const exts = new Set([".jsx", ".tsx"]);

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
        if (entry.isFile() && exts.has(path.extname(entry.name))) {
            results.push(full);
        }
    }

    return results;
}

function collectFiles(inputPath) {
    const absPath = path.resolve(BASE_DIR, inputPath);
    if (!fs.existsSync(absPath)) return [];

    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) return walk(absPath);
    if (stat.isFile() && exts.has(path.extname(absPath))) return [absPath];

    return [];
}

function findInlineStyles(text) {
    const matches = [];

    // Common JSX inline styles: style={{ ... }}
    const reDoubleBrace = /\bstyle\s*=\s*\{\s*\{/g;
    // Other JSX inline styles: style={...}
    const reAnyExpr = /\bstyle\s*=\s*\{/g;
    // String styles: style="..."
    const reString = /\bstyle\s*=\s*"/g;

    for (const [label, re] of [
        ["style={{", reDoubleBrace],
        ["style={", reAnyExpr],
        ['style="', reString],
    ]) {
        let m;
        while ((m = re.exec(text)) !== null) {
            matches.push({ index: m.index, label });
        }
    }

    // De-duplicate indexes (style={{ will also match style={)
    const byIndex = new Map();
    for (const match of matches) {
        const existing = byIndex.get(match.index);
        if (!existing || existing.label.length < match.label.length) {
            byIndex.set(match.index, match);
        }
    }

    return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function lineOfIndex(text, index) {
    // 1-based line number
    let line = 1;
    for (let i = 0; i < index && i < text.length; i++) {
        if (text[i] === "\n") line++;
    }
    return line;
}

function pickBaseDir() {
    // Support running either from repo root or from frontend/.
    // Examples:
    // - cmd /c "cd frontend && node scripts/check-no-inline-styles.mjs"
    // - node frontend/scripts/check-no-inline-styles.mjs
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, "src"))) return cwd;
    if (fs.existsSync(path.join(cwd, "frontend", "src")))
        return path.join(cwd, "frontend");
    return cwd;
}

const BASE_DIR = pickBaseDir();

const inputPaths = process.argv.slice(2);
const scanPaths = inputPaths.length ? inputPaths : DEFAULT_PATHS;

/** @type {{file: string, line: number, label: string}[]} */
const violations = [];

for (const p of scanPaths) {
    for (const file of collectFiles(p)) {
        const text = fs.readFileSync(file, "utf8");
        const matches = findInlineStyles(text);
        for (const match of matches) {
            violations.push({
                file: path.relative(BASE_DIR, file),
                line: lineOfIndex(text, match.index),
                label: match.label,
            });
        }
    }
}

if (violations.length) {
    console.error(
        `FAIL: inline style usage found (${violations.length} violations).`
    );
    for (const v of violations) {
        console.error(`- ${v.file}:${v.line} (${v.label})`);
    }
    process.exit(1);
}

console.log(
    `PASS: no inline styles found. Scope: ${scanPaths.join(", ")}. Base: ${path.relative(process.cwd(), BASE_DIR) || "."}`
);
