import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <main style={{ padding: "80px 20px", textAlign: "center" }}>
            <h1>404</h1>
            <p>העמוד שחיפשת לא נמצא</p>
            <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
                חזרה לדף הבית
            </Link>
        </main>
    );
}
