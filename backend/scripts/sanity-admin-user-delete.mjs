import "dotenv/config";

import crypto from "node:crypto";
import mongoose from "mongoose";

process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection", reason);
    process.exitCode = 1;
});

console.log("sanity-admin-user-delete:script-start");

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

async function listen(serverApp) {
    return await new Promise((resolve, reject) => {
        const server = serverApp.listen(0, "0.0.0.0", () => resolve(server));
        server.on("error", reject);
    });
}

async function closeServer(server) {
    if (!server) return;
    await new Promise((resolve) => server.close(() => resolve()));
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

async function requestFormData({ baseUrl, path, method, headers, formData }) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Accept: "application/json",
            ...(headers || {}),
        },
        body: formData,
    });

    return { status: res.status, body: await readJson(res) };
}

function tinyPngBuffer() {
    // 1x1 transparent PNG
    const base64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X4l9gAAAAASUVORK5CYII=";
    return Buffer.from(base64, "base64");
}

function isSupabaseNotFoundError(err) {
    const msg = String(err?.message || "").toLowerCase();
    // supabase-js typically reports: "Object not found" for missing storage objects
    return msg.includes("not found") || msg.includes("404");
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function precheckDownload({ downloadToBuffer, buckets, path }) {
    let lastError = null;

    for (const bucket of buckets) {
        try {
            await downloadToBuffer({ bucket, path });
            return { ok: true, bucket };
        } catch (err) {
            lastError = err;
        }
    }

    return { ok: false, error: lastError };
}

async function fetchStatus(url) {
    const res = await fetch(url, { method: "GET" });
    // ensure body is not buffered
    try {
        // Drain small bodies to allow keep-alive reuse.
        await res.arrayBuffer();
    } catch {
        // ignore
    }
    return res.status;
}

async function getObjectHttpStatus({ bucket, path, createSignedUrl }) {
    // Use signed URL to validate existence (works for public + private buckets).
    try {
        const signedUrl = await createSignedUrl({
            bucket,
            path,
            expiresIn: 60,
        });
        const status = await fetchStatus(signedUrl);
        return { ok: true, status, urlKind: "signed" };
    } catch (err) {
        // If we can't even mint a signed URL, we can't prove a 404.
        return {
            ok: false,
            status: null,
            message: String(err?.message || err),
        };
    }
}

async function postcheckNotFound({
    downloadToBuffer,
    buckets,
    path,
    createSignedUrl,
}) {
    // Supabase storage operations can be eventually-consistent.
    // Retry for a short bounded window to make this sanity deterministic.
    const attempts = 12;
    const delayMs = 250;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        let sawStillExists = false;

        for (const bucket of buckets) {
            try {
                await downloadToBuffer({ bucket, path });
                sawStillExists = true;
                break;
            } catch (err) {
                // downloadToBuffer does not expose status codes; validate via HTTP status.
                const http = await getObjectHttpStatus({
                    bucket,
                    path,
                    createSignedUrl,
                });

                if (!http.ok) {
                    // Fallback: if error message clearly indicates not found, accept it.
                    if (
                        isSupabaseNotFoundError(err) ||
                        isSupabaseNotFoundError({ message: http.message || "" })
                    ) {
                        continue;
                    }

                    return {
                        ok: false,
                        bucket,
                        reason: "UNEXPECTED_ERROR",
                        message: http.message || String(err?.message || err),
                    };
                }

                if (http.status === 404) continue;

                if (http.status === 200) {
                    sawStillExists = true;
                    break;
                }

                return {
                    ok: false,
                    bucket,
                    reason: "UNEXPECTED_STATUS",
                    message: `HTTP status ${http.status}`,
                };
            }
        }

        if (!sawStillExists) return { ok: true };

        if (attempt < attempts) {
            await sleep(delayMs);
        }
    }

    return {
        ok: false,
        bucket: buckets?.[0] || null,
        reason: "NOT_FOUND_TIMEOUT",
        message: "Timed out waiting for NOT FOUND",
    };
}

