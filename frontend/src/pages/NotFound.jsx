import { Link } from "react-router-dom";
import SeoHelmet from "../components/seo/SeoHelmet";
import styles from "./NotFound.module.css";

export default function NotFound() {
    return (
        <main className={styles.root}>
            <SeoHelmet
                robots="noindex, nofollow"
                title="404 – עמוד לא נמצא | Cardigo"
            />
            <h1>404</h1>
            <p>העמוד שחיפשת לא נמצא</p>
            <Link to="/" className={styles.backLink}>
                חזרה לדף הבית
            </Link>
        </main>
    );
}
