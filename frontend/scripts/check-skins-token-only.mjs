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
const SKINS_DIR = path.join(BASE_DIR, "src", "templates", "skins");

const ALLOWED_SELECTOR_RE = /^\.(theme|palette[A-Za-z0-9_-]*)$/;

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
        if (entry.isFile() && entry.name.endsWith(".module.css")) {
            results.push(full);
        }
    }

    return results;
}

function stripBlockComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, "");
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
    return trimmed.length > 180 ? trimmed.slice(0, 180) + "…" : trimmed;
}

function validateSelectorHeader(header) {
    const raw = header.trim();

    if (!raw.length) {
        return {
            ok: false,
            reason: "Empty selector header",
        };
    }

    if (raw.startsWith("@")) {
        if (raw.startsWith("@media")) return { ok: true, type: "at" };
        return {
            ok: false,
            reason: `Forbidden at-rule: ${raw.split(/\s+/)[0]}`,
        };
    }

    // Multiple selectors (comma-separated) are allowed only if each is allowed.
    const selectors = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    for (const sel of selectors) {
        if (!ALLOWED_SELECTOR_RE.test(sel)) {
            return {
                ok: false,
                reason: `Forbidden selector: ${sel}`,
            };
        }
    }

    return { ok: true, type: "selector", selectors };
}

function validateDeclarations(blockText) {
    const withoutComments = stripBlockComments(blockText);

    // Extremely strict: only "--*: ...;" declarations.
    // Split on semicolons; ignore empty segments.
    const parts = withoutComments.split(";");
    for (const part of parts) {
        const s = part.trim();
        if (!s) continue;

        // Allow nested @media blocks? Not expected inside selector blocks.
        if (s.includes("{") || s.includes("}")) {
            return {
                ok: false,
                reason: "Nested blocks are not allowed inside skin selectors",
            };
        }

        const colon = s.indexOf(":");
        if (colon === -1) {
            return { ok: false, reason: "Malformed declaration (missing ':')" };
        }

        const prop = s.slice(0, colon).trim();
        if (!prop.startsWith("--")) {
            return {
                ok: false,
                reason: `Non-token declaration found: ${prop}`,
            };
        }
    }

    return { ok: true };
}

/** @type {{file: string, line: number, excerpt: string, reason: string}[]} */
const violations = [];

const files = walk(SKINS_DIR)
    .map((abs) => path.relative(BASE_DIR, abs))
    .sort((a, b) => a.localeCompare(b));

for (const rel of files) {
    const abs = path.join(BASE_DIR, rel);
    const original = fs.readFileSync(abs, "utf8");
    const lower = original.toLowerCase();

    // Forbidden anywhere in skins (including comments/whitespace).
    if (lower.includes("url(")) {
        const idx = lower.indexOf("url(");
        violations.push({
            file: rel,
            line: lineOfIndex(original, idx),
            excerpt: lineExcerpt(original, idx),
            reason: "Forbidden usage: url(",
        });
        continue;
    }
    if (lower.includes("background-image")) {
        const idx = lower.indexOf("background-image");
        violations.push({
            file: rel,
            line: lineOfIndex(original, idx),
            excerpt: lineExcerpt(original, idx),
            reason: "Forbidden usage: background-image",
        });
        continue;
    }
    if (lower.includes("background")) {
        const idx = lower.indexOf("background");
        violations.push({
            file: rel,
            line: lineOfIndex(original, idx),
            excerpt: lineExcerpt(original, idx),
            reason: "Forbidden usage: background",
        });
        continue;
    }

    const text = stripBlockComments(original);

    // Minimal brace-based parser supporting @media wrappers.
    /** @type {{type: 'at' | 'selector', header: string, headerIndex: number}[]} */
    const stack = [];
    let headerStart = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === "{") {
            const header = text.slice(headerStart, i);
            const headerIndex = headerStart;

            const selResult = validateSelectorHeader(header);
            if (!selResult.ok) {
                violations.push({
                    file: rel,
                    line: lineOfIndex(original, headerIndex),
                    excerpt: lineExcerpt(original, headerIndex),
                    reason: selResult.reason,
                });
                break;
            }

            stack.push({
                type: selResult.type,
                header: header.trim(),
                headerIndex,
            });

            headerStart = i + 1;
            continue;
        }

        if (ch === "}") {
            const content = text.slice(headerStart, i);
            const popped = stack.pop();

            if (!popped) {
                violations.push({
                    file: rel,
                    line: lineOfIndex(original, i),
                    excerpt: lineExcerpt(original, i),
                    reason: "Unmatched closing brace" ,
                });
                break;
            }

            if (popped.type === "selector") {
                const declResult = validateDeclarations(content);
                if (!declResult.ok) {
                    violations.push({
                        file: rel,
                        line: lineOfIndex(original, popped.headerIndex),
                        excerpt: popped.header || lineExcerpt(original, popped.headerIndex),
                        reason: declResult.reason,
                    });
                    break;
                }
            }

            headerStart = i + 1;
        }
    }

    if (!violations.length && stack.length) {
        const last = stack[stack.length - 1];
        violations.push({
            file: rel,
            line: lineOfIndex(original, last.headerIndex),
            excerpt: last.header || lineExcerpt(original, last.headerIndex),
            reason: "Unclosed block (missing '}')",
        });
    }
}

if (violations.length) {
    const first = violations[0];
    console.error(`FAIL: skins must be token-only. Violations: ${violations.length}.`);
    console.error(`Scanned files (${files.length}):`);
    for (const f of files) console.error(`- ${f}`);
    console.error("First violation:");
    console.error(`- ${first.file}:${first.line}`);
    console.error(`  Reason: ${first.reason}`);
    console.error(`  > ${first.excerpt}`);
    process.exit(1);
}

console.log(`PASS: skins are token-only. Scanned ${files.length} files.`);
for (const f of files) console.log(`- ${f}`);
