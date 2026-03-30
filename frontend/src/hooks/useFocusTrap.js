import { useEffect } from "react";

/**
 * useFocusTrap(containerRef, isEnabled)
 *
 * When isEnabled is true, traps keyboard Tab/Shift+Tab navigation inside
 * the element referenced by containerRef.
 *
 * - Safe when there are 0 or 1 focusable elements (no-op).
 * - Does not mutate styles or the DOM.
 * - No external dependencies.
 */

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function useFocusTrap(containerRef, isEnabled) {
    useEffect(() => {
        if (!isEnabled) return;

        const container = containerRef.current;
        if (!container) return;

        const onKeyDown = (e) => {
            if (e.key !== "Tab") return;

            const focusable = Array.from(
                container.querySelectorAll(FOCUSABLE_SELECTOR),
            );

            if (focusable.length < 2) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: if focus is on first, jump to last
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab: if focus is on last, jump to first
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [containerRef, isEnabled]);
}
