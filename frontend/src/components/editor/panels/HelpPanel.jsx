import Panel from "./Panel";
import Button from "../../ui/Button";
import {
    SUPPORT_EMAIL,
    SUPPORT_WHATSAPP_URL,
} from "../../../utils/supportContact";
import styles from "./HelpPanel.module.css";

export default function HelpPanel() {
    return (
        <Panel title="עזרה ותמיכה">
            <div className={styles.root}>
                <p className={styles.intro}>
                    צריכים עזרה ביצירת הכרטיס, בהגדרות או בכל דבר אחר? פשוט כתבו
                    לנו - ונשמח לעזור.
                </p>
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>צור קשר</div>
                    <div className={styles.ctaStack}>
                        <Button
                            as="a"
                            variant="secondary"
                            fullWidth
                            href={SUPPORT_WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="פתח שיחת WhatsApp בחלון חדש"
                        >
                            שלח הודעה ב-WhatsApp
                        </Button>
                        <Button
                            as="a"
                            variant="ghost"
                            fullWidth
                            href={"mailto:" + SUPPORT_EMAIL}
                            aria-label="שלח מייל לתמיכה"
                        >
                            שלח מייל לתמיכה
                        </Button>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
