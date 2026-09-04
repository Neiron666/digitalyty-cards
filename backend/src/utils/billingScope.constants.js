/**
 * Canonical normalized billing-scope vocabulary.
 *
 * Model-free and import-free on purpose: both personalOrg.util.js (which
 * imports the Organization model) and trial.js (which must stay model-free)
 * consume this single source, so neither duplicates the literals.
 */
export const BILLING_SCOPE = Object.freeze({
    PERSONAL: "PERSONAL",
    REAL_ORG: "REAL_ORG",
    UNKNOWN: "UNKNOWN",
});
