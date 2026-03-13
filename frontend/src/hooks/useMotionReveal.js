import { useCallback, useEffect, useRef, useState } from "react";

const REDUCED =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-reveal hook for the motion preset framework.
 * For NEW pages/components only — does NOT touch existing useReveal consumers.
 *
 * Returns { ref, isRevealed }. Consumer applies motion.isVisible conditionally:
 *
 *   import motion from "../../styles/motion.module.css";
 *   const { ref, isRevealed } = useMotionReveal();
 *   <div
 *     className={`${motion.fadeUp} ${isRevealed ? motion.isVisible : ""}`}
 *     ref={ref}
 *   />
 *
 * Under prefers-reduced-motion: isRevealed starts as true (no animation wait).
 *
 * @param {object}  [opts]
 * @param {number}  [opts.threshold=0.15]
 * @param {string}  [opts.rootMargin="0px 0px -40px 0px"]
 * @param {boolean} [opts.once=true] — unobserve after first reveal
 */
export default function useMotionReveal({
    threshold = 0.15,
    rootMargin = "0px 0px -40px 0px",
    once = true,
} = {}) {
    const [isRevealed, setIsRevealed] = useState(REDUCED);
    const observerRef = useRef(null);
    const nodeRef = useRef(null);

    useEffect(() => {
        if (REDUCED) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setIsRevealed(true);
                        if (once) io.unobserve(entry.target);
                    } else if (!once) {
                        setIsRevealed(false);
                    }
                }
            },
            { threshold, rootMargin },
        );
        observerRef.current = io;

        /* If element registered before observer was ready, observe it now */
        if (nodeRef.current) io.observe(nodeRef.current);

        return () => {
            io.disconnect();
            observerRef.current = null;
        };
    }, [threshold, rootMargin, once]);

    /* Stable callback ref — handles element mount/unmount */
    const ref = useCallback((el) => {
        nodeRef.current = el;
        if (el && observerRef.current) {
            observerRef.current.observe(el);
        }
    }, []);

    return { ref, isRevealed };
}
