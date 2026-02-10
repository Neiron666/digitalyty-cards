import "dotenv/config";

import crypto from "node:crypto";

import mongoose from "mongoose";

// Node 22 treats unhandled rejections as fatal by default.
// Mongoose index creation can reject during startup if DB indexes are out of sync.
// For sanity scripts, catch and proceed after repairing indexes.
process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection", reason);
    process.exitCode = 1;
});

console.log("sanity-org-access:script-start");

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function randomHex(bytes = 6) {
    return crypto.randomBytes(bytes).toString("hex");
}

function extractTokenFromInviteLink(inviteLink) {
    if (typeof inviteLink !== "string" || !inviteLink.trim()) return "";
    const raw = inviteLink.trim();

    try {
        const u = new URL(raw);
        return String(u.searchParams.get("token") || "").trim();
    } catch {
        // Fallback for unexpected non-absolute URLs.
        const m = raw.match(/[?&]token=([^&]+)/i);
        if (!m) return "";
        try {
            return decodeURIComponent(String(m[1] || "")).trim();
        } catch {
            return String(m[1] || "").trim();
        }
    }
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

async function requestText({ url, method, headers }) {
    const res = await fetch(url, {
        method: method || "GET",
        headers: { ...(headers || {}) },
    });
    const text = await res.text();
    return { status: res.status, text };
}

const SANITY_INVITE_PASSWORD = "Sanity#Pass12345";

async function getCardIndexDebt(Card) {
    try {
        const indexes = await Card.collection.indexes();
        const hasOrgUser = (indexes || []).some(
            (i) =>
                i?.name === "orgId_1_user_1" &&
                i?.unique === true &&
                i?.key?.orgId === 1 &&
                i?.key?.user === 1,
        );

        if (hasOrgUser) return null;

        return {
            missing: ["orgId_1_user_1"],
            message:
                "INDEX_DEBT: Missing required Card index orgId_1_user_1 (unique on {orgId:1,user:1}). Sanity is read-only and will not create indexes.",
        };
    } catch (e) {
        return {
            missing: ["orgId_1_user_1"],
            message: `INDEX_DEBT: Failed to list Card indexes: ${String(e?.message || e)}`,
        };
    }
}

async function cleanup(
    models,
    { adminUserId, userId, userEmail, otherUserId, orgId },
) {
    const { Card, Organization, OrganizationMember, User } = models;

    let resolvedUserId = userId || null;
    try {
        if (!resolvedUserId && userEmail) {
            const u = await User.findOne({ email: userEmail })
                .select("_id")
                .lean();
            resolvedUserId = u?._id || null;
        }

        const userIds = [resolvedUserId, otherUserId].filter(Boolean);
        if (userIds.length) {
            await Card.deleteMany({ user: { $in: userIds } });
        }
    } catch {
        // ignore
    }

    try {
        if (orgId) {
            await OrganizationMember.deleteMany({ orgId });
            await Organization.deleteOne({ _id: orgId });
        }
    } catch {
        // ignore
    }

    try {
        if (resolvedUserId) {
            await User.deleteOne({ _id: resolvedUserId });
        } else if (userEmail) {
            await User.deleteOne({ email: String(userEmail || "") });
        }
    } catch {
        // ignore
    }

    try {
        if (otherUserId) await User.deleteOne({ _id: otherUserId });
    } catch {
        // ignore
    }

    try {
        if (adminUserId) await User.deleteOne({ _id: adminUserId });
    } catch {
        // ignore
    }
}

async function main() {
    // Avoid background autoIndex races/conflicts in sanity scripts.
    // Use explicit connect option (more reliable than global set() for this script).
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    // IMPORTANT: app/models must be imported only after disabling autoIndex.
    // Static ESM imports run before this function body and can schedule index builds.
    const [
        { default: app },
        { default: Card },
        { default: Organization },
        { default: OrganizationMember },
        { default: User },
        { signToken },
    ] = await Promise.all([
        import("../src/app.js"),
        import("../src/models/Card.model.js"),
        import("../src/models/Organization.model.js"),
        import("../src/models/OrganizationMember.model.js"),
        import("../src/models/User.model.js"),
        import("../src/utils/jwt.js"),
    ]);

    const models = { Card, Organization, OrganizationMember, User };

    // Ensure Mongoose doesn't try to auto-create Card indexes at connect time.
    // Sanity scripts are read-only w.r.t. index governance.
    Card.schema.set("autoIndex", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });
    console.log("MongoDB connected");

    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    await Promise.all([Organization.init(), OrganizationMember.init()]);

    const statuses = {};
    statuses.indexDebt = await getCardIndexDebt(Card);
    if (statuses.indexDebt) {
        console.log(JSON.stringify({ ok: false, statuses }, null, 2));
        assert(false, statuses.indexDebt.message);
    }

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        adminUserId: null,
        userId: null,
        userEmail: null,
        otherUserId: null,
        orgId: null,
        memberId: null,
        orgSlug: null,
        orgCardId: null,
    };

    const checks = {
        mineIsPersonalPath: false,
        nonMemberOrgCard404: false,
        memberGetsOrgCard: false,
        publishPatchDtoPublicPathIsOrg: false,
        publishPatchDtoOgPathIsOrg: false,
        patchSaveDtoPublicPathIsOrg: false,
        patchSaveDtoOgPathIsOrg: false,
        revokeBlocksOrgWrites404: false,
    };

    // statuses already initialized above (includes indexDebt)

    try {
        // Admin user + JWT
        const adminEmail = `sanity-admin-${Date.now()}-${randomHex()}@example.com`;
        const admin = await User.create({
            email: adminEmail,
            passwordHash: "sanity",
            role: "admin",
        });
        created.adminUserId = String(admin._id);
        const adminToken = signToken(String(admin._id));
        const adminHeaders = { Authorization: `Bearer ${adminToken}` };

        // Member user email MUST be new-user flow (sanity must not hit INVITE_LOGIN_REQUIRED)
        const userEmail = `sanity+${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}@example.test`;
        created.userEmail = userEmail;
        let userHeaders = null;

        // Non-member user + JWT
        const otherEmail = `sanity-user2-${Date.now()}-${randomHex()}@example.com`;
        const other = await User.create({
            email: otherEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.otherUserId = String(other._id);
        const otherToken = signToken(String(other._id));
        const otherHeaders = { Authorization: `Bearer ${otherToken}` };

        // Create org
        const orgSlug = `sanity-org-${randomHex(4)}`;
        created.orgSlug = orgSlug;
        const orgCreate = await requestJson({
            baseUrl,
            path: "/admin/orgs",
            method: "POST",
            headers: adminHeaders,
            body: { name: "Sanity Org", slug: orgSlug, note: "sanity" },
        });

        statuses.orgCreate = {
            status: orgCreate.status,
            code: orgCreate.body?.code || null,
            id: orgCreate.body?.id || null,
        };

        assert(orgCreate.status === 201, "Failed to create org");
        created.orgId = orgCreate.body?.id || null;
        assert(created.orgId, "Missing org id");

        // Add member via invite + public accept (sanity must not depend on direct-add)
        const inviteCreate = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/invites`,
            method: "POST",
            headers: adminHeaders,
            body: { email: userEmail, role: "member" },
        });

        statuses.inviteCreate = {
            status: inviteCreate.status,
            code: inviteCreate.body?.code || null,
            inviteId: inviteCreate.body?.inviteId || null,
        };

        assert(inviteCreate.status === 201, "Failed to create invite");
        const inviteLink =
            typeof inviteCreate.body?.inviteLink === "string"
                ? inviteCreate.body.inviteLink
                : "";
        const tokenFromLink = extractTokenFromInviteLink(inviteLink);
        assert(tokenFromLink, "Missing invite token");

        const inviteAccept = await requestJson({
            baseUrl,
            path: "/invites/accept",
            method: "POST",
            body: { token: tokenFromLink, password: SANITY_INVITE_PASSWORD },
        });

        statuses.inviteAccept = {
            status: inviteAccept.status,
            hasJwt: typeof inviteAccept.body?.token === "string",
        };

        assert(
            inviteAccept.status === 200,
            `Failed to accept invite: status=${inviteAccept.status}`,
        );
        assert(
            typeof inviteAccept.body?.token === "string" &&
                inviteAccept.body.token.trim(),
            "Missing JWT from invite accept",
        );

        const userJwt = String(inviteAccept.body.token);
        userHeaders = { Authorization: `Bearer ${userJwt}` };

        const listMembers = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members?page=1&limit=50`,
            method: "GET",
            headers: adminHeaders,
        });

        statuses.listMembers = {
            status: listMembers.status,
            total: listMembers.body?.total ?? null,
        };

        const items = Array.isArray(listMembers.body?.items)
            ? listMembers.body.items
            : [];
        const member = items.find((m) => m?.email === userEmail) || null;
        created.memberId = member?.id || null;

        if (!created.memberId) {
            const emailsSample = items
                .map((m) => String(m?.email || "").trim())
                .filter(Boolean)
                .slice(0, 10);
            statuses.createdMemberLookup = {
                wantedEmail: userEmail,
                total: listMembers.body?.total ?? null,
                itemsCount: items.length,
                emailsSample,
            };
        }
        assert(created.memberId, "Missing member id");

        // Ensure personal card exists for member user
        const personalCreate = await requestJson({
            baseUrl,
            path: "/cards",
            method: "POST",
            headers: userHeaders,
            body: {},
        });

        statuses.personalCreate = {
            status: personalCreate.status,
            id: personalCreate.body?._id || null,
        };

        assert(
            personalCreate.status === 200 || personalCreate.status === 201,
            "Failed to create personal card",
        );

        // (1) /cards/mine must always be personal path
        const mine = await requestJson({
            baseUrl,
            path: "/cards/mine",
            method: "GET",
            headers: userHeaders,
        });

        statuses.mine = {
            status: mine.status,
            publicPath: mine.body?.publicPath || null,
        };

        checks.mineIsPersonalPath =
            mine.status === 200 &&
            typeof mine.body?.publicPath === "string" &&
            mine.body.publicPath.startsWith("/card/");

        // (2) Non-member must not resolve org card via user surface
        const nonMemberOrgCard = await requestJson({
            baseUrl,
            path: `/orgs/${orgSlug}/cards/mine`,
            method: "GET",
            headers: otherHeaders,
        });

        statuses.nonMemberOrgCard = {
            status: nonMemberOrgCard.status,
            message: nonMemberOrgCard.body?.message || null,
        };

        checks.nonMemberOrgCard404 = nonMemberOrgCard.status === 404;

        // (3) Member gets/creates org card (idempotent)
        const orgCard1 = await requestJson({
            baseUrl,
            path: `/orgs/${orgSlug}/cards/mine`,
            method: "GET",
            headers: userHeaders,
        });

        statuses.orgCard1 = {
            status: orgCard1.status,
            id: orgCard1.body?._id || null,
            publicPath: orgCard1.body?.publicPath || null,
        };

        created.orgCardId = orgCard1.body?._id || null;

        const orgCardSlugFromDto = String(orgCard1.body?.slug || "").trim();
        const orgCardPath = String(orgCard1.body?.publicPath || "");
        const orgCardSlugFromPath = orgCardPath.startsWith(`/c/${orgSlug}/`)
            ? String(orgCardPath.slice(`/c/${orgSlug}/`.length))
                  .split(/[/?#]/)[0]
                  .trim()
            : "";
        const orgCardSlug = orgCardSlugFromPath || orgCardSlugFromDto || "";

        statuses.orgCardSlug = orgCardSlug || null;

        checks.memberGetsOrgCard =
            orgCard1.status === 200 &&
            Boolean(created.orgCardId) &&
            typeof orgCard1.body?.publicPath === "string" &&
            orgCard1.body.publicPath.startsWith(`/c/${orgSlug}/`);

        const orgCard2 = await requestJson({
            baseUrl,
            path: `/orgs/${orgSlug}/cards/mine`,
            method: "GET",
            headers: userHeaders,
        });

        statuses.orgCard2 = {
            status: orgCard2.status,
            id: orgCard2.body?._id || null,
        };

        assert(
            String(orgCard2.body?._id || "") ===
                String(created.orgCardId || ""),
            "Org card must be idempotent (same card id)",
        );

        // Draft save PATCH (contract check): ensure PATCH /cards/:id returns org-scoped publicPath/ogPath.
        // IMPORTANT: do this BEFORE publish so we test the normal draft save path.
        const patchSave = await requestJson({
            baseUrl,
            path: `/cards/${created.orgCardId}`,
            method: "PATCH",
            headers: userHeaders,
            body: { seo: { title: "sanity-save-patch" } },
        });

        const expectedOrgPublicPathSave = `/c/${String(created.orgSlug || "")}/${String(statuses.orgCardSlug || "")}`;
        const expectedOrgOgPathSave = `/og/c/${String(created.orgSlug || "")}/${String(statuses.orgCardSlug || "")}`;

        statuses.patchSave = {
            status: patchSave.status,
            publicPath: patchSave.body?.publicPath ?? null,
            ogPath: patchSave.body?.ogPath ?? null,
            expectedPublicPath: expectedOrgPublicPathSave,
            expectedOgPath: expectedOrgOgPathSave,
        };

        checks.patchSaveDtoPublicPathIsOrg =
            patchSave.body?.publicPath === expectedOrgPublicPathSave;
        checks.patchSaveDtoOgPathIsOrg =
            patchSave.body?.ogPath === expectedOrgOgPathSave;

        // Publish org card so it becomes publicly resolvable by /c/:orgSlug/:slug and OG.
        assert(orgCardSlug, "Missing org card slug");
        const publish = await requestJson({
            baseUrl,
            path: `/cards/${created.orgCardId}`,
            method: "PATCH",
            headers: userHeaders,
            body: {
                status: "published",
                business: { name: "Sanity Biz" },
                design: { templateId: "classic" },
            },
        });

        statuses.publish = {
            status: publish.status,
            cardStatus: publish.body?.status || null,
            publishError: publish.body?.publishError || null,
        };

        const expectedOrgPublicPath = `/c/${String(created.orgSlug || "")}/${String(statuses.orgCardSlug || "")}`;
        const expectedOrgOgPath = `/og/c/${String(created.orgSlug || "")}/${String(statuses.orgCardSlug || "")}`;

        checks.publishPatchDtoPublicPathIsOrg =
            publish.body?.publicPath === expectedOrgPublicPath;
        checks.publishPatchDtoOgPathIsOrg =
            publish.body?.ogPath === expectedOrgOgPath;

        statuses.publish.publicPath = publish.body?.publicPath ?? null;
        statuses.publish.ogPath = publish.body?.ogPath ?? null;
        statuses.publish.expectedPublicPath = expectedOrgPublicPath;
        statuses.publish.expectedOgPath = expectedOrgOgPath;

        assert(publish.status === 200, "Failed to publish org card");
        assert(
            publish.body?.status === "published" && !publish.body?.publishError,
            "Org card must be published for public surface checks",
        );

        const serverBaseUrl = `http://127.0.0.1:${port}`;
        const publicPath = `/c/${orgSlug}/${orgCardSlug}`;
        const ogPath = `/og/c/${orgSlug}/${orgCardSlug}`;

        // Public surface checks while membership is active.
        const publicResolveActive = await requestJson({
            baseUrl,
            path: publicPath,
            method: "GET",
        });

        statuses.publicResolveActive = {
            status: publicResolveActive.status,
            publicPath: publicResolveActive.body?.publicPath || null,
        };

        const ogActive = await requestText({
            url: `${serverBaseUrl}${ogPath}`,
        });

        statuses.ogActive = {
            status: ogActive.status,
        };

        const sitemapActive = await requestText({
            url: `${serverBaseUrl}/sitemap.xml`,
        });

        const sitemapContainsBefore =
            sitemapActive.status === 200 &&
            String(sitemapActive.text || "").includes(publicPath);

        statuses.sitemapActive = {
            status: sitemapActive.status,
            containsOrgUrl: sitemapContainsBefore,
            sample: sitemapContainsBefore
                ? publicPath
                : String(sitemapActive.text || "").slice(0, 160),
        };

        assert(
            publicResolveActive.status === 200,
            "Public org resolve must be 200 for active membership",
        );
        assert(
            ogActive.status === 200,
            "OG org route must be 200 for active membership",
        );
        assert(
            sitemapContainsBefore,
            "sitemap.xml must include org card URL for active membership",
        );

        // Revoke membership via admin
        const revoke = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members/${created.memberId}`,
            method: "PATCH",
            headers: adminHeaders,
            body: { status: "inactive" },
        });

        statuses.revoke = {
            status: revoke.status,
            code: revoke.body?.code || null,
        };

        assert(revoke.status === 200, "Failed to revoke membership");

        // Public surfaces must become anti-enum 404 after revocation (no 410/other signals).
        const publicResolveRevoked = await requestJson({
            baseUrl,
            path: publicPath,
            method: "GET",
        });

        statuses.publicResolveRevoked = {
            status: publicResolveRevoked.status,
        };

        const ogRevoked = await requestText({
            url: `${serverBaseUrl}${ogPath}`,
        });

        statuses.ogRevoked = {
            status: ogRevoked.status,
        };

        const sitemapRevoked = await requestText({
            url: `${serverBaseUrl}/sitemap.xml`,
        });

        const sitemapContainsAfter =
            sitemapRevoked.status === 200 &&
            String(sitemapRevoked.text || "").includes(publicPath);

        statuses.sitemapRevoked = {
            status: sitemapRevoked.status,
            containsOrgUrl: sitemapContainsAfter,
            sample: sitemapContainsAfter
                ? publicPath
                : String(sitemapRevoked.text || "").slice(0, 160),
        };

        assert(
            publicResolveRevoked.status === 404,
            "Public org resolve must be 404 after revocation (anti-enum)",
        );
        assert(
            ogRevoked.status === 404,
            "OG org route must be 404 after revocation (anti-enum)",
        );
        assert(
            !sitemapContainsAfter,
            "sitemap.xml must not include org card URL after revocation",
        );

        // Attempt write after revocation => 404
        const patchAfterRevoke = await requestJson({
            baseUrl,
            path: `/cards/${created.orgCardId}`,
            method: "PATCH",
            headers: userHeaders,
            body: { business: { name: "Should not write" } },
        });

        statuses.patchAfterRevoke = {
            status: patchAfterRevoke.status,
            message: patchAfterRevoke.body?.message || null,
        };

        checks.revokeBlocksOrgWrites404 = patchAfterRevoke.status === 404;

        const ok = Object.values(checks).every(Boolean);
        console.log(
            JSON.stringify(
                {
                    ok,
                    checks,
                    statuses,
                    created: {
                        orgSlug: created.orgSlug,
                    },
                },
                null,
                2,
            ),
        );

        assert(ok, "sanity-org-access failed");
    } finally {
        await cleanup(models, created);
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }

        try {
            await new Promise((resolve) => server.close(() => resolve()));
        } catch {
            // ignore
        }
    }
}

(async () => {
    // Verification discipline: always print explicit exit code.
    process.exitCode = 0;
    try {
        await main();
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        const code = Number.isFinite(Number(process.exitCode))
            ? Number(process.exitCode)
            : 0;
        console.log(`EXIT:${code}`);
    }
})();
