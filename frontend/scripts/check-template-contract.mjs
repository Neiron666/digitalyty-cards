import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function pickBaseDir() {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, "src"))) return cwd;
    if (fs.existsSync(path.join(cwd, "frontend", "src")))
        return path.join(cwd, "frontend");
    return cwd;
}

const BASE_DIR = pickBaseDir();

function toPascalCaseKey(key) {
    return String(key || "")
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join("");
}

function paletteKeyToExpectedClass(key) {
    return `palette${toPascalCaseKey(key)}`;
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

/** @type {{where: string, message: string, excerpt?: string}[]} */
const violations = [];

const ALLOWED_SKIN_KEYS = new Set(["base", "custom", "beauty"]);

async function loadRegistry() {
    const registryPath = path.join(
        BASE_DIR,
        "src",
        "templates",
        "templates.config.js"
    );

    if (!fs.existsSync(registryPath)) {
        throw new Error(`Registry not found: ${registryPath}`);
    }

    // Dynamic import to avoid require() in ESM.
    const mod = await import(pathToFileURL(registryPath).href);
    return mod;
}

function readText(relPath) {
    const abs = path.join(BASE_DIR, relPath);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, "utf8");
}

function parseCssModuleClasses(cssText) {
    const classes = new Set();
    const re = /\.([A-Za-z0-9_-]+)\s*\{/g;
    let m;
    while ((m = re.exec(cssText)) !== null) {
        classes.add(m[1]);
    }
    return classes;
}

function getTemplateIds(templates) {
    const ids = new Set();
    for (const t of templates || []) {
        if (t && typeof t.id === "string") ids.add(t.id);
    }
    return ids;
}

function validateCustomPalettes(template) {
    const palettes = template?.customPalettes;
    if (!Array.isArray(palettes) || palettes.length === 0) {
        violations.push({
            where: "registry:customV1.customPalettes",
            message: "customV1.customPalettes must be a non-empty array",
        });
        return [];
    }

    /** @type {string[]} */
    const keys = [];
    for (const p of palettes) {
        if (typeof p !== "string") {
            violations.push({
                where: "registry:customV1.customPalettes",
                message: "customV1.customPalettes must contain only strings",
            });
            continue;
        }
        const normalized = p.trim().toLowerCase();
        if (!normalized) {
            violations.push({
                where: "registry:customV1.customPalettes",
                message: "Palette keys must be non-empty strings",
            });
            continue;
        }
        keys.push(normalized);
    }

    // Ensure uniqueness
    const uniq = new Set(keys);
    if (uniq.size !== keys.length) {
        violations.push({
            where: "registry:customV1.customPalettes",
            message: "Palette keys must be unique",
        });
    }

    return [...uniq];
}

function validateSkinKeys(templates) {
    for (const t of templates || []) {
        if (!t || typeof t.id !== "string") continue;

        const skinKey = t.skinKey;
        if (typeof skinKey !== "string" || !skinKey.trim()) {
            violations.push({
                where: `registry:TEMPLATES:${t.id}`,
                message: `Template '${t.id}' must define skinKey`,
            });
            continue;
        }

        const normalized = skinKey.trim().toLowerCase();
        if (!ALLOWED_SKIN_KEYS.has(normalized)) {
            violations.push({
                where: `registry:TEMPLATES:${t.id}`,
                message: `Template '${
                    t.id
                }' has invalid skinKey '${skinKey}'. Allowed: ${[
                    ...ALLOWED_SKIN_KEYS,
                ].join(", ")}`,
            });
        }

        if (Array.isArray(t.customPalettes) && t.customPalettes.length) {
            const defaultKey = String(t.defaultPaletteKey || "")
                .trim()
                .toLowerCase();
            if (!defaultKey) {
                violations.push({
                    where: `registry:TEMPLATES:${t.id}`,
                    message: `Template '${t.id}' must define defaultPaletteKey when customPalettes is present`,
                });
                continue;
            }

            const allowed = t.customPalettes.map((p) =>
                String(p).trim().toLowerCase()
            );
            if (!allowed.includes(defaultKey)) {
                violations.push({
                    where: `registry:TEMPLATES:${t.id}`,
                    message: `Template '${t.id}' defaultPaletteKey '${defaultKey}' must be included in customPalettes`,
                });
            }
        }
    }
}

function validateNoMagicComparisons() {
    const targets = [
        "src/templates/TemplateRenderer.jsx",
        "src/components/editor/panels/DesignPanel.jsx",
    ];

    const forbiddenPatterns = [
        /\btemplateId\s*===\s*['"][^'"]+['"]/g,
        /\bselectedTemplate\?\.id\s*===\s*['"][^'"]+['"]/g,
        /\bcustomPaletteKey\s*\|\|\s*['"]gold['"]/g,
        /\bcustomPaletteKey\s*\?\?\s*['"]gold['"]/g,
    ];

    for (const rel of targets) {
        const text = readText(rel);
        if (!text) continue;

        for (const re of forbiddenPatterns) {
            let m;
            while ((m = re.exec(text)) !== null) {
                violations.push({
                    where: `${rel}:${lineOfIndex(text, m.index)}`,
                    message:
                        "Magic-string comparison/fallback detected; must be registry-driven",
                    excerpt: lineExcerpt(text, m.index),
                });
            }
        }
    }
}

function validateCustomSkinHasPaletteClasses(paletteKeys) {
    const cssRel = "src/templates/skins/custom/CustomSkin.module.css";
    const cssText = readText(cssRel);
    if (!cssText) {
        violations.push({
            where: cssRel,
            message: "Custom skin CSS module not found",
        });
        return;
    }

    const classes = parseCssModuleClasses(cssText);

    for (const key of paletteKeys) {
        const expected = paletteKeyToExpectedClass(key);
        if (!classes.has(expected)) {
            violations.push({
                where: cssRel,
                message: `Missing palette class for key '${key}': expected .${expected}`,
            });
        }
    }
}

function validateRendererAgainstRegistry(templateIds, paletteKeys) {
    const rendererRel = "src/templates/TemplateRenderer.jsx";
    const text = readText(rendererRel);
    if (!text) {
        violations.push({
            where: rendererRel,
            message: "TemplateRenderer.jsx not found",
        });
        return;
    }

    // Ensure renderer is registry-driven (no hardcoded allowlist).
    if (text.includes("CUSTOM_PALETTE_CLASS_BY_KEY")) {
        violations.push({
            where: rendererRel,
            message:
                "Renderer still contains CUSTOM_PALETTE_CLASS_BY_KEY; palette allowlist must be derived from registry",
        });
    }

    if (!/customPalettes/.test(text)) {
        violations.push({
            where: rendererRel,
            message:
                "Renderer does not reference template.customPalettes; palette allowlist must be derived from registry",
        });
    }

    // If renderer contains a hardcoded palette array literal, fail fast.
    // (This is intentionally conservative; palette keys must live in registry.)
    const hardcodedArray = text.match(
        /\b\[(?:\s*['"][a-z0-9_-]+['"]\s*,?\s*)+\]/i
    );
    if (hardcodedArray && /gold|ocean|forest/i.test(hardcodedArray[0])) {
        violations.push({
            where: rendererRel,
            message:
                "Renderer appears to contain a hardcoded palette list; use registry instead",
            excerpt: hardcodedArray[0],
        });
    }

    // Template ID sanity: any templateId === "..." must exist in registry.
    const re = /templateId\s*===\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const id = m[1];
        if (!templateIds.has(id)) {
            violations.push({
                where: `${rendererRel}:${lineOfIndex(text, m.index)}`,
                message: `Renderer references unknown templateId '${id}' (not in registry)`,
                excerpt: lineExcerpt(text, m.index),
            });
        }
    }

    // If renderer uses the palette class convention, sanity check the expected class prefix appears.
    // This helps catch accidental drift in key→class rule.
    if (paletteKeys.length) {
        const expectedExample = paletteKeyToExpectedClass(paletteKeys[0]);
        if (!text.includes("palette") || !text.includes("toPascalCaseKey")) {
            // Not a hard failure by itself; but if palette class derivation is absent, contracts may drift.
            // Keep strict: require the convention to be implemented in renderer.
            violations.push({
                where: rendererRel,
                message: `Renderer must derive palette CSS module class names via rule palette${"PascalCase"}(key) (e.g. .${expectedExample})`,
            });
        }
    }
}

try {
    const registry = await loadRegistry();
    const templates = registry?.TEMPLATES;

    if (!Array.isArray(templates) || templates.length === 0) {
        violations.push({
            where: "registry:TEMPLATES",
            message: "TEMPLATES must be a non-empty array",
        });
    }

    const templateIds = getTemplateIds(templates);

    validateSkinKeys(templates);

    const customV1 = Array.isArray(templates)
        ? templates.find((t) => t?.id === "customV1")
        : null;

    if (!customV1) {
        violations.push({
            where: "registry:TEMPLATES",
            message: "Registry must include a template with id 'customV1'",
        });
    }

    const paletteKeys = validateCustomPalettes(customV1);

    if (paletteKeys.length) {
        validateCustomSkinHasPaletteClasses(paletteKeys);
    }

    validateRendererAgainstRegistry(templateIds, paletteKeys);

    validateNoMagicComparisons();

    if (violations.length) {
        console.error(
            `FAIL: template contract violations (${violations.length}).`
        );
        for (const v of violations) {
            console.error(`- ${v.where}: ${v.message}`);
            if (v.excerpt) console.error(`  > ${v.excerpt}`);
        }
        process.exit(1);
    }

    console.log("PASS: template contracts are consistent.");
    console.log(`- Registry templates: ${templateIds.size}`);
    console.log(`- CustomV1 palettes: ${paletteKeys.join(", ") || "(none)"}`);
    process.exit(0);
} catch (err) {
    console.error(`FAIL: ${err?.message || String(err)}`);
    process.exit(1);
}
