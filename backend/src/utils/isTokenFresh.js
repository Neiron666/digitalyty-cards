/**
 * Determines whether a JWT is fresh relative to a user's last password-change event.
 *
 * Security policy:
 *   - If passwordChangedAt is null/undefined → token is always considered fresh.
 *     This preserves backward compatibility for all existing users whose field is null.
 *   - JWT `iat` is seconds-precision (standard). passwordChangedAt is a Date (ms-precision).
 *   - Comparison: token is STALE when  iat < floor(passwordChangedAt.getTime() / 1000).
 *   - Tokens issued in the same second as the password change (iat === changedAtSec) are
 *     treated as FRESH. This avoids accidentally invalidating a post-reset login token
 *     that was issued within the same clock second as the password update.
 *
 * @param {object} payload         Decoded JWT payload (from verifyToken). Must have .iat.
 * @param {Date|null|undefined} passwordChangedAt  Value from User document.
 * @returns {boolean}  true = token is fresh and should be accepted.
 */
export function isTokenFresh(payload, passwordChangedAt) {
    if (!passwordChangedAt) return true;
    // Truncate passwordChangedAt to second-precision to match JWT iat granularity.
    const changedAtSec = Math.floor(passwordChangedAt.getTime() / 1000);
    return payload.iat >= changedAtSec;
}
