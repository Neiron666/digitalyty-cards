/**
 * write-ssr-card-package-type.mjs — SSR_P3_DEDICATED_CARD_SSR_RENDERER_MINIMAL
 *
 * Writes dist_ssr_card/package.json with { "type": "module" } so Node.js treats
 * dist_ssr_card/*.js files as ES modules in the Netlify Lambda runtime.
 *
 * Called from build:ssr-card script after vite build --ssr --outDir dist_ssr_card.
 * No dependencies. No env reads. No absolute paths in output.
 */

import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distSsrCardDir = join(__dirname, "..", "dist_ssr_card");
const outputPath = join(distSsrCardDir, "package.json");
const content = '{ "type": "module" }\n';

await mkdir(distSsrCardDir, { recursive: true });
await writeFile(outputPath, content, "utf-8");
console.log("WROTE: dist_ssr_card/package.json (type=module)");
