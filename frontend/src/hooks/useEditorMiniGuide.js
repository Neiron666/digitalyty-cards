import { useState, useCallback, useEffect, useRef } from "react";

export const MINI_GUIDE_IDS = {
    SHARE_CARD: "share-card",
};

// ── Step factories ─────────────────────────────────────────────────────────────

function buildShareCardSteps({
    cardIsPublished,
    entCanPublish,
    entCanChangeSlug,
}) {
    const sm1 = {
        id: "sm-open",
        targetId: "editor-tour-sections-menu",
        text: "לחץ על תפריט עריכה כדי לפתוח אותו",
        requiresDrawer: false,
    };

    const settingsTab = {
        id: "settings-tab",
        targetId: "editor-mini-guide-tab-settings",
        text: "לחץ על הגדרות כדי לפתוח את הגדרות הכרטיס",
        requiresDrawer: true,
        isNextDisabledByDefault: true,
    };

    const slugInput = {
        id: "slug-input",
        targetId: "editor-mini-guide-slug-input",
        text: "כאן תוכל לשנות את הכתובת הקצרה של הכרטיס. אפשר להמשיך ללא שינוי.",
        requiresDrawer: false,
        isSlugStep: true,
    };

    const publishBtn = {
        id: "publish-btn",
        targetId: "editor-mini-guide-publish-btn",
        text: "לחץ על פרסום כדי לפרסם את הכרטיס ולהפעיל את הקישור הציבורי",
        requiresDrawer: false,
        isPublishStep: true,
    };

    const sm2 = {
        id: "sm-link",
        targetId: "editor-tour-sections-menu",
        text: "לחץ על תפריט עריכה כדי לראות את הקישור לשיתוף",
        requiresDrawer: false,
    };

    const linkBlock = {
        id: "link-block",
        targetId: "editor-mini-guide-public-link-block",
        text:
            cardIsPublished || entCanPublish
                ? "זהו הקישור הציבורי שלך — שתף אותו עם הלקוחות!"
                : "זהו הקישור העתידי שלך — יהפוך לציבורי לאחר פרסום הכרטיס",
        requiresDrawer: true,
        isFinalBlockStep: true,
    };

    // Branch A: already published — no need to push publish step
    if (cardIsPublished) {
        return [sm1, settingsTab, sm2, linkBlock];
    }

    // Branch B: draft, cannot publish (free plan) — show future-link at the end
    if (!entCanPublish) {
        return [sm1, settingsTab, sm2, linkBlock];
    }

    // Branch C: draft, can publish, but cannot change slug
    if (!entCanChangeSlug) {
        return [sm1, settingsTab, publishBtn, sm2, linkBlock];
    }

    // Branch D: draft, can publish, can change slug
    return [sm1, settingsTab, slugInput, publishBtn, sm2, linkBlock];
}

