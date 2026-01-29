import { useEffect } from "react";
import Page from "../components/page/Page";
import Button from "../components/ui/Button";
import {
    trackSitePageView,
    trackSiteClick,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import styles from "./Contact.module.css";

export default function Contact() {
    const email = "digitalyty.web@gmail.com";

    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <Page title="צור קשר" subtitle="נשמח לשמוע מכם">
            <div className={styles.root}>
                <p>ניתן לפנות אלינו במייל:</p>
                <strong>{email}</strong>

                <div className={styles.actions}>
                    <Button
                        as="a"
                        href={`mailto:${email}`}
                        variant="secondary"
                        onClick={() =>
                            trackSiteClick({
                                action: SITE_ACTIONS.contact_email_click,
                                pagePath: "/contact",
                            })
                        }
                    >
                        שלחו מייל
                    </Button>
                </div>
            </div>
        </Page>
    );
}
