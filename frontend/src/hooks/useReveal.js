import { useCallback, useEffect, useRef } from "react";

const REDUCED =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-reveal hook.  Returns a stable callback ref.
 *
 * @param {object}  opts
 * @param {string}  opts.revealClass  – CSS Module class to add on intersect
 * @param {boolean} [opts.skip=false] – skip observation entirely (e.g. preview)
 * @param {number}  [opts.threshold=0.15]
 * @param {string}  [opts.rootMargin="0px 0px -40px 0px"]
 */
export default function useReveal({
    revealClass,
    skip = false,
    threshold = 0.15,
    rootMargin = "0px 0px -40px 0px",
} = {}) {
    const observerRef = useRef(null);
    const elsRef = useRef(new Set());

    /* create / tear-down observer once */
    useEffect(() => {
        if (skip || REDUCED || !revealClass) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(revealClass);
                        io.unobserve(entry.target);
                        elsRef.current.delete(entry.target);
                    }
                }
            },
            { threshold, rootMargin },
        );
        observerRef.current = io;

        /* observe elements already registered before IO was ready */
        for (const el of elsRef.current) io.observe(el);

        return () => {
            io.disconnect();
            observerRef.current = null;
        };
    }, [revealClass, skip, threshold, rootMargin]);

    /* stable callback ref */
    const ref = useCallback(
        (el) => {
            if (!el || skip || REDUCED || !revealClass) return;
            elsRef.current.add(el);
            if (observerRef.current) observerRef.current.observe(el);
        },
        [revealClass, skip],
    );

    return ref;
}
