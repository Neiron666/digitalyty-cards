import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { buildOwnerPaymentContext } from "../src/controllers/card.controller.js";

const SENTINEL = "5f000000000000000000abcd"; // canonical personalOrgId sentinel
const REAL_ORG = "5f000000000000000000ffff";
const NOW = new Date("2026-09-10T00:00:00.000Z");

// ── PERSONAL ─────────────────────────────────────────────────────────────────

test("null/missing orgId is personal scope with no organization payload", () => {
    const ctx = buildOwnerPaymentContext({
        card: {},
        personalOrgId: SENTINEL,
        org: null,
        now: NOW,
    });
    assert.deepEqual(ctx, { scope: "personal", organization: null });
});

test("personal sentinel orgId is personal scope", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: SENTINEL },
        personalOrgId: SENTINEL,
        org: null,
        now: NOW,
    });
    assert.deepEqual(ctx, { scope: "personal", organization: null });
});

// ── REAL_ORG ─────────────────────────────────────────────────────────────────

test("non-personal orgId is organization scope", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: { isActive: true, orgEntitlement: undefined },
        now: NOW,
    });
    assert.equal(ctx.scope, "organization");
});

test("active org entitlement with future expiry -> currentlyActive=true", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: {
            isActive: true,
            orgEntitlement: {
                status: "active",
                plan: "org",
                expiresAt: "2027-06-10T00:00:00.000Z",
            },
        },
        now: NOW,
    });
    assert.deepEqual(ctx, {
        scope: "organization",
        organization: {
            status: "active",
            plan: "org",
            expiresAt: "2027-06-10T00:00:00.000Z",
            currentlyActive: true,
        },
    });
});

test("active raw status with past expiry -> currentlyActive=false, status still active", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: {
            isActive: true,
            orgEntitlement: {
                status: "active",
                plan: "org",
                expiresAt: "2020-01-01T00:00:00.000Z",
            },
        },
        now: NOW,
    });
    assert.equal(ctx.scope, "organization");
    assert.equal(ctx.organization.status, "active");
    assert.equal(ctx.organization.currentlyActive, false);
    assert.equal(ctx.organization.expiresAt, "2020-01-01T00:00:00.000Z");
});

test("revoked entitlement -> organization scope, currentlyActive=false", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: {
            isActive: true,
            orgEntitlement: {
                status: "revoked",
                plan: "org",
                expiresAt: "2027-06-10T00:00:00.000Z",
            },
        },
        now: NOW,
    });
    assert.equal(ctx.scope, "organization");
    assert.equal(ctx.organization.status, "revoked");
    assert.equal(ctx.organization.currentlyActive, false);
});

test("missing/none entitlement -> organization scope, currentlyActive=false, status=none", () => {
    const ctxMissing = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: { isActive: true },
        now: NOW,
    });
    assert.equal(ctxMissing.scope, "organization");
    assert.equal(ctxMissing.organization.status, "none");
    assert.equal(ctxMissing.organization.currentlyActive, false);

    const ctxNone = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: { isActive: true, orgEntitlement: { status: "none" } },
        now: NOW,
    });
    assert.equal(ctxNone.organization.status, "none");
    assert.equal(ctxNone.organization.currentlyActive, false);
});

test("unresolved personalOrgId with non-null orgId follows existing fail-closed REAL_ORG semantics", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: null,
        org: null,
        now: NOW,
    });
    assert.equal(ctx.scope, "organization");
    assert.deepEqual(ctx.organization, {
        status: "none",
        plan: null,
        expiresAt: null,
        currentlyActive: false,
    });
});

// ── PRIVACY ──────────────────────────────────────────────────────────────────

