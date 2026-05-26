/**
 * Phase 2B: XSS-safe JSON serializer for embedding into HTML <script type="application/json">.
 * Pure ESM, dependency-free. No eval, no Function, no innerHTML, no DOM access.
 *
 * Escapes characters that would otherwise allow the JSON payload to break out
 * of the script element or be misinterpreted by the HTML parser / JS engine:
 *   <   →  \u003c   (prevents </script> termination)
 *   >   →  \u003e   (defensive symmetry)
 *   &   →  \u0026   (prevents HTML entity decoding edge cases)
 *   U+2028 (LINE SEPARATOR)       →  \u2028
 *   U+2029 (PARAGRAPH SEPARATOR)  →  \u2029
 */
export function serializeJsonForHtml(value) {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return "null";
    return json
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
