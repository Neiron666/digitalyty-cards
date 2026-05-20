import { useCallback, useEffect, useRef, useState } from "react";

// ── Storage key ──────────────────────────────────────────────────────────────

export const EDITOR_TOUR_STORAGE_KEY = "cardigo_editor_tour_v1";
export const EDITOR_TOUR_CTA_HL_KEY =
    "cardigo_editor_tour_cta_highlight_pending_v1";

// ── Sequence config ───────────────────────────────────────────────────────────
// Ordered list of tour steps for the editor guided onboarding tour.
// requiresDrawer: true → drawer must be open before this step's target is visible.
// anonymousOnly: true → step is filtered out for authenticated users.
// finalCta: true → step is part of the anonymous conversion endpoint.

export const EDITOR_TOUR_STEPS = [
    // ── 0 ── template dark group ─────────────────────────────────────────────
    {
        id: "step-template-dark-group",
        targetId: "editor-tour-template-dark-group",
        text: "בחרו סגנון כהה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 1 ── template select ─────────────────────────────────────────────────
    {
        id: "step-template-select",
        targetId: "editor-tour-template-select-tehomTurkiz",
        text: "בחרו את התבנית",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 2 ── save template ───────────────────────────────────────────────────
    {
        id: "step-save-template",
        targetId: "editor-tour-save-changes",
        text: "שמרו את התבנית",
        anonymousOnly: false,
        requiresDrawer: false,
        isSaveStep: true,
    },
    // ── 3 ── preview toggle ──────────────────────────────────────────────────
    {
        id: "step-preview-toggle",
        targetId: "editor-tour-preview-toggle",
        text: "עברו לתצוגה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 4 ── edit toggle ─────────────────────────────────────────────────────
    {
        id: "step-edit-toggle",
        targetId: "editor-tour-edit-toggle",
        text: "חזרו לעריכה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 5 ── sections menu ───────────────────────────────────────────────────
    {
        id: "step-sections-menu-1",
        targetId: "editor-tour-sections-menu",
        text: "פתחו את התפריט",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 6 ── tab head ────────────────────────────────────────────────────────
    {
        id: "step-tab-head",
        targetId: "editor-tour-tab-head",
        text: "פתחו את ראש הכרטיס",
        anonymousOnly: false,
        requiresDrawer: true,
    },
    // ── 7 ── upload background ───────────────────────────────────────────────
    {
        id: "step-upload-background",
        targetId: "editor-tour-upload-background-block",
        text: "העלו תמונת רקע",
        anonymousOnly: false,
        requiresDrawer: false,
        isUploadStep: true,
        uploadKind: "background",
    },
    // ── 8 ── upload avatar ───────────────────────────────────────────────────
    {
        id: "step-upload-avatar",
        targetId: "editor-tour-upload-avatar-block",
        text: "העלו תמונה או לוגו",
        anonymousOnly: false,
        requiresDrawer: false,
        isUploadStep: true,
        uploadKind: "avatar",
    },
    // ── 9 ── save head/design ────────────────────────────────────────────────
    {
        id: "step-save-head",
        targetId: "editor-tour-save-changes",
        text: "שמרו את התמונות",
        anonymousOnly: false,
        requiresDrawer: false,
        isSaveStep: true,
    },
    // ── 10 ── preview after upload ───────────────────────────────────────────
    {
        id: "step-preview-after-upload",
        targetId: "editor-tour-preview-toggle",
        text: "ראו מה השתנה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 11 ── edit after upload ──────────────────────────────────────────────
    {
        id: "step-edit-after-upload",
        targetId: "editor-tour-edit-toggle",
        text: "חזרו לעריכה",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 12 ── sections menu ──────────────────────────────────────────────────
    {
        id: "step-sections-menu-2",
        targetId: "editor-tour-sections-menu",
        text: "פתחו את התפריט",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 13 ── tab business ───────────────────────────────────────────────────
    {
        id: "step-tab-business",
        targetId: "editor-tour-tab-business",
        text: "פתחו פרטי העסק",
        anonymousOnly: false,
        requiresDrawer: true,
    },
    // ── 14 ── business name input ────────────────────────────────────────────
    {
        id: "step-field-business-name",
        targetId: "editor-tour-field-business-name",
        text: "הזינו שם עסק",
        anonymousOnly: false,
        requiresDrawer: false,
        advanceOn: "input",
    },
    // ── 15 ── business category input ────────────────────────────────────────
    {
        id: "step-field-business-category",
        targetId: "editor-tour-field-business-category",
        text: "הזינו תחום עיסוק",
        anonymousOnly: false,
        requiresDrawer: false,
        advanceOn: "input",
    },
    // ── 16 ── save business ──────────────────────────────────────────────────
    {
        id: "step-save-business",
        targetId: "editor-tour-save-changes",
        text: "שמרו את פרטי העסק",
        anonymousOnly: false,
        requiresDrawer: false,
        isSaveStep: true,
    },
    // ── 17 ── sections menu ──────────────────────────────────────────────────
    {
        id: "step-sections-menu-3",
        targetId: "editor-tour-sections-menu",
        text: "פתחו את התפריט",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 18 ── tab contact ────────────────────────────────────────────────────
    {
        id: "step-tab-contact",
        targetId: "editor-tour-tab-contact",
        text: "פתחו פרטי קשר",
        anonymousOnly: false,
        requiresDrawer: true,
    },
    // ── 19 ── phone input ────────────────────────────────────────────────────
    {
        id: "step-field-contact-phone",
        targetId: "editor-tour-field-contact-phone",
        text: "הזינו טלפון",
        anonymousOnly: false,
        requiresDrawer: false,
        advanceOn: "input",
    },
    // ── 20 ── email input ────────────────────────────────────────────────────
    {
        id: "step-field-contact-email",
        targetId: "editor-tour-field-contact-email",
        text: "הזינו אימייל",
        anonymousOnly: false,
        requiresDrawer: false,
        advanceOn: "input",
    },
    // ── 21 ── save contact ───────────────────────────────────────────────────
    {
        id: "step-save-contact",
        targetId: "editor-tour-save-changes",
        text: "שמרו פרטי קשר",
        anonymousOnly: false,
        requiresDrawer: false,
        isSaveStep: true,
    },
    // ── 22 ── final preview ──────────────────────────────────────────────────
    {
        id: "step-final-preview",
        targetId: "editor-tour-preview-toggle",
        text: "צפו בכרטיס",
        anonymousOnly: false,
        requiresDrawer: false,
    },
    // ── 23 ── final edit ─────────────────────────────────────────────────────
    {
        id: "step-final-edit",
        targetId: "editor-tour-edit-toggle",
        text: "חזרו לעריכה",
        anonymousOnly: false,
        requiresDrawer: false,
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

// ── CTA highlight pending helpers ─────────────────────────────────────────────
// Tracks whether the post-tour anonymous CTA glow is pending first-click.
// Written only on natural guide completion; cleared on skip and restart.

export function readEditorTourCtaHighlightPending() {
    const ls = getSafeLocalStorage();
    if (!ls) return false;
    try {
        return ls.getItem(EDITOR_TOUR_CTA_HL_KEY) === "1";
    } catch {
        return false;
    }
}

export function writeEditorTourCtaHighlightPending() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.setItem(EDITOR_TOUR_CTA_HL_KEY, "1");
    } catch {
        // localStorage unavailable — CTA highlight is best-effort only.
    }
}

export function clearEditorTourCtaHighlightPending() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.removeItem(EDITOR_TOUR_CTA_HL_KEY);
    } catch {
        // localStorage unavailable — CTA highlight is best-effort only.
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
                writeEditorTourCtaHighlightPending();
                return { isDone: true, currentIndex: prev.currentIndex };
            }
            return { isDone: false, currentIndex: nextIndex };
        });
    }, [totalSteps]);

    const skip = useCallback(() => {
        writeEditorTourDone();
        clearEditorTourCtaHighlightPending();
        setState({ isDone: true, currentIndex: 0 });
    }, []);

    const complete = useCallback(() => {
        writeEditorTourDone();
        setState({ isDone: true, currentIndex: 0 });
    }, []);

    const restart = useCallback(() => {
        clearEditorTourDone();
        clearEditorTourCtaHighlightPending();
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
            el.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "smooth",
            });
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
                } else if (attempt < 5) {
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

        // isSaveStep guard — advance is driven by commitDraft success only.
        // Must be checked before isInteractive to prevent double-advance.
        if (currentStep?.isSaveStep) return undefined;

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
    }, [isActive, activeTargetId, activeTargetEl, advance, currentStep]);

    // ── advanceOn:input effect ────────────────────────────────────────────────
    // Advances the tour when the user types or pastes a non-empty value into
    // the active input target. Only active when currentStep.advanceOn === "input".
    //
    // Two listeners are registered on the element (not on document):
    //   "input"  — covers typing, cut, autocomplete, and desktop paste
    //              (fires after the DOM value has been updated by the browser).
    //   "paste"  — covers mobile paste where the "input" event fires before
    //              the pasted value is committed, or does not fire at all.
    //              Uses setTimeout(0) to defer the value check until after
    //              the browser has updated input.value.
    //
    // handled flag: prevents double-advance when both paste and input fire
    // (the desktop scenario). The cleanup also sets handled = true so any
    // in-flight paste timer cannot call advance() after the effect tears down.
    // StrictMode-safe: cleanup cancels timer + removes both listeners.

    useEffect(() => {
        if (
            !isActive ||
            !activeTargetEl ||
            currentStep?.advanceOn !== "input"
        ) {
            return undefined;
        }

        let handled = false;
        let pasteTimerId = null;

        const tryAdvance = () => {
            if (handled) return;
            const val =
                typeof activeTargetEl.value === "string"
                    ? activeTargetEl.value
                    : "";
            if (val.trim().length > 0) {
                handled = true;
                advance();
            }
        };

        const handleInput = () => {
            tryAdvance();
        };

        const handlePaste = () => {
            if (pasteTimerId !== null) {
                window.clearTimeout(pasteTimerId);
            }
            pasteTimerId = window.setTimeout(() => {
                pasteTimerId = null;
                tryAdvance();
            }, 0);
        };

        activeTargetEl.addEventListener("input", handleInput);
        activeTargetEl.addEventListener("paste", handlePaste);

        return () => {
            handled = true;
            if (pasteTimerId !== null) {
                window.clearTimeout(pasteTimerId);
            }
            activeTargetEl.removeEventListener("input", handleInput);
            activeTargetEl.removeEventListener("paste", handlePaste);
        };
    }, [isActive, activeTargetEl, currentStep, advance]);

    // ── upload success effect ─────────────────────────────────────────────────
    // Advances the tour when a "cardigo:upload-applied" CustomEvent is received
    // from DesignEditor after a confirmed successful upload+apply cycle.
    // Only active when currentStep.isUploadStep is true.
    // Guards against wrong-kind events via detail.kind === currentStep.uploadKind.
    // Listener is on document because the event is dispatched from DesignEditor
    // which is not a descendant of the tour target element.

    useEffect(() => {
        if (!isActive || !currentStep?.isUploadStep) return undefined;

        const handler = (e) => {
            if (e.detail?.kind === currentStep.uploadKind) {
                advance();
            }
        };

        document.addEventListener("cardigo:upload-applied", handler);

        return () => {
            document.removeEventListener("cardigo:upload-applied", handler);
        };
    }, [isActive, currentStep, advance]);

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
