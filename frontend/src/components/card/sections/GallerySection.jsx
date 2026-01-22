import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Section from "./Section";
import styles from "./GallerySection.module.css";
import {
    galleryItemToOriginalUrl,
    galleryItemToThumbUrl,
} from "../../../utils/gallery";

const BODY_SCROLL_LOCK_CLASS = "digi-lb-open";
const SWIPE_THRESHOLD_PX = 40;

function mod(n, m) {
    return ((n % m) + m) % m;
}

function GallerySection({ card }) {
    const rawGallery = Array.isArray(card?.gallery) ? card.gallery : [];

    const items = useMemo(() => {
        const out = [];

        for (let rawIndex = 0; rawIndex < rawGallery.length; rawIndex += 1) {
            const item = rawGallery[rawIndex];

            const fullUrl = galleryItemToOriginalUrl(item);
            if (!fullUrl) continue;

            const thumbUrl = galleryItemToThumbUrl(item) || fullUrl;

            const createdAtPart =
                item && typeof item === "object" && item.createdAt != null
                    ? String(item.createdAt)
                    : "";
            const pathPart =
                item &&
                typeof item === "object" &&
                typeof item.path === "string"
                    ? item.path
                    : "";

            const visibleIndex = out.length;
            const alt =
                item &&
                typeof item === "object" &&
                typeof item.alt === "string" &&
                item.alt.trim()
                    ? item.alt.trim()
                    : `תמונה ${visibleIndex + 1} בגלריה`;

            out.push({
                id: `${fullUrl}|${createdAtPart}|${pathPart}|${rawIndex}`,
                thumbUrl,
                fullUrl,
                alt,
                rawIndex,
            });
        }

        return out;
    }, [rawGallery]);

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const overlayRef = useRef(null);
    const closeButtonRef = useRef(null);
    const lastActiveThumbRef = useRef(null);
    const touchRef = useRef({
        startX: 0,
        startY: 0,
        swiping: false,
        canceled: false,
    });

    const hasItems = items.length > 0;

    const closeLightbox = useCallback(() => {
        setIsOpen(false);
        try {
            document?.body?.classList?.remove(BODY_SCROLL_LOCK_CLASS);
        } catch {}

        const el = lastActiveThumbRef.current;
        lastActiveThumbRef.current = null;
        if (el && typeof el.focus === "function") {
            // Ensure focus restoration happens after overlay unmount.
            setTimeout(() => {
                try {
                    el.focus();
                } catch {}
            }, 0);
        }
    }, []);

    const showPrev = useCallback(() => {
        if (!hasItems) return;
        setActiveIndex((i) => mod(i - 1, items.length));
    }, [hasItems, items.length]);

    const showNext = useCallback(() => {
        if (!hasItems) return;
        setActiveIndex((i) => mod(i + 1, items.length));
    }, [hasItems, items.length]);

    const openLightbox = useCallback(
        (index, thumbEl) => {
            if (!hasItems) return;
            const nextIndex =
                typeof index === "number" && Number.isFinite(index)
                    ? Math.min(Math.max(0, index), items.length - 1)
                    : 0;

            if (thumbEl) lastActiveThumbRef.current = thumbEl;
            setActiveIndex(nextIndex);
            setIsOpen(true);
        },
        [hasItems, items.length],
    );

    useEffect(() => {
        if (!isOpen) return;

        try {
            document?.body?.classList?.add(BODY_SCROLL_LOCK_CLASS);
        } catch {}

        return () => {
            try {
                document?.body?.classList?.remove(BODY_SCROLL_LOCK_CLASS);
            } catch {}
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (!hasItems) {
            setIsOpen(false);
            return;
        }

        // Clamp activeIndex when items change while open (e.g., editor upload/remove).
        setActiveIndex((i) => {
            const clamped = Math.min(Math.max(0, i), items.length - 1);
            return clamped;
        });
    }, [isOpen, hasItems, items.length]);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === "Escape") {
                e.preventDefault();
                closeLightbox();
                return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                showPrev();
                return;
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                showNext();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, closeLightbox, showPrev, showNext]);

    useEffect(() => {
        if (!isOpen) return;
        // Focus close button on open (A11y minimum).
        const id = requestAnimationFrame(() => {
            try {
                closeButtonRef.current?.focus?.();
            } catch {}
        });
        return () => cancelAnimationFrame(id);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (!hasItems) return;
        if (items.length < 2) return;

        const left = mod(activeIndex - 1, items.length);
        const right = mod(activeIndex + 1, items.length);
        for (const idx of [left, right]) {
            const src = items[idx]?.fullUrl;
            if (!src) continue;
            const img = new Image();
            img.src = src;
        }
    }, [activeIndex, hasItems, isOpen, items]);

    if (!hasItems) return null;

    return (
        <Section title="גלריה">
            <div className={styles.gallery}>
                {items.map((it, index) => (
                    <button
                        key={it.id}
                        type="button"
                        className={styles.imageWrapper}
                        onClick={(e) => openLightbox(index, e.currentTarget)}
                        aria-label={`פתח תמונה ${index + 1}`}
                    >
                        <img
                            src={it.thumbUrl}
                            alt={it.alt}
                            className={styles.image}
                            loading="lazy"
                            decoding="async"
                        />
                    </button>
                ))}
            </div>

            {isOpen ? (
                <div
                    ref={overlayRef}
                    className={styles.overlay}
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === overlayRef.current) closeLightbox();
                    }}
                    onWheel={(e) => {
                        if (!isOpen) return;
                        e.preventDefault();
                        const dx = e.deltaX;
                        const dy = e.deltaY;
                        const dir = Math.abs(dx) > Math.abs(dy) ? dx : dy;
                        if (dir > 0) showNext();
                        else if (dir < 0) showPrev();
                    }}
                    onTouchStart={(e) => {
                        if (!isOpen) return;
                        const t = e.touches?.[0];
                        if (!t) return;
                        touchRef.current = {
                            startX: t.clientX,
                            startY: t.clientY,
                            swiping: true,
                            canceled: false,
                        };
                    }}
                    onTouchMove={(e) => {
                        const state = touchRef.current;
                        if (!isOpen || !state.swiping || state.canceled) return;
                        const t = e.touches?.[0];
                        if (!t) return;
                        const dx = t.clientX - state.startX;
                        const dy = t.clientY - state.startY;
                        if (Math.abs(dy) > Math.abs(dx)) {
                            state.canceled = true;
                        }
                    }}
                    onTouchEnd={(e) => {
                        const state = touchRef.current;
                        if (!isOpen || !state.swiping || state.canceled) {
                            touchRef.current.swiping = false;
                            return;
                        }
                        const t = e.changedTouches?.[0];
                        if (!t) return;
                        const dx = t.clientX - state.startX;
                        if (dx > SWIPE_THRESHOLD_PX) showPrev();
                        else if (dx < -SWIPE_THRESHOLD_PX) showNext();
                        touchRef.current.swiping = false;
                    }}
                >
                    <div className={styles.dialog}>
                        <div className={styles.topBar}>
                            <div className={styles.counter}>
                                {activeIndex + 1} / {items.length}
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                className={styles.close}
                                onClick={closeLightbox}
                                aria-label="סגור"
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.media}>
                            <button
                                type="button"
                                className={styles.navPrev}
                                onClick={showPrev}
                                aria-label="הקודם"
                            >
                                ‹
                            </button>
                            <img
                                src={items[activeIndex]?.fullUrl}
                                alt={items[activeIndex]?.alt}
                                className={styles.lightboxImage}
                                decoding="async"
                            />
                            <button
                                type="button"
                                className={styles.navNext}
                                onClick={showNext}
                                aria-label="הבא"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </Section>
    );
}

export default GallerySection;
