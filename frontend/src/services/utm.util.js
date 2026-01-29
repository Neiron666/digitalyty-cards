const STORAGE_KEY_UTM = "digitalyty_utm";

export function getUtm() {
    try {
        const params = new URLSearchParams(window.location.search || "");

        const source = params.get("utm_source") || "";
        const campaign = params.get("utm_campaign") || "";
        const medium = params.get("utm_medium") || "";

        const utm = {
            source: source || undefined,
            campaign: campaign || undefined,
            medium: medium || undefined,
        };

        const hasAny = Boolean(utm.source || utm.campaign || utm.medium);
        if (hasAny) {
            sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(utm));
            return utm;
        }

        const cached = sessionStorage.getItem(STORAGE_KEY_UTM);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object") return parsed;
            } catch {
                // ignore
            }
        }

        return {};
    } catch {
        return {};
    }
}
