import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const EXT_ALLOWLIST = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
            continue;
        }

        const ext = path.extname(entry.name);
        if (!EXT_ALLOWLIST.has(ext)) continue;
        files.push(fullPath);
    }

    return files;
}

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function isStringLiteralAction(argText) {
    // This check is intentionally strict: action must not be a string literal.
    // We expect `action: SITE_ACTIONS.some_action`.
    return /\baction\s*:\s*(["'`])/.test(argText);
}

function extractBalancedCallArgs(source, callName, startIdx) {
    const callStart = source.indexOf(callName, startIdx);
    if (callStart < 0) return null;

    const parenStart = source.indexOf("(", callStart + callName.length);
    if (parenStart < 0) return null;

    let i = parenStart + 1;
    let depth = 1;
    let inString = null;
    let escaped = false;

    for (; i < source.length; i += 1) {
        const ch = source[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === inString) {
                inString = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === "`") {
            inString = ch;
            continue;
        }

        if (ch === "(") depth += 1;
        else if (ch === ")") depth -= 1;

        if (depth === 0) {
            const args = source.slice(parenStart + 1, i);
            return { args, endIdx: i + 1 };
        }
    }

    return null;
}

function checkFile(filePath) {
    const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    const src = readText(filePath);

    const findings = [];
    let idx = 0;

    while (idx < src.length) {
        const hit = src.indexOf("trackSiteClick", idx);
        if (hit < 0) break;

        const extracted = extractBalancedCallArgs(src, "trackSiteClick", hit);
        if (!extracted) {
            idx = hit + 1;
            continue;
        }

        const { args, endIdx } = extracted;

        if (isStringLiteralAction(args)) {
            const preview = args.replace(/\s+/g, " ").slice(0, 160).trim();
            findings.push({
                file: rel,
                message:
                    "Found string-literal action in trackSiteClick(). Use SITE_ACTIONS.* instead.",
                preview,
            });
        }

        idx = endIdx;
    }

    return findings;
}

function main() {
    if (!fs.existsSync(ROOT)) {
        console.error(`[check:site-actions] Missing src directory at ${ROOT}`);
        process.exit(2);
    }

    const files = walk(ROOT);
    const allFindings = [];

    for (const filePath of files) {
        allFindings.push(...checkFile(filePath));
    }

    if (allFindings.length === 0) {
        console.log(
            "[check:site-actions] OK: no string-literal actions found.",
        );
        return;
    }

    console.error("[check:site-actions] FAIL: string-literal actions found:");
    for (const f of allFindings) {
        console.error(`- ${f.file}: ${f.message}`);
        console.error(`  preview: ${f.preview}`);
    }

    process.exit(1);
}

main();
