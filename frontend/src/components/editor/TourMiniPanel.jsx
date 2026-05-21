import styles from "./TourCoachPanel.module.css";

/**
 * TourMiniPanel — authenticated in-editor mini-guide coach panel.
 * Reuses TourCoachPanel.module.css for visual consistency.
 */
export default function TourMiniPanel({
    step,
    currentIndex,
    totalSteps,
    onNext,
    onSkip,
    nextDisabled,
    isFinalStep,
    guideTitle,
}) {
    if (!step) return null;

    return (
        <section
            className={styles.panel}
            dir="rtl"
            role="region"
            aria-label={guideTitle || "מדריך"}
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
                    disabled={Boolean(nextDisabled)}
                >
                    {isFinalStep ? "סיום" : "הבא"}
                </button>
                <button
                    type="button"
                    className={styles.skipButton}
                    onClick={() => onSkip?.()}
                >
                    דלג
                </button>
            </div>
        </section>
    );
}
