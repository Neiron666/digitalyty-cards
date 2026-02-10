import "dotenv/config";

import crypto from "node:crypto";

import mongoose from "mongoose";

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

function isOk(status) {
    return status >= 200 && status < 300;
}

const SANITY_INVITE_PASSWORD = "Sanity#Pass12345";

async function getOrgMembershipIndexDebt(OrganizationMember) {
    try {
        const indexes = await OrganizationMember.collection.indexes();
        const hasOrgUser = (indexes || []).some(
            (i) =>
                i?.name === "orgId_1_userId_1" &&
                i?.unique === true &&
                i?.key?.orgId === 1 &&
                i?.key?.userId === 1,
        );

        if (hasOrgUser) return null;

        return {
            missing: ["orgId_1_userId_1"],
            message:
                "INDEX_DEBT: Missing required OrganizationMember index orgId_1_userId_1 (unique on {orgId:1,userId:1}). Sanity is read-only and will not create indexes.",
        };
    } catch (e) {
        return {
            missing: ["orgId_1_userId_1"],
            message: `INDEX_DEBT: Failed to list OrganizationMember indexes: ${String(e?.message || e)}`,
        };
    }
}

async function cleanup(models, { adminUserId, userId, userEmail, orgId }) {
    const { Card, Organization, OrganizationMember, User } = models;
    try {
        if (orgId) {
            await OrganizationMember.deleteMany({ orgId });
            await Organization.deleteOne({ _id: orgId });
        }
    } catch {
        // ignore
    }

    try {
        let resolvedUserId = userId || null;
        if (!resolvedUserId && userEmail) {
            const u = await User.findOne({ email: userEmail })
                .select("_id")
                .lean();
            resolvedUserId = u?._id || null;
        }

        if (resolvedUserId) {
            await Card.deleteMany({ user: resolvedUserId });
            await User.deleteOne({ _id: resolvedUserId });
        }
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
    // Must be set BEFORE importing app/models.
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

    // Defense-in-depth: ensure Mongoose doesn't try to auto-create indexes.
    Organization.schema.set("autoIndex", false);
    OrganizationMember.schema.set("autoIndex", false);

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

    const statuses = {};
    statuses.indexDebt = await getOrgMembershipIndexDebt(OrganizationMember);
    if (statuses.indexDebt) {
        console.log(
            JSON.stringify(
                {
                    ok: false,
                    baseUrl: null,
                    checks: null,
                    statuses,
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
        return;
    }

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        adminUserId: null,
        userId: null,
        userEmail: null,
        orgId: null,
        memberId: null,
    };

    const checks = {
        orgCreateOk: false,
        orgSlugUnique409: false,
        addMemberOk: false,
        addMemberDupAccept404: false,
        listMembersOk: false,
        deleteMember204: false,
        listMembersAfterDeleteOk: false,
    };

    // statuses already initialized above (includes indexDebt)

    try {
        // Create admin user and JWT
        const adminEmail = `sanity-admin-${Date.now()}-${randomHex()}@example.com`;
        const admin = await User.create({
            email: adminEmail,
            passwordHash: "sanity",
            role: "admin",
        });
        created.adminUserId = String(admin._id);

        const token = signToken(String(admin._id));
        const authHeaders = { Authorization: `Bearer ${token}` };

        // Member target email MUST be new-user flow (sanity must not hit INVITE_LOGIN_REQUIRED)
        const userEmail = `sanity+${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}@example.test`;
        created.userEmail = userEmail;

        // 1) Create org
        const orgSlug = `sanity-org-${randomHex(4)}`;
        const orgCreate = await requestJson({
            baseUrl,
            path: "/admin/orgs",
            method: "POST",
            headers: authHeaders,
            body: { name: "Sanity Org", slug: orgSlug, note: "sanity" },
        });

        statuses.orgCreate = {
            status: orgCreate.status,
            code: orgCreate.body?.code || null,
            id: orgCreate.body?.id || null,
        };

        checks.orgCreateOk =
            orgCreate.status === 201 && Boolean(orgCreate.body?.id);
        created.orgId = orgCreate.body?.id || null;

        // 2) Duplicate slug => 409
        const orgDup = await requestJson({
            baseUrl,
            path: "/admin/orgs",
            method: "POST",
            headers: authHeaders,
            body: { name: "Sanity Org 2", slug: orgSlug },
        });

        statuses.orgSlugDuplicate = {
            status: orgDup.status,
            code: orgDup.body?.code || null,
        };

        checks.orgSlugUnique409 =
            orgDup.status === 409 && orgDup.body?.code === "ORG_SLUG_TAKEN";

        // 3) Add member via invite + public accept (sanity must not depend on direct-add)
        assert(created.orgId, "Missing created org id");
        const inviteCreate = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/invites`,
            method: "POST",
            headers: authHeaders,
            body: { email: userEmail, role: "member" },
        });

        statuses.inviteCreate = {
            status: inviteCreate.status,
            code: inviteCreate.body?.code || null,
            inviteId: inviteCreate.body?.inviteId || null,
        };

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
            body: inviteAccept.body || null,
        };

        assert(
            inviteAccept.status === 200,
            `Failed to accept invite: status=${inviteAccept.status}`,
        );

        checks.addMemberOk =
            inviteCreate.status === 201 &&
            inviteAccept.status === 200 &&
            typeof inviteAccept.body?.token === "string";

        // 4) Duplicate accept should not create extra membership (token is single-use).
        // Hardening: accept may return different non-2xx codes across implementations.
        const inviteAcceptDup = await requestJson({
            baseUrl,
            path: "/invites/accept",
            method: "POST",
            body: { token: tokenFromLink },
        });

        statuses.inviteAcceptDuplicate = {
            status: inviteAcceptDup.status,
            message: inviteAcceptDup.body?.message || null,
        };

        checks.addMemberDupAccept404 = !isOk(inviteAcceptDup.status);

        // 5) List members
        const list1 = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members?page=1&limit=50`,
            method: "GET",
            headers: authHeaders,
        });

        statuses.listMembers = {
            status: list1.status,
            total: list1.body?.total ?? null,
        };

        checks.listMembersOk =
            isOk(list1.status) && Array.isArray(list1.body?.items);

        const items = Array.isArray(list1.body?.items) ? list1.body.items : [];
        const createdMember = items.find((m) => m?.email === userEmail) || null;
        created.memberId = createdMember?.id || null;

        if (!created.memberId) {
            const emailsSample = items
                .map((m) => String(m?.email || "").trim())
                .filter(Boolean)
                .slice(0, 10);
            statuses.createdMemberLookup = {
                wantedEmail: userEmail,
                total: list1.body?.total ?? null,
                itemsCount: items.length,
                emailsSample,
            };
        }

        // 6) Delete member
        assert(created.memberId, "Missing created member id");
        const del = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members/${created.memberId}`,
            method: "DELETE",
            headers: authHeaders,
        });

        statuses.deleteMember = { status: del.status };
        checks.deleteMember204 = del.status === 204;

        // 7) List members after delete
        const list2 = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members?page=1&limit=10`,
            method: "GET",
            headers: authHeaders,
        });

        statuses.listMembersAfterDelete = {
            status: list2.status,
            total: list2.body?.total ?? null,
        };

        checks.listMembersAfterDeleteOk =
            isOk(list2.status) && Array.isArray(list2.body?.items);

        const ok = Object.values(checks).every(Boolean);

        console.log(
            JSON.stringify(
                {
                    ok,
                    baseUrl,
                    checks,
                    statuses,
                },
                null,
                2,
            ),
        );

        if (!ok) process.exitCode = 1;
    } finally {
        try {
            await cleanup(models, created);
        } catch {
            // ignore
        }

        try {
            await new Promise((resolve) => server.close(() => resolve()));
        } catch {
            // ignore
        }

        try {
            await mongoose.disconnect();
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
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        const code = Number.isFinite(Number(process.exitCode))
            ? Number(process.exitCode)
            : 0;
        console.log(`EXIT:${code}`);
    }
})();
