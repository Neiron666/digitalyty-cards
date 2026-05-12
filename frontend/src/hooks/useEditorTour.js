import { useCallback, useEffect, useRef, useState } from "react";

// ── Storage key ──────────────────────────────────────────────────────────────

export const EDITOR_TOUR_STORAGE_KEY = "cardigo_editor_tour_v1";

// ── Sequence config ───────────────────────────────────────────────────────────
// Ordered list of tour steps for the editor guided onboarding tour.
// requiresDrawer: true → drawer must be open before this step's target is visible.
// anonymousOnly: true → step is filtered out for authenticated users.
// finalCta: true → step is part of the anonymous conversion endpoint.

export const EDITOR_TOUR_STEPS = [
    {
        id: "step-template-dark-group",
        targetId: "editor-tour-template-dark-group",
        text: "בחרו תבנית רקע כהה שמתאימה לעסק שלכם",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-template-select",
        targetId: "editor-tour-template-select-tehomTurkiz",
        text: "בחרו את התבנית כדי להתחיל לעצב את הכרטיס",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-save-changes",
        targetId: "editor-tour-save-changes",
        text: "שמרו את בחירת התבנית לפני שממשיכים לתצוגה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-preview-toggle",
        targetId: "editor-tour-preview-toggle",
        text: "עברו לתצוגה כדי לראות איך הכרטיס נראה ללקוח",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-edit-toggle",
        targetId: "editor-tour-edit-toggle",
        text: "חזרו לעריכה כדי להמשיך למלא את הכרטיס",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-sections-menu-1",
        targetId: "editor-tour-sections-menu",
        text: "פתחו את התפריט כדי לעבור בין חלקי הכרטיס",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-tab-head",
        targetId: "editor-tour-tab-head",
        text: "כאן עורכים את ראש הכרטיס",
        anonymousOnly: false,
        requiresDrawer: true,
    },
    {
        id: "step-sections-menu-2",
        targetId: "editor-tour-sections-menu",
        text: "פתחו שוב את התפריט כדי להמשיך לפרטי העסק",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-tab-business",
        targetId: "editor-tour-tab-business",
        text: "כאן ממלאים את פרטי העסק",
        anonymousOnly: false,
        requiresDrawer: true,
    },
    {
        id: "step-sections-menu-3",
        targetId: "editor-tour-sections-menu",
        text: "פתחו שוב את התפריט כדי לעבור לפרטי קשר",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    {
        id: "step-tab-contact",
        targetId: "editor-tour-tab-contact",
        text: "כאן מוסיפים טלפון, וואטסאפ וקישורים חשובים",
        anonymousOnly: false,
        requiresDrawer: true,
    },
];

// ── Filtering helper ──────────────────────────────────────────────────────────
// Returns a filtered copy of EDITOR_TOUR_STEPS without mutating the original.

export function getEditorTourSteps({ isAnonymous = false } = {}) {
    if (isAnonymous) return EDITOR_TOUR_STEPS.slice();
    return EDITOR_TOUR_STEPS.filter((step) => !step.anonymousOnly);
}

// ── Safe localStorage helpers ─────────────────────────────────────────────────
// These helpers are intentionally inlined here and must not import from api.js.

function getSafeLocalStorage() {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage || null;
    } catch {
        return null;
    }
}

