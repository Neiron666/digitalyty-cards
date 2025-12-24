import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
    const { isAuthenticated, user } = useAuth();

    return (
        <main style={{ padding: "60px 20px", textAlign: "center" }}>
            <h1>הדשבורד שלי</h1>
            {isAuthenticated && user?.email ? (
                <p style={{ marginTop: 8, opacity: 0.85 }}>
                    Email: {user.email}
                </p>
            ) : null}
            <p>כאן תוכל לנהל את כרטיס הביקור הדיגיטלי שלך.</p>
            <p>העמוד בבנייה 🚧</p>
        </main>
    );
}
