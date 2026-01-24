import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Section from "./Section";
import styles from "./ReviewsSection.module.css";

const INTERVAL_MS = 2000;
const RESUME_AFTER_MS = 3000;
const SWIPE_THRESHOLD_PX = 50;
const TRANSITION_MS = 320;

function clampRating(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 5;
    return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizeReviewItem(review) {
    if (typeof review === "string") {
        const text = review.trim();
        return text ? { text, name: "", rating: 5 } : null;
    }

    if (!review || typeof review !== "object") return null;

    const textRaw =
        typeof review.text === "string"
            ? review.text
            : typeof review.value === "string"
              ? review.value
              : "";
    const text = String(textRaw || "").trim();
    if (!text) return null;

    const nameRaw =
        typeof review.name === "string"
            ? review.name
            : typeof review.author === "string"
              ? review.author
              : "";
    const name = String(nameRaw || "").trim();

    const rating = clampRating(review.rating);

    return { text, name, rating };
}

function mod(n, m) {
    return ((n % m) + m) % m;
}

function ReviewsSection({ card }) {
    const items = useMemo(() => {
        const raw = Array.isArray(card?.reviews) ? card.reviews : [];
        return raw.map(normalizeReviewItem).filter(Boolean).slice(0, 5);
    }, [card?.reviews]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [transition, setTransition] = useState(null);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [isRTL, setIsRTL] = useState(false);

    const rootRef = useRef(null);
    const viewportRef = useRef(null);
    const activeIndexRef = useRef(0);
    const transitionRef = useRef(null);
    const focusWithinRef = useRef(false);

    const autoplayTimerRef = useRef(null);
    const resumeTimerRef = useRef(null);
    const transitionDoneTimerRef = useRef(null);

    const pointerRef = useRef({
        id: null,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        dragging: false,
        canceled: false,
    });

    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    useEffect(() => {
        transitionRef.current = transition;
    }, [transition]);

    useEffect(() => {
        const mq =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function"
                ? window.matchMedia("(prefers-reduced-motion: reduce)")
                : null;

        if (!mq) return;

        const apply = () => setReduceMotion(Boolean(mq.matches));
        apply();

        if (typeof mq.addEventListener === "function") {
            mq.addEventListener("change", apply);
            return () => mq.removeEventListener("change", apply);
        }

        mq.addListener(apply);
        return () => mq.removeListener(apply);
    }, []);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        try {
            const dir = window.getComputedStyle(el).direction;
            setIsRTL(dir === "rtl");
        } catch {
            setIsRTL(false);
        }
    }, []);

    useEffect(() => {
        // Clamp when items change.
        setActiveIndex((i) => {
            const max = items.length - 1;
            if (max < 0) return 0;
            return Math.min(Math.max(0, i), max);
        });
    }, [items.length]);

    const stopAutoplay = useCallback(() => {
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
        if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
        }
    }, []);

    const commitTransition = useCallback(() => {
        const t = transitionRef.current;
        if (!t) return;
        setTransition(null);
        setActiveIndex(t.to);
        activeIndexRef.current = t.to;
    }, []);

    const endTransition = useCallback(() => {
        const t = transitionRef.current;
        if (!t) return;
        setTransition(null);
        setActiveIndex(t.to);
        activeIndexRef.current = t.to;
    }, []);

    const goToIndex = useCallback(
        (nextIndex, action, { source } = {}) => {
            if (items.length < 2) {
                setActiveIndex(0);
                return;
            }

            commitTransition();

            const from = activeIndexRef.current;
            const to = mod(nextIndex, items.length);
            if (to === from) return;

            if (reduceMotion) {
                setActiveIndex(to);
                return;
            }

            // Action is semantic (next/prev). Visual direction is derived from RTL in CSS.
            setTransition({ from, to, action, phase: "prepare" });

            requestAnimationFrame(() => {
                setTransition((prev) =>
                    prev ? { ...prev, phase: "animate" } : prev,
                );
            });

            // Safety: ensure we always finalize even if transitionend is missed.
            if (transitionDoneTimerRef.current) {
                clearTimeout(transitionDoneTimerRef.current);
            }
            transitionDoneTimerRef.current = setTimeout(() => {
                transitionDoneTimerRef.current = null;
                endTransition();
            }, TRANSITION_MS + 120);

            // Autoplay should continue only if it was already running.
            if (source === "autoplay") return;
        },
        [commitTransition, endTransition, items.length, reduceMotion],
    );

    const goPrev = useCallback(
        ({ source } = {}) => {
            const prev = mod(activeIndexRef.current - 1, items.length);
            goToIndex(prev, "prev", { source });
        },
        [goToIndex, items.length],
    );

    const goNext = useCallback(
        ({ source } = {}) => {
            const next = mod(activeIndexRef.current + 1, items.length);
            goToIndex(next, "next", { source });
        },
        [goToIndex, items.length],
    );

    const startAutoplay = useCallback(() => {
        if (reduceMotion) return;
        if (items.length < 2) return;
        if (focusWithinRef.current) return;
        if (autoplayTimerRef.current) return;

        autoplayTimerRef.current = setInterval(() => {
            // Best effort: do not fight the user.
            if (focusWithinRef.current) return;
            if (transitionRef.current) return;
            goNext({ source: "autoplay" });
        }, INTERVAL_MS);
    }, [goNext, items.length, reduceMotion]);

    const scheduleResume = useCallback(() => {
        if (reduceMotion) return;
        if (items.length < 2) return;

        if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
        }

        resumeTimerRef.current = setTimeout(() => {
            resumeTimerRef.current = null;
            if (focusWithinRef.current) return;
            startAutoplay();
        }, RESUME_AFTER_MS);
    }, [items.length, reduceMotion, startAutoplay]);

    useEffect(() => {
        stopAutoplay();
        startAutoplay();
        return () => stopAutoplay();
    }, [items.length, reduceMotion, startAutoplay, stopAutoplay]);

    useEffect(() => {
        return () => {
            if (transitionDoneTimerRef.current) {
                clearTimeout(transitionDoneTimerRef.current);
                transitionDoneTimerRef.current = null;
            }
        };
    }, []);

    const onPrevClick = useCallback(() => {
        stopAutoplay();
        goPrev({ source: "user" });
        scheduleResume();
    }, [goPrev, scheduleResume, stopAutoplay]);

    const onNextClick = useCallback(() => {
        stopAutoplay();
        goNext({ source: "user" });
        scheduleResume();
    }, [goNext, scheduleResume, stopAutoplay]);

    const onKeyDown = useCallback(
        (e) => {
            if (items.length < 2) return;
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

            // Pause on interaction.
            stopAutoplay();

            // RTL nuance: for a natural feel, arrow mapping is inverted.
            // LTR: ArrowLeft=prev, ArrowRight=next.
            // RTL: ArrowLeft=next, ArrowRight=prev.
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (isRTL) goNext({ source: "user" });
                else goPrev({ source: "user" });
                scheduleResume();
                return;
            }

            if (e.key === "ArrowRight") {
                e.preventDefault();
                if (isRTL) goPrev({ source: "user" });
                else goNext({ source: "user" });
                scheduleResume();
            }
        },
        [goNext, goPrev, isRTL, items.length, scheduleResume, stopAutoplay],
    );

    const onFocusCapture = useCallback(() => {
        focusWithinRef.current = true;
        stopAutoplay();
    }, [stopAutoplay]);

    const onBlurCapture = useCallback(() => {
        // Wait a tick to see if focus moved within the section.
        setTimeout(() => {
            const root = rootRef.current;
            const active = document.activeElement;
            const stillWithin =
                root && active && typeof root.contains === "function"
                    ? root.contains(active)
                    : false;
            focusWithinRef.current = Boolean(stillWithin);
            if (!focusWithinRef.current) scheduleResume();
        }, 0);
    }, [scheduleResume]);

    const onPointerDown = useCallback(
        (e) => {
            if (items.length < 2) return;

            const el = viewportRef.current;
            if (!el) return;

            stopAutoplay();

            pointerRef.current = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                lastX: e.clientX,
                lastY: e.clientY,
                dragging: true,
                canceled: false,
            };

            try {
                el.setPointerCapture?.(e.pointerId);
            } catch {}
        },
        [items.length, stopAutoplay],
    );

    const onPointerMove = useCallback((e) => {
        const state = pointerRef.current;
        if (!state.dragging) return;
        if (state.id !== e.pointerId) return;

        state.lastX = e.clientX;
        state.lastY = e.clientY;

        const dx = state.lastX - state.startX;
        const dy = state.lastY - state.startY;

        // Vertical scroll should cancel drag-to-swipe.
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
            state.canceled = true;
        }
    }, []);

    const onPointerUp = useCallback(
        (e) => {
            const state = pointerRef.current;
            if (!state.dragging) return;
            if (state.id !== e.pointerId) return;

            state.dragging = false;
            const dx = state.lastX - state.startX;
            const dy = state.lastY - state.startY;

            if (!state.canceled && Math.abs(dx) > Math.abs(dy)) {
                if (dx <= -SWIPE_THRESHOLD_PX) {
                    // Swipe left: LTR=next, RTL=prev.
                    if (isRTL) goPrev({ source: "user" });
                    else goNext({ source: "user" });
                } else if (dx >= SWIPE_THRESHOLD_PX) {
                    // Swipe right: LTR=prev, RTL=next.
                    if (isRTL) goNext({ source: "user" });
                    else goPrev({ source: "user" });
                }
            }

            scheduleResume();
        },
        [goNext, goPrev, isRTL, scheduleResume],
    );

    const onPointerCancel = useCallback(() => {
        pointerRef.current.dragging = false;
        scheduleResume();
    }, [scheduleResume]);

    const onSlideTransitionEnd = useCallback(
        (e) => {
            if (!transitionRef.current) return;
            if (transitionRef.current.phase !== "animate") return;
            if (e.propertyName !== "transform" && e.propertyName !== "opacity")
                return;

            if (transitionDoneTimerRef.current) {
                clearTimeout(transitionDoneTimerRef.current);
                transitionDoneTimerRef.current = null;
            }

            endTransition();
        },
        [endTransition],
    );

    function renderStars(rating) {
        const r = clampRating(rating);
        return (
            <div
                className={styles.stars}
                role="img"
                aria-label={`דירוג ${r} מתוך 5`}
            >
                {Array.from({ length: 5 }).map((_, i) => (
                    <span
                        key={i}
                        className={i < r ? styles.starFilled : styles.starEmpty}
                        aria-hidden="true"
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    }

    function renderCard(item) {
        return (
            <figure className={styles.card}>
                <div className={styles.cardInner}>
                    {renderStars(5)}
                    <blockquote className={styles.quote}>
                        <p className={styles.text}>“{item.text}”</p>
                    </blockquote>
                    {item.name ? (
                        <div className={styles.author}>{item.name}</div>
                    ) : null}
                </div>
            </figure>
        );
    }

    if (!items.length) return null;

    const hasControls = items.length > 1;
    const t = transition;
    const stateKey = t
        ? `${t.from}->${t.to}:${t.action}`
        : `active:${activeIndex}`;

    return (
        <Section title="המלצות">
            <div
                ref={rootRef}
                className={styles.slider}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onFocusCapture={onFocusCapture}
                onBlurCapture={onBlurCapture}
                data-dir={isRTL ? "rtl" : "ltr"}
                data-reduce-motion={reduceMotion ? "true" : "false"}
            >
                <div className={styles.frame}>
                    <div className={styles.navLayer}>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnPrev}`}
                            onClick={onPrevClick}
                            aria-label="המלצה הקודמת"
                            disabled={!hasControls}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.btnNext}`}
                            onClick={onNextClick}
                            aria-label="המלצה הבאה"
                            disabled={!hasControls}
                        >
                            ›
                        </button>
                    </div>

                    <div
                        ref={viewportRef}
                        className={styles.viewport}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerCancel}
                        role="group"
                        aria-label="המלצות"
                    >
                        {t ? (
                            <div
                                key={stateKey}
                                className={`${styles.stack} ${styles[`action_${t.action}`]} ${
                                    t.phase === "animate"
                                        ? styles.animating
                                        : ""
                                }`}
                                onTransitionEnd={onSlideTransitionEnd}
                            >
                                <div
                                    className={`${styles.slide} ${styles.outgoing}`}
                                    aria-hidden="true"
                                    tabIndex={-1}
                                >
                                    {renderCard(items[t.from])}
                                </div>
                                <div
                                    className={`${styles.slide} ${styles.incoming}`}
                                    aria-hidden="false"
                                    tabIndex={-1}
                                >
                                    {renderCard(items[t.to])}
                                </div>
                            </div>
                        ) : (
                            <div
                                key={stateKey}
                                className={styles.slideSingle}
                                aria-hidden="false"
                                tabIndex={-1}
                            >
                                {renderCard(items[activeIndex])}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Section>
    );
}

export default ReviewsSection;
