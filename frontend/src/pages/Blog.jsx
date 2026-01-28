import { useEffect } from "react";
import { trackSitePageView } from "../services/siteAnalytics.client";

function Blog() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return <h1>בלוג</h1>;
}

export default Blog;
