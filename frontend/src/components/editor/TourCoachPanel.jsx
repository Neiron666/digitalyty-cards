import styles from "./TourCoachPanel.module.css";

/**
 * TourCoachPanel — isolated coach panel UI for the editor guided onboarding tour.
 *
 * Phase 2C-4: component is unimported. No integration. No hook usage.
 * Renders static content only. No DOM access, no timers, no events.
 *
 * Expected step shape:
 *   {
 *     id: string,
 *     targetId: string,
 *     text: string,
 *     anonymousOnly?: boolean,
 *     requiresDrawer?: boolean,
 *     finalCta?: boolean
 *   } | null
 *
 * @param {object} props
 * @param {{ id: string, targetId: string, text: string, anonymousOnly?: boolean, requiresDrawer?: boolean, finalCta?: boolean } | null} props.step
 * @param {number} props.currentIndex
 * @param {number} props.totalSteps
 * @param {() => void} [props.onSkip]
 * @param {() => void} [props.onNext]
 */
export default function TourCoachPanel({
    step,
    currentIndex,
    totalSteps,
    onSkip,
    onNext,
}) {
    if (!step) return null;

    return (
        <section
            className={styles.panel}
            dir="rtl"
            role="region"
            aria-label="סיור מודרך"
        >
            <div className={styles.content}>
                <p
                    className={styles.text}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {step.text}
                </p>
                <p className={styles.meta}>
                    {currentIndex + 1} מתוך {totalSteps}
                </p>
            </div>
            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => onNext?.()}
                >
                    המשך
                </button>
                <button
                    type="button"
                    className={styles.skipButton}
                    onClick={() => onSkip?.()}
                >
                    דלגו על ההדרכה
                </button>
            </div>
        </section>
    );
}
