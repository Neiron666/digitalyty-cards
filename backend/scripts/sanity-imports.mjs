import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

function setEnvDefaults() {
    process.env.NODE_ENV ??= "test";
    process.env.JWT_SECRET ??= "sanity";

    process.env.SITE_ANALYTICS_RETENTION_DAYS ??= "30";

    process.env.TRANZILA_TERMINAL ??= "sanity";
    process.env.TRANZILA_SECRET ??= "sanity";
    process.env.TRANZILA_NOTIFY_URL ??= "https://example.invalid/notify";
    process.env.TRANZILA_SUCCESS_URL ??= "https://example.invalid/success";
    process.env.TRANZILA_FAIL_URL ??= "https://example.invalid/fail";
}

function toStackExcerpt(error, maxLines = 20) {
    const stack = typeof error?.stack === "string" ? error.stack : "";
    if (!stack) return "";
    return stack.split("\n").slice(0, maxLines).join("\n");
}

async function main() {
    setEnvDefaults();

    const hereDir = path.dirname(fileURLToPath(import.meta.url));
    const backendRoot = path.resolve(hereDir, "..");

    const targets = [
        { label: "app", relPath: "src/app.js" },

        { label: "admin.routes", relPath: "src/routes/admin.routes.js" },
        {
            label: "admin.controller",
            relPath: "src/controllers/admin.controller.js",
        },

        { label: "card.routes", relPath: "src/routes/card.routes.js" },
        {
            label: "card.controller",
            relPath: "src/controllers/card.controller.js",
        },

        { label: "upload.routes", relPath: "src/routes/upload.routes.js" },
        {
            label: "upload.controller",
            relPath: "src/controllers/upload.controller.js",
        },

        { label: "auth.routes", relPath: "src/routes/auth.routes.js" },

        {
            label: "admin.middleware",
            relPath: "src/middlewares/admin.middleware.js",
        },
        {
            label: "auth.middleware",
            relPath: "src/middlewares/auth.middleware.js",
        },
        { label: "jwt", relPath: "src/utils/jwt.js" },

        {
            label: "supabaseStorage",
            relPath: "src/services/supabaseStorage.js",
        },

        { label: "User.model", relPath: "src/models/User.model.js" },
        { label: "Card.model", relPath: "src/models/Card.model.js" },
        {
            label: "Organization.model",
            relPath: "src/models/Organization.model.js",
        },
        {
            label: "OrganizationMember.model",
            relPath: "src/models/OrganizationMember.model.js",
        },
        { label: "OrgInvite.model", relPath: "src/models/OrgInvite.model.js" },
    ];

    const failures = [];
    let importedCount = 0;

    for (const target of targets) {
        const absPath = path.resolve(backendRoot, target.relPath);
        const fileHref = pathToFileURL(absPath).href;

        try {
            await import(fileHref);
            importedCount += 1;
        } catch (error) {
            failures.push({
                label: target.label,
                file: target.relPath,
                message: error?.message ? String(error.message) : String(error),
                stack: toStackExcerpt(error, 20),
            });
        }
    }

    const report = {
        ok: failures.length === 0,
        importedCount,
        failedCount: failures.length,
        failures,
    };

    console.log(JSON.stringify(report));
    return report.ok ? 0 : 1;
}

let exitCode = 1;
try {
    exitCode = await main();
} catch (error) {
    const report = {
        ok: false,
        importedCount: 0,
        failedCount: 1,
        failures: [
            {
                label: "sanity-imports:top-level",
                file: "scripts/sanity-imports.mjs",
                message: error?.message ? String(error.message) : String(error),
                stack: toStackExcerpt(error, 20),
            },
        ],
    };

    console.log(JSON.stringify(report));
    exitCode = 1;
} finally {
    process.exitCode = exitCode;
    console.log(`EXIT:${exitCode}`);
}
