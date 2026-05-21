import { useState, useCallback, useEffect, useRef } from "react";

export const MINI_GUIDE_IDS = {
    SHARE_CARD: "share-card",
    SEO_AUTO: "seo-auto",
    BOOKING_HOURS: "booking-hours",
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

function buildSeoAutoSteps(/* context unused – steps are static */) {
    return [
        {
            id: "seo-open",
            targetId: "editor-tour-sections-menu",
            text: "פתחו את תפריט העריכה.",
            requiresDrawer: false,
        },
        {
            id: "seo-tab",
            targetId: "editor-mini-guide-tab-seo",
            text: "בחרו SEO וסקריפטים.",
            requiresDrawer: true,
            isNextDisabledByDefault: true,
        },
        {
            id: "seo-auto-btn",
            targetId: "editor-mini-guide-seo-auto-btn",
            text: "לחצו על ״הגדירו לי SEO אוטומטית״. אם הכפתור לא פעיל, השלימו קודם את הפרטים החסרים.",
            requiresDrawer: false,
            isFinalBlockStep: true,
        },
    ];
}

const BOOKING_HOURS_GUIDE_DAYS = [
    { key: "sun", label: "ראשון" },
    { key: "mon", label: "שני" },
    { key: "tue", label: "שלישי" },
    { key: "wed", label: "רביעי" },
    { key: "thu", label: "חמישי" },
];

function buildBookingHoursSteps({
    canUseBooking,
    bookingEnabled,
    hoursEnabled,
    week,
} = {}) {
    const steps = [];

    steps.push({
        id: "booking-hours-open",
        targetId: "editor-tour-sections-menu",
        text: "פתחו את תפריט העריכה.",
        requiresDrawer: false,
    });

    steps.push({
        id: "booking-hours-tab",
        targetId: "editor-mini-guide-tab-hours",
        text: "עברו לשעות פעילות.",
        requiresDrawer: true,
        isNextDisabledByDefault: true,
    });

    if (canUseBooking) {
        if (bookingEnabled !== true) {
            steps.push({
                id: "booking-enable",
                targetId: "editor-mini-guide-hours-booking-enable",
                text: "אפשרו ללקוחות להזמין תורים מהכרטיס.",
                requiresDrawer: false,
                isCheckboxChangeStep: true,
            });
        }

        steps.push({
            id: "booking-horizon",
            targetId: "editor-mini-guide-hours-horizon",
            text: "בחרו כמה זמן קדימה לקוחות יוכלו להזמין.",
            requiresDrawer: false,
            isListboxSelectStep: true,
        });
    }

    if (hoursEnabled !== true) {
        steps.push({
            id: "hours-show-in-card",
            targetId: "editor-mini-guide-hours-show-in-card",
            text: "הפעילו הצגה של שעות הפעילות בכרטיס.",
            requiresDrawer: false,
            isCheckboxChangeStep: true,
        });
    }

    const safeWeek =
        week && typeof week === "object" && !Array.isArray(week) ? week : {};
    for (const { key, label } of BOOKING_HOURS_GUIDE_DAYS) {
        const dayData = safeWeek[key];
        const alreadyOpen = dayData?.open === true;
        const hasIntervals =
            Array.isArray(dayData?.intervals) && dayData.intervals.length > 0;

        if (!alreadyOpen) {
            steps.push({
                id: `hours-${key}-open`,
                targetId: `editor-mini-guide-hours-${key}-closed`,
                text: `פתחו את יום ${label} לקבלת תורים.`,
                requiresDrawer: false,
                isCheckboxChangeStep: true,
            });
        }

        if (!hasIntervals) {
            steps.push({
                id: `hours-${key}-add-range`,
                targetId: `editor-mini-guide-hours-${key}-add-range`,
                text: `הוסיפו טווח שעות ליום ${label}.`,
                requiresDrawer: false,
            });
        }
    }

    steps.push({
        id: "booking-hours-save",
        targetId: "editor-tour-save-changes",
        text: "שמרו את השינויים.",
        requiresDrawer: false,
        isFinalBlockStep: true,
    });

    return steps;
}

function computeActiveSteps(guideId, context) {
    if (guideId === MINI_GUIDE_IDS.SHARE_CARD) {
        return buildShareCardSteps(context);
    }
    if (guideId === MINI_GUIDE_IDS.SEO_AUTO) {
        return buildSeoAutoSteps(context);
    }
    if (guideId === MINI_GUIDE_IDS.BOOKING_HOURS) {
        return buildBookingHoursSteps(context);
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
        (newGuideId, extraContext = {}) => {
            if (!enabled) return;
            const context = {
                cardIsPublished,
                entCanPublish,
                entCanChangeSlug,
                ...extraContext,
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
        if (currentStep?.isCheckboxChangeStep) return undefined;
        if (currentStep?.isListboxSelectStep) return undefined;
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

    // ── Checkbox change advance ────────────────────────────────────────────────
    // For checkbox-backed toggle steps. Advances only when the real nested input
    // fires a change event with checked=true. Uses deferred setTimeout(0) so
    // React onChange / state update can complete before the guide advances.
    // Handled guard + timerId cleanup. No preventDefault, no stopPropagation.

    useEffect(() => {
        if (!isActive || !activeTargetEl || !currentStep?.isCheckboxChangeStep)
            return undefined;

        const checkboxInput = activeTargetEl.querySelector(
            'input[type="checkbox"]',
        );
        if (!checkboxInput || checkboxInput.disabled) return undefined;

        let handled = false;
        let timerId = null;

        const handler = (e) => {
            if (handled) return;
            if (e.target.checked !== true) return;
            handled = true;
            timerId = window.setTimeout(() => {
                timerId = null;
                advance();
            }, 0);
        };

        checkboxInput.addEventListener("change", handler);
        return () => {
            handled = true;
            if (timerId !== null) {
                window.clearTimeout(timerId);
                timerId = null;
            }
            checkboxInput.removeEventListener("change", handler);
        };
    }, [isActive, activeTargetEl, currentStep, advance]);

    // ── Listbox select advance ─────────────────────────────────────────────────
    // For TimeListbox-backed steps. Advances after a [role="option"] button click
    // bubbles up from inside the wrapper. Uses deferred setTimeout(0) so the
    // option's own React onClick / onChange can complete before guide advances.
    // Trigger button clicks (no [role="option"] ancestor) are ignored.
    // Handled guard + timerId cleanup. No preventDefault, no stopPropagation.

    useEffect(() => {
        if (!isActive || !activeTargetEl || !currentStep?.isListboxSelectStep)
            return undefined;

        let handled = false;
        let timerId = null;

        const handler = (e) => {
            if (handled) return;
            const optionEl = e.target?.closest?.('[role="option"]');
            if (!optionEl) return;
            handled = true;
            timerId = window.setTimeout(() => {
                timerId = null;
                advance();
            }, 0);
        };

        activeTargetEl.addEventListener("click", handler);
        return () => {
            handled = true;
            if (timerId !== null) {
                window.clearTimeout(timerId);
                timerId = null;
            }
            activeTargetEl.removeEventListener("click", handler);
        };
    }, [isActive, activeTargetEl, currentStep, advance]);

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
