/**
 * Canonical feature flag for the PERSONAL paid-access 48-hour grace.
 *
 * Single source of truth: no other module may read this env var directly.
 * Strict string equality only — absent, "", "1", "TRUE", "yes" and every other
 * value resolve to false (mirrors isStoCreateEnabled / isYeshInvoiceEnabled).
 *
 * Read per call (not captured at module load) so tests can set the variable
 * after the module graph is imported. process.env is fixed at process start in
 * production, so a flag change requires a restart/redeploy.
 *
 * @returns {boolean}
 */
export function isPersonalPaidGrace48hEnabled() {
    return process.env.CARDIGO_PERSONAL_PAID_GRACE_48H_ENABLED === "true";
}