test("owner context never leaks internal admin/audit entitlement metadata", () => {
    const ctx = buildOwnerPaymentContext({
        card: { orgId: REAL_ORG },
        personalOrgId: SENTINEL,
        org: {
            isActive: true,
            orgEntitlement: {
                status: "active",
                plan: "org",
                expiresAt: "2027-06-10T00:00:00.000Z",
                source: "admin-manual",
                paymentReference: "ref-123",
                adminNote: "internal note",
                grantedByUserId: "5f000000000000000000aaaa",
                grantedAt: NOW,
                lastModifiedByUserId: "5f000000000000000000bbbb",
                lastModifiedAt: NOW,
            },
        },
        now: NOW,
    });

    const keys = Object.keys(ctx.organization);
    assert.deepEqual(
        keys.sort(),
        ["currentlyActive", "expiresAt", "plan", "status"].sort(),
    );
    for (const forbidden of [
        "source",
        "paymentReference",
        "adminNote",
        "grantedByUserId",
        "grantedAt",
        "lastModifiedByUserId",
        "lastModifiedAt",
    ]) {
        assert.equal(
            Object.prototype.hasOwnProperty.call(ctx.organization, forbidden),
            false,
        );
    }
});

test("public card DTO handlers do not reference ownerPaymentContext", () => {
    const controllerPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../src/controllers/card.controller.js",
    );
    const source = readFileSync(controllerPath, "utf8");

    function extractFunctionBody(fnName) {
        const start = source.indexOf(`export async function ${fnName}(`);
        assert.ok(start >= 0, `${fnName} not found`);
        const nextExportIdx = source.indexOf("\nexport ", start + 1);
        return source.slice(
            start,
            nextExportIdx === -1 ? source.length : nextExportIdx,
        );
    }

    for (const fnName of ["getCardBySlug", "getCompanyCardByOrgSlugAndSlug"]) {
        const body = extractFunctionBody(fnName);
        assert.equal(
            body.includes("ownerPaymentContext"),
            false,
            `${fnName} must not reference ownerPaymentContext`,
        );
    }
});

test("claimCard preserves toJSON() wire semantics (not toObject()) for the additive ownerPaymentContext response", () => {
    const controllerPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../src/controllers/card.controller.js",
    );
    const source = readFileSync(controllerPath, "utf8");

    const start = source.indexOf("export async function claimCard(");
    assert.ok(start >= 0, "claimCard not found");
    const body = source.slice(start);

    assert.equal(
        body.includes("result.card.toJSON"),
        true,
        "claimCard must use result.card.toJSON() for wire-shape parity with the prior res.json(result.card) behavior",
    );
    assert.equal(
        body.includes("result.card.toObject"),
        false,
        "claimCard must not use result.card.toObject() (not wire-shape equivalent to the prior res.json(result.card) serialization)",
    );
});

// ── CONTINUITY ───────────────────────────────────────────────────────────────

test("organization scope context is identical across load (getOrCreateMyOrgCard-shaped) and post-save (updateCard-shaped) inputs", () => {
    const card = { orgId: REAL_ORG };
    const org = {
        isActive: true,
        orgEntitlement: {
            status: "active",
            plan: "org",
            expiresAt: "2027-06-10T00:00:00.000Z",
        },
    };

    const onLoad = buildOwnerPaymentContext({
        card,
        personalOrgId: SENTINEL,
        org,
        now: NOW,
    });
    const afterSave = buildOwnerPaymentContext({
        card,
        personalOrgId: SENTINEL,
        org,
        now: NOW,
    });

    assert.deepEqual(onLoad, afterSave);
    assert.equal(onLoad.scope, "organization");
    assert.equal(onLoad.organization.currentlyActive, true);
});

test("personal scope context is identical across getMyCard-shaped and updateCard-shaped inputs", () => {
    const card = { orgId: SENTINEL };

    const onLoad = buildOwnerPaymentContext({
        card,
        personalOrgId: SENTINEL,
        org: null,
        now: NOW,
    });
    const afterSave = buildOwnerPaymentContext({
        card,
        personalOrgId: SENTINEL,
        org: null,
        now: NOW,
    });

    assert.deepEqual(onLoad, { scope: "personal", organization: null });
    assert.deepEqual(afterSave, { scope: "personal", organization: null });
});
