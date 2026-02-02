import "dotenv/config";

import crypto from "node:crypto";

import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import Organization from "../src/models/Organization.model.js";
import OrganizationMember from "../src/models/OrganizationMember.model.js";
import User from "../src/models/User.model.js";
import { signToken } from "../src/utils/jwt.js";

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

async function cleanup({ adminUserId, userId, orgId }) {
    try {
        if (orgId) {
            await OrganizationMember.deleteMany({ orgId });
            await Organization.deleteOne({ _id: orgId });
        }
    } catch {
        // ignore
    }

    try {
        if (userId) await User.deleteOne({ _id: userId });
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
    await connectDB(process.env.MONGO_URI);

    assert(
        typeof process.env.JWT_SECRET === "string" &&
            process.env.JWT_SECRET.trim(),
        "Missing JWT_SECRET in env",
    );

    // Ensure indexes exist for duplicate checks.
    await Promise.all([Organization.init(), OrganizationMember.init()]);

    const server = await listen(app);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const created = {
        adminUserId: null,
        userId: null,
        orgId: null,
        memberId: null,
    };

    const checks = {
        orgCreateOk: false,
        orgSlugUnique409: false,
        addMemberOk: false,
        addMemberDup409: false,
        listMembersOk: false,
        deleteMember204: false,
        listMembersAfterDeleteOk: false,
    };

    const statuses = {};

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

        // Create a normal user (member target)
        const userEmail = `sanity-user-${Date.now()}-${randomHex()}@example.com`;
        const user = await User.create({
            email: userEmail,
            passwordHash: "sanity",
            role: "user",
        });
        created.userId = String(user._id);

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

        // 3) Add member by email
        assert(created.orgId, "Missing created org id");
        const memberCreate = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members`,
            method: "POST",
            headers: authHeaders,
            body: { email: userEmail, role: "member" },
        });

        statuses.memberCreate = {
            status: memberCreate.status,
            code: memberCreate.body?.code || null,
            id: memberCreate.body?.id || null,
        };

        checks.addMemberOk =
            memberCreate.status === 201 && Boolean(memberCreate.body?.id);
        created.memberId = memberCreate.body?.id || null;

        // 4) Duplicate member => 409
        const memberDup = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members`,
            method: "POST",
            headers: authHeaders,
            body: { email: userEmail },
        });

        statuses.memberDuplicate = {
            status: memberDup.status,
            code: memberDup.body?.code || null,
        };

        checks.addMemberDup409 =
            memberDup.status === 409 &&
            memberDup.body?.code === "MEMBER_EXISTS";

        // 5) List members
        const list1 = await requestJson({
            baseUrl,
            path: `/admin/orgs/${created.orgId}/members?page=1&limit=10`,
            method: "GET",
            headers: authHeaders,
        });

        statuses.listMembers = {
            status: list1.status,
            total: list1.body?.total ?? null,
        };

        checks.listMembersOk =
            isOk(list1.status) && Array.isArray(list1.body?.items);

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
            await cleanup(created);
        } catch {
            // ignore
        }

        await new Promise((resolve) => server.close(() => resolve()));
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
