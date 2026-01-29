import { Component } from "react";
import styles from "./ChunkErrorBoundary.module.css";

const RELOAD_GUARD_KEY = "digitalyty_chunk_reload_once";

function isChunkLoadError(err) {
    const msg = String(err?.message || "").toLowerCase();

    if (msg.includes("chunkloaderror")) return true;
    if (msg.includes("loading chunk")) return true;
    if (msg.includes("failed to fetch dynamically imported module"))
        return true;
    if (msg.includes("importing a module script failed")) return true;

    return false;
}

function canAttemptReload() {
    try {
        return (
            typeof window !== "undefined" &&
            window.sessionStorage?.getItem(RELOAD_GUARD_KEY) !== "1"
        );
    } catch {
        return false;
    }
}

function markReloadAttempted() {
    try {
        window.sessionStorage?.setItem(RELOAD_GUARD_KEY, "1");
    } catch {
        // ignore
    }
}

export default class ChunkErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, reloaded: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        try {
            if (!isChunkLoadError(error)) return;
            if (!canAttemptReload()) return;

            markReloadAttempted();
            this.setState({ reloaded: true });
            window.location.reload();
        } catch {
            // ignore
        }
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const label =
            typeof this.props.label === "string" && this.props.label.trim()
                ? this.props.label.trim()
                : "אירעה שגיאה בטעינת הדף";

        return (
            <div className={styles.root} dir="rtl" role="alert">
                <div className={styles.title}>{label}</div>
                <div className={styles.subtitle}>
                    נסה לרענן את הדף. אם זה קורה אחרי עדכון גרסה, ייתכן שהדפדפן
                    שמר קאש ישן.
                </div>

                <button
                    type="button"
                    className={styles.button}
                    onClick={() => window.location.reload()}
                >
                    רענן
                </button>
            </div>
        );
    }
}
