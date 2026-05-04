/**
 * sanity-shared-fixtures.mjs
 *
 * Shared utility functions for sanity-analytics, sanity-booking, sanity-leads.
 * NOT a standalone script. Import from the individual sanity scripts only.
 * Contains no mongoose model imports and no side effects.
 */

import crypto from "node:crypto";

export function assert(condition, message) {
    if (!condition) throw new Error(message);
}

export function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

export async function listen(serverApp) {
    return new Promise((resolve, reject) => {
        const server = serverApp.listen(0, "0.0.0.0", () => resolve(server));
        server.on("error", reject);
    });
}

export async function readJson(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

export async function requestJson({ baseUrl, path, method, headers, body }) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Accept: "application/json",
            ...(body === undefined
                ? {}
                : { "Content-Type": "application/json" }),
            ...(headers || {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await readJson(res) };
}

export const SANITY_INVITE_PASSWORD = "Sanity#Pass12345";
