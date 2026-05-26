import { renderToString } from "react-dom/server";
import {
    createStaticHandler,
    createStaticRouter,
    StaticRouterProvider,
} from "react-router-dom";

// Named import: react-helmet-async is bundled for SSR via vite.config.js ssr.noExternal.
// Rollup resolves the package ESM entry (lib/index.esm.js) which has named exports only.
import { HelmetProvider } from "react-helmet-async";

import { AuthProvider } from "./context/AuthContext";
import { UnreadCountProvider } from "./context/UnreadCountContext";
import routes from "./app/routes.config";
import { InitialListingDataProvider } from "./seo/initialListingData";
import { InitialDetailDataProvider } from "./seo/initialDetailData";

/**
 * Render a target marketing route to an HTML string for static generation.
 *
 * Called by generate-static.mjs (Phase 2A-5) for each pre-render target:
 *   /  /cards  /pricing  /contact
 *
 * Returns { html, helmetContext } — the caller assembles the final page by
 * injecting html into the index.html template and extracting head tags via
 * helmetContext.helmet.{title,meta,link,script}.toString().
 *
 * @param {string} url - Absolute path starting with "/", e.g. "/cards"
 * @param {object} [options]
 * @param {object} [options.initialListingData] - Optional initial listing data map.
 * @returns {Promise<{ html: string, helmetContext: object }>}
 */
export async function renderForRoute(url, options = {}) {
    if (typeof url !== "string" || !url.startsWith("/")) {
        throw new TypeError(
            `renderForRoute: url must be a string starting with "/", got: ${JSON.stringify(url)}`,
        );
    }

    const handler = createStaticHandler(routes);
    const request = new Request("https://cardigo.co.il" + url);
    const context = await handler.query(request);

    // Redirect responses are passed back to the caller to handle.
    if (context instanceof Response) {
        throw context;
    }

    const router = createStaticRouter(routes, context);
    const helmetContext = {};
    const initialListingData =
        options && typeof options === "object" && options.initialListingData
            ? options.initialListingData
            : {};
    const initialDetailData =
        options && typeof options === "object" && options.initialDetailData
            ? options.initialDetailData
            : {};

    const html = renderToString(
        <HelmetProvider context={helmetContext}>
            <AuthProvider>
                <UnreadCountProvider>
                    <InitialListingDataProvider value={initialListingData}>
                        <InitialDetailDataProvider value={initialDetailData}>
                            <StaticRouterProvider
                                router={router}
                                context={context}
                            />
                        </InitialDetailDataProvider>
                    </InitialListingDataProvider>
                </UnreadCountProvider>
            </AuthProvider>
        </HelmetProvider>,
    );

    return { html, helmetContext };
}
