import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import { useAuth } from "../context/AuthContext";
import styles from "./Dashboard.module.css";

function coerceFlashFromState(state) {
    const flash = state?.flash;
    if (flash && typeof flash === "object") {
        const type = flash.type;
        const message = flash.message;
        if (typeof message === "string" && message.trim()) {
            return {
                type:
                    type === "success" || type === "error" || type === "info"
                        ? type
                        : "info",
                message,
            };
        }
    }

    // Back-compat: older navigations used { notice: { type, text } }
    const notice = state?.notice;
    if (notice && typeof notice === "object") {
        const type = notice.type;
        const message = notice.text;
        if (typeof message === "string" && message.trim()) {
            return {
                type:
                    type === "success" || type === "error" || type === "info"
                        ? type
                        : "info",
                message,
            };
        }
    }

    return null;
}

export default function Dashboard() {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [flash, setFlash] = useState(null);
    const lastHandledKeyRef = useRef(null);

    useEffect(() => {
        if (!location?.key) return;
        if (lastHandledKeyRef.current === location.key) return;
        lastHandledKeyRef.current = location.key;

        const nextFlash = coerceFlashFromState(location.state);
        if (!nextFlash) return;

        setFlash(nextFlash);

        // Clear state so it doesn't repeat after refresh.
        navigate(".", { replace: true, state: null });
    }, [location, navigate]);

    return (
        <>
            {flash ? (
                <div className={styles.flashWrap}>
                    <div className={styles.flash}>
                        <FlashBanner
                            type={flash.type}
                            message={flash.message}
                            onDismiss={() => setFlash(null)}
                        />
                    </div>
                </div>
            ) : null}
            <main className={styles.main}>
                <h1>הדשבורד שלי</h1>
                {isAuthenticated && user?.email ? (
                    <p className={styles.email}>Email: {user.email}</p>
                ) : null}
                <p>כאן תוכל לנהל את כרטיס הביקור הדיגיטלי שלך.</p>
                <p>העמוד בבנייה 🚧</p>
            </main>
        </>
    );
}
