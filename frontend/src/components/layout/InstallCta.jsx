import { useState } from "react";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import styles from "./InstallCta.module.css";

export default function InstallCta() {
    const {
        canPrompt,
        triggerPrompt,
        isInstalled,
        isIOS,
        isSafari,
        isInAppBrowser,
        showIOSGuide,
    } = useInstallPrompt();

    const [highlighted, setHighlighted] = useState(false);

    let helpText;
    if (isInstalled) {
        helpText = "✓ Cardigo מותקן במכשיר שלכם";
    } else if (canPrompt) {
        helpText = null;
    } else if (showIOSGuide) {
        helpText = "להתקנה: לחצו על שיתוף ▸ הוסף למסך הבית";
    } else if (isInAppBrowser || (isIOS && !isSafari)) {
        helpText = "פתחו ב־Safari להתקנה כאפליקציה";
    } else {
        helpText =
            "כפתור ההתקנה מיועד למכשירי אנדרואיד בלבד. אם חלון ההתקנה לא נפתח, אפשר להתקין דרך תפריט הדפדפן.";
    }

    function handleClick() {
        if (canPrompt) {
            triggerPrompt();
            return;
        }
        setHighlighted((v) => !v);
    }

    const helpClass =
        highlighted && helpText
            ? `${styles.helpText} ${styles.helpHighlight}`
            : styles.helpText;

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.installBtn}
                onClick={handleClick}
            >
                התקינו את Cardigo
            </button>
            {helpText && <p className={helpClass}>{helpText}</p>}
        </div>
    );
}
