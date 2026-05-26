// Runtime smoke for public content OG routes (/og/blog/:slug, /og/guides/:slug).
// Mounts ONLY the OG router into an ephemeral Express app on 127.0.0.1:0,
// monkey-patches BlogPost.findOne / GuidePost.findOne to return deterministic
// in-memory data, and exercises the handlers via native fetch.
// No DB connection. No app.js. No server.js. No new dependencies.

process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "sanity";
process.env.SITE_URL ??= "https://example.invalid";

const HARD_TIMEOUT_MS = 5000;
const SITE = "https://example.invalid";

let allOk = true;
let server = null;

const hardTimeout = setTimeout(() => {
    console.log(
        `OG_RUNTIME_SMOKE_CASE __timeout__ FAIL hard timeout ${HARD_TIMEOUT_MS}ms exceeded`,
    );
    console.log("OG_RUNTIME_SMOKE_FAIL");
    process.exit(1);
}, HARD_TIMEOUT_MS);
hardTimeout.unref?.();

function record(name, ok, reason = "") {
    if (ok) {
        console.log(`OG_RUNTIME_SMOKE_CASE ${name} PASS`);
    } else {
        allOk = false;
        console.log(`OG_RUNTIME_SMOKE_CASE ${name} FAIL ${reason}`);
    }
}

const { default: express } = await import("express");
const { default: mongoose } = await import("mongoose");
const { default: BlogPost } = await import("../src/models/BlogPost.model.js");
const { default: GuidePost } = await import("../src/models/GuidePost.model.js");

if (mongoose.connection.readyState !== 0) {
    console.log(
        `OG_RUNTIME_SMOKE_CASE __pre_db__ FAIL mongoose.connection.readyState=${mongoose.connection.readyState} expected 0`,
    );
    console.log("OG_RUNTIME_SMOKE_FAIL");
    process.exit(1);
}

const originalBlogFindOne = BlogPost.findOne;
const originalGuideFindOne = GuidePost.findOne;

function makeMockFindOne(slugTable, aliasTable) {
    return function mockFindOne(filter) {
        return {
            lean: async () => {
                if (
                    filter &&
                    typeof filter === "object" &&
                    filter.status === "published"
                ) {
                    if (typeof filter.slug === "string") {
                        return slugTable[filter.slug] || null;
                    }
                    if (typeof filter.previousSlugs === "string") {
                        return aliasTable[filter.previousSlugs] || null;
                    }
                }
                return null;
            },
        };
    };
}

const blogSlugTable = {
    "current-slug-mock": {
        slug: "current-slug-mock",
        title: "Blog smoke",
        seo: { title: "Blog smoke seo", description: "Blog smoke desc" },
        excerpt: "Blog smoke excerpt",
        publishedAt: new Date("2026-05-01T00:00:00Z"),
        updatedAt: new Date("2026-05-02T00:00:00Z"),
        authorName: "Smoke author",
    },
};
const blogAliasTable = {
    "old-alias-mock": {
        slug: "canonical-blog-mock",
        title: "Blog canonical",
        seo: {
            title: "Blog canonical seo",
            description: "Blog canonical desc",
        },
        excerpt: "Blog canonical excerpt",
        publishedAt: new Date("2026-05-03T00:00:00Z"),
        updatedAt: new Date("2026-05-04T00:00:00Z"),
        authorName: "Smoke author",
    },
};
const guideSlugTable = {
    "current-slug-mock": {
        slug: "current-slug-mock",
        title: "Guide smoke",
        seo: { title: "Guide smoke seo", description: "Guide smoke desc" },
        excerpt: "Guide smoke excerpt",
        publishedAt: new Date("2026-05-01T00:00:00Z"),
        updatedAt: new Date("2026-05-02T00:00:00Z"),
        authorName: "Smoke author",
    },
};
const guideAliasTable = {
    "old-alias-mock": {
        slug: "canonical-guide-mock",
        title: "Guide canonical",
        seo: {
            title: "Guide canonical seo",
            description: "Guide canonical desc",
        },
        excerpt: "Guide canonical excerpt",
        publishedAt: new Date("2026-05-03T00:00:00Z"),
        updatedAt: new Date("2026-05-04T00:00:00Z"),
        authorName: "Smoke author",
    },
};

BlogPost.findOne = makeMockFindOne(blogSlugTable, blogAliasTable);
GuidePost.findOne = makeMockFindOne(guideSlugTable, guideAliasTable);

