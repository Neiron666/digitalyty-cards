import { useCallback, useEffect, useRef } from "react";

const REDUCED =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-linked progress hook for the v2 motion layer.
 * Writes a CSS custom property `--scroll-progress` (0..1) on the element.
 *
 * For NEW marketing/app-shell sections only.
 * Does NOT depend on useMotionReveal or motion.module.css.
 *
 * Approved carve-out: el.style.setProperty('--scroll-progress', value)
 * is the ONLY inline-style mutation allowed, per architect decision.
 *
 * Usage:
 *   import scroll from "../../styles/motion-scroll.module.css";
 *   const { ref } = useScrollProgress();
 *   <div className={scroll.scrollZoomSoft} ref={ref}>…</div>
 *
 * Under prefers-reduced-motion: no listeners created, --scroll-progress
 * stays at CSS default (0 via fallback in presets).
 *
 * @param {object}  [opts]
 * @param {number}  [opts.threshold=0] - IO threshold for activation
 * @param {string}  [opts.rootMargin="0px 0px 0px 0px"]
 */
export default function useScrollProgress({
    threshold = 0,
    rootMargin = "0px 0px 0px 0px",
} = {}) {
    const nodeRef = useRef(null);
    const isVisibleRef = useRef(false);
    const rafRef = useRef(0);
    const lastValueRef = useRef(-1);

    useEffect(() => {
        if (REDUCED) return;

        function computeProgress() {
            const el = nodeRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;

            /* 0 = element top at viewport bottom, 1 = element bottom at viewport top */
            const raw = (vh - rect.top) / (vh + rect.height);
            const clamped = Math.min(1, Math.max(0, raw));

            /* Round to 3 decimals to avoid sub-pixel churn */
            const rounded = Math.round(clamped * 1000) / 1000;

            if (rounded !== lastValueRef.current) {
                lastValueRef.current = rounded;
                el.style.setProperty("--scroll-progress", rounded);
            }
        }

        function onScroll() {
            if (!isVisibleRef.current) return;
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = 0;
                computeProgress();
            });
        }

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    isVisibleRef.current = entry.isIntersecting;
                    if (entry.isIntersecting) computeProgress();
                }
            },
            { threshold, rootMargin },
        );

        if (nodeRef.current) io.observe(nodeRef.current);

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            io.disconnect();
            window.removeEventListener("scroll", onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [threshold, rootMargin]);

    const ref = useCallback((el) => {
        nodeRef.current = el;
    }, []);

    return { ref };
}
