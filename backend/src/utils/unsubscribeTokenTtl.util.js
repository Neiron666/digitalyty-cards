// Shared TTL for marketing unsubscribe tokens.
// Imported by both unsubscribe.routes.js (consume endpoint) and
// trialReminderJob.js (token issuance) — single source of truth.
export const UNSUBSCRIBE_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
