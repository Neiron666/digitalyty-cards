import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";
import mongoose from "mongoose";
import path from "node:path";

import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import Card from "../src/models/Card.model.js";
import User from "../src/models/User.model.js";
import { signToken } from "../src/utils/jwt.js";

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

function deepHasOwnKey(value, key, seen = new Set()) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (Object.prototype.hasOwnProperty.call(value, key)) return true;

    if (Array.isArray(value)) {
        for (const item of value) {
            if (deepHasOwnKey(item, key, seen)) return true;
        }
        return false;
    }

    for (const v of Object.values(value)) {
        if (deepHasOwnKey(v, key, seen)) return true;
    }
    return false;
}

function stripJsComments(text) {
    // Best-effort comment stripping to avoid counting matches in comments.
    // This is sufficient for our invariant check; it doesn't need to be a full parser.
    return String(text || "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}

function countRegexMatchesInDir({
    dirPath,
    filePattern = /\.(?:js|mjs|ts|tsx)$/,
    re,
    skipDirNames = new Set([
        "node_modules",
        "dist",
        "build",
        "coverage",
        ".git",
    ]),
}) {
    let count = 0;
    const stack = [dirPath];
    while (stack.length) {
        const current = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const ent of entries) {
            const full = path.join(current, ent.name);
            if (ent.isDirectory()) {
                if (skipDirNames.has(ent.name)) continue;
                stack.push(full);
                continue;
            }

            if (!ent.isFile() || !filePattern.test(ent.name)) continue;

            let text;
            try {
                text = fs.readFileSync(full, "utf8");
            } catch {
                continue;
            }

            const matches = stripJsComments(text).match(re);
            if (matches) count += matches.length;
        }
    }

    return count;
}

async function listen(serverApp) {
    return await new Promise((resolve, reject) => {
        const server = serverApp.listen(0, "0.0.0.0", () => resolve(server));
        server.on("error", reject);
    });
}

async function readJson(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

async function requestJson({ baseUrl, path, method, headers, body }) {
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

function isOkStatus(status) {
    return status >= 200 && status < 300;
}

async function cleanupDocs({ userId }) {
    if (!userId) return;

    try {
        const u = await User.findById(userId).lean();
        if (u?.cardId) {
            await Card.deleteOne({ _id: u.cardId });
        }
    } catch {
        // ignore
    }

    try {
        await User.deleteOne({ _id: userId });
    } catch {
        // ignore
    }
}

async function main() {
    // Mongo
    await connectDB(process.env.MONGO_URI);

    // JWT secret is required for auth middleware.
    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    const server = await listen(app);
    const { port } = server.address();
    const originPrimary = `http://127.0.0.1:${port}`;
    const originAlt = `http://127.0.0.2:${port}`;
    const baseUrlPrimary = `${originPrimary}/api`;
    const baseUrlAlt = `${originAlt}/api`;
    const hostPrimary = new URL(baseUrlPrimary).hostname;
    const hostAlt = new URL(baseUrlAlt).hostname;

    const created = {
        userId: null,
        cardId: null,
    };

    const checks = {
        userOnly: false,
        draftOnly: false,
        limit2PerMonth: false,
        publicNoSlugPolicy: false,
        exposeSlugPolicySingleMatch: false,
        tenantResolveOk: false,
        altHostResolveOk: false,
        altHostOgOk: false,
        altHostSitemapOk: false,
        altHostAnalytics204: false,
        limitPayload: null,
    };

    const statuses = {};

    try {
        // Enterprise invariant: exposeSlugPolicy:true must have exactly one call-site.
        // Avoid git commands; do a lightweight file-walk scan.
        try {
            const srcDir = path.join(process.cwd(), "src");
            const count = countRegexMatchesInDir({
                dirPath: srcDir,
                re: /exposeSlugPolicy\s*:\s*true/g,
            });
            statuses.exposeSlugPolicyMatches = count;
            checks.exposeSlugPolicySingleMatch = count === 1;
        } catch {
            statuses.exposeSlugPolicyMatches = null;
            checks.exposeSlugPolicySingleMatch = false;
        }

        // A) User-only: anonymous (no JWT) should be forbidden for custom slug.
        {
            const anonymousId = crypto.randomUUID();
            const r = await requestJson({
                baseUrl: baseUrlPrimary,
                path: "/cards/slug",
                method: "PATCH",
                headers: {
                    "x-anonymous-id": anonymousId,
                },
                body: { slug: `sanity-useronly-${randomHex(4)}` },
            });

            statuses.userOnly = {
                status: r.status,
                code: r.body?.code || null,
            };
            checks.userOnly =
                r.status === 403 &&
                r.body &&
                r.body.code === "SLUG_REQUIRES_AUTH";
        }

        // B) Draft-only: create user+card(draft), change slug once OK, publish, then slug change blocked.
        const email = `sanity-slug-policy-${Date.now()}-${randomHex()}@example.com`;
        const user = await User.create({ email, passwordHash: "sanity" });
        created.userId = String(user._id);

        const token = signToken(String(user._id));
        const authHeaders = {
            Authorization: `Bearer ${token}`,
        };

        const createCard = await requestJson({
            baseUrl: baseUrlPrimary,
            path: "/cards",
            method: "POST",
            headers: authHeaders,
            body: {
                business: { name: "Sanity Slug Policy" },
                design: { templateId: "minimal" },
            },
        });

        statuses.createCard = {
            status: createCard.status,
            id: createCard.body?._id || null,
        };

        assert(
            isOkStatus(createCard.status) &&
                createCard.body &&
                typeof createCard.body._id === "string",
            `Expected create card success, got ${createCard.status}`,
        );

        created.cardId = String(createCard.body._id);

        const slug1 = `sanity-slug-a-${randomHex(4)}`;
        const setSlug1 = await requestJson({
            baseUrl: baseUrlPrimary,
            path: "/cards/slug",
            method: "PATCH",
            headers: authHeaders,
            body: { slug: slug1 },
        });

        statuses.slug1 = { status: setSlug1.status, body: setSlug1.body };
        assert(
            isOkStatus(setSlug1.status) && setSlug1.body?.slug === slug1,
            `Expected slug1 update OK, got ${setSlug1.status}`,
        );

        // Publish card (minimal via existing API)
        const publish = await requestJson({
            baseUrl: baseUrlPrimary,
            path: `/cards/${created.cardId}`,
            method: "PATCH",
            headers: authHeaders,
            body: {
                status: "published",
                business: { name: "Sanity Slug Policy" },
                design: { templateId: "minimal" },
            },
        });

        statuses.publish = {
            status: publish.status,
            statusField: publish.body?.status || null,
            publishError: publish.body?.publishError || null,
        };

        assert(
            isOkStatus(publish.status) && publish.body?.status === "published",
            `Expected publish success, got ${publish.status} body=${JSON.stringify(
                publish.body,
            )}`,
        );

        // D) Tenant smoke: public resolve succeeds ONLY when published.
        {
            const pub = await requestJson({
                baseUrl: baseUrlPrimary,
                path: `/cards/${slug1}`,
                method: "GET",
                headers: { Accept: "application/json" },
            });

            const hasSlugPolicyDeep = deepHasOwnKey(pub.body, "slugPolicy");

            statuses.tenantResolve = {
                status: pub.status,
                slug: pub.body?.slug || null,
                code: pub.body?.code || null,
                hasSlugPolicy: hasSlugPolicyDeep,
            };

            checks.tenantResolveOk =
                pub.status === 200 && pub.body && pub.body.slug === slug1;

            // Contract: slugPolicy must be user-context only (/cards/mine), never public.
            checks.publicNoSlugPolicy =
                pub.status === 200 && !hasSlugPolicyDeep;
        }

        // Host-independence: public resolve must not depend on Host allowlists.
        {
            const pubWrongHost = await requestJson({
                baseUrl: baseUrlAlt,
                path: `/cards/${slug1}`,
                method: "GET",
                headers: { Accept: "application/json" },
            });

            statuses.altHostResolve = {
                status: pubWrongHost.status,
                code: pubWrongHost.body?.code || null,
            };

            checks.altHostResolveOk =
                pubWrongHost.status === 200 &&
                pubWrongHost.body?.slug === slug1;
        }

        // Host-independence: SEO/public surfaces must not depend on Host allowlists.
        {
            const ogWrongHost = await requestJson({
                baseUrl: originAlt,
                path: `/og/card/${slug1}`,
                method: "GET",
                headers: { Accept: "text/html" },
            });

            statuses.altHostOg = {
                status: ogWrongHost.status,
                body: ogWrongHost.body,
            };

            checks.altHostOgOk = ogWrongHost.status === 200;
        }

        {
            const sitemapWrongHost = await requestJson({
                baseUrl: originAlt,
                path: "/sitemap.xml",
                method: "GET",
                headers: { Accept: "application/xml" },
            });

            statuses.altHostSitemap = {
                status: sitemapWrongHost.status,
            };

            checks.altHostSitemapOk = sitemapWrongHost.status === 200;
        }

        {
            const analyticsWrongHost = await requestJson({
                baseUrl: baseUrlAlt,
                path: "/analytics/track",
                method: "POST",
                headers: { Accept: "application/json" },
                body: { slug: slug1, event: "view" },
            });

            statuses.altHostAnalytics = {
                status: analyticsWrongHost.status,
            };

            checks.altHostAnalytics204 = analyticsWrongHost.status === 204;
        }

        const slug2 = `sanity-slug-b-${randomHex(4)}`;

        // Unpublish back to draft to allow slug edits.
        const unpublish = await requestJson({
            baseUrl: baseUrlPrimary,
            path: `/cards/${created.cardId}`,
            method: "PATCH",
            headers: authHeaders,
            body: { status: "draft" },
        });

        statuses.unpublish = {
            status: unpublish.status,
            statusField: unpublish.body?.status || null,
        };

        assert(
            isOkStatus(unpublish.status) && unpublish.body?.status === "draft",
            `Expected unpublish success, got ${unpublish.status}`,
        );

        const setSlugWhileDraft = await requestJson({
            baseUrl: baseUrlPrimary,
            path: "/cards/slug",
            method: "PATCH",
            headers: authHeaders,
            body: { slug: slug2 },
        });

        statuses.slug2 = {
            status: setSlugWhileDraft.status,
            body: setSlugWhileDraft.body,
        };

        assert(
            isOkStatus(setSlugWhileDraft.status) &&
                setSlugWhileDraft.body?.slug === slug2,
            `Expected slug2 update OK, got ${setSlugWhileDraft.status}`,
        );

        // Draft-only enforcement
        const republish = await requestJson({
            baseUrl: baseUrlPrimary,
            path: `/cards/${created.cardId}`,
            method: "PATCH",
            headers: authHeaders,
            body: {
                status: "published",
                business: { name: "Sanity Slug Policy" },
                design: { templateId: "minimal" },
            },
        });

        assert(
            isOkStatus(republish.status) &&
                republish.body?.status === "published",
            `Expected republish success, got ${republish.status}`,
        );

        const blockedPublished = await requestJson({
            baseUrl: baseUrlPrimary,
            path: "/cards/slug",
            method: "PATCH",
            headers: authHeaders,
            body: { slug: `sanity-slug-published-${randomHex(4)}` },
        });

        statuses.draftOnly = {
            status: blockedPublished.status,
            code: blockedPublished.body?.code || null,
        };

        checks.draftOnly =
            blockedPublished.status === 403 &&
            blockedPublished.body?.code === "SLUG_ONLY_DRAFT";

        // Back to draft to exercise the monthly limit.
        const backToDraft = await requestJson({
            baseUrl: baseUrlPrimary,
            path: `/cards/${created.cardId}`,
            method: "PATCH",
            headers: authHeaders,
            body: { status: "draft" },
        });

        assert(
            isOkStatus(backToDraft.status) &&
                backToDraft.body?.status === "draft",
            `Expected back-to-draft success, got ${backToDraft.status}`,
        );

        // C) 2/month: We already did 2 successful changes (slug1, slug2). Third must fail.
        const slug3 = `sanity-slug-c-${randomHex(4)}`;
        const third = await requestJson({
            baseUrl: baseUrlPrimary,
            path: "/cards/slug",
            method: "PATCH",
            headers: authHeaders,
            body: { slug: slug3 },
        });

        statuses.limit = {
            status: third.status,
            code: third.body?.code || null,
            body: third.body,
        };

        checks.limit2PerMonth =
            third.status === 429 && third.body?.code === "SLUG_CHANGE_LIMIT";

        if (third.body && typeof third.body === "object") {
            const hasLimit = Object.prototype.hasOwnProperty.call(
                third.body,
                "limit",
            );
            const hasRemaining = Object.prototype.hasOwnProperty.call(
                third.body,
                "remaining",
            );

            checks.limitPayload = hasLimit || hasRemaining;
            if (hasLimit || hasRemaining) {
                assert(
                    hasLimit && hasRemaining,
                    `Expected both remaining+limit in payload when present, got ${JSON.stringify(
                        third.body,
                    )}`,
                );
            }
        }

        const ok =
            checks.exposeSlugPolicySingleMatch &&
            checks.userOnly &&
            checks.draftOnly &&
            checks.limit2PerMonth &&
            checks.publicNoSlugPolicy &&
            checks.tenantResolveOk &&
            checks.altHostResolveOk &&
            checks.altHostOgOk &&
            checks.altHostSitemapOk &&
            checks.altHostAnalytics204;

        console.log(
            JSON.stringify(
                {
                    ok,
                    baseUrlPrimary,
                    baseUrlAlt,
                    hostPrimary,
                    hostAlt,
                    checks,
                    statuses,
                },
                null,
                0,
            ),
        );

        process.exitCode = ok ? 0 : 2;
    } finally {
        await cleanupDocs({ userId: created.userId });
        await new Promise((resolve) => server.close(() => resolve()));
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error("FAILED", err?.message || err);
    process.exitCode = 1;
});
