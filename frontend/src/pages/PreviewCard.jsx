import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import api from "../services/api";
import CardRenderer from "../components/card/CardRenderer";
import { withDemoPreviewCard } from "../components/editor/previewDemo";
import styles from "./PreviewCardPage.module.css";

function toNotFoundErrorMessage() {
    return "כרטיס לא נמצא";
}

export default function PreviewCard() {
    const { slug, orgSlug } = useParams();

    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            setCard(null);

            const safeSlug = String(slug || "").trim();
            const safeOrgSlug = String(orgSlug || "").trim();

            if (!safeSlug) {
                setError(toNotFoundErrorMessage());
                setLoading(false);
                return;
            }

            const url = safeOrgSlug
                ? `/preview/c/${safeOrgSlug}/${safeSlug}`
                : `/preview/cards/${safeSlug}`;

            try {
                const res = await api.get(url);
                setCard(res.data);
            } catch {
                setError(toNotFoundErrorMessage());
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [slug, orgSlug]);

    const previewCard = useMemo(() => withDemoPreviewCard(card), [card]);

    if (loading) return <p>טוען כרטיס...</p>;
    if (error) return <p>{error}</p>;
    if (!previewCard) return null;

    return (
        <div className={styles.previewPage}>
            <Helmet>
                <meta name="robots" content="noindex, nofollow, noarchive" />
            </Helmet>

            <div className={styles.previewContainer}>
                {/* <div className={styles.previewNotice}>מצב תצוגה מקדימה</div> */}
                <CardRenderer card={previewCard} mode="public" />
            </div>
        </div>
    );
}