async function main() {
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const mongoUri = process.env.MONGO_URI;
    assert(mongoUri && String(mongoUri).trim(), "Missing MONGO_URI");

    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    const [
        { default: app },
        { default: Card },
        { default: User },
        { signToken },
        { collectSupabasePathsFromCard, normalizeSupabasePaths },
        {
            createSignedUrl,
            downloadToBuffer,
            getAnonPrivateBucketName,
            getPublicBucketName,
        },
    ] = await Promise.all([
        import("../src/app.js"),
        import("../src/models/Card.model.js"),
        import("../src/models/User.model.js"),
        import("../src/utils/jwt.js"),
        import("../src/utils/supabasePaths.js"),
        import("../src/services/supabaseStorage.js"),
    ]);

    // Avoid index governance conflicts during sanity startup.
    Card.schema.set("autoIndex", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });
    console.log("MongoDB connected");

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        adminUserId: null,
        targetUserId: null,
        cardId: null,
        rawPaths: [],
        paths: [],
    };

    const report = {
        ok: false,
        userId: null,
        cardId: null,
        pathsCount: 0,
        precheckOkCount: 0,
        postcheckNotFoundCount: 0,
        failures: [],
    };

    let adminToken = null;
    let adminHeaders = null;

    try {
        // (1) Create platform admin user + JWT (DB direct, same as other sanities)
        const adminEmail = `sanity-admin-${Date.now()}-${randomHex()}@example.com`;
        const admin = await User.create({
            email: adminEmail,
            passwordHash: "sanity",
            role: "admin",
        });
        created.adminUserId = String(admin._id);
        adminToken = signToken(String(admin._id));
        adminHeaders = { Authorization: `Bearer ${adminToken}` };

        // (2) Create normal user + JWT (DB direct, then act via API)
        const userEmail = `sanity-user-${Date.now()}-${randomHex()}@example.com`;
        const user = await User.create({
            email: userEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.targetUserId = String(user._id);
        report.userId = created.targetUserId;

        const userToken = signToken(String(user._id));
        const userHeaders = { Authorization: `Bearer ${userToken}` };

        // (3) Create personal card via API, then resolve cardId via GET /cards/mine
        const createRes = await requestJson({
            baseUrl,
            path: "/cards",
            method: "POST",
            headers: userHeaders,
            body: {},
        });
        assert(
            createRes.status === 200 || createRes.status === 201,
            `Expected POST /cards 200/201, got ${createRes.status}`,
        );

        const mineRes = await requestJson({
            baseUrl,
            path: "/cards/mine",
            method: "GET",
            headers: { ...userHeaders, Accept: "application/json" },
        });
        assert(
            mineRes.status === 200,
            `Expected GET /cards/mine 200, got ${mineRes.status}`,
        );
        const cardId = mineRes?.body?._id;
        assert(typeof cardId === "string" && cardId.trim(), "Missing cardId");
        created.cardId = String(cardId);
        report.cardId = created.cardId;

        // (4) Upload design asset + gallery image (real upload endpoints)
        const pngBuffer = tinyPngBuffer();
        const pngBlob = new Blob([pngBuffer], { type: "image/png" });

        const assetForm = new FormData();
        assetForm.append("cardId", created.cardId);
        assetForm.append("kind", "avatar");
        assetForm.append("image", pngBlob, "tiny.png");

        const assetRes = await requestFormData({
            baseUrl,
            path: "/uploads/asset",
            method: "POST",
            headers: userHeaders,
            formData: assetForm,
        });
        assert(
            assetRes.status === 200,
            `Expected POST /uploads/asset 200, got ${assetRes.status}`,
        );

        const galleryForm = new FormData();
        galleryForm.append("cardId", created.cardId);
        galleryForm.append("image", pngBlob, "tiny.png");

        const galleryRes = await requestFormData({
            baseUrl,
            path: "/uploads/image",
            method: "POST",
            headers: userHeaders,
            formData: galleryForm,
        });
        assert(
            galleryRes.status === 200,
            `Expected POST /uploads/image 200, got ${galleryRes.status}`,
        );

        // (5) Collect card-owned paths via existing helper, then pre-assert existence
        const freshCard = await Card.findById(created.cardId).lean();
        assert(freshCard, "Expected Card.findById to return a card");

        const rawPaths = collectSupabasePathsFromCard(freshCard);
        const paths = normalizeSupabasePaths(rawPaths);

        created.rawPaths = rawPaths;
        created.paths = paths;

        report.pathsCount = paths.length;
        assert(paths.length > 0, "Expected at least 1 Supabase path on card");

        const isAnonymousOwned =
            !freshCard?.user && Boolean(freshCard?.anonymousId);
        const publicBucket = getPublicBucketName();
        const buckets = isAnonymousOwned
            ? Array.from(
                  new Set(
                      [
                          getAnonPrivateBucketName({ allowFallback: true }),
                          publicBucket,
                      ].filter(Boolean),
                  ),
              )
            : [publicBucket];

        for (const path of paths) {
            const r = await precheckDownload({
                downloadToBuffer,
                buckets,
                path,
            });

            if (!r.ok) {
                report.failures.push({
                    phase: "precheck",
                    path,
                    reason: "DOWNLOAD_FAILED",
                    message: String(r?.error?.message || r?.error || ""),
                });
                throw new Error(`Precheck failed for path: ${path}`);
            }

            report.precheckOkCount += 1;
        }

        // (6) Execute admin hard delete user
        const delRes = await requestJson({
            baseUrl,
            path: `/admin/users/${created.targetUserId}/delete`,
            method: "POST",
            headers: adminHeaders,
            body: {
                reason: "sanity-admin-user-delete",
                confirm: "DELETE",
            },
        });

        assert(
            delRes.status === 200,
            `Expected admin delete 200, got ${delRes.status}`,
        );
        assert(
            delRes?.body?.ok === true,
            "Expected admin delete response { ok: true }",
        );

        // (7) Post-assert: user + cards removed
        const userAfter = await User.findById(created.targetUserId).lean();
        assert(
            !userAfter,
            "Expected User.findById to return null after delete",
        );

        const cardCountAfter = await Card.countDocuments({
            user: created.targetUserId,
        });
        assert(
            cardCountAfter === 0,
            `Expected 0 cards after delete, got ${cardCountAfter}`,
        );

        // (8) Post-assert: no Supabase garbage (download must be 404/not found)
        for (const path of paths) {
            const r = await postcheckNotFound({
                downloadToBuffer,
                buckets,
                path,
                createSignedUrl,
            });

            if (!r.ok) {
                report.failures.push({
                    phase: "postcheck",
                    path,
                    reason: r.reason,
                    bucket: r.bucket || null,
                    message: r.message || null,
                });
                throw new Error(`Postcheck failed for path: ${path}`);
            }

            report.postcheckNotFoundCount += 1;
        }

        report.ok = true;
        return report;
    } catch (err) {
        if (report.failures.length === 0) {
            report.failures.push({
                phase: "fatal",
                path: null,
                reason: "ERROR",
                message: String(err?.message || err),
            });
        }
        report.ok = false;
        return report;
    } finally {
        // Best-effort cleanup if the test failed before deleting the user.
        try {
            if (adminHeaders && created.targetUserId) {
                const stillExists = await User.findById(created.targetUserId)
                    .select("_id")
                    .lean();

                if (stillExists) {
                    await requestJson({
                        baseUrl,
                        path: `/admin/users/${created.targetUserId}/delete`,
                        method: "POST",
                        headers: adminHeaders,
                        body: {
                            reason: "sanity-admin-user-delete:cleanup",
                            confirm: "DELETE",
                        },
                    });
                }
            }
        } catch {
            // ignore
        }

        await closeServer(server);
        await mongoose.disconnect();
    }
}

const finalReport = await main();
console.log(JSON.stringify(finalReport, null, 2));
process.exitCode = finalReport?.ok ? 0 : 1;
console.log(`EXIT:${process.exitCode}`);