export function readEditorTourDone() {
    const ls = getSafeLocalStorage();
    if (!ls) return false;
    try {
        return ls.getItem(EDITOR_TOUR_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

export function writeEditorTourDone() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.setItem(EDITOR_TOUR_STORAGE_KEY, "1");
    } catch {
        // localStorage unavailable — tour persistence is best-effort only.
    }
}

export function clearEditorTourDone() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.removeItem(EDITOR_TOUR_STORAGE_KEY);
    } catch {
        // localStorage unavailable — tour persistence is best-effort only.
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// Pure sequence-state hook. No DOM access. No CSS. No rendering.
// Integration (DOM activation, drawer orchestration, panel) belongs to later phases.
//
// Props:
//   isAnonymous {boolean} — when true, anonymousOnly steps are included.
//   enabled     {boolean} — when false, tour is immediately inactive.

export function useEditorTour({ isAnonymous = false, enabled = true } = {}) {
    const steps = getEditorTourSteps({ isAnonymous });
    const totalSteps = steps.length;

    const [state, setState] = useState(() => ({
        isDone: readEditorTourDone(),
        currentIndex: 0,
    }));

    const isDone = state.isDone;
    const currentIndex = state.currentIndex;
    const currentStep =
        !isDone && currentIndex < totalSteps ? steps[currentIndex] : null;
    const isActive = Boolean(enabled && !isDone && currentStep);

    const advance = useCallback(() => {
        setState((prev) => {
            if (prev.isDone) return prev;
            const nextIndex = prev.currentIndex + 1;
            if (nextIndex >= totalSteps) {
                writeEditorTourDone();
                return { isDone: true, currentIndex: prev.currentIndex };
            }
            return { isDone: false, currentIndex: nextIndex };
        });
    }, [totalSteps]);

    const skip = useCallback(() => {
        writeEditorTourDone();
        setState({ isDone: true, currentIndex: 0 });
    }, []);

    const complete = useCallback(() => {
        writeEditorTourDone();
        setState({ isDone: true, currentIndex: 0 });
    }, []);

    const restart = useCallback(() => {
        clearEditorTourDone();
        setState({ isDone: false, currentIndex: 0 });
    }, []);

    // ── DOM activation ────────────────────────────────────────────────────────
    // Marks the current step's target with data-tour-active="true" so the
    // tour.css glow outline becomes visible.
    //
    // Bounded retry: if the target is not in DOM on first query (e.g. the
    // dark-template group has not yet committed a re-render for tehomTurkiz),
    // we schedule up to 2 requestAnimationFrame retries before giving up.
    //
    // Cleanup uses the captured closure variable (NOT a re-query) so the
    // attribute is always removed from the exact element that received it.
    // StrictMode-safe: cleanup cancels the RAF and clears state; the second
    // mount retries fresh.
    const [activeTargetEl, setActiveTargetEl] = useState(null);
    const rafIdRef = useRef(null);
    const activeTargetId = currentStep ? currentStep.targetId : null;

    useEffect(() => {
        if (typeof document === "undefined") return undefined;
        if (!isActive || !activeTargetId) return undefined;

        let capturedEl = null;

        const activate = (el) => {
            el.setAttribute("data-tour-active", "true");
            capturedEl = el;
            setActiveTargetEl(el);
        };

        const el = document.querySelector(`[data-tour-id="${activeTargetId}"]`);
        if (el) {
            activate(el);
        } else {
            let attempt = 0;
            const retry = () => {
                attempt += 1;
                const found = document.querySelector(
                    `[data-tour-id="${activeTargetId}"]`,
                );
                if (found) {
                    activate(found);
                } else if (attempt < 2) {
                    rafIdRef.current = requestAnimationFrame(retry);
                }
            };
            rafIdRef.current = requestAnimationFrame(retry);
        }

        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (capturedEl) {
                capturedEl.removeAttribute("data-tour-active");
            }
            setActiveTargetEl(null);
        };
    }, [isActive, activeTargetId]);

    // ── Click-to-advance (Phase 2) ────────────────────────────────────────────
    // When the active target is an interactive element (button, link, or
    // role=button/link), clicking it advances the tour as if "הבנתי" was
    // clicked, while preserving the target's own native behavior.
    //
    // Interactive detection:
    //   - tagName BUTTON or A
    //   - role="button" or role="link"
    //   - All other containers (SECTION, DIV without role) are excluded.
    //
    // Constraints:
    //   - No preventDefault / stopPropagation.
    //   - No capture phase.
    //   - Listener on the target element only — not on document/window.
    //   - Cleanup removes the exact handler ref — safe under StrictMode.

    useEffect(() => {
        if (!isActive || !activeTargetId || !activeTargetEl) return undefined;

        if (activeTargetEl.getAttribute("data-tour-id") !== activeTargetId) {
            return undefined;
        }

        const tag = activeTargetEl.tagName;
        const role = activeTargetEl.getAttribute("role");
        const isInteractive =
            tag === "BUTTON" ||
            tag === "A" ||
            role === "button" ||
            role === "link";

        if (!isInteractive) return undefined;

        const handler = () => {
            advance();
        };

        activeTargetEl.addEventListener("click", handler);

        return () => {
            activeTargetEl.removeEventListener("click", handler);
        };
    }, [isActive, activeTargetId, activeTargetEl, advance]);

    return {
        isActive,
        isDone,
        currentStep,
        currentIndex,
        totalSteps,
        advance,
        skip,
        complete,
        restart,
        steps,
    };
}
