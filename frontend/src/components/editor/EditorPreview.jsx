import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";

function PhoneFrame({ children }) {
    return (
        <div
            style={{
                width: "min(420px, 92vw)",
                aspectRatio: "9 / 16",
                borderRadius: 28,
                padding: 10,
                background: "#0b0b0f",
                boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 22,
                    overflow: "hidden",
                    background: "#ffffff",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function EditorPreview({ card, header, footer }) {
    return (
        <PhoneFrame>
            <div className={styles.preview}>
                {header ? <div className={styles.header}>{header}</div> : null}
                <CardRenderer card={card} />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
