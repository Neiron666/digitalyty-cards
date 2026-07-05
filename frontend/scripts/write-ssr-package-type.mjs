/**
 * write-ssr-package-type.mjs — SSR_P3_NETLIFY_FUNCTION_SSR_RUNTIME_SPIKE_NARROW_ESM_BOUNDARY_FIX
 *
 * Writes dist_ssr/package.json with { "type": "module" } so Node.js treats
 * dist_ssr/*.js files as ES modules in Netlify Lambda without making the root
 * frontend/package.json available in the Lambda bundle.
 *
 * Called from build:ssr script after vite build --ssr.
 * No dependencies. No env reads. No absolute paths in output.
 */

import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distSsrDir = join(__dirname, "..", "dist_ssr");
const outputPath = join(distSsrDir, "package.json");
const content = '{ "type": "module" }\n';

await mkdir(distSsrDir, { recursive: true });
await writeFile(outputPath, content, "utf-8");
console.log("WROTE: dist_ssr/package.json (type=module)");
