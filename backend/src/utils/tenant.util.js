// NOTE: Host-tenancy is deprecated in this repo by product policy.
// We keep the legacy tenantKey field/indexes for backward compatibility only.
const DEFAULT_TENANT_KEY_RAW =
    process.env.DEFAULT_TENANT_KEY || "digitalyty.co.il";

export const DEFAULT_TENANT_KEY = String(DEFAULT_TENANT_KEY_RAW)
    .trim()
    .toLowerCase();
