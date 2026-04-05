// Trial rollout configuration — user-premium-trial lifecycle.
// Separate from anonymous trial semantics in utils/trial.js.

export const TRIAL_DURATION_DAYS = 10;

/**
 * Read and parse TRIAL_ROLLOUT_DATE from env.
 * Returns a valid Date or null (if env var is absent or empty).
 * Throws if the value is present but not a valid ISO8601 date.
 */
export function getTrialRolloutDate() {
    const raw = process.env.TRIAL_ROLLOUT_DATE;
    if (typeof raw !== "string" || !raw.trim()) return null;

    const date = new Date(raw.trim());
    if (!Number.isFinite(date.getTime())) {
        throw new Error(
            `TRIAL_ROLLOUT_DATE is not a valid ISO8601 date: "${raw}"`,
        );
    }
    return date;
}

/**
 * Check whether a user is eligible for auto-trial on first card creation.
 *
 * Eligible iff ALL of:
 *  - TRIAL_ROLLOUT_DATE is configured (non-null)
 *  - user.trialActivatedAt is null (never used trial)
 *  - user.trialEligibilityClosedAt is null (not closed by claim/other event)
 *  - user.createdAt >= rollout date
 */
export function isUserTrialEligible(user) {
    if (!user) return false;

    const rollout = getTrialRolloutDate();
    if (!rollout) return false;

    if (user.trialActivatedAt) return false;
    if (user.trialEligibilityClosedAt) return false;

    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    if (!createdAt || !Number.isFinite(createdAt.getTime())) return false;

    return createdAt.getTime() >= rollout.getTime();
}