const { default: ogRoutes } = await import("../src/routes/og.routes.js");

try {
    const app = express();
    app.use("/", ogRoutes);

    server = await new Promise((resolve, reject) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
        s.on("error", reject);
    });

    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    async function runCase({
        name,
        path,
        expectStatus,
        expectIncludes = [],
        expectExcludes = [],
    }) {
        try {
            const res = await fetch(`${base}${path}`, {
                method: "GET",
                redirect: "manual",
            });
            const body = await res.text();
            if (res.status !== expectStatus) {
                return record(
                    name,
                    false,
                    `status=${res.status} expected=${expectStatus}`,
                );
            }
            if (res.status === 500) {
                return record(name, false, "status 500 unexpected");
            }
            if (body.includes("ReferenceError")) {
                return record(name, false, "body contained ReferenceError");
            }
            for (const needle of expectIncludes) {
                if (!body.includes(needle)) {
                    return record(
                        name,
                        false,
                        `body missing expected substring: ${needle}`,
                    );
                }
            }
            for (const forbidden of expectExcludes) {
                if (body.includes(forbidden)) {
                    return record(
                        name,
                        false,
                        `body contained forbidden substring: ${forbidden}`,
                    );
                }
            }
            record(name, true);
        } catch (err) {
            record(name, false, `fetch error: ${err?.message || err}`);
        }
    }

    await runCase({
        name: "A_blog_missing",
        path: "/og/blog/__missing_runtime_smoke__",
        expectStatus: 404,
        expectIncludes: ["Not found"],
    });
    await runCase({
        name: "B_guides_missing",
        path: "/og/guides/__missing_runtime_smoke__",
        expectStatus: 404,
        expectIncludes: ["Not found"],
    });
    await runCase({
        name: "C_blog_current",
        path: "/og/blog/current-slug-mock",
        expectStatus: 200,
        expectIncludes: [`${SITE}/blog/current-slug-mock/`],
        expectExcludes: [`${SITE}/blog/old-alias-mock/`],
    });
    await runCase({
        name: "D_blog_alias",
        path: "/og/blog/old-alias-mock",
        expectStatus: 200,
        expectIncludes: [`${SITE}/blog/canonical-blog-mock/`],
        expectExcludes: [`${SITE}/blog/old-alias-mock/`],
    });
    await runCase({
        name: "E_guides_current",
        path: "/og/guides/current-slug-mock",
        expectStatus: 200,
        expectIncludes: [`${SITE}/guides/current-slug-mock/`],
        expectExcludes: [`${SITE}/guides/old-alias-mock/`],
    });
    await runCase({
        name: "F_guides_alias",
        path: "/og/guides/old-alias-mock",
        expectStatus: 200,
        expectIncludes: [`${SITE}/guides/canonical-guide-mock/`],
        expectExcludes: [`${SITE}/guides/old-alias-mock/`],
    });
} finally {
    BlogPost.findOne = originalBlogFindOne;
    GuidePost.findOne = originalGuideFindOne;
    if (server) {
        await new Promise((resolve) => server.close(() => resolve()));
    }
    clearTimeout(hardTimeout);
}

let restored = true;
if (BlogPost.findOne !== originalBlogFindOne) {
    restored = false;
    console.log(
        "OG_RUNTIME_SMOKE_RESTORED_MODELS: FAIL BlogPost.findOne not restored",
    );
}
if (GuidePost.findOne !== originalGuideFindOne) {
    restored = false;
    console.log(
        "OG_RUNTIME_SMOKE_RESTORED_MODELS: FAIL GuidePost.findOne not restored",
    );
}
if (restored) {
    console.log("OG_RUNTIME_SMOKE_RESTORED_MODELS: PASS");
}

const finalReadyState = mongoose.connection.readyState;
if (finalReadyState === 0) {
    console.log("OG_RUNTIME_SMOKE_DB_CONNECTION: PASS readyState=0");
} else {
    allOk = false;
    console.log(
        `OG_RUNTIME_SMOKE_DB_CONNECTION: FAIL readyState=${finalReadyState}`,
    );
}

if (allOk && restored && finalReadyState === 0) {
    console.log("OG_RUNTIME_SMOKE_PASS");
    process.exitCode = 0;
} else {
    console.log("OG_RUNTIME_SMOKE_FAIL");
    process.exitCode = 1;
}
