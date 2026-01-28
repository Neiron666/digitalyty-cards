import { useEffect } from "react";
import Page from "../components/page/Page";
import CardsEmpty from "../components/cards/CardsEmpty";
import CardsGrid from "../components/cards/CardsGrid";
import { trackSitePageView } from "../services/siteAnalytics.client";
import styles from "./Cards.module.css";

export default function Cards() {
    // позже здесь будет загрузка реальных карточек
    const cards = []; // MVP: пусто

    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <Page
            title="דוגמאות לכרטיסי ביקור דיגיטליים"
            subtitle="כך נראה כרטיס ביקור דיגיטלי מקצועי שנוצר בעזרת Digitalyty"
        >
            {cards.length === 0 ? <CardsEmpty /> : <CardsGrid cards={cards} />}

            {/* SEO-текст */}
            <section className={styles.seo}>
                <h2>כרטיס ביקור דיגיטלי – למה זה עובד?</h2>
                <p>
                    כרטיס ביקור דיגיטלי מאפשר להציג את העסק בצורה מקצועית,
                    מעודכנת ונגישה. במקום כרטיס נייר שנעלם או מתיישן, כרטיס
                    דיגיטלי תמיד זמין בקישור אחד, ניתן לשיתוף בוואטסאפ, SMS, QR
                    או אימייל, ומתאים במיוחד למובייל.
                </p>
                <p>
                    Digitalyty מאפשרת ליצור כרטיס ביקור דיגיטלי לעסקים תוך דקות,
                    עם עיצוב מודרני, כפתורי יצירת קשר, גלריית תמונות, וידאו,
                    המלצות וטופס לידים.
                </p>
            </section>
        </Page>
    );
}
