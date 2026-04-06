/**
 * bootstrap-first-admin.mjs
 *
 * Promotes an existing registered user to the admin role on a fresh cluster.
 * This is the ONLY safe production path for first-admin bootstrap.
 *
 * Precondition:
 *   The user must already exist (registered via /api/auth/register).
 *   This script does NOT create users, reset passwords, or issue tokens.
 *
 * Usage:
 *   node scripts/bootstrap-first-admin.mjs --email=user@example.com           (dry-run)
 *   node scripts/bootstrap-first-admin.mjs --email=user@example.com --apply   (apply)
 *
 * Governance rules:
 *   - Requires --apply flag for writes (dry-run by default - safe to inspect first).
 *   - Idempotent: re-run is safe if user is already admin.
 *   - Writes only: role="admin", isVerified=true - no other fields touched.
 *   - Post-check re-reads from DB to confirm the write.
 *   - No JWT is issued. The admin must login via the normal /api/auth/login flow.
 *   - Full audit: prints before/after state for operator record.
 */

import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

// ── Arg parsing ──────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        dryRun: true,
        email: null,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token.startsWith("--email="))
            args.email = token.slice("--email=".length).trim();
    }

    return args;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    if (!args.email) {
        console.error(
            "Usage: node scripts/bootstrap-first-admin.mjs --email=<email> [--apply]",
        );
        console.error(
            "  --apply   required to apply the write (default: dry-run)",
        );
        process.exitCode = 1;
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    const emailNormalized = args.email.trim().toLowerCase();

    console.log(`mode:  ${args.dryRun ? "DRY-RUN" : "APPLY"}`);
    console.log(`email: ${emailNormalized}`);

    await connectDB(process.env.MONGO_URI);

    // Access the users collection directly - no model import to avoid any
    // unexpected schema-level side effects (e.g. virtual validators).
    const users = mongoose.connection.db.collection("users");

    const user = await users.findOne(
        { email: emailNormalized },
        { projection: { email: 1, role: 1, isVerified: 1, createdAt: 1 } },
    );

    if (!user) {
        console.error(`\nERROR: no user found with email "${emailNormalized}"`);
        console.error(
            "Register the user first via /api/auth/register, then re-run this script.",
        );
        process.exitCode = 2;
        return;
    }

    console.log("\ncurrent state:");
    console.log(`  _id:        ${user._id}`);
    console.log(`  email:      ${user.email}`);
    console.log(`  role:       ${user.role}`);
    console.log(`  isVerified: ${user.isVerified}`);
    console.log(`  createdAt:  ${user.createdAt?.toISOString() ?? "n/a"}`);

    if (user.role === "admin") {
        console.log("\nUser is already admin - no-op. No writes applied.");
        return;
    }

    console.log("\nplanned writes:");
    console.log("  role       → admin");
    console.log("  isVerified → true");

    if (args.dryRun) {
        console.log(
            "\n[dry-run] No writes applied. Re-run with --apply to promote.",
        );
        return;
    }

    // Apply the promotion.
    const result = await users.updateOne(
        { _id: user._id },
        { $set: { role: "admin", isVerified: true } },
    );

    if (result.modifiedCount !== 1) {
        console.error(
            `\nERROR: updateOne modifiedCount=${result.modifiedCount} - expected 1`,
        );
        process.exitCode = 2;
        return;
    }

    // Post-check: re-read from DB to confirm.
    const updated = await users.findOne(
        { _id: user._id },
        { projection: { email: 1, role: 1, isVerified: 1 } },
    );

    console.log("\npost-check (re-read from DB):");
    console.log(`  _id:        ${updated._id}`);
    console.log(`  email:      ${updated.email}`);
    console.log(`  role:       ${updated.role}`);
    console.log(`  isVerified: ${updated.isVerified}`);

    if (updated.role !== "admin") {
        console.error(
            "\nERROR: post-check FAILED - role is not admin after write",
        );
        process.exitCode = 2;
        return;
    }

    if (!updated.isVerified) {
        console.error(
            "\nERROR: post-check FAILED - isVerified is not true after write",
        );
        process.exitCode = 2;
        return;
    }

    console.log("\nAdmin promotion complete - POST-CHECK PASS");
    console.log(
        "The user can now login via /api/auth/login and access /api/admin/* routes.",
    );
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
