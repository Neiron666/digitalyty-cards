import { useEffect } from "react";
import { trackSitePageView } from "../services/siteAnalytics.client";

function Guides() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return <h1>מדריכים</h1>;
}

export default Guides;