function computeActiveSteps(guideId, context) {
    if (guideId === MINI_GUIDE_IDS.SHARE_CARD) {
        return buildShareCardSteps(context);
    }
    return [];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useEditorMiniGuide({
    enabled,
    cardIsPublished,
    entCanPublish,
    entCanChangeSlug,
}) {
    const [state, setState] = useState({
        guideId: null,
        currentIndex: 0,
        steps: [],
        running: false,
        isDone: false,
    });

    const {
        guideId: currentGuideId,
        currentIndex,
        steps,
        running,
        isDone,
    } = state;

    const totalSteps = steps.length;
    const isActive = running && totalSteps > 0 && currentIndex < totalSteps;
    const currentStep = isActive ? steps[currentIndex] : null;
    const isFinalStep = isActive && currentIndex === totalSteps - 1;
    const isNextDisabled = Boolean(
        isActive &&
        (currentStep?.isNextDisabledByDefault === true ||
            (currentStep?.isPublishStep === true && !cardIsPublished)),
    );
    const requiresDrawerStepId =
        isActive && currentStep?.requiresDrawer ? currentStep.id : null;

    // ── Actions ───────────────────────────────────────────────────────────────

    const start = useCallback(
        (newGuideId) => {
            if (!enabled) return;
            const context = {
                cardIsPublished,
                entCanPublish,
                entCanChangeSlug,
            };
            const activeSteps = computeActiveSteps(newGuideId, context);
            if (!activeSteps.length) return;
            setState({
                guideId: newGuideId,
                currentIndex: 0,
                steps: activeSteps,
                running: true,
                isDone: false,
            });
        },
        [enabled, cardIsPublished, entCanPublish, entCanChangeSlug],
    );

    const advance = useCallback(() => {
        setState((prev) => {
            if (!prev.running || !prev.steps.length) return prev;
            const next = prev.currentIndex + 1;
            if (next >= prev.steps.length) {
                return {
                    ...prev,
                    running: false,
                    isDone: true,
                    currentIndex: 0,
                };
            }
            return { ...prev, currentIndex: next };
        });
    }, []);

    const skip = useCallback(() => {
        setState((prev) => ({
            ...prev,
            running: false,
            isDone: false,
            currentIndex: 0,
            steps: [],
            guideId: null,
        }));
    }, []);

    const complete = useCallback(() => {
        setState((prev) => ({
            ...prev,
            running: false,
            isDone: true,
            currentIndex: 0,
        }));
    }, []);

    // ── DOM activation ─────────────────────────────────────────────────────────
    // Replicates useEditorTour.js: querySelector, set data-tour-active, RAF retry
    // (up to 5 attempts), captured-element closure cleanup. StrictMode-safe.

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

    // ── Generic click-to-advance ───────────────────────────────────────────────
    // Mirrors useEditorTour.js: BUTTON / A / role=button / role=link only.
    // Publish step, slug step, and final block step are handled by dedicated effects.

    useEffect(() => {
        if (!isActive || !activeTargetId || !activeTargetEl) return undefined;
        if (currentStep?.isPublishStep) return undefined;
        if (currentStep?.isSlugStep) return undefined;
        if (currentStep?.isFinalBlockStep) return undefined;
        if (activeTargetEl.getAttribute("data-tour-id") !== activeTargetId)
            return undefined;

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

    // ── Slug input deferred advance ────────────────────────────────────────────
    // Replicates useEditorTour.js advanceOn:"input" semantics exactly:
    // shared scheduleAdvance(), handled flag, timerId, clearTimeout before
    // scheduling. Both input+paste events call the same scheduleAdvance().
    // Prevents double-advance when the browser fires paste then input.
    // Cleanup: handled=true, clears timer, removes both listeners. StrictMode-safe.

    useEffect(() => {
        if (!isActive || !activeTargetEl || !currentStep?.isSlugStep)
            return undefined;

        let handled = false;
        let timerId = null;

        const scheduleAdvance = () => {
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
            timerId = window.setTimeout(() => {
                timerId = null;
                if (handled) return;
                const val =
                    typeof activeTargetEl.value === "string"
                        ? activeTargetEl.value
                        : "";
                if (val.trim().length > 0) {
                    handled = true;
                    advance();
                }
            }, 0);
        };

        const handleInput = () => {
            scheduleAdvance();
        };
        const handlePaste = () => {
            scheduleAdvance();
        };

        activeTargetEl.addEventListener("input", handleInput);
        activeTargetEl.addEventListener("paste", handlePaste);

        return () => {
            handled = true;
            if (timerId !== null) {
                window.clearTimeout(timerId);
            }
            activeTargetEl.removeEventListener("input", handleInput);
            activeTargetEl.removeEventListener("paste", handlePaste);
        };
    }, [isActive, activeTargetEl, currentStep, advance]);

    // ── Publish prop-watch ─────────────────────────────────────────────────────
    // Auto-advances when cardIsPublished becomes true while on the publish step.
    // Direct click on the publish button does NOT advance; success is observed
    // only through the prop — a failed publish leaves the step active.

    useEffect(() => {
        if (!isActive || !currentStep?.isPublishStep) return;
        if (!cardIsPublished) return;
        advance();
    }, [isActive, cardIsPublished, currentStep?.isPublishStep, advance]);

    // ── Dedicated final-block click completion ─────────────────────────────────
    // Separate from generic click-to-advance (which skips non-interactive elements).
    // The link-block target is a DIV without role. Fires complete() on any click.
    // No preventDefault, no stopPropagation — child anchors open in new tab normally.

    useEffect(() => {
        if (!isActive || !activeTargetEl || !currentStep?.isFinalBlockStep)
            return undefined;

        const handler = () => {
            complete();
        };
        activeTargetEl.addEventListener("click", handler);
        return () => {
            activeTargetEl.removeEventListener("click", handler);
        };
    }, [isActive, activeTargetEl, currentStep, complete]);

    return {
        isActive,
        isDone,
        currentGuideId,
        currentStep,
        currentIndex,
        totalSteps,
        start,
        advance,
        skip,
        complete,
        requiresDrawerStepId,
        isNextDisabled,
        isFinalStep,
    };
}
