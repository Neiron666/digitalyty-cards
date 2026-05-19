import { useState } from "react";

const GUIDE_DROPDOWN_ACK_KEY = "cardigo_guide_dropdown_v1";

// ── Safe localStorage helpers ─────────────────────────────────────────────────
// Pattern mirrors useEditorTour.js — intentionally inlined here, not shared.

function getSafeLocalStorage() {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage || null;
    } catch {
        return null;
    }
}

function readAck() {
    const ls = getSafeLocalStorage();
    if (!ls) return false;
    try {
        return ls.getItem(GUIDE_DROPDOWN_ACK_KEY) === "1";
    } catch {
        return false;
    }
}

function writeAck() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.setItem(GUIDE_DROPDOWN_ACK_KEY, "1");
    } catch {
        // localStorage unavailable — persistence is best-effort only.
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Tracks whether the user has acknowledged the guide dropdown at least once.
 *
 * - Initializes from localStorage (safe read).
 * - `acknowledge()` persists "1" and flips local state to true.
 * - If localStorage is unavailable the hook still works for the current session.
 */
export default function useGuideDropdownAck() {
    const [isAcknowledged, setIsAcknowledged] = useState(() => readAck());

    function acknowledge() {
        if (isAcknowledged) return;
        writeAck();
        setIsAcknowledged(true);
    }

    return { isAcknowledged, acknowledge };
}
