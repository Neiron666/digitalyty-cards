const CONSENT_KEY = "cardigo_cookie_consent_v1";

export function pushConsentToDataLayer(state) {
    try {
        if (typeof window === "undefined" || !Array.isArray(window.dataLayer))
            return;
        window.dataLayer.push({
            event: "cardigo_consent_update",
            cardigo_consent_version: state.version,
            cardigo_consent_acknowledged: state.acknowledged,
            cardigo_consent_optional_tracking: state.optionalTrackingAllowed,
        });
    } catch {
        /* dataLayer push failed – non-fatal */
    }
}

function safeParse(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.version === 1) {
            return parsed;
        }
    } catch {
        /* corrupted – treat as absent */
    }
    return null;
}

export function getConsentState() {
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;
        return safeParse(raw);
    } catch {
        return null;
    }
}

export function acceptConsent() {
    return saveConsent(true);
}

export function saveConsent(optionalTrackingAllowed) {
    const state = {
        version: 1,
        acknowledged: true,
        optionalTrackingAllowed: Boolean(optionalTrackingAllowed),
        ts: Date.now(),
    };
    try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    } catch {
        /* storage blocked – banner will reappear next visit */
    }
    pushConsentToDataLayer(state);
    return state;
}

export function hasAcceptedConsent() {
    const s = getConsentState();
    return Boolean(s && s.acknowledged);
}
