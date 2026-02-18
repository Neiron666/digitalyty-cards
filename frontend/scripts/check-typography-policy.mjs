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

/** @typedef {'FONT_SIZE_UNIT'|'FONT_SIZE_CLAMP'|'FONT_SIZE_CALC_NON_REM'|'FONT_SIZE_VAR_PX_FALLBACK'|'FS_TOKEN_DISALLOWED'} ViolationType */

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

function hasDisallowedUnit(value) {
    const v = value.toLowerCase();
    if (/(^|[^a-z])px\b/.test(v)) return true;
    if (/(^|[^a-z])vw\b/.test(v)) return true;
    if (/(^|[^a-z])vh\b/.test(v)) return true;
    if (/%/.test(v)) return true;

    // Match 'em' but not 'rem'.
    if (/(^|[^a-z])em\b/.test(v)) return true;

    return false;
}

function hasVarPxFallback(value) {
    return /\bvar\([^;]*?\b\d+(?:\.\d+)?px\b/i.test(value);
}

function hasCalcNonRem(value) {
    const v = value.toLowerCase();
    if (!v.includes("calc(")) return false;
    return hasDisallowedUnit(v);
}

/** @type {{type: ViolationType, file: string, line: number, excerpt: string}[]} */
const violations = [];

const files = walk(SRC_DIR)
    .map((abs) => path.relative(BASE_DIR, abs))
    .sort((a, b) => a.localeCompare(b));

for (const rel of files) {
    const abs = path.join(BASE_DIR, rel);
    const original = fs.readFileSync(abs, "utf8");
    const masked = maskBlockComments(original);

    // font-size: ...;
    {
        const reFontSize = /\bfont-size\s*:\s*([\s\S]*?);/gi;
        let m;
        while ((m = reFontSize.exec(masked)) !== null) {
            const idx = m.index;
            const value = m[1] || "";

            /** @type {ViolationType[]} */
            const types = [];

            if (hasDisallowedUnit(value)) types.push("FONT_SIZE_UNIT");
            if (/\bclamp\(/i.test(value)) types.push("FONT_SIZE_CLAMP");
            if (hasCalcNonRem(value)) types.push("FONT_SIZE_CALC_NON_REM");
            if (hasVarPxFallback(value))
                types.push("FONT_SIZE_VAR_PX_FALLBACK");

            for (const type of types) {
                violations.push({
                    type,
                    file: rel,
                    line: lineOfIndex(original, idx),
                    excerpt: lineExcerpt(original, idx),
                });
            }
        }
    }

    // --fs-*: ...;
    {
        const reFsToken = /\b(--fs-[a-z0-9-]+)\s*:\s*([\s\S]*?);/gi;
        let m;
        while ((m = reFsToken.exec(masked)) !== null) {
            const idx = m.index;
            const tokenName = m[1] || "--fs-(unknown)";
            const value = m[2] || "";

            const hasClamp = /\bclamp\(/i.test(value);
            const hasUnits = hasDisallowedUnit(value);
            const calcNonRem = hasCalcNonRem(value);

            if (hasClamp || hasUnits || calcNonRem) {
                violations.push({
                    type: "FS_TOKEN_DISALLOWED",
                    file: rel,
                    line: lineOfIndex(original, idx),
                    excerpt: `${tokenName}: ${lineExcerpt(original, idx)}`,
                });
            }
        }
    }
}

/** @type {Record<ViolationType, number>} */
const counts = {
    FONT_SIZE_UNIT: 0,
    FONT_SIZE_CLAMP: 0,
    FONT_SIZE_CALC_NON_REM: 0,
    FONT_SIZE_VAR_PX_FALLBACK: 0,
    FS_TOKEN_DISALLOWED: 0,
};

for (const v of violations) counts[v.type]++;

const total = violations.length;

if (total) {
    console.error(
        `FAIL: typography policy violations found (${total}). Mode: ${
            STRICT ? "STRICT" : "REPORT_ONLY"
        }`,
    );
    console.error(`Scanned CSS files: ${files.length}. Base: ${BASE_DIR}`);
    console.error("Summary by type:");
    for (const [k, n] of Object.entries(counts)) {
        if (!n) continue;
        console.error(`- ${k}: ${n}`);
    }

    console.error("Violations:");
    for (const v of violations) {
        console.error(`- ${v.type}: ${v.file}:${v.line}`);
        console.error(`  > ${v.excerpt}`);
    }

    if (STRICT) process.exit(1);
    process.exit(0);
}

console.log(
    `PASS: typography policy ok (font-size + --fs-* definitions). Scanned CSS files: ${files.length}. Mode: ${
        STRICT ? "STRICT" : "REPORT_ONLY"
    }`,
);
process.exit(0);
