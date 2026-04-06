// Retention purge configuration - post-trial premium data cleanup.

const DAY_MS = 24 * 60 * 60 * 1000;

function parsePositiveInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.floor(n);
}

/** Days after downgradedAt before premium surplus data is purged. */
export const RETENTION_GRACE_DAYS = parsePositiveInt(
    process.env.RETENTION_GRACE_DAYS,
    90,
);

export const RETENTION_GRACE_MS = RETENTION_GRACE_DAYS * DAY_MS;

/** Premium-only contact/social fields to $unset during purge. */
export const PREMIUM_CONTACT_FIELDS = [
    "contact.facebook",
    "contact.twitter",
    "contact.tiktok",
    "contact.waze",
    "contact.linkedin",
    "contact.extraLines",
    "contact.mobile",
    "contact.officePhone",
    "contact.fax",
];
